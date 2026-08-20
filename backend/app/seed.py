"""Development-only seed data for MohallaShop (Phase 1a).

Run against your local database::

    DATABASE_URL=postgresql+asyncpg://mohalla:changeme@localhost:5432/mohallashop \
        uv run python -m app.seed

Creates: categories, one shopkeeper-owned shop, a few products with inventory.
No real credentials are used — the user UUIDs are local development identities.
Authentication for these identities still goes through Supabase; in local dev you
mint JWTs with SUPABASE_JWT_SECRET for manual API testing (see tests/conftest.py).
"""

from __future__ import annotations

import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session_maker
from app.shops.models import Category, Inventory, Product, Shop, ShopStatus
from app.users.models import User, UserProfile

CUSTOMER_ID_DEV = '00000000-0000-0000-0000-0000000000a1'
SHOPKEEPER_ID_DEV = '00000000-0000-0000-0000-0000000000b2'

CATEGORIES = [
    ('Groceries', 'groceries'),
    ('Fruits & Vegetables', 'fruits-vegetables'),
    ('Dairy & Eggs', 'dairy-eggs'),
    ('Bakery', 'bakery'),
]

PRODUCTS = [
    ('Wheat Atta (Fortified)', 'groceries', Decimal('52.00'), '1 kg', 40),
    ('Basmati Rice Premium', 'groceries', Decimal('128.00'), '5 kg', 15),
    ('Fresh Tomatoes', 'fruits-vegetables', Decimal('30.00'), '500 g', 60),
    ('Cottage Cheese (Paneer)', 'dairy-eggs', Decimal('90.00'), '200 g', 12),
    ('Brown Bread', 'bakery', Decimal('45.00'), '400 g', 0),  # out of stock example
]


async def seed(session: AsyncSession) -> dict[str, str]:
    # Users (idempotent upsert).
    for uid, phone in (
        (CUSTOMER_ID_DEV, '+919000000001'),
        (SHOPKEEPER_ID_DEV, '+919000000002'),
    ):
        await session.execute(
            insert(User)
            .values(id=uid, phone=phone)
            .on_conflict_do_update(index_elements=['id'], set_={'phone': phone})
        )
    await session.execute(
        insert(UserProfile)
        .values(user_id=SHOPKEEPER_ID_DEV, display_name='Sharma Kirana')
        .on_conflict_do_nothing(index_elements=['user_id'])
    )

    # Categories.
    slug_to_id: dict[str, str] = {}
    for name, slug in CATEGORIES:
        await session.execute(
            insert(Category).values(name=name, slug=slug).on_conflict_do_nothing()
        )
        row = (await session.execute(select(Category.id).where(Category.slug == slug))).scalar_one()
        slug_to_id[slug] = str(row)

    # Shop (one per shopkeeper).
    shop_row = (
        await session.execute(select(Shop.id).where(Shop.owner_user_id == SHOPKEEPER_ID_DEV))
    ).scalar_one_or_none()
    if shop_row is None:
        shop = Shop(
            owner_user_id=SHOPKEEPER_ID_DEV,
            name='Sharma Kirana Store',
            description='Your neighbourhood daily-essentials shop.',
            phone='+919000000002',
            status=ShopStatus.ACTIVE,
            address_line1='12, Gandhi Chowk',
            address_city='Pune',
            address_state='Maharashtra',
            address_pincode='411001',
        )
        session.add(shop)
        await session.flush()
        shop_id = shop.id
    else:
        shop_id = shop_row

    # Products + inventory.
    for name, slug, price, unit, qty in PRODUCTS:
        existing = (
            await session.execute(
                select(Product.id).where(Product.shop_id == shop_id, Product.name == name)
            )
        ).scalar_one_or_none()
        if existing is None:
            product = Product(
                shop_id=shop_id,
                category_id=slug_to_id[slug],
                name=name,
                price=price,
                unit=unit,
                is_active=True,
            )
            session.add(product)
            await session.flush()
            session.add(Inventory(product_id=product.id, quantity_available=qty))

    await session.commit()
    return {'shopkeeper_user_id': SHOPKEEPER_ID_DEV, 'shop_id': str(shop_id)}


async def main() -> None:
    factory = get_session_maker()
    async with factory() as session:
        result = await seed(session)
    print('Seed complete:', result)


if __name__ == '__main__':
    asyncio.run(main())
