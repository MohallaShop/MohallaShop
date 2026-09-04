"""Tests: cart (single-shop rule, ownership)."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy import select

from app.carts.models import Cart
from app.users.models import User
from tests.conftest import OTHER_SHOPKEEPER_ID, SHOPKEEPER_ID, make_token
from tests.helpers import seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_add_item_binds_shop(client, db, customer_headers) -> None:
    shop_id, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    r = await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 2},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body['shop_id'] == str(shop_id)
    assert body['items'][0]['quantity'] == 2
    assert body['items'][0]['unit_price'] == '50.00'


async def test_add_item_uses_existing_contact_user(client, db) -> None:
    shop_id, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    existing_user_id = uuid4()
    token_user_id = uuid4()
    email = 'existing-cart-customer@example.com'
    db.add(User(id=existing_user_id, email=email, phone='+919700000000'))
    await db.commit()

    headers = {
        'Authorization': f'Bearer {make_token(token_user_id, ["customer"], email=email)}'
    }
    r = await client.post(
        '/api/v1/cart/items',
        headers=headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )

    assert r.status_code == 201, r.text
    cart = (await db.execute(select(Cart).where(Cart.user_id == existing_user_id))).scalar_one()
    assert cart.shop_id == shop_id


async def test_cross_shop_rejected(client, db, customer_headers) -> None:
    _, p1 = await seed_shop_with_product(db, SHOPKEEPER_ID, product_name='A')
    _, p2 = await seed_shop_with_product(db, OTHER_SHOPKEEPER_ID, product_name='B')
    assert (
        await client.post(
            '/api/v1/cart/items',
            headers=customer_headers,
            json={'product_id': str(p1), 'quantity': 1},
        )
    ).status_code == 201
    r = await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(p2), 'quantity': 1},
    )
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'cart_cross_shop'


async def test_increment_existing_item(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )
    r = await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 2},
    )
    assert r.status_code == 201
    assert r.json()['items'][0]['quantity'] == 3


async def test_update_and_remove_item(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    added = await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )
    item_id = added.json()['items'][0]['id']
    patched = await client.patch(
        f'/api/v1/cart/items/{item_id}', headers=customer_headers, json={'quantity': 5}
    )
    assert patched.json()['items'][0]['quantity'] == 5
    deleted = await client.delete(f'/api/v1/cart/items/{item_id}', headers=customer_headers)
    assert deleted.status_code == 200
    assert deleted.json()['items'] == []
    assert deleted.json()['shop_id'] is None  # shop unbound when empty


async def test_ownership_isolation(client, db, customer_headers) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    added = await client.post(
        '/api/v1/cart/items',
        headers=customer_headers,
        json={'product_id': str(product_id), 'quantity': 1},
    )
    item_id = added.json()['items'][0]['id']

    other = {'Authorization': f'Bearer {make_token(uuid4(), ["customer"], phone="+919999990001")}'}
    # Other customer's cart is separate; their update of this item -> 404.
    r = await client.patch(f'/api/v1/cart/items/{item_id}', headers=other, json={'quantity': 9})
    assert r.status_code == 404


async def test_unauthenticated_cart_rejected(client) -> None:
    assert (await client.get('/api/v1/cart')).status_code == 401
