"""Shops domain service: customer discovery + shopkeeper's own shop."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import Principal
from app.orders.models import Order, OrderStatus
from app.shops.models import Category, Inventory, Product, Shop, ShopStatus
from app.shops.schemas import (
    ShopAddressOut,
    ShopCreate,
    ShopDetail,
    ShopkeeperInventoryUpdate,
    ShopkeeperProductCreate,
    ShopkeeperProductUpdate,
)
from app.users.service import ensure_user


async def _active_shop_or_404(session: AsyncSession, shop_id: UUID) -> Shop:
    shop = await session.get(Shop, shop_id)
    if shop is None or shop.status != ShopStatus.ACTIVE:
        raise NotFoundError('Shop not found')
    return shop


def _detail(shop: Shop) -> ShopDetail:
    return ShopDetail(
        id=shop.id,
        name=shop.name,
        description=shop.description,
        phone=shop.phone,
        address=ShopAddressOut(
            line1=shop.address_line1,
            line2=shop.address_line2,
            city=shop.address_city,
            state=shop.address_state,
            pincode=shop.address_pincode,
            latitude=shop.latitude,
            longitude=shop.longitude,
        ),
        status=shop.status.value,
        delivery_fee=shop.delivery_fee,
    )


async def list_shops(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    q: str | None = None,
    city: str | None = None,
) -> tuple[list[Shop], int]:
    base = select(Shop).where(Shop.status == ShopStatus.ACTIVE)
    count_base = select(func.count()).select_from(Shop).where(Shop.status == ShopStatus.ACTIVE)
    if q:
        like = f'%{q}%'
        cond = Shop.name.ilike(like) | Shop.description.ilike(like)
        base = base.where(cond)
        count_base = count_base.where(cond)
    if city:
        base = base.where(Shop.address_city == city)
        count_base = count_base.where(Shop.address_city == city)
    base = base.order_by(Shop.name).offset((page - 1) * page_size).limit(page_size)
    items = (await session.execute(base)).scalars().all()
    total = int((await session.execute(count_base)).scalar_one())
    return list(items), total


async def get_shop(session: AsyncSession, shop_id: UUID) -> ShopDetail:
    return _detail(await _active_shop_or_404(session, shop_id))


async def list_products(
    session: AsyncSession,
    shop_id: UUID,
    *,
    page: int,
    page_size: int,
    q: str | None = None,
    category_id: UUID | None = None,
    only_in_stock: bool = False,
) -> tuple[list[Product], int]:
    await _active_shop_or_404(session, shop_id)
    base = (
        select(Product)
        .options(selectinload(Product.inventory))
        .where(Product.shop_id == shop_id, Product.is_active.is_(True))
    )
    count_base = (
        select(func.count())
        .select_from(Product)
        .where(Product.shop_id == shop_id, Product.is_active.is_(True))
    )
    if q:
        like = f'%{q}%'
        cond = Product.name.ilike(like) | Product.description.ilike(like)
        base = base.where(cond)
        count_base = count_base.where(cond)
    if category_id is not None:
        base = base.where(Product.category_id == category_id)
        count_base = count_base.where(Product.category_id == category_id)
    if only_in_stock:
        base = base.join(Inventory).where(Inventory.quantity_available > 0)
        count_base = count_base.join(Inventory).where(Inventory.quantity_available > 0)
    base = base.order_by(Product.name).offset((page - 1) * page_size).limit(page_size)
    items = (await session.execute(base)).scalars().all()
    total = int((await session.execute(count_base)).scalar_one())
    return list(items), total


async def get_product(session: AsyncSession, product_id: UUID) -> Product:
    stmt = (
        select(Product)
        .options(selectinload(Product.inventory))
        .where(Product.id == product_id, Product.is_active.is_(True))
    )
    product = (await session.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise NotFoundError('Product not found')
    shop = await session.get(Shop, product.shop_id)
    if shop is None or shop.status != ShopStatus.ACTIVE:
        raise NotFoundError('Product not found')
    return product


async def get_shopkeeper_shop(session: AsyncSession, principal: Principal) -> Shop:
    user = await ensure_user(session, principal)
    stmt = select(Shop).where(Shop.owner_user_id == user.id)
    shop = (await session.execute(stmt)).scalar_one_or_none()
    if shop is None:
        raise NotFoundError('You do not own a shop yet')
    return shop


async def create_shop(
    session: AsyncSession, principal: Principal, data: ShopCreate
) -> Shop:
    """Register the shopkeeper's (single) shop. It starts pending admin approval."""
    user = await ensure_user(session, principal)
    existing = (
        await session.execute(select(Shop).where(Shop.owner_user_id == user.id))
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(
            'You already own a shop',
            code='shop_already_exists',
            details={'shop_id': str(existing.id)},
        )
    shop = Shop(
        owner_user_id=user.id,
        name=data.name,
        description=data.description,
        phone=data.phone,
        status=ShopStatus.PENDING,
        address_line1=data.address_line1,
        address_line2=data.address_line2,
        address_city=data.city,
        address_state=data.state,
        address_pincode=data.pincode,
        delivery_fee=data.delivery_fee,
    )
    session.add(shop)
    await session.commit()
    await session.refresh(shop)
    return shop


async def shopkeeper_shop_counts(session: AsyncSession, shop_id: UUID) -> tuple[int, int]:
    product_count = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Product)
                .where(Product.shop_id == shop_id, Product.is_active.is_(True))
            )
        ).scalar_one()
    )
    pending = int(
        (
            await session.execute(
                select(func.count())
                .select_from(Order)
                .where(Order.shop_id == shop_id, Order.status == OrderStatus.PENDING_SHOP)
            )
        ).scalar_one()
    )
    return product_count, pending


async def list_categories(session: AsyncSession) -> list[Category]:
    """All categories ordered by sort_order then name (small, unpaged set)."""
    result = await session.execute(select(Category).order_by(Category.sort_order, Category.name))
    return list(result.scalars().all())


async def category_product_counts(session: AsyncSession) -> dict[UUID, int]:
    """Active, in-stock product counts grouped by category."""
    rows = (
        await session.execute(
            select(Product.category_id, func.count(Product.id))
            .join(Shop, Shop.id == Product.shop_id)
            .join(Inventory, Inventory.product_id == Product.id)
            .where(
                Product.is_active.is_(True),
                Shop.status == ShopStatus.ACTIVE,
                Inventory.quantity_available > 0,
            )
            .group_by(Product.category_id)
        )
    ).all()
    return {row[0]: int(row[1]) for row in rows if row[0] is not None}


async def search_products(
    session: AsyncSession,
    *,
    q: str | None = None,
    category_id: UUID | None = None,
    page: int,
    page_size: int,
) -> tuple[list[tuple[Product, str, int]], int]:
    """Global product search across active shops (joins shop name + stock)."""
    base = (
        select(Product, Shop.name.label('shop_name'), Inventory.quantity_available)
        .join(Shop, Shop.id == Product.shop_id)
        .join(Inventory, Inventory.product_id == Product.id)
        .where(Product.is_active.is_(True), Shop.status == ShopStatus.ACTIVE)
    )
    count_base = (
        select(func.count())
        .select_from(Product)
        .join(Shop, Shop.id == Product.shop_id)
        .join(Inventory, Inventory.product_id == Product.id)
        .where(Product.is_active.is_(True), Shop.status == ShopStatus.ACTIVE)
    )
    if q:
        like = f'%{q}%'
        cond = Product.name.ilike(like) | Product.description.ilike(like)
        base = base.where(cond)
        count_base = count_base.where(cond)
    if category_id is not None:
        base = base.where(Product.category_id == category_id)
        count_base = count_base.where(Product.category_id == category_id)
    base = base.order_by(Product.name).offset((page - 1) * page_size).limit(page_size)
    result = (await session.execute(base)).all()
    total = int((await session.execute(count_base)).scalar_one())
    return [(r[0], r[1], int(r[2])) for r in result], total


# ── Shopkeeper catalog management ───────────────────────────────
async def list_shop_products_managed(
    session: AsyncSession,
    shop_id: UUID,
    *,
    q: str | None = None,
    page: int,
    page_size: int,
) -> tuple[list[Product], int]:
    """List ALL products (active or not) for seller management."""
    base = (
        select(Product).options(selectinload(Product.inventory)).where(Product.shop_id == shop_id)
    )
    count_base = select(func.count()).select_from(Product).where(Product.shop_id == shop_id)
    if q:
        like = f'%{q}%'
        cond = Product.name.ilike(like) | Product.description.ilike(like)
        base = base.where(cond)
        count_base = count_base.where(cond)
    base = base.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = (await session.execute(base)).scalars().all()
    total = int((await session.execute(count_base)).scalar_one())
    return list(items), total


async def _load_owned_product(session: AsyncSession, shop_id: UUID, product_id: UUID) -> Product:
    stmt = (
        select(Product)
        .options(selectinload(Product.inventory))
        .where(Product.id == product_id, Product.shop_id == shop_id)
    )
    product = (await session.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise NotFoundError('Product not found')
    return product


async def create_shop_product(
    session: AsyncSession, shop_id: UUID, data: ShopkeeperProductCreate
) -> Product:
    product = Product(
        shop_id=shop_id,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
        price=data.price,
        unit=data.unit,
        image_url=data.image_url,
        is_active=data.is_active,
    )
    session.add(product)
    await session.flush()
    session.add(
        Inventory(
            product_id=product.id,
            quantity_available=data.quantity_available,
            low_stock_threshold=data.low_stock_threshold,
        )
    )
    await session.commit()
    # Reload with the inventory relationship populated for response mapping.
    stmt = select(Product).options(selectinload(Product.inventory)).where(Product.id == product.id)
    return (await session.execute(stmt)).scalar_one()


async def update_shop_product(
    session: AsyncSession, shop_id: UUID, product_id: UUID, data: ShopkeeperProductUpdate
) -> Product:
    product = await _load_owned_product(session, shop_id, product_id)
    values = data.model_dump(exclude_unset=True)
    for key, value in values.items():
        setattr(product, key, value)
    await session.commit()
    await session.refresh(product)
    return product


async def update_shop_inventory(
    session: AsyncSession, shop_id: UUID, product_id: UUID, data: ShopkeeperInventoryUpdate
) -> Product:
    product = await _load_owned_product(session, shop_id, product_id)
    if product.inventory is None:  # defensive — should not happen
        session.add(Inventory(product_id=product.id))
        await session.flush()
        await session.refresh(product)
    if data.quantity_available is not None:
        product.inventory.quantity_available = data.quantity_available
    if data.low_stock_threshold is not None:
        product.inventory.low_stock_threshold = data.low_stock_threshold
    await session.commit()
    await session.refresh(product)
    return product


async def delete_shop_product(session: AsyncSession, shop_id: UUID, product_id: UUID) -> None:
    product = await _load_owned_product(session, shop_id, product_id)
    # Use a bulk delete so the DB-level ON DELETE CASCADE removes inventory
    # without the ORM nulling the inventory FK first (it is NOT NULL).
    pid = product.id
    session.expire(product)
    await session.execute(delete(Product).where(Product.id == pid))
    await session.commit()


__all__ = [
    'Category',
    'Shop',
    'category_product_counts',
    'create_shop',
    'create_shop_product',
    'delete_shop_product',
    'get_product',
    'get_shop',
    'get_shopkeeper_shop',
    'list_categories',
    'list_products',
    'list_shop_products_managed',
    'list_shops',
    'search_products',
    'shopkeeper_shop_counts',
    'update_shop_inventory',
    'update_shop_product',
]
