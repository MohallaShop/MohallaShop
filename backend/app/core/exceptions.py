"""Domain exception hierarchy and a consistent error envelope model.

Every business error raises one of these. :mod:`exception_handlers` converts
them into a single JSON shape so clients never see raw database or framework
exceptions.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for all expected application errors."""

    status_code: int = 500
    code: str = 'internal_error'

    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class AuthenticationError(AppError):
    status_code = 401
    code = 'unauthenticated'


class AuthorizationError(AppError):
    status_code = 403
    code = 'forbidden'


class NotFoundError(AppError):
    status_code = 404
    code = 'not_found'


class ConflictError(AppError):
    status_code = 409
    code = 'conflict'


class ValidationFailed(AppError):  # noqa: N818 - avoids clashing with pydantic.ValidationError
    status_code = 422
    code = 'validation_failed'


class StateTransitionError(AppError):
    """Raised when an illegal order/delivery state transition is attempted."""

    status_code = 409
    code = 'illegal_state_transition'
