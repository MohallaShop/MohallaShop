"""FastAPI application factory and entrypoint.

Run in development::

    uv run uvicorn app.main:app --reload --port 8000

The app is assembled in :func:`create_app` so tests can construct an instance
with overridden dependencies.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app import __version__
from app.api.v1 import api_router
from app.api.v1.health import router as health_router
from app.core.config import Settings, get_settings
from app.core.db import dispose_engine
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter

log = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach conservative security headers to every response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = (
            'geolocation=(self), camera=(), microphone=(), payment=(self)'
        )
        response.headers['Content-Security-Policy'] = (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        )
        if request.url.scheme == 'https':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings)
    log.info('startup', app=settings.app_name, env=settings.app_env, version=__version__)
    yield
    await dispose_engine()
    log.info('shutdown', app=settings.app_name)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and return the configured :class:`FastAPI` application."""
    s = settings or get_settings()

    app = FastAPI(
        title=f'{s.app_name} API',
        version=__version__,
        description='MohallaShop backend — Phase 1 (Web MVP).',
        docs_url='/docs' if not s.is_production else None,
        redoc_url='/redoc' if not s.is_production else None,
        openapi_url='/openapi.json' if not s.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware ──────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=True,
        allow_methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allow_headers=['Accept', 'Authorization', 'Content-Type', 'X-Request-ID'],
    )
    app.add_middleware(SecurityHeadersMiddleware)

    # ── Rate limiting ───────────────────────────────────────────
    app.state.limiter = limiter
    limiter.enabled = s.rate_limit_enabled
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # ── Errors ──────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routes ──────────────────────────────────────────────────
    app.include_router(health_router, tags=['health'])  # /health
    app.include_router(api_router, prefix='/api')  # /api/v1

    return app


app = create_app()
