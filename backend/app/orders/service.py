"""Orders domain service.

Owns the order state machine and the atomic order-creation routine. Money is
always computed server-side; inventory is decremented with a conditional UPDATE
to prevent oversell (SCHEMA §4, §7). Carts never touch inventory.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, cast
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.carts.models import Cart, CartItem, CartStatus
from app.core.exceptions import ConflictError, NotFoundError, StateTransitionError, ValidationFailed
from app.core.security import Principal
from app.orders.models import (
    Order,
    OrderItem,
    OrderStateHistory,
    OrderStatus,
)
from app.orders.schemas import (
    DeliveryAddressOut,
    OrderCustomerOut,
    OrderDetail,
    OrderHistoryOut,
    OrderItemOut,
    OrderSummary,
)
from app.shops.models import Inventory, Product, Shop
from app.users.models import Address, UserProfile
from app.users.service import ensure_user


# ── Domain-specific conflicts (envelope code) ──────────────────
class EmptyCart(ConflictError):  # noqa: N818 - semantic; subclasses ConflictError
    code = 'empty_cart'


class InsufficientInventory(ConflictError):  # noqa: N818 - semantic; subclasses ConflictError
    code = 'insufficient_inventory'


# ── State machine ──────────────────────────────────────────────
_ALLOWED: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING_SHOP: {
        OrderStatus.ACCEPTED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
    },
    OrderStatus.ACCEPTED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.READY_FOR_PICKUP},
}

_RESTOCK_TARGETS = {OrderStatus.REJECTED, OrderStatus.CANCELLED}


def _assert_transition(current: OrderStatus, target: OrderStatus) -> None:
    if target not in _ALLOWED.get(current, set()):
        raise StateTransitionError(
            f'Cannot transition order from {current.value} to {target.value}',
            details={'current': current.value, 'target': target.value},
        )


# ── Mapping helpers ────────────────────────────────────────────
def _summary(order: Order, item_count: int) -> OrderSummary:
    return OrderSummary(
        id=order.id,
        order_no=order.order_no,
        status=order.status.value,
        total_amount=order.total_amount,
        item_count=item_count,
        placed_at=order.placed_at,
    )


async def _item_count(session: AsyncSession, order_id: UUID) -> int:
    return int(
        (
            await session.execute(
                select(func.count()).select_from(OrderItem).where(OrderItem.order_id == order_id)
            )
        ).scalar_one()
    )


async def _detail(
    session: AsyncSession,
    order: Order,
    *,
    include_customer: bool,
) -> OrderDetail:
    customer: OrderCustomerOut | None = None
    if include_customer:
        profile = await session.get(UserProfile, order.customer_user_id)
        customer = OrderCustomerOut(
            user_id=order.customer_user_id, display_name=profile.display_name if profile else None
        )
    shop = await session.get(Shop, order.shop_id)
    items = [
        OrderItemOut(
            product_id=oi.product_id,
            product_name=oi.product_name,
            product_unit=oi.product_unit,
            unit_price=oi.unit_price,
            quantity=oi.quantity,
            line_total=oi.line_total,
        )
        for oi in order.items
    ]
    history = [
        OrderHistoryOut(
            from_state=h.from_state.value if h.from_state else None,
            to_state=h.to_state.value,
            actor_role=h.actor_role,
            reason=h.reason,
            created_at=h.created_at,
        )
        for h in order.history
    ]
    return OrderDetail(
        id=order.id,
        order_no=order.order_no,
        status=order.status.value,
        total_amount=order.total_amount,
        item_count=len(items),
        placed_at=order.placed_at,
        shop_id=order.shop_id,
        shop_name=shop.name if shop else '',
        customer=customer,
        subtotal=order.subtotal,
        delivery_fee=order.delivery_fee,
        notes=order.notes,
        delivery_address=DeliveryAddressOut(
            line1=order.delivery_line1,
            line2=order.delivery_line2,
            landmark=order.delivery_landmark,
            city=order.delivery_city,
            state=order.delivery_state,
            pincode=order.delivery_pincode,
            contact_name=order.delivery_contact_name,
            contact_phone=order.delivery_contact_phone,
        ),
        items=items,
        history=history,
    )


async def _load_detail(
    session: AsyncSession, order_id: UUID, *, include_customer: bool
) -> tuple[Order, OrderDetail]:
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.history))
        .where(Order.id == order_id)
    )
    order = (await session.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise NotFoundError('Order not found')
    return order, await _detail(session, order, include_customer=include_customer)


# ── Order creation (atomic) ────────────────────────────────────
async def create_order(
    session: AsyncSession,
    principal: Principal,
    address_id: UUID,
    notes: str | None,
) -> OrderDetail:
    uid = principal.user_id
    await ensure_user(session, principal)

    # Lock the active cart.
    cart = (
        await session.execute(
            select(Cart)
            .where(Cart.user_id == uid, Cart.status == CartStatus.ACTIVE)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if cart is None or cart.shop_id is None:
        raise EmptyCart('Cannot checkout an empty cart')

    # Validate address ownership.
    addr = await session.get(Address, address_id)
    if addr is None or addr.user_id != uid:
        raise NotFoundError('Address not found')

    # Lock cart lines and products first. Inventory is locked separately below so
    # a missing inventory row cannot disappear through an inner join.
    rows = (
        await session.execute(
            select(CartItem, Product)
            .join(Product, Product.id == CartItem.product_id)
            .where(CartItem.cart_id == cart.id)
            .with_for_update()
        )
    ).all()
    if not rows:
        raise EmptyCart('Cannot checkout an empty cart')

    expected_item_count = int(
        (
            await session.execute(
                select(func.count()).select_from(CartItem).where(CartItem.cart_id == cart.id)
            )
        ).scalar_one()
    )
    if len(rows) != expected_item_count:
        raise ValidationFailed('A product in your cart is no longer available')

    shop_id = cart.shop_id
    subtotal = Decimal('0')

    locked_rows: list[tuple[CartItem, Product, Inventory]] = []
    for item, product in rows:
        inv = (
            await session.execute(
                select(Inventory).where(Inventory.product_id == product.id).with_for_update()
            )
        ).scalar_one_or_none()
        if inv is None:
            raise ValidationFailed(
                'A product in your cart has no inventory record',
                details={'product_id': str(product.id)},
            )
        locked_rows.append((item, product, inv))

    for item, product, inv in locked_rows:
        if not product.is_active or product.shop_id != shop_id:
            raise ValidationFailed(
                'A product in your cart is no longer available',
                details={'product_id': str(product.id)},
            )
        if inv.quantity_available < item.quantity:
            raise InsufficientInventory(
                'Insufficient stock for an item',
                details={
                    'product_id': str(product.id),
                    'available': inv.quantity_available,
                    'requested': item.quantity,
                },
            )
        # Concurrency-safe decrement.
        result = await session.execute(
            update(Inventory)
            .where(
                Inventory.product_id == product.id,
                Inventory.quantity_available >= item.quantity,
            )
            .values(quantity_available=Inventory.quantity_available - item.quantity)
        )
        if cast(CursorResult[Any], result).rowcount != 1:
            raise InsufficientInventory(
                'Insufficient stock for an item',
                details={'product_id': str(product.id)},
            )
        subtotal += product.price * item.quantity

    delivery_fee = Decimal('0')
    total = subtotal + delivery_fee

    order_id = uuid4()
    order = Order(
        id=order_id,
        order_no='MS-' + order_id.hex[:8].upper(),
        customer_user_id=uid,
        shop_id=shop_id,
        status=OrderStatus.PENDING_SHOP,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total_amount=total,
        notes=notes,
        delivery_line1=addr.line1,
        delivery_line2=addr.line2,
        delivery_landmark=addr.landmark,
        delivery_city=addr.city,
        delivery_state=addr.state,
        delivery_pincode=addr.pincode,
        delivery_contact_name=addr.contact_name,
        delivery_contact_phone=addr.contact_phone,
    )
    session.add(order)
    await session.flush()

    for item, product, _inv in locked_rows:
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_unit=product.unit,
                unit_price=product.price,
                quantity=item.quantity,
                line_total=product.price * item.quantity,
            )
        )
    session.add(
        OrderStateHistory(
            order_id=order.id,
            from_state=None,
            to_state=OrderStatus.PENDING_SHOP,
            actor_user_id=uid,
            actor_role='customer',
            reason='order placed',
        )
    )

    # Consume the cart (items removed, shop binding cleared; row reused).
    await session.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    cart.shop_id = None

    await session.commit()
    _order, detail = await _load_detail(session, order.id, include_customer=False)
    return detail


# ── Restock helper ─────────────────────────────────────────────
async def _restock(session: AsyncSession, order_id: UUID) -> None:
    items = (
        (await session.execute(select(OrderItem).where(OrderItem.order_id == order_id)))
        .scalars()
        .all()
    )
    for it in items:
        if it.product_id is None:
            continue
        inventory = (
            await session.execute(
                select(Inventory).where(Inventory.product_id == it.product_id).with_for_update()
            )
        ).scalar_one_or_none()
        if inventory is not None:
            inventory.quantity_available += it.quantity


# ── Customer ───────────────────────────────────────────────────
async def list_customer_orders(
    session: AsyncSession,
    principal: Principal,
    *,
    page: int,
    page_size: int,
    status: OrderStatus | None = None,
) -> tuple[list[tuple[Order, int]], int]:
    base = select(Order, func.count(OrderItem.id))
    base = base.join(OrderItem, OrderItem.order_id == Order.id, isouter=True)
    base = base.group_by(Order.id).order_by(Order.placed_at.desc())
    where = [Order.customer_user_id == principal.user_id]
    count_stmt = (
        select(func.count()).select_from(Order).where(Order.customer_user_id == principal.user_id)
    )
    if status is not None:
        where.append(Order.status == status)
        count_stmt = count_stmt.where(Order.status == status)
    base = base.where(*where)
    base = base.offset((page - 1) * page_size).limit(page_size)
    result = (await session.execute(base)).all()
    total = int((await session.execute(count_stmt)).scalar_one())
    out: list[tuple[Order, int]] = []
    for row in result:
        order, count = row[0], int(row[1])
        out.append((order, count))
    return out, total


async def get_customer_order(
    session: AsyncSession, principal: Principal, order_id: UUID
) -> OrderDetail:
    order, detail = await _load_detail(session, order_id, include_customer=False)
    if order.customer_user_id != principal.user_id:
        raise NotFoundError('Order not found')
    return detail


async def cancel_order(session: AsyncSession, principal: Principal, order_id: UUID) -> OrderDetail:
    order = (
        await session.execute(
            select(Order)
            .where(Order.id == order_id, Order.customer_user_id == principal.user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if order is None:
        raise NotFoundError('Order not found')
    _assert_transition(order.status, OrderStatus.CANCELLED)
    previous = order.status
    order.status = OrderStatus.CANCELLED
    session.add(
        OrderStateHistory(
            order_id=order.id,
            from_state=previous,
            to_state=OrderStatus.CANCELLED,
            actor_user_id=principal.user_id,
            actor_role='customer',
            reason='cancelled by customer',
        )
    )
    await _restock(session, order.id)
    await session.commit()
    _o, detail = await _load_detail(session, order.id, include_customer=False)
    return detail


# ── Shopkeeper ─────────────────────────────────────────────────
async def _resolve_shop_id(session: AsyncSession, principal: Principal) -> UUID:
    shop_id = (
        await session.execute(select(Shop.id).where(Shop.owner_user_id == principal.user_id))
    ).scalar_one_or_none()
    if shop_id is None:
        raise NotFoundError('You do not own a shop yet')
    return shop_id


async def _load_shop_order(
    session: AsyncSession,
    principal: Principal,
    order_id: UUID,
    *,
    for_update: bool = False,
) -> Order:
    shop_id = await _resolve_shop_id(session, principal)
    stmt = select(Order).where(Order.id == order_id, Order.shop_id == shop_id)
    if for_update:
        stmt = stmt.with_for_update()
    order = (await session.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise NotFoundError('Order not found')  # 404, not 403, to avoid leaking existence
    return order


async def list_shop_orders(
    session: AsyncSession,
    principal: Principal,
    *,
    page: int,
    page_size: int,
    status: OrderStatus | None = None,
) -> tuple[list[tuple[Order, int]], int]:
    shop_id = await _resolve_shop_id(session, principal)
    base = (
        select(Order, func.count(OrderItem.id))
        .join(OrderItem, OrderItem.order_id == Order.id, isouter=True)
        .group_by(Order.id)
        .order_by(Order.placed_at.desc())
    )
    where = [Order.shop_id == shop_id]
    count_stmt = select(func.count()).select_from(Order).where(Order.shop_id == shop_id)
    if status is not None:
        where.append(Order.status == status)
        count_stmt = count_stmt.where(Order.status == status)
    base = base.where(*where).offset((page - 1) * page_size).limit(page_size)
    result = (await session.execute(base)).all()
    total = int((await session.execute(count_stmt)).scalar_one())
    return [(r[0], int(r[1])) for r in result], total


async def get_shop_order(
    session: AsyncSession, principal: Principal, order_id: UUID
) -> OrderDetail:
    await _load_shop_order(session, principal, order_id)
    _order, detail = await _load_detail(session, order_id, include_customer=True)
    return detail


async def _shopkeeper_transition(
    session: AsyncSession,
    principal: Principal,
    order_id: UUID,
    target: OrderStatus,
    reason: str | None = None,
) -> OrderDetail:
    order = await _load_shop_order(session, principal, order_id, for_update=True)
    _assert_transition(order.status, target)
    previous = order.status
    order.status = target
    session.add(
        OrderStateHistory(
            order_id=order.id,
            from_state=previous,
            to_state=target,
            actor_user_id=principal.user_id,
            actor_role='shopkeeper',
            reason=reason,
        )
    )
    if target in _RESTOCK_TARGETS:
        await _restock(session, order.id)
    await session.commit()
    _o, detail = await _load_detail(session, order.id, include_customer=True)
    return detail


async def accept(session: AsyncSession, principal: Principal, order_id: UUID) -> OrderDetail:
    return await _shopkeeper_transition(session, principal, order_id, OrderStatus.ACCEPTED)


async def reject(
    session: AsyncSession, principal: Principal, order_id: UUID, reason: str | None
) -> OrderDetail:
    return await _shopkeeper_transition(
        session, principal, order_id, OrderStatus.REJECTED, reason=reason
    )


async def preparing(session: AsyncSession, principal: Principal, order_id: UUID) -> OrderDetail:
    return await _shopkeeper_transition(session, principal, order_id, OrderStatus.PREPARING)


async def ready(session: AsyncSession, principal: Principal, order_id: UUID) -> OrderDetail:
    return await _shopkeeper_transition(session, principal, order_id, OrderStatus.READY_FOR_PICKUP)


__all__ = [
    'EmptyCart',
    'InsufficientInventory',
    'accept',
    'cancel_order',
    'create_order',
    'get_customer_order',
    'get_shop_order',
    'list_customer_orders',
    'list_shop_orders',
    'preparing',
    'ready',
    'reject',
]
