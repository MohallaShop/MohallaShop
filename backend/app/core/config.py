"""Application configuration via typed environment variables.

All runtime configuration is centralized here. Settings are read from the
process environment (and, in development, from a `.env` file). No secrets are
hardcoded — only typed placeholders that fail loudly when missing.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal['development', 'staging', 'production']


def asyncpg_dsn(url: str) -> str:
    """Normalize a PostgreSQL DSN to the asyncpg driver scheme.

    Supabase publishes connection strings as ``postgresql://…`` (the psycopg2
    dialect), but this application only uses the async driver, and SQLAlchemy's
    async engine requires the ``postgresql+asyncpg://`` scheme. Idempotent for
    URLs that already carry a driver.
    """
    if url.startswith('postgresql://') or url.startswith('postgres://'):
        return 'postgresql+asyncpg://' + url.split('://', 1)[1]
    return url


class Settings(BaseSettings):
    """Strongly-typed application settings."""

    model_config = SettingsConfigDict(
        env_file=('.env', '../.env'),
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore',
    )

    # ── Environment ──────────────────────────────────────────────
    app_env: AppEnv = 'development'
    app_name: str = 'MohallaShop'
    log_level: str = 'INFO'

    # ── Backend ──────────────────────────────────────────────────
    backend_host: str = '0.0.0.0'
    backend_port: int = 8000
    backend_cors_origins_raw: str = Field(
        default='http://localhost:3000',
        alias='BACKEND_CORS_ORIGINS',
    )

    # ── Database ─────────────────────────────────────────────────
    database_url: str = 'postgresql+asyncpg://mohalla:changeme@localhost:5432/mohallashop'
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # ── Supabase ─────────────────────────────────────────────────
    supabase_url: str = ''
    supabase_anon_key: str = ''
    supabase_service_role_key: str = ''
    # HS256 projects verify with a shared JWT secret; RS256/ES256 projects
    # expose a JWKS URL instead (e.g. {SUPABASE_URL}/auth/v1/.well-known/jwks.json).
    supabase_jwt_secret: str = ''
    supabase_jwt_algorithm: str = 'HS256'
    supabase_jwks_url: str = ''
    supabase_jwt_issuer: str = ''
    supabase_jwt_audience: str = ''

    # ── Payments (Razorpay) — Phase 1b ───────────────────────────
    razorpay_key_id: str = ''
    razorpay_key_secret: str = ''
    razorpay_webhook_secret: str = ''

    # ── Riders — Phase 1b ────────────────────────────────────────
    # Flat per-delivery fee (₹), snapshotted onto each delivery at assignment.
    rider_delivery_fee: float = 25.0

    # ── Security ─────────────────────────────────────────────────
    rate_limit_enabled: bool = True

    # ── Derived ──────────────────────────────────────────────────
    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.backend_cors_origins_raw.split(',') if o.strip()]
        return origins

    @property
    def is_development(self) -> bool:
        return self.app_env == 'development'

    @property
    def razorpay_configured(self) -> bool:
        """Both API credentials present — online payments can be offered."""
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def payments_enabled(self) -> bool:
        """Online payments are live (COD always remains available)."""
        return self.razorpay_configured

    @property
    def is_production(self) -> bool:
        return self.app_env == 'production'

    @field_validator('log_level')
    @classmethod
    def _normalize_log_level(cls, v: str) -> str:
        return v.upper()

    @model_validator(mode='after')
    def _validate_production_configuration(self) -> Settings:
        """Reject development credentials and permissive origins in production."""
        if not self.is_production:
            return self

        if not self.supabase_jwt_issuer or not self.supabase_jwt_audience:
            raise ValueError(
                'SUPABASE_JWT_ISSUER and SUPABASE_JWT_AUDIENCE are required in production'
            )
        if self.supabase_jwks_url:
            if not self.supabase_url:
                raise ValueError('SUPABASE_URL is required when JWKS verification is enabled')
        elif len(self.supabase_jwt_secret) < 32:
            raise ValueError('A strong SUPABASE_JWT_SECRET is required in production')
        if not self.cors_origins or '*' in self.cors_origins:
            raise ValueError('Explicit BACKEND_CORS_ORIGINS are required in production')
        if 'changeme' in self.database_url.lower():
            raise ValueError('A non-placeholder DATABASE_URL is required in production')
        return self


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""
    return Settings()
