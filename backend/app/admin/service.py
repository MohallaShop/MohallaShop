"""Admin service: read-only aggregations over existing tables."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import AdminDashboardOut
from app.orders.models import Order
from app.shops.models import Inventory, Product, Shop, ShopStatus
from app.users.models import User


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


__all__ = [
    'dashboard',
    'list_orders_admin',
    'list_products_admin',
    'list_shops_admin',
    'list_users',
]
