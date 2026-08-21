"""Exception handlers that produce a consistent error envelope.

Shape::

    {
      "error": {
        "code": "not_found",
        "message": "Shop not found",
        "details": { ... }
      }
    }

Raw database or framework exceptions are never leaked: the catch-all handler
logs the real error and returns a generic 500.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError
from app.core.logging import get_logger

log = get_logger(__name__)


def _envelope(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {'error': {'code': code, 'message': message, 'details': details or {}}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_exception(_: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            log.error('application_error', error=str(exc), code=exc.code)
        else:
            log.info('client_error', code=exc.code, status=exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exception(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Literal 422: newer Starlette deprecates HTTP_422_UNPROCESSABLE_ENTITY.
        return JSONResponse(
            status_code=422,
            content=_envelope(
                'validation_failed', 'Request validation failed', jsonable_encoder(exc.errors())
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled_exception(_: Request, exc: Exception) -> JSONResponse:
        # Never leak internals. Log the real traceback server-side.
        log.exception('unhandled_exception', error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope('internal_error', 'An unexpected error occurred'),
        )
