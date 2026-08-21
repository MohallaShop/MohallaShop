"""Tests: read-only admin oversight + RBAC isolation."""

from __future__ import annotations

import pytest

from tests.conftest import SHOPKEEPER_ID
from tests.helpers import place_order, seed_shop_with_product

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


async def test_admin_approves_pending_shop(
    client, db, admin_headers, shopkeeper_headers
) -> None:
    # Register via the API so the shop starts pending.
    reg = await client.post(
        '/api/v1/shopkeeper/shop',
        headers=shopkeeper_headers,
        json={'name': 'Awaiting Approval', 'address_line1': '5 Lane', 'city': 'Pune'},
    )
    assert reg.status_code == 201, reg.text
    shop_id = reg.json()['id']

    # Hidden before approval.
    assert 'Awaiting Approval' not in [
        s['name'] for s in (await client.get('/api/v1/shops')).json()['items']
    ]

    approved = await client.patch(
        f'/api/v1/admin/shops/{shop_id}/status', headers=admin_headers, json={'status': 'active'}
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()['status'] == 'active'

    # Visible after approval.
    assert 'Awaiting Approval' in [
        s['name'] for s in (await client.get('/api/v1/shops')).json()['items']
    ]


async def test_admin_suspends_and_restores_shop(client, db, admin_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID, shop_name='Suspend Me')
    suspended = await client.patch(
        f'/api/v1/admin/shops/{shop_id}/status',
        headers=admin_headers,
        json={'status': 'suspended'},
    )
    assert suspended.status_code == 200
    assert suspended.json()['status'] == 'suspended'
    assert 'Suspend Me' not in [
        s['name'] for s in (await client.get('/api/v1/shops')).json()['items']
    ]

    restored = await client.patch(
        f'/api/v1/admin/shops/{shop_id}/status', headers=admin_headers, json={'status': 'active'}
    )
    assert restored.status_code == 200
    assert restored.json()['status'] == 'active'


async def test_admin_illegal_shop_transition_rejected(
    client, db, admin_headers, shopkeeper_headers
) -> None:
    # pending → suspended is not allowed (approve or leave pending instead).
    reg = await client.post(
        '/api/v1/shopkeeper/shop',
        headers=shopkeeper_headers,
        json={'name': 'Still Pending', 'address_line1': '9 Lane', 'city': 'Pune'},
    )
    shop_id = reg.json()['id']
    r = await client.patch(
        f'/api/v1/admin/shops/{shop_id}/status',
        headers=admin_headers,
        json={'status': 'suspended'},
    )
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'illegal_state_transition'


async def test_non_admin_cannot_change_shop_status(client, db, shopkeeper_headers) -> None:
    shop_id, _ = await seed_shop_with_product(db, SHOPKEEPER_ID)
    r = await client.patch(
        f'/api/v1/admin/shops/{shop_id}/status',
        headers=shopkeeper_headers,
        json={'status': 'suspended'},
    )
    assert r.status_code == 403


# ── User roles (Supabase Auth Admin API, monkeypatched) ────────
async def test_user_detail_unconfigured_supabase(client, admin_headers) -> None:
    r = await client.get(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}', headers=admin_headers
    )
    assert r.status_code == 503
    assert r.json()['error']['code'] == 'supabase_admin_unconfigured'


async def test_update_user_roles_merges_metadata(
    client, monkeypatch, admin_headers
) -> None:
    calls: dict[str, object] = {}

    async def fake_get(settings, user_id):
        return {
            'id': str(user_id),
            'email': 'rider@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': {'roles': ['customer'], 'invited_by': 'seed'},
        }

    async def fake_update(settings, user_id, app_metadata):
        calls['update'] = app_metadata
        return {
            'id': str(user_id),
            'email': 'rider@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': app_metadata,
        }

    async def fake_sign_out(settings, user_id):
        calls['signed_out'] = str(user_id)

    monkeypatch.setattr('app.core.supabase_admin.get_user', fake_get)
    monkeypatch.setattr('app.core.supabase_admin.update_app_metadata', fake_update)
    monkeypatch.setattr('app.core.supabase_admin.sign_out', fake_sign_out)

    r = await client.put(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}/roles',
        headers=admin_headers,
        json={'roles': ['rider', 'customer', 'rider']},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Deduped, order preserved; unrelated metadata keys untouched.
    assert body['roles'] == ['rider', 'customer']
    assert body['email_confirmed'] is True
    assert calls['update'] == {'invited_by': 'seed', 'roles': ['rider', 'customer']}
    # Force sign-out so the next token carries the new claims.
    assert calls['signed_out'] == str(SHOPKEEPER_ID)


async def test_update_user_roles_rejects_unknown_role(client, admin_headers) -> None:
    r = await client.put(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}/roles',
        headers=admin_headers,
        json={'roles': ['wizard']},
    )
    assert r.status_code == 422


async def test_admin_cannot_grant_super_admin(client, monkeypatch, admin_headers) -> None:
    async def fake_get(settings, user_id):
        return {
            'id': str(user_id),
            'email': 'customer@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': {'roles': ['customer']},
        }

    async def fake_update(settings, user_id, app_metadata):
        raise AssertionError('update must not be called for an illegal grant')

    async def fake_sign_out(settings, user_id):
        raise AssertionError('sign_out must not be called for an illegal grant')

    monkeypatch.setattr('app.core.supabase_admin.get_user', fake_get)
    monkeypatch.setattr('app.core.supabase_admin.update_app_metadata', fake_update)
    monkeypatch.setattr('app.core.supabase_admin.sign_out', fake_sign_out)

    r = await client.put(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}/roles',
        headers=admin_headers,
        json={'roles': ['super_admin']},
    )
    assert r.status_code == 403
    assert r.json()['error']['code'] == 'forbidden'


async def test_admin_cannot_demote_super_admin(client, monkeypatch, admin_headers) -> None:
    async def fake_get(settings, user_id):
        return {
            'id': str(user_id),
            'email': 'boss@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': {'roles': ['super_admin']},
        }

    async def fake_update(settings, user_id, app_metadata):
        raise AssertionError('update must not be called for an illegal demotion')

    async def fake_sign_out(settings, user_id):
        raise AssertionError('sign_out must not be called for an illegal demotion')

    monkeypatch.setattr('app.core.supabase_admin.get_user', fake_get)
    monkeypatch.setattr('app.core.supabase_admin.update_app_metadata', fake_update)
    monkeypatch.setattr('app.core.supabase_admin.sign_out', fake_sign_out)

    r = await client.put(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}/roles',
        headers=admin_headers,
        json={'roles': ['customer']},
    )
    assert r.status_code == 403


async def test_super_admin_can_grant_super_admin(
    client, monkeypatch, super_admin_headers
) -> None:
    calls: dict[str, object] = {}

    async def fake_get(settings, user_id):
        return {
            'id': str(user_id),
            'email': 'customer@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': {'roles': ['customer']},
        }

    async def fake_update(settings, user_id, app_metadata):
        calls['update'] = app_metadata
        return {
            'id': str(user_id),
            'email': 'customer@example.com',
            'phone': None,
            'email_confirmed_at': '2026-08-01T00:00:00Z',
            'app_metadata': app_metadata,
        }

    async def fake_sign_out(settings, user_id):
        calls['signed_out'] = str(user_id)

    monkeypatch.setattr('app.core.supabase_admin.get_user', fake_get)
    monkeypatch.setattr('app.core.supabase_admin.update_app_metadata', fake_update)
    monkeypatch.setattr('app.core.supabase_admin.sign_out', fake_sign_out)

    r = await client.put(
        f'/api/v1/admin/users/{SHOPKEEPER_ID}/roles',
        headers=super_admin_headers,
        json={'roles': ['super_admin']},
    )
    assert r.status_code == 200, r.text
    assert r.json()['roles'] == ['super_admin']


# ── Analytics + settings ───────────────────────────────────────
async def test_analytics_window_and_top_shops(
    client, db, admin_headers, customer_headers, shopkeeper_headers
) -> None:
    shop_id, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    await place_order(client, customer_headers, product_id)

    r = await client.get('/api/v1/admin/analytics', headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    # 14 zero-filled days, oldest first.
    assert len(body['orders_per_day']) == 14
    today = body['orders_per_day'][-1]
    assert today['orders'] == 1
    assert today['revenue'] == '50.00'
    assert body['top_shops'][0]['shop_id'] == str(shop_id)
    assert body['top_shops'][0]['orders'] == 1


async def test_admin_settings_flags(client, admin_headers) -> None:
    r = await client.get('/api/v1/admin/settings', headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body['payments_enabled'] is False
    assert body['razorpay_configured'] is False
    assert body['supabase_admin_configured'] is False
