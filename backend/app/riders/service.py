"""Riders domain service: online/offline, assignment, delivery lifecycle, earnings.

The per-delivery fee is passed in by callers (routers resolve it from the
injected Settings) so tests can override configuration through FastAPI's
dependency overrides instead of the process environment.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import NotFoundError, StateTransitionError
from app.core.logging import get_logger
from app.core.security import Principal
from app.orders.models import Order, OrderStateHistory, OrderStatus
from app.orders.service import _assert_transition
from app.riders.models import ACTIVE_STATUSES, Delivery, DeliveryStatus, Rider
from app.riders.schemas import (
    EarningDayOut,
    RiderDashboardOut,
    RiderDeliveryOut,
    RiderEarningsOut,
    RiderStateOut,
)
from app.shops.models import Shop
from app.users.service import ensure_user

logger = get_logger(__name__)

_DELIVERY_ALLOWED: dict[DeliveryStatus, set[DeliveryStatus]] = {
    DeliveryStatus.ASSIGNED: {DeliveryStatus.PICKED_UP, DeliveryStatus.FAILED},
    DeliveryStatus.PICKED_UP: {DeliveryStatus.DELIVERED, DeliveryStatus.FAILED},
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.FAILED: set(),
}


def fee_from_settings(settings: Settings) -> Decimal:
    return Decimal(str(settings.rider_delivery_fee)).quantize(Decimal('0.01'))


# ── Mapping ────────────────────────────────────────────────────
def _delivery_out(d: Delivery, order: Order, shop_name: str) -> RiderDeliveryOut:
    return RiderDeliveryOut(
        id=d.id,
        order_id=order.id,
        order_no=order.order_no,
        shop_name=shop_name,
        status=d.status.value,
        rider_fee=d.rider_fee,
        total_amount=order.total_amount,
        drop_line1=order.delivery_line1,
        drop_city=order.delivery_city,
        drop_pincode=order.delivery_pincode,
        contact_name=order.delivery_contact_name,
        contact_phone=order.delivery_contact_phone,
        assigned_at=d.assigned_at,
        picked_up_at=d.picked_up_at,
        completed_at=d.completed_at,
        notes=d.notes,
    )


# ── Online / offline ───────────────────────────────────────────
async def get_rider(session: AsyncSession, user_id: UUID) -> Rider:
    rider = await session.get(Rider, user_id)
    if rider is None:
        raise NotFoundError('Rider profile not found')
    return rider


async def ensure_rider(session: AsyncSession, principal: Principal) -> Rider:
    await ensure_user(session, principal)
    rider = await session.get(Rider, principal.user_id)
    if rider is None:
        rider = Rider(user_id=principal.user_id)
        session.add(rider)
        await session.flush()
    return rider


async def set_online(
    session: AsyncSession, principal: Principal, fee: Decimal
) -> RiderStateOut:
    rider = await ensure_rider(session, principal)
    rider.is_online = True
    await session.flush()
    # Catch-up: assign orders that became ready while nobody was online.
    assigned = await assign_waiting_orders(session, fee)
    await session.commit()
    logger.info('rider_online', user_id=str(principal.user_id), assigned=assigned)
    return await rider_state(session, principal.user_id)


async def set_offline(session: AsyncSession, principal: Principal) -> RiderStateOut:
    rider = await get_rider(session, principal.user_id)
    rider.is_online = False
    await session.commit()
    return await rider_state(session, principal.user_id)


async def rider_state(session: AsyncSession, user_id: UUID) -> RiderStateOut:
    rider = await get_rider(session, user_id)
    active = await _active_counts(session)
    return RiderStateOut(
        user_id=user_id,
        is_online=rider.is_online,
        active_deliveries=active.get(user_id, 0),
    )


# ── Assignment ─────────────────────────────────────────────────
async def _active_counts(session: AsyncSession) -> dict[UUID, int]:
    rows = (
        await session.execute(
            select(Delivery.rider_user_id, func.count(Delivery.id))
            .where(Delivery.status.in_(ACTIVE_STATUSES))
            .group_by(Delivery.rider_user_id)
        )
    ).all()
    return {row[0]: int(row[1]) for row in rows if row[0] is not None}


async def _pick_rider(session: AsyncSession, *, exclude: UUID | None = None) -> UUID | None:
    """The online rider with the fewest active deliveries.

    All online rider rows are locked (skip_locked) so concurrent
    ready-transactions cannot double-assign: the loser waits on the lock and
    then sees the winner's updated load. Locks are taken in user_id order to
    avoid deadlocks. `exclude` keeps a failed delivery from boomeranging back
    to the rider who just failed it.
    """
    online = list(
        (
            await session.execute(
                select(Rider)
                .where(Rider.is_online.is_(True))
                .order_by(Rider.user_id)
                .with_for_update(skip_locked=True)
            )
        )
        .scalars()
        .all()
    )
    if exclude is not None:
        online = [r for r in online if r.user_id != exclude]
    if not online:
        return None
    counts = await _active_counts(session)
    return min(online, key=lambda r: (counts.get(r.user_id, 0), r.user_id)).user_id


async def auto_assign_ready_order(
    session: AsyncSession, order: Order, fee: Decimal
) -> Delivery | None:
    """Assign a ready_for_pickup order if any online rider exists. Runs inside
    the shopkeeper's `ready` transaction; returns None when nobody is online —
    the order then waits for the catch-up pass when a rider comes online."""
    if order.status != OrderStatus.READY_FOR_PICKUP:
        return None
    existing = (
        await session.execute(select(Delivery).where(Delivery.order_id == order.id))
    ).scalar_one_or_none()
    if existing is not None and existing.status in ACTIVE_STATUSES:
        return existing
    rider_id = await _pick_rider(session)
    if rider_id is None:
        return None
    delivery = Delivery(
        order_id=order.id,
        rider_user_id=rider_id,
        status=DeliveryStatus.ASSIGNED,
        rider_fee=fee,
        assigned_at=datetime.now(UTC),
    )
    session.add(delivery)
    return delivery


async def assign_waiting_orders(session: AsyncSession, fee: Decimal) -> int:
    """Assign every ready order without an active delivery (oldest first)."""
    waiting = (
        (
            await session.execute(
                select(Order)
                .where(Order.status == OrderStatus.READY_FOR_PICKUP)
                .order_by(Order.placed_at)
            )
        )
        .scalars()
        .all()
    )
    assigned = 0
    for order in waiting:
        delivery = (
            await session.execute(select(Delivery).where(Delivery.order_id == order.id))
        ).scalar_one_or_none()
        if delivery is not None and delivery.status in ACTIVE_STATUSES:
            continue
        rider_id = await _pick_rider(session)
        if rider_id is None:
            break
        session.add(
            Delivery(
                order_id=order.id,
                rider_user_id=rider_id,
                status=DeliveryStatus.ASSIGNED,
                rider_fee=fee,
                assigned_at=datetime.now(UTC),
            )
        )
        assigned += 1
    return assigned


# ── Dashboard / list ───────────────────────────────────────────
async def dashboard(session: AsyncSession, principal: Principal) -> RiderDashboardOut:
    rider = await ensure_rider(session, principal)
    counts = await _active_counts(session)
    today_start = datetime.combine(datetime.now(UTC).date(), time.min, tzinfo=UTC)
    completed_today, earned_today = (
        await session.execute(
            select(func.count(Delivery.id), func.coalesce(func.sum(Delivery.rider_fee), 0))
            .where(
                Delivery.rider_user_id == principal.user_id,
                Delivery.status == DeliveryStatus.DELIVERED,
                Delivery.completed_at >= today_start,
            )
        )
    ).one()
    return RiderDashboardOut(
        is_online=rider.is_online,
        active_count=counts.get(principal.user_id, 0),
        completed_today=int(completed_today),
        earned_today=Decimal(earned_today),
    )


async def list_deliveries(
    session: AsyncSession,
    principal: Principal,
    *,
    status: DeliveryStatus | None = None,
    page: int,
    page_size: int,
) -> tuple[list[RiderDeliveryOut], int]:
    """The rider's deliveries (newest first). `status=None` returns all."""
    conds = [Delivery.rider_user_id == principal.user_id]
    if status is not None:
        conds.append(Delivery.status == status)
    base = (
        select(Delivery, Order, Shop.name)
        .join(Order, Order.id == Delivery.order_id)
        .join(Shop, Shop.id == Order.shop_id)
        .where(*conds)
        .order_by(Delivery.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(Delivery).where(*conds)
    total = int((await session.execute(count_stmt)).scalar_one())
    rows = (await session.execute(base.offset((page - 1) * page_size).limit(page_size))).all()
    return [_delivery_out(d, o, shop) for d, o, shop in rows], total


# ── Delivery lifecycle ─────────────────────────────────────────
def _record_order_transition(
    session: AsyncSession,
    order: Order,
    target: OrderStatus,
    actor_user_id: UUID,
    reason: str | None,
) -> None:
    _assert_transition(order.status, target)
    previous = order.status
    order.status = target
    session.add(
        OrderStateHistory(
            order_id=order.id,
            from_state=previous,
            to_state=target,
            actor_user_id=actor_user_id,
            actor_role='rider',
            reason=reason,
        )
    )


async def _transition(
    session: AsyncSession,
    principal: Principal,
    delivery_id: UUID,
    target: DeliveryStatus,
    fee: Decimal,
    *,
    reason: str | None = None,
) -> RiderDeliveryOut:
    delivery = (
        await session.execute(
            select(Delivery).where(Delivery.id == delivery_id).with_for_update()
        )
    ).scalar_one_or_none()
    if delivery is None or delivery.rider_user_id != principal.user_id:
        raise NotFoundError('Delivery not found')
    if target not in _DELIVERY_ALLOWED.get(delivery.status, set()):
        raise StateTransitionError(
            f'Cannot move delivery from {delivery.status.value} to {target.value}',
            details={'current': delivery.status.value, 'target': target.value},
        )

    order = (
        await session.execute(select(Order).where(Order.id == delivery.order_id).with_for_update())
    ).scalar_one()
    now = datetime.now(UTC)
    delivery.status = target

    if target == DeliveryStatus.PICKED_UP:
        if order.status != OrderStatus.READY_FOR_PICKUP:
            raise StateTransitionError('Order is not awaiting pickup')
        delivery.picked_up_at = now
        _record_order_transition(session, order, OrderStatus.OUT_FOR_DELIVERY, principal.user_id,
                                 'picked up by rider')
    elif target == DeliveryStatus.DELIVERED:
        if order.status != OrderStatus.OUT_FOR_DELIVERY:
            raise StateTransitionError('Order is not out for delivery')
        delivery.completed_at = now
        _record_order_transition(session, order, OrderStatus.DELIVERED, principal.user_id,
                                 'delivered by rider')
    else:  # FAILED
        delivery.notes = reason
        delivery.completed_at = now
        # A failed delivery bounces the order back to ready_for_pickup (when it
        # was out with this rider) so it can be reassigned.
        if order.status == OrderStatus.OUT_FOR_DELIVERY:
            _record_order_transition(session, order, OrderStatus.READY_FOR_PICKUP,
                                     principal.user_id, reason or 'delivery failed')
        await session.flush()
        # Reassign to another online rider, if one is free.
        rider_id = await _pick_rider(session, exclude=principal.user_id)
        if rider_id is not None:
            session.add(
                Delivery(
                    order_id=order.id,
                    rider_user_id=rider_id,
                    status=DeliveryStatus.ASSIGNED,
                    rider_fee=fee,
                    assigned_at=datetime.now(UTC),
                    notes='reassigned after failed delivery',
                )
            )

    await session.commit()
    shop = await session.get(Shop, order.shop_id)
    return _delivery_out(delivery, order, shop.name if shop else '')


async def pick_up(
    session: AsyncSession, principal: Principal, delivery_id: UUID, fee: Decimal
) -> RiderDeliveryOut:
    return await _transition(session, principal, delivery_id, DeliveryStatus.PICKED_UP, fee)


async def complete(
    session: AsyncSession, principal: Principal, delivery_id: UUID, fee: Decimal
) -> RiderDeliveryOut:
    return await _transition(session, principal, delivery_id, DeliveryStatus.DELIVERED, fee)


async def fail(
    session: AsyncSession, principal: Principal, delivery_id: UUID, fee: Decimal,
    reason: str | None,
) -> RiderDeliveryOut:
    return await _transition(
        session, principal, delivery_id, DeliveryStatus.FAILED, fee, reason=reason
    )


# ── Earnings ───────────────────────────────────────────────────
async def earnings(
    session: AsyncSession, principal: Principal, *, days: int = 7
) -> RiderEarningsOut:
    today = datetime.now(UTC).date()
    since = datetime.combine(today - timedelta(days=days - 1), time.min, tzinfo=UTC)

    lifetime_count, lifetime_sum = (
        await session.execute(
            select(func.count(Delivery.id), func.coalesce(func.sum(Delivery.rider_fee), 0))
            .where(
                Delivery.rider_user_id == principal.user_id,
                Delivery.status == DeliveryStatus.DELIVERED,
            )
        )
    ).one()

    day_col = func.date_trunc('day', Delivery.completed_at).label('day')
    rows = (
        await session.execute(
            select(day_col, func.count(Delivery.id), func.coalesce(func.sum(Delivery.rider_fee), 0))
            .where(
                Delivery.rider_user_id == principal.user_id,
                Delivery.status == DeliveryStatus.DELIVERED,
                Delivery.completed_at >= since,
            )
            .group_by('day')
            .order_by('day')
        )
    ).all()
    by_day = {r[0].date(): (int(r[1]), Decimal(r[2])) for r in rows}

    per_day: list[EarningDayOut] = []
    for i in range(days - 1, -1, -1):
        d: date = today - timedelta(days=i)
        deliveries, fees = by_day.get(d, (0, Decimal('0')))
        per_day.append(EarningDayOut(date=d.isoformat(), deliveries=deliveries, fees=fees))

    return RiderEarningsOut(
        lifetime_deliveries=int(lifetime_count),
        lifetime_fees=Decimal(lifetime_sum),
        today_fees=by_day.get(today, (0, Decimal('0')))[1],
        per_day=per_day,
    )


__all__ = [
    'assign_waiting_orders',
    'auto_assign_ready_order',
    'complete',
    'dashboard',
    'earnings',
    'ensure_rider',
    'fail',
    'fee_from_settings',
    'get_rider',
    'list_deliveries',
    'pick_up',
    'rider_state',
    'set_offline',
    'set_online',
]
