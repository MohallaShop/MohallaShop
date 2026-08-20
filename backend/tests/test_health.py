"""Tests for the health endpoints."""

from __future__ import annotations


async def test_health_live(client) -> None:
    r = await client.get('/health')
    assert r.status_code == 200
    body = r.json()
    assert body['status'] == 'ok'
    assert 'version' in body


async def test_health_v1_live(client) -> None:
    r = await client.get('/api/v1/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'
