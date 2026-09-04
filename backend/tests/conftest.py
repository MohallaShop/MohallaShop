"""Shared pytest fixtures.

Integration tests run against a real PostgreSQL instance provided by `pgserver`
(bundled PG). The schema is created via the real Alembic migration
(`alembic upgrade head`), so the migration itself is exercised by the suite.
Tables are truncated between tests for isolation.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import tempfile
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, urlunparse
from uuid import UUID

import asyncpg
import jwt
import pgserver
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.main import create_app

# ── Fixed dev identities used across tests ─────────────────────
CUSTOMER_ID = UUID('00000000-0000-0000-0000-000000000001')
SHOPKEEPER_ID = UUID('00000000-0000-0000-0000-000000000002')
OTHER_SHOPKEEPER_ID = UUID('00000000-0000-0000-0000-000000000003')
ADMIN_ID = UUID('00000000-0000-0000-0000-000000000004')
RIDER_ID = UUID('00000000-0000-0000-0000-000000000005')
RIDER2_ID = UUID('00000000-0000-0000-0000-000000000006')

DEV_SECRET = 'mohallashop-development-test-jwt-secret-do-not-use-in-production'
DBNAME = 'mohalla_pytest'
BACKEND_DIR = Path(__file__).resolve().parent.parent

_TABLES = [
    'deliveries',
    'riders',
    'favorite_shops',
    'order_state_history',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'inventory',
    'products',
    'shops',
    'categories',
    'addresses',
    'user_profiles',
    'users',
]


# ── Settings helpers (kept compatible with Phase 0 tests) ──────
def make_test_settings(database_url: str = 'postgresql+asyncpg://x') -> Settings:
    return Settings(
        app_env='development',
        log_level='WARNING',
        backend_cors_origins_raw='http://localhost:3000',
        database_url=database_url,
        supabase_jwt_secret=DEV_SECRET,
        supabase_jwt_algorithm='HS256',
        # Pinned so a local backend/.env with real credentials cannot leak
        # into tests (pydantic-settings merges .env values for unset fields).
        supabase_jwks_url='',
        supabase_url='',
        supabase_service_role_key='',
        razorpay_key_id='',
        razorpay_key_secret='',
        razorpay_webhook_secret='',
        rider_delivery_fee=25.0,
        rate_limit_enabled=False,
    )


@pytest.fixture
def settings() -> Settings:
    return make_test_settings()


@pytest.fixture
def jwt_secret() -> str:
    return DEV_SECRET


# ── Token minting ──────────────────────────────────────────────
def make_token(
    user_id: UUID,
    roles: list[str],
    *,
    secret: str = DEV_SECRET,
    email: str | None = None,
    phone: str | None = None,
) -> str:
    now = datetime.now(UTC)
    if phone is None:
        # Derive a unique number per user so `users.phone`'s partial unique
        # index is never violated when several identities share a test token.
        phone = f'+91{user_id.hex[-10:]}'
    payload = {
        'sub': str(user_id),
        'phone': phone,
        'email': email or f'{user_id.hex}@example.com',
        'exp': now + timedelta(hours=1),
        'iat': now,
        'iss': 'supabase',
        'app_metadata': {'roles': roles},
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def auth_headers(user_id: UUID, roles: list[str]) -> dict[str, str]:
    return {'Authorization': f'Bearer {make_token(user_id, roles)}'}


# ── Real PostgreSQL (session) ──────────────────────────────────
async def _recreate_db(admin_uri: str) -> str:
    conn = await asyncpg.connect(admin_uri)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS {DBNAME}')
        await conn.execute(f'CREATE DATABASE {DBNAME}')
    finally:
        await conn.close()
    parsed = urlparse(admin_uri)
    db_uri = urlunparse(parsed._replace(path=f'/{DBNAME}'))
    return db_uri.replace('postgresql://', 'postgresql+asyncpg://', 1)


@pytest.fixture(scope='session')
def db_url() -> str:
    pgdata = tempfile.mkdtemp(prefix='mohalla_pg_')
    srv = pgserver.get_server(pgdata, cleanup_mode='delete')
    admin_uri = srv.get_uri('postgres')
    url = asyncio.run(_recreate_db(admin_uri))

    env = os.environ.copy()
    env['DATABASE_URL'] = url
    result = subprocess.run(
        ['uv', 'run', 'alembic', 'upgrade', 'head'],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        pytest.exit('alembic upgrade head failed', returncode=1)
    return url


@pytest.fixture(scope='session')
def engine(db_url: str):
    # NullPool: asyncpg connections are bound to their event loop. Since each
    # test gets its own loop, connections must not be pooled/reused across them.
    eng = create_async_engine(db_url, poolclass=NullPool, future=True)
    yield eng
    asyncio.run(eng.dispose())


@pytest.fixture(scope='session')
def session_factory(engine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
    )


def _override_get_db_factory(factory: async_sessionmaker[AsyncSession]):
    async def _override() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    return _override


@pytest_asyncio.fixture(autouse=True)
async def _reset_db(session_factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[None]:
    yield
    async with session_factory() as session:
        await session.execute(text(f'TRUNCATE TABLE {", ".join(_TABLES)} RESTART IDENTITY CASCADE'))
        await session.commit()


@pytest_asyncio.fixture
async def client(
    settings: Settings, session_factory: async_sessionmaker[AsyncSession]
) -> AsyncIterator[AsyncClient]:
    app = create_app(settings=settings)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_db] = _override_get_db_factory(session_factory)
    get_settings.cache_clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as ac:
        yield ac
    app.dependency_overrides.clear()
    get_settings.cache_clear()


# ── Headers fixtures ───────────────────────────────────────────
@pytest.fixture
def customer_headers() -> dict[str, str]:
    return auth_headers(CUSTOMER_ID, ['customer'])


@pytest.fixture
def shopkeeper_headers() -> dict[str, str]:
    return auth_headers(SHOPKEEPER_ID, ['shopkeeper'])


@pytest.fixture
def other_shopkeeper_headers() -> dict[str, str]:
    return auth_headers(OTHER_SHOPKEEPER_ID, ['shopkeeper'])


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return auth_headers(ADMIN_ID, ['admin'])


@pytest.fixture
def super_admin_headers() -> dict[str, str]:
    return auth_headers(ADMIN_ID, ['admin', 'super_admin'])


@pytest.fixture
def rider_headers() -> dict[str, str]:
    return auth_headers(RIDER_ID, ['rider'])


@pytest.fixture
def rider2_headers() -> dict[str, str]:
    return auth_headers(RIDER2_ID, ['rider'])


# ── Direct DB helpers ──────────────────────────────────────────
@pytest_asyncio.fixture
async def db(session_factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncSession]:
    """A short-lived session for direct seeding/inspection inside a test."""
    async with session_factory() as session:
        yield session
