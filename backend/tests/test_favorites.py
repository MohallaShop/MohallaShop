"""Tests: customer favorites (saved shops)."""

from __future__ import annotations

import pytest

from tests.conftest import SHOPKEEPER_ID
from tests.helpers import seed_shop_with_product

pytestmark = pytest.mark.asyncio


async def test_list_favorites_empty(client, customer_headers) -> None:
    r = await client.get('/api/v1/favorites/shops', headers=customer_headers)
    assert r.status_code == 200
    assert r.json() == []


async def test_add_and_list_favorite(client, db, customer_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Fav Shop')
    r = await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    assert r.status_code == 201, r.text
    assert r.json()['shop_name'] == 'Fav Shop'

    listing = await client.get('/api/v1/favorites/shops', headers=customer_headers)
    assert any(f['shop_id'] == str(shop_id) for f in listing.json())


async def test_add_favorite_idempotent(client, db, customer_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID)
    assert (
        await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    ).status_code in (200, 201)
    second = await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    assert second.status_code in (200, 201)
    listing = await client.get('/api/v1/favorites/shops', headers=customer_headers)
    assert len([f for f in listing.json() if f['shop_id'] == str(shop_id)]) == 1


async def test_cannot_favorite_inactive_shop(client, db, customer_headers) -> None:
    from tests.conftest import OTHER_SHOPKEEPER_ID

    shop_id, _ = await seed_shop_with_product(
        db, OTHER_SHOPKEEPER_ID, shop_name='Closed', shop_active=False
    )
    r = await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    assert r.status_code == 404


async def test_remove_favorite(client, db, customer_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Gone Shop')
    await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    favs = (await client.get('/api/v1/favorites/shops', headers=customer_headers)).json()
    fav_id = favs[0]['id']
    r = await client.delete(f'/api/v1/favorites/{fav_id}', headers=customer_headers)
    assert r.status_code == 204
    after = (await client.get('/api/v1/favorites/shops', headers=customer_headers)).json()
    assert all(f['id'] != fav_id for f in after)


async def test_cannot_remove_other_users_favorite(client, db, customer_headers) -> None:
    from uuid import uuid4

    from tests.conftest import make_token

    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID)
    await client.post(f'/api/v1/favorites/shops/{shop_id}', headers=customer_headers)
    fav_id = (await client.get('/api/v1/favorites/shops', headers=customer_headers)).json()[0]['id']
    other = {'Authorization': f'Bearer {make_token(uuid4(), ["customer"], phone="+918800000000")}'}
    assert (await client.delete(f'/api/v1/favorites/{fav_id}', headers=other)).status_code == 404


async def test_shopkeeper_cannot_use_favorites(client, shopkeeper_headers) -> None:
    assert (
        await client.get('/api/v1/favorites/shops', headers=shopkeeper_headers)
    ).status_code == 403
