"""Rider flow integration tests: assignment, lifecycle, earnings, RBAC."""

from __future__ import annotations

from uuid import UUID

from tests.conftest import RIDER2_ID, RIDER_ID, SHOPKEEPER_ID
from tests.helpers import place_order, seed_shop_with_product

FEE = '25.00'


_READY_STEPS = {'accept': 'accepted', 'preparing': 'preparing', 'ready': 'ready_for_pickup'}


async def make_order_ready(client, shopkeeper_headers: dict, order_id: str) -> None:
    """Drive an order through accept → preparing → ready."""
    for step, expected in _READY_STEPS.items():
        r = await client.post(
            f'/api/v1/shopkeeper/orders/{order_id}/{step}', headers=shopkeeper_headers
        )
        assert r.status_code == 200, r.text
        assert r.json()['status'] == expected


async def first_delivery(client, rider_headers: dict) -> dict:
    r = await client.get('/api/v1/rider/deliveries', headers=rider_headers)
    assert r.status_code == 200, r.text
    return r.json()['items'][0]


# ── RBAC ───────────────────────────────────────────────────────
async def test_customer_cannot_use_rider_endpoints(client, customer_headers) -> None:
    for path in ('/api/v1/rider/dashboard', '/api/v1/rider/earnings'):
        assert (await client.get(path, headers=customer_headers)).status_code == 403
    r = await client.post('/api/v1/rider/online', headers=customer_headers)
    assert r.status_code == 403


# ── Assignment ─────────────────────────────────────────────────
async def test_ready_auto_assigns_online_rider(
    client, db, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)

    assert (await client.post('/api/v1/rider/online', headers=rider_headers)).status_code == 200
    await make_order_ready(client, shopkeeper_headers, order['id'])

    items = (await client.get('/api/v1/rider/deliveries', headers=rider_headers)).json()['items']
    assert len(items) == 1
    d = items[0]
    assert d['status'] == 'assigned'
    assert d['order_id'] == order['id']
    assert d['rider_fee'] == FEE
    assert d['shop_name'] == 'Test Shop'
    assert d['drop_line1'] == '1 Main St'
    assert d['contact_name']  # snapshot carried over

    dash = (await client.get('/api/v1/rider/dashboard', headers=rider_headers)).json()
    assert dash['is_online'] is True
    assert dash['active_count'] == 1
    assert dash['completed_today'] == 0


async def test_go_online_catches_up_waiting_orders(
    client, db, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    """Orders readied while nobody was online are assigned on go-online."""
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await make_order_ready(client, shopkeeper_headers, order['id'])

    state = (await client.post('/api/v1/rider/online', headers=rider_headers)).json()
    assert state['is_online'] is True
    assert state['active_deliveries'] == 1

    d = await first_delivery(client, rider_headers)
    assert d['order_id'] == order['id']


async def test_waited_order_stays_unassigned_without_riders(
    client, db, customer_headers, shopkeeper_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await make_order_ready(client, shopkeeper_headers, order['id'])
    # No rider exists yet; ready() must still succeed and leave the order ready.
    detail = await client.get(f"/api/v1/orders/{order['id']}", headers=customer_headers)
    assert detail.json()['status'] == 'ready_for_pickup'


async def test_least_loaded_rider_is_chosen(
    client, db, customer_headers, shopkeeper_headers, rider_headers, rider2_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID, qty=10)
    assert (await client.post('/api/v1/rider/online', headers=rider_headers)).status_code == 200
    assert (await client.post('/api/v1/rider/online', headers=rider2_headers)).status_code == 200

    order1 = await place_order(client, customer_headers, product_id, qty=2)
    await make_order_ready(client, shopkeeper_headers, order1['id'])
    order2 = await place_order(client, customer_headers, product_id, qty=2)
    await make_order_ready(client, shopkeeper_headers, order2['id'])

    # First order → rider 1 (both idle; lower user_id wins the tie-break).
    # Second order → rider 2 (rider 1 now carries one active delivery).
    d1 = await first_delivery(client, rider_headers)
    d2 = await first_delivery(client, rider2_headers)
    assert d1['order_id'] == order1['id']
    assert d2['order_id'] == order2['id']


# ── Lifecycle ──────────────────────────────────────────────────
async def test_pick_and_complete_lifecycle(
    client, db, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])
    delivery = await first_delivery(client, rider_headers)

    picked = await client.post(f"/api/v1/rider/deliveries/{delivery['id']}/pick",
                               headers=rider_headers)
    assert picked.status_code == 200, picked.text
    assert picked.json()['status'] == 'picked_up'
    assert (await client.get(f"/api/v1/orders/{order['id']}", headers=customer_headers)).json()[
        'status'
    ] == 'out_for_delivery'

    done = await client.post(f"/api/v1/rider/deliveries/{delivery['id']}/complete",
                             headers=rider_headers)
    assert done.status_code == 200, done.text
    assert done.json()['status'] == 'delivered'
    assert (await client.get(f"/api/v1/orders/{order['id']}", headers=customer_headers)).json()[
        'status'
    ] == 'delivered'

    dash = (await client.get('/api/v1/rider/dashboard', headers=rider_headers)).json()
    assert dash['active_count'] == 0
    assert dash['completed_today'] == 1
    assert dash['earned_today'] == FEE

    earn = (await client.get('/api/v1/rider/earnings', headers=rider_headers)).json()
    assert earn['lifetime_deliveries'] == 1
    assert earn['lifetime_fees'] == FEE
    assert earn['today_fees'] == FEE
    assert len(earn['per_day']) == 7
    assert earn['per_day'][-1]['deliveries'] == 1


async def test_complete_before_pick_rejected(
    client, db, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])
    delivery = await first_delivery(client, rider_headers)

    r = await client.post(f"/api/v1/rider/deliveries/{delivery['id']}/complete",
                          headers=rider_headers)
    assert r.status_code == 409
    assert r.json()['error']['code'] == 'illegal_state_transition'


async def test_fail_returns_order_and_reassigns(
    client, db, customer_headers, shopkeeper_headers, rider_headers, rider2_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await client.post('/api/v1/rider/online', headers=rider2_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])
    delivery = await first_delivery(client, rider_headers)

    r = await client.post(
        f"/api/v1/rider/deliveries/{delivery['id']}/fail",
        headers=rider_headers,
        json={'reason': 'customer unavailable'},
    )
    assert r.status_code == 200, r.text
    assert r.json()['status'] == 'failed'
    assert r.json()['notes'] == 'customer unavailable'

    # Order bounces back to ready_for_pickup and is handed to the other rider.
    assert (await client.get(f"/api/v1/orders/{order['id']}", headers=customer_headers)).json()[
        'status'
    ] == 'ready_for_pickup'
    reassigned = await first_delivery(client, rider2_headers)
    assert reassigned['order_id'] == order['id']
    assert reassigned['status'] == 'assigned'
    assert 'reassigned' in reassigned['notes']

    # The failing rider keeps the failed attempt in their history.
    failed = (await client.get('/api/v1/rider/deliveries?status=failed', headers=rider_headers))
    assert failed.json()['pagination']['total'] == 1


async def test_rider_cannot_touch_foreign_delivery(
    client, db, customer_headers, shopkeeper_headers, rider_headers, rider2_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])
    delivery = await first_delivery(client, rider_headers)

    r = await client.post(f"/api/v1/rider/deliveries/{delivery['id']}/pick",
                          headers=rider2_headers)
    assert r.status_code == 404


async def test_offline_rider_not_assigned(
    client, db, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await client.post('/api/v1/rider/offline', headers=rider_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])

    state = (await client.get('/api/v1/rider/dashboard', headers=rider_headers)).json()
    assert state['is_online'] is False
    assert state['active_count'] == 0


# ── Earnings ───────────────────────────────────────────────────
async def test_earnings_zero_filled_for_new_rider(client, db, rider_headers) -> None:
    r = await client.get('/api/v1/rider/earnings', headers=rider_headers)
    assert r.status_code == 200
    body = r.json()
    assert body['lifetime_deliveries'] == 0
    assert body['lifetime_fees'] == '0.00'
    assert len(body['per_day']) == 7
    assert all(day['deliveries'] == 0 for day in body['per_day'])


# ── Admin oversight ────────────────────────────────────────────
async def test_admin_riders_listing(
    client, db, admin_headers, customer_headers, shopkeeper_headers, rider_headers
) -> None:
    _, product_id = await seed_shop_with_product(db, SHOPKEEPER_ID)
    order = await place_order(client, customer_headers, product_id)
    await client.post('/api/v1/rider/online', headers=rider_headers)
    await make_order_ready(client, shopkeeper_headers, order['id'])

    r = await client.get('/api/v1/admin/riders', headers=admin_headers)
    assert r.status_code == 200, r.text
    items = r.json()['items']
    assert len(items) == 1
    row = items[0]
    assert row['user_id'] == str(RIDER_ID)
    assert row['is_online'] is True
    assert row['active_deliveries'] == 1
    assert row['completed_deliveries'] == 0


async def test_admin_riders_forbidden_for_customer(client, customer_headers) -> None:
    assert (
        await client.get('/api/v1/admin/riders', headers=customer_headers)
    ).status_code == 403


def test_rider_fixture_ids_are_distinct() -> None:
    assert RIDER_ID != RIDER2_ID
    assert isinstance(RIDER_ID, UUID)
