"""Tests: read-only admin oversight + RBAC isolation."""

from __future__ import annotations

import pytest

from tests.conftest import SHOPKEEPER_ID
from tests.helpers import seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_customer_cannot_access_admin(client, customer_headers) -> None:
    assert (
        await client.get('/api/v1/admin/dashboard', headers=customer_headers)
    ).status_code == 403


async def test_shopkeeper_cannot_access_admin(client, shopkeeper_headers) -> None:
    assert (
        await client.get('/api/v1/admin/dashboard', headers=shopkeeper_headers)
    ).status_code == 403


async def test_admin_dashboard_aggregates(client, db, admin_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    r = await client.get('/api/v1/admin/dashboard', headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['users'] >= 1
    assert body['shops_active'] >= 1
    assert body['products'] >= 1
    assert isinstance(body['orders_by_status'], dict)


async def test_admin_lists_shops_with_counts(client, db, admin_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Admin Visible')
    r = await client.get('/api/v1/admin/shops', headers=admin_headers)
    assert r.status_code == 200
    names = [s['name'] for s in r.json()['items']]
    assert 'Admin Visible' in names
    assert all('product_count' in s for s in r.json()['items'])


async def test_admin_lists_products_with_stock(client, db, admin_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, product_name='Admin SKU', qty=7)
    r = await client.get('/api/v1/admin/products', headers=admin_headers)
    assert r.status_code == 200
    names = [p['name'] for p in r.json()['items']]
    assert 'Admin SKU' in names
    sample = next(p for p in r.json()['items'] if p['name'] == 'Admin SKU')
    assert sample['quantity_available'] == 7


async def test_admin_lists_users(client, db, admin_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID)
    r = await client.get('/api/v1/admin/users', headers=admin_headers)
    assert r.status_code == 200
    assert r.json()['pagination']['total'] >= 1
