"""Tests: shop & product discovery (customer)."""

from __future__ import annotations

import pytest

from tests.conftest import OTHER_SHOPKEEPER_ID, SHOPKEEPER_ID
from tests.helpers import add_product, seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_unauthenticated_rejected(client) -> None:
    assert (await client.get('/api/v1/shops')).status_code == 401


async def test_customer_can_list_shops(client, db, customer_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Alpha Store')
    r = await client.get('/api/v1/shops', headers=customer_headers)
    assert r.status_code == 200
    body = r.json()
    names = [s['name'] for s in body['items']]
    assert 'Alpha Store' in names
    assert body['pagination']['total'] >= 1


async def test_inactive_shops_hidden(client, db, customer_headers) -> None:
    active_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Visible')
    inactive_id, _ = await seed_shop_with_product(
        db, OTHER_SHOPKEEPER_ID, shop_name='Hidden', shop_active=False
    )
    r = await client.get('/api/v1/shops', headers=customer_headers)
    names = {s['name'] for s in r.json()['items']}
    assert 'Visible' in names
    assert 'Hidden' not in names
    # Detail of inactive shop is 404.
    assert (
        await client.get(f'/api/v1/shops/{inactive_id}', headers=customer_headers)
    ).status_code == 404
    assert (
        await client.get(f'/api/v1/shops/{active_id}', headers=customer_headers)
    ).status_code == 200


async def test_product_listing_excludes_inactive(client, db, customer_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, product_name='Active SKU')
    await add_product(db, shop_id, name='Inactive SKU', active=False)
    r = await client.get(f'/api/v1/shops/{shop_id}/products', headers=customer_headers)
    assert r.status_code == 200
    names = {p['name'] for p in r.json()['items']}
    assert 'Active SKU' in names
    assert 'Inactive SKU' not in names


async def test_product_detail_and_money_format(client, db, customer_headers) -> None:
    from decimal import Decimal

    _, product_id = await seed_shop_with_product(
        db, SHOPKEEPER_ID, price=Decimal('52.00'), product_name='Atta'
    )
    r = await client.get(f'/api/v1/products/{product_id}', headers=customer_headers)
    assert r.status_code == 200
    body = r.json()
    assert body['price'] == '52.00'  # money serialized as 2-decimal string
    assert body['in_stock'] is True


async def test_product_wrong_or_missing(client, db, customer_headers) -> None:
    import uuid

    assert (
        await client.get(f'/api/v1/products/{uuid.uuid4()}', headers=customer_headers)
    ).status_code == 404


async def test_list_categories(client, db, customer_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID)
    r = await client.get('/api/v1/categories', headers=customer_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1
    assert {'id', 'name', 'slug', 'sort_order'} <= set(body[0].keys())


async def test_category_summary_counts_in_stock_only(client, db, customer_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    r = await client.get('/api/v1/categories/summary', headers=customer_headers)
    assert r.status_code == 200
    body = r.json()
    assert any(c['product_count'] >= 1 for c in body)


async def test_global_product_search(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(
        db, SHOPKEEPER_ID, product_name='Organic Wheat Atta', qty=4
    )
    r = await client.get('/api/v1/products', params={'q': 'wheat'}, headers=customer_headers)
    assert r.status_code == 200
    items = r.json()['items']
    assert any(p['id'] == str(product_id) for p in items)
    sample = items[0]
    assert {'shop_name', 'in_stock', 'price'} <= set(sample.keys())


async def test_global_search_excludes_inactive(client, db, customer_headers) -> None:
    from sqlalchemy import update as sql_update

    from app.shops.models import Product

    _, product_id = await seed_shop_with_product(
        db, SHOPKEEPER_ID, product_name='Hidden Flour', qty=4
    )
    await db.execute(sql_update(Product).where(Product.id == product_id).values(is_active=False))
    await db.commit()
    r = await client.get('/api/v1/products', params={'q': 'flour'}, headers=customer_headers)
    assert all(p['id'] != str(product_id) for p in r.json()['items'])
