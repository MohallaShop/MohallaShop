"""Async database engine, session factory, and declarative base.

The engine is created lazily from :class:`Settings` so that tests can override
it. ``get_db`` is the canonical FastAPI dependency for obtaining a session.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import Settings, asyncpg_dsn, get_settings

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_engine(settings: Settings | None = None) -> AsyncEngine:
    """Return the singleton async engine, creating it on first use."""
    global _engine
    if _engine is None:
        s = settings or get_settings()
        _engine = create_async_engine(
            asyncpg_dsn(s.database_url),
            # statement_cache_size=0 disables asyncpg's prepared-statement cache,
            # which is required when connecting through Supabase's transaction
            # pooler (pgbouncer in transaction mode cannot carry prepared
            # statements across pooled connections).
            connect_args={'statement_cache_size': 0},
            pool_size=s.db_pool_size,
            max_overflow=s.db_max_overflow,
            echo=s.db_echo,
            future=True,
        )
    return _engine


def get_session_maker(settings: Settings | None = None) -> async_sessionmaker[AsyncSession]:
    """Return the cached session factory."""
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            bind=get_engine(settings),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yield a session and roll back on error."""
    factory = get_session_maker()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Dispose the engine (called on application shutdown)."""
    global _engine, _session_maker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_maker = None
