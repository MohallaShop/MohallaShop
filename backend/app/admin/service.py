"""Admin service: aggregations + shop lifecycle + user role management."""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import (
    AdminAnalyticsOut,
    AdminDashboardOut,
    AdminRiderOut,
    AdminSettingsOut,
    AdminUserDetailOut,
    AdminUserRolesUpdate,
    OrdersPerDayOut,
    TopShopOut,
)
from app.auth.roles import Role
from app.core import supabase_admin
from app.core.config import Settings
from app.core.exceptions import AuthorizationError, NotFoundError, StateTransitionError
from app.core.security import Principal
from app.orders.models import Order
from app.riders.models import ACTIVE_STATUSES, Delivery, DeliveryStatus, Rider
from app.shops.models import Inventory, Product, Shop, ShopStatus
from app.users.models import User, UserProfile

logger = logging.getLogger(__name__)

ANALYTICS_WINDOW_DAYS = 14

# Admin-driven shop status transitions. Approval (→ active) is legal from any
# state; suspension only from active; closing only from active/suspended.
# `pending` is never a target — it is set exclusively by shop registration.
_SHOP_STATUS_TARGETS: dict[ShopStatus, set[ShopStatus]] = {
    ShopStatus.PENDING: {ShopStatus.ACTIVE},
    ShopStatus.ACTIVE: {ShopStatus.SUSPENDED, ShopStatus.INACTIVE},
    ShopStatus.SUSPENDED: {ShopStatus.ACTIVE, ShopStatus.INACTIVE},
    ShopStatus.INACTIVE: {ShopStatus.ACTIVE},
}


async def list_users(session: AsyncSession, *, page: int, page_size: int) -> tuple[list[User], int]:
    base = select(User).order_by(User.created_at.desc())
    total = int((await session.execute(select(func.count()).select_from(User))).scalar_one())
    items = (
        (await session.execute(base.offset((page - 1) * page_size).limit(page_size)))
        .scalars()
        .all()
    )
    return list(items), total


async def list_shops_admin(
    session: AsyncSession, *, page: int, page_size: int, q: str | None = None
) -> tuple[list[tuple[Shop, int]], int]:
    base = select(Shop, func.count(Product.id))
    base = base.join(Product, Product.shop_id == Shop.id, isouter=True)
    base = base.group_by(Shop.id).order_by(Shop.created_at.desc())
    count_base = select(func.count()).select_from(Shop)
    if q:
        like = f'%{q}%'
        base = base.where(Shop.name.ilike(like))
        count_base = count_base.where(Shop.name.ilike(like))
    total = int((await session.execute(count_base)).scalar_one())
    rows = (await session.execute(base.offset((page - 1) * page_size).limit(page_size))).all()
    return [(r[0], int(r[1])) for r in rows], total


async def list_products_admin(
    session: AsyncSession, *, page: int, page_size: int, q: str | None = None
) -> tuple[list[tuple[Product, int]], int]:
    base = (
        select(Product, Inventory.quantity_available)
        .join(Inventory, Inventory.product_id == Product.id, isouter=True)
        .order_by(Product.created_at.desc())
    )
    count_base = select(func.count()).select_from(Product)
    if q:
        like = f'%{q}%'
        base = base.where(Product.name.ilike(like))
        count_base = count_base.where(Product.name.ilike(like))
    total = int((await session.execute(count_base)).scalar_one())
    rows = (await session.execute(base.offset((page - 1) * page_size).limit(page_size))).all()
    return [(r[0], int(r[1] or 0)) for r in rows], total


async def list_orders_admin(
    session: AsyncSession, *, page: int, page_size: int
) -> tuple[list[Order], int]:
    base = select(Order).order_by(Order.placed_at.desc())
    total = int((await session.execute(select(func.count()).select_from(Order))).scalar_one())
    items = (
        (await session.execute(base.offset((page - 1) * page_size).limit(page_size)))
        .scalars()
        .all()
    )
    return list(items), total


async def dashboard(session: AsyncSession) -> AdminDashboardOut:
    users = int((await session.execute(select(func.count()).select_from(User))).scalar_one())
    shops_active = int(
        (
            await session.execute(
                select(func.count()).select_from(Shop).where(Shop.status == ShopStatus.ACTIVE)
            )
        ).scalar_one()
    )
    shops_inactive = int(
        (
            await session.execute(
                select(func.count()).select_from(Shop).where(Shop.status == ShopStatus.INACTIVE)
            )
        ).scalar_one()
    )
    products = int((await session.execute(select(func.count()).select_from(Product))).scalar_one())

    status_rows = (
        await session.execute(select(Order.status, func.count(Order.id)).group_by(Order.status))
    ).all()
    orders_by_status: dict[str, int] = {}
    for status, count in status_rows:
        orders_by_status[status.value if hasattr(status, 'value') else str(status)] = int(count)

    return AdminDashboardOut(
        users=users,
        shops_active=shops_active,
        shops_inactive=shops_inactive,
        products=products,
        orders_by_status=orders_by_status,
    )


async def set_shop_status(
    session: AsyncSession, shop_id: UUID, target: ShopStatus
) -> tuple[Shop, int]:
    """Move a shop to an admin-chosen status. Returns the shop + product count."""
    shop = await session.get(Shop, shop_id)
    if shop is None:
        raise NotFoundError('Shop not found')
    if target not in _SHOP_STATUS_TARGETS.get(shop.status, set()):
        raise StateTransitionError(
            f'A {shop.status.value} shop cannot be set to {target.value}',
            details={'from': shop.status.value, 'to': target.value},
        )
    shop.status = target
    await session.commit()
    await session.refresh(shop)
    product_count = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Product)
                .where(Product.shop_id == shop.id)
            )
        ).scalar_one()
    )
    return shop, product_count


async def list_riders_admin(
    session: AsyncSession, *, page: int, page_size: int
) -> tuple[list[AdminRiderOut], int]:
    """Riders with their live load — online first, then by user id."""
    base = (
        select(
            Rider,
            UserProfile.display_name,
            User.email,
            func.count(Delivery.id).filter(Delivery.status.in_(ACTIVE_STATUSES)),
            func.count(Delivery.id).filter(Delivery.status == DeliveryStatus.DELIVERED),
        )
        .join(UserProfile, UserProfile.user_id == Rider.user_id, isouter=True)
        .join(User, User.id == Rider.user_id, isouter=True)
        .join(Delivery, Delivery.rider_user_id == Rider.user_id, isouter=True)
        .group_by(Rider.user_id, UserProfile.display_name, User.email)
        .order_by(Rider.is_online.desc(), Rider.user_id)
    )
    total = int((await session.execute(select(func.count()).select_from(Rider))).scalar_one())
    rows = (await session.execute(base.offset((page - 1) * page_size).limit(page_size))).all()
    items = [
        AdminRiderOut(
            user_id=rider.user_id,
            display_name=name,
            email=email,
            is_online=rider.is_online,
            active_deliveries=int(active),
            completed_deliveries=int(completed),
        )
        for rider, name, email, active, completed in rows
    ]
    return items, total


__all__ = [
    'analytics',
    'dashboard',
    'get_admin_settings',
    'get_user_detail',
    'list_orders_admin',
    'list_products_admin',
    'list_riders_admin',
    'list_shops_admin',
    'list_users',
    'set_shop_status',
    'update_user_roles',
]


# ── Supabase user management (roles live in app_metadata) ──────
def _user_detail(payload: dict[str, object]) -> AdminUserDetailOut:
    app_metadata = payload.get('app_metadata')
    metadata: dict[str, object] = app_metadata if isinstance(app_metadata, dict) else {}
    raw_roles = metadata.get('roles')
    roles = [str(r) for r in raw_roles] if isinstance(raw_roles, list) else []
    email = payload.get('email')
    phone = payload.get('phone')
    return AdminUserDetailOut(
        id=UUID(str(payload.get('id'))),
        email=email if isinstance(email, str) else None,
        phone=phone if isinstance(phone, str) else None,
        email_confirmed=payload.get('email_confirmed_at') is not None,
        roles=roles,
    )


async def get_user_detail(settings: Settings, user_id: UUID) -> AdminUserDetailOut:
    return _user_detail(await supabase_admin.get_user(settings, user_id))


async def update_user_roles(
    settings: Settings, user_id: UUID, data: AdminUserRolesUpdate, *, actor: Principal
) -> AdminUserDetailOut:
    """Replace the user's roles, preserving every other app_metadata key.

    Roles are JWT claims embedded at sign-in, so the user is force-signed-out
    afterwards (best-effort): their next login mints a token carrying the new
    roles. Without this, a promoted rider would keep a customer-only token
    until it expired.

    Only a super-admin may grant or revoke the super-admin role (privilege
    escalation guard).
    """
    is_super_admin = Role.SUPER_ADMIN in actor.roles
    target_roles = [r.value for r in data.roles]
    wants_super = Role.SUPER_ADMIN in data.roles

    current = await supabase_admin.get_user(settings, user_id)
    current_roles = _user_detail(current).roles

    if not is_super_admin and (wants_super or Role.SUPER_ADMIN in current_roles):
        raise AuthorizationError(
            'Only a super-admin can grant or remove the super-admin role',
            details={'required_roles': ['super_admin']},
        )

    app_metadata = current.get('app_metadata')
    merged: dict[str, object] = dict(app_metadata) if isinstance(app_metadata, dict) else {}
    # Dedupe while preserving order; empty list == plain customer.
    merged['roles'] = list(dict.fromkeys(target_roles))

    updated = await supabase_admin.update_app_metadata(settings, user_id, merged)
    try:
        await supabase_admin.sign_out(settings, user_id)
    except Exception:
        logger.warning('supabase sign_out failed for %s after role update', user_id)
    return _user_detail(updated)


# ── Analytics ──────────────────────────────────────────────────
async def analytics(session: AsyncSession) -> AdminAnalyticsOut:
    """Orders + revenue per day (zero-filled) and top shops by revenue."""
    since = datetime.now(UTC) - timedelta(days=ANALYTICS_WINDOW_DAYS - 1)

    day = func.date_trunc('day', Order.placed_at).label('day')
    per_day_rows = (
        await session.execute(
            select(day, func.count(Order.id), func.coalesce(func.sum(Order.total_amount), 0))
            .where(Order.placed_at >= since)
            .group_by('day')
            .order_by('day')
        )
    ).all()
    by_day = {row[0].date(): (int(row[1]), Decimal(row[2])) for row in per_day_rows}

    orders_per_day: list[OrdersPerDayOut] = []
    today = datetime.now(UTC).date()
    for i in range(ANALYTICS_WINDOW_DAYS - 1, -1, -1):
        d: date = today - timedelta(days=i)
        orders, revenue = by_day.get(d, (0, Decimal('0')))
        orders_per_day.append(OrdersPerDayOut(date=d.isoformat(), orders=orders, revenue=revenue))

    top_rows = (
        await session.execute(
            select(
                Shop.id,
                Shop.name,
                func.count(Order.id),
                func.coalesce(func.sum(Order.total_amount), 0),
            )
            .join(Order, Order.shop_id == Shop.id)
            .group_by(Shop.id, Shop.name)
            .order_by(func.sum(Order.total_amount).desc())
            .limit(5)
        )
    ).all()
    top_shops = [
        TopShopOut(shop_id=row[0], shop_name=row[1], orders=int(row[2]), revenue=Decimal(row[3]))
        for row in top_rows
    ]

    riders_online = int(
        (
            await session.execute(
                select(func.count()).select_from(Rider).where(Rider.is_online.is_(True))
            )
        ).scalar_one()
    )

    return AdminAnalyticsOut(
        orders_per_day=orders_per_day, top_shops=top_shops, riders_online=riders_online
    )


# ── Settings (booleans only — no secrets leave the server) ─────
def get_admin_settings(settings: Settings) -> AdminSettingsOut:
    return AdminSettingsOut(
        payments_enabled=settings.payments_enabled,
        razorpay_configured=settings.razorpay_configured,
        supabase_admin_configured=bool(
            settings.supabase_url and settings.supabase_service_role_key
        ),
        rider_delivery_fee=Decimal(str(settings.rider_delivery_fee)),
    )
