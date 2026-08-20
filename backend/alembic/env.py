"""Generic single-database configuration with an async driver.

MohallaShop uses SQLAlchemy 2.0 async + asyncpg. This environment file loads
the database URL from :mod:`app.core.config` (so a single source of truth for
configuration is maintained) and runs migrations inside an async engine.

Usage::

    uv run alembic upgrade head
    uv run alembic revision -m "create users table" --autogenerate
"""

from __future__ import annotations

import asyncio

# Ensure the backend package is importable when running `alembic` directly.
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.db as _db_models  # noqa: F401 - registers all ORM models
from app.core.config import asyncpg_dsn, get_settings
from app.core.db import Base

# Import every module that defines ORM models here so autogenerate sees them.
# As domains are added in later phases, their model modules are appended below.

config = context.config

# The runtime database URL (normalized to the asyncpg driver scheme). This is
# built directly from Settings and passed straight to SQLAlchemy instead of
# `set_main_option`, because configparser interpolation cannot represent
# percent-encoded characters in connection strings (e.g. Supabase pooler URLs
# containing %40).
DATABASE_URL = asyncpg_dsn(get_settings().database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # statement_cache_size=0 is required by Supabase's transaction pooler
    # (pgbouncer cannot carry prepared statements across connections).
    connectable = create_async_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
        connect_args={'statement_cache_size': 0},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
