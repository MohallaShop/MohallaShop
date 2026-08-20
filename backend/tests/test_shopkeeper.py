"""Tests: shopkeeper order handling + shop isolation."""

from __future__ import annotations

import pytest

from tests.conftest import OTHER_SHOPKEEPER_ID, SHOPKEEPER_ID
from tests.helpers import get_inventory_qty, place_order, seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_shopkeeper_shop_endpoint(client, db, shopkeeper_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='My Shop')
    r = await client.get('/api/v1/shopkeeper/shop', headers=shopkeeper_headers)
    assert r.status_code == 200
    assert r.json()['name'] == 'My Shop'


async def test_shop_without_shop_404(client, other_shopkeeper_headers) -> None:
    r = await client.get('/api/v1/shopkeeper/shop', headers=other_shopkeeper_headers)
    assert r.status_code == 404


async def test_customer_cannot_access_shopkeeper(client, customer_headers) -> None:
    assert (
        await client.get('/api/v1/shopkeeper/orders', headers=customer_headers)
    ).status_code == 403


async def test_list_own_shop_orders(client, db, customer_headers, shopkeeper_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    r = await client.get('/api/v1/shopkeeper/orders', headers=shopkeeper_headers)
    assert r.status_code == 200
    ids = [o['id'] for o in r.json()['items']]
    assert order['id'] in ids


async def test_cannot_access_other_shop_order(
    client, db, customer_headers, shopkeeper_headers, other_shopkeeper_headers
) -> None:
    # Shopkeeper A owns the shop where the order is placed.
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    # Give shopkeeper B an unrelated shop too.
    await seed_shop_with_product(db, OTHER_SHOPKEEPER_ID, shop_name='Other Shop')
    order = await place_order(client, customer_headers, product_id)

    # Owner can see it; other shopkeeper gets 404 (existence hidden).
    assert (
        await client.get(f'/api/v1/shopkeeper/orders/{order["id"]}', headers=shopkeeper_headers)
    ).status_code == 200
    assert (
        await client.get(
            f'/api/v1/shopkeeper/orders/{order["id"]}', headers=other_shopkeeper_headers
        )
    ).status_code == 404
    # And cannot transition it.
    assert (
        await client.post(
            f'/api/v1/shopkeeper/orders/{order["id"]}/accept',
            headers=other_shopkeeper_headers,
        )
    ).status_code == 404


async def test_accept_preparing_ready(client, db, customer_headers, shopkeeper_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)

    accepted = await client.post(
        f'/api/v1/shopkeeper/orders/{order["id"]}/accept', headers=shopkeeper_headers
    )
    assert accepted.status_code == 200
    assert accepted.json()['status'] == 'accepted'

    preparing = await client.post(
        f'/api/v1/shopkeeper/orders/{order["id"]}/preparing', headers=shopkeeper_headers
    )
    assert preparing.json()['status'] == 'preparing'

    ready = await client.post(
        f'/api/v1/shopkeeper/orders/{order["id"]}/ready', headers=shopkeeper_headers
    )
    assert ready.json()['status'] == 'ready_for_pickup'


async def test_illegal_transition_rejected(
    client, db, customer_headers, shopkeeper_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post(f'/api/v1/shopkeeper/orders/{order["id"]}/accept', headers=shopkeeper_headers)
    # Already accepted; cannot accept again.
    r = await client.post(
        f'/api/v1/shopkeeper/orders/{order["id"]}/accept', headers=shopkeeper_headers
    )
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'illegal_state_transition'


async def test_reject_restocks(client, db, customer_headers, shopkeeper_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=4)
    order = await place_order(client, customer_headers, product_id, qty=3)
    assert await get_inventory_qty(db, product_id) == 1
    r = await client.post(
        f'/api/v1/shopkeeper/orders/{order["id"]}/reject',
        headers=shopkeeper_headers,
        json={'reason': 'out of stock'},
    )
    assert r.status_code == 200
    assert r.json()['status'] == 'rejected'
    assert await get_inventory_qty(db, product_id) == 4  # restocked


# ── Seller catalog management ──────────────────────────────────
async def test_shopkeeper_lists_all_products_inc_inactive(client, db, shopkeeper_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, product_name='Live SKU')
    from tests.helpers import add_product

    await add_product(db, shop_id, name='Dormant SKU', active=False)
    r = await client.get('/api/v1/shopkeeper/products', headers=shopkeeper_headers)
    assert r.status_code == 200
    names = {p['name'] for p in r.json()['items']}
    assert {'Live SKU', 'Dormant SKU'} <= names


async def test_shopkeeper_creates_product_with_inventory(client, db, shopkeeper_headers) -> None:
    await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Catalog Shop')
    r = await client.post(
        '/api/v1/shopkeeper/products',
        headers=shopkeeper_headers,
        json={
            'name': 'New Bread',
            'price': '45.00',
            'unit': '400 g',
            'quantity_available': 12,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body['name'] == 'New Bread'
    assert body['quantity_available'] == 12
    assert body['is_active'] is True


async def test_customer_cannot_create_product(client, customer_headers) -> None:
    r = await client.post(
        '/api/v1/shopkeeper/products',
        headers=customer_headers,
        json={'name': 'X', 'price': '1.00', 'unit': 'pc'},
    )
    assert r.status_code == 403


async def test_shopkeeper_updates_product_and_inventory(client, db, shopkeeper_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    upd = await client.patch(
        f'/api/v1/shopkeeper/products/{product_id}',
        headers=shopkeeper_headers,
        json={'price': '99.00', 'is_active': False},
    )
    assert upd.status_code == 200
    assert upd.json()['price'] == '99.00'
    assert upd.json()['is_active'] is False

    inv = await client.patch(
        f'/api/v1/shopkeeper/products/{product_id}/inventory',
        headers=shopkeeper_headers,
        json={'quantity_available': 0},
    )
    assert inv.status_code == 200
    assert inv.json()['quantity_available'] == 0


async def test_shopkeeper_cannot_touch_other_shops_product(
    client, db, shopkeeper_headers, other_shopkeeper_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    # Other shopkeeper should not see or mutate it.
    assert (
        await client.patch(
            f'/api/v1/shopkeeper/products/{product_id}',
            headers=other_shopkeeper_headers,
            json={'price': '1.00'},
        )
    ).status_code == 404
    assert (
        await client.delete(
            f'/api/v1/shopkeeper/products/{product_id}', headers=other_shopkeeper_headers
        )
    ).status_code == 404


async def test_shopkeeper_deletes_product(client, db, shopkeeper_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    r = await client.delete(f'/api/v1/shopkeeper/products/{product_id}', headers=shopkeeper_headers)
    assert r.status_code == 204
    listing = await client.get('/api/v1/shopkeeper/products', headers=shopkeeper_headers)
    assert all(p['id'] != product_id for p in listing.json()['items'])
