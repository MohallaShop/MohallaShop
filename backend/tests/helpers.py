"""Test data helpers (integration)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.shops.models import Category, Inventory, Product, Shop, ShopStatus
from app.users.models import User

_used_category_slugs: set[str] = set()


async def ensure_user_row(session: AsyncSession, user_id: UUID) -> None:
    await session.execute(
        insert(User).values(id=user_id).on_conflict_do_nothing(index_elements=['id'])
    )


async def seed_shop_with_product(
    session: AsyncSession,
    owner_id: UUID,
    *,
    qty: int = 10,
    price: Decimal = Decimal('50.00'),
    shop_name: str = 'Test Shop',
    product_name: str = 'Wheat Atta',
    product_active: bool = True,
    shop_active: bool = True,
) -> tuple[UUID, UUID]:
    await ensure_user_row(session, owner_id)
    shop = Shop(
        owner_user_id=owner_id,
        name=shop_name,
        status=ShopStatus.ACTIVE if shop_active else ShopStatus.INACTIVE,
    )
    session.add(shop)
    await session.flush()

    slug = f'cat-{owner_id.hex[:6]}'
    if slug not in _used_category_slugs:
        _used_category_slugs.add(slug)
    category = (
        await session.execute(select(Category).where(Category.slug == slug))
    ).scalar_one_or_none()
    if category is None:
        category = Category(name=f'Cat {owner_id.hex[:4]}', slug=slug)
        session.add(category)
        await session.flush()

    product = Product(
        shop_id=shop.id,
        category_id=category.id,
        name=product_name,
        price=price,
        unit='1 kg',
        is_active=product_active,
    )
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity_available=qty))
    await session.commit()
    return shop.id, product.id


async def get_inventory_qty(session: AsyncSession, product_id: UUID) -> int:
    from app.shops.models import Inventory

    row = (
        await session.execute(
            select(Inventory.quantity_available).where(Inventory.product_id == product_id)
        )
    ).scalar_one()
    return int(row)


async def add_product(
    session: AsyncSession,
    shop_id: UUID,
    *,
    name: str = 'Extra Item',
    price: Decimal = Decimal('20.00'),
    qty: int = 5,
    active: bool = True,
) -> UUID:
    product = Product(shop_id=shop_id, name=name, price=price, unit='1 pc', is_active=active)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity_available=qty))
    await session.commit()
    return product.id


async def place_order(
    client,  # type: ignore[no-untyped-def]
    headers: dict[str, str],
    product_id: UUID,
    *,
    qty: int = 1,
) -> dict:
    """Drive the full customer checkout flow; return the created order detail."""
    addr = await client.post(
        '/api/v1/me/addresses',
        headers=headers,
        json={'line1': '1 Main St', 'city': 'Pune', 'state': 'MH', 'pincode': '411001'},
    )
    assert addr.status_code == 201, addr.text
    add = await client.post(
        '/api/v1/cart/items',
        headers=headers,
        json={'product_id': str(product_id), 'quantity': qty},
    )
    assert add.status_code == 201, add.text
    order = await client.post(
        '/api/v1/orders', headers=headers, json={'address_id': addr.json()['id']}
    )
    assert order.status_code == 201, order.text
    return order.json()
