"""Tests: order creation (server-side pricing, atomicity, inventory, history)."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import update

from app.shops.models import Product
from tests.conftest import SHOPKEEPER_ID
from tests.helpers import get_inventory_qty, place_order, seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_create_order_success(client, db, customer_headers) -> None:

    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=10, price=Decimal('50.00'))
    order = await place_order(client, customer_headers, product_id, qty=2)

    # Server-side price & totals.
    assert order['subtotal'] == '100.00'
    assert order['delivery_fee'] == '0.00'
    assert order['total_amount'] == '100.00'
    assert order['status'] == 'pending_shop'
    assert order['items'][0]['unit_price'] == '50.00'  # snapshotted from server price
    # Inventory decremented.
    assert await get_inventory_qty(db, product_id) == 8
    # History recorded with creation event.
    kinds = [(h['from_state'], h['to_state']) for h in order['history']]
    assert (None, 'pending_shop') in kinds
    # Cart cleared for the customer.
    cart = await client.get('/api/v1/cart', headers=customer_headers)
    assert cart.json()['items'] == []
    assert cart.json()['shop_id'] is None


async def test_create_order_charges_shop_delivery_fee(client, db, customer_headers) -> None:
    # The fee is snapshotted from the shop at checkout: subtotal + fee = total.
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, delivery_fee=Decimal('20'))
    order = await place_order(client, customer_headers, product_id, qty=1)
    assert order['subtotal'] == '50.00'
    assert order['delivery_fee'] == '20.00'
    assert order['total_amount'] == '70.00'


async def test_insufficient_inventory(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=1)
    addr = await client.post(
        '/api/v1/me/addresses',
        headers=customer_headers,
        json={'line1': 'x', 'city': 'Pune', 'state': 'MH', 'pincode': '411001'},
    )
    await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 5},
    )  # cart allows it; checkout must reject
    r = await client.post(
        '/api/v1/orders', headers=customer_headers, json={'address_id': addr.json()['id']}
    )
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'insufficient_inventory'
    # Stock untouched on failure.
    assert await get_inventory_qty(db, product_id) == 1


async def test_empty_cart_rejected(client, db, customer_headers) -> None:
    addr = await client.post(
        '/api/v1/me/addresses',
        headers=customer_headers,
        json={'line1': 'x', 'city': 'Pune', 'state': 'MH', 'pincode': '411001'},
    )
    r = await client.post(
        '/api/v1/orders', headers=customer_headers, json={'address_id': addr.json()['id']}
    )
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'empty_cart'


async def test_invalid_address(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )
    r = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={'address_id': str(uuid4())},
    )
    assert r.status_code == 404


async def test_inactive_product_at_checkout(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=5)
    await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )
    # Deactivate after adding to cart.
    await db.execute(update(Product).where(Product.id == product_id).values(is_active=False))
    await db.commit()
    addr = await client.post(
        '/api/v1/me/addresses',
        headers=customer_headers,
        json={'line1': 'x', 'city': 'Pune', 'state': 'MH', 'pincode': '411001'},
    )
    r = await client.post(
        '/api/v1/orders', headers=customer_headers, json={'address_id': addr.json()['id']}
    )
    assert r.status_code == 422


async def test_customer_cancel_restocks(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=3)
    order = await place_order(client, customer_headers, product_id, qty=2)
    assert await get_inventory_qty(db, product_id) == 1
    r = await client.post(f'/api/v1/orders/{order["id"]}/cancel', headers=customer_headers)
    assert r.status_code == 200
    assert r.json()['status'] == 'cancelled'
    assert await get_inventory_qty(db, product_id) == 3  # restocked


async def test_only_own_order_visible(client, db, customer_headers) -> None:
    from tests.conftest import make_token

    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id, qty=1)
    other = {'Authorization': f'Bearer {make_token(uuid4(), ["customer"])}'}
    assert (await client.get(f'/api/v1/orders/{order["id"]}', headers=other)).status_code == 404


async def test_customer_order_history(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=20)
    await place_order(client, customer_headers, product_id, qty=1)
    await place_order(client, customer_headers, product_id, qty=1)
    r = await client.get('/api/v1/orders', headers=customer_headers)
    assert r.status_code == 200
    assert r.json()['pagination']['total'] == 2
    assert all(item['status'] == 'pending_shop' for item in r.json()['items'])
