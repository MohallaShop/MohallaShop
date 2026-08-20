"""Health & readiness probes.

* ``GET /health``        — liveness (process up). No DB dependency.
* ``GET /health/ready``  — readiness (can serve traffic). Checks DB connectivity.

The health router is mounted twice: once under ``/api/v1`` and once at the root
``/health`` so infrastructure probes do not need to know the API version.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.logging import get_logger

log = get_logger(__name__)
router = APIRouter()


@router.get('/health')
async def health(settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    """Liveness probe — always 200 while the process is alive."""
    return {
        'status': 'ok',
        'app': settings.app_name,
        'env': settings.app_env,
        'version': __version__,
    }


@router.get('/health/ready')
async def readiness(
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    """Readiness probe — verifies the database is reachable."""
    payload: dict[str, Any] = {
        'status': 'ok',
        'app': settings.app_name,
        'version': __version__,
        'checks': {'db': 'ok'},
    }
    http_status = status.HTTP_200_OK
    try:
        result = await db.execute(text('SELECT 1'))
        result.scalar_one()
    except Exception as exc:
        log.warning('readiness_db_failed', error=str(exc))
        payload['status'] = 'degraded'
        payload['checks']['db'] = 'error'
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=payload)
