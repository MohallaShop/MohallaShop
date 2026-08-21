"""Reusable FastAPI dependencies: settings, DB session, and auth/RBAC.

Authorization pattern
---------------------
``get_current_principal`` verifies the Bearer token and returns a
:class:`~app.core.security.Principal`. ``require_roles`` returns a dependency
that enforces role membership. The frontend is never the source of truth for
permissions — the decoded, server-verified token is.
"""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.roles import Role
from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import Principal, decode_principal

# `auto_error=False` lets us raise our own structured 401 instead of Starlette's.
_bearer_scheme = HTTPBearer(auto_error=False)


def get_request_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> Principal:
    """Resolve and verify the access token from the Authorization header."""
    if credentials is None or not credentials.credentials:
        raise AuthenticationError('Missing bearer token')
    return decode_principal(credentials.credentials, settings)


def get_current_principal(
    principal: Principal = Depends(get_request_principal),
) -> Principal:
    """Dependency that yields the authenticated principal."""
    return principal


def get_optional_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> Principal | None:
    """Dependency for public catalogue routes: anonymous browsing is allowed.

    No token → ``None`` (the caller treats the request as anonymous). A token
    that IS presented must still verify — an invalid or expired token is never
    silently downgraded to anonymous (ADR-0006).
    """
    if credentials is None or not credentials.credentials:
        return None
    return decode_principal(credentials.credentials, settings)


def require_roles(*allowed: Role) -> Callable[..., Principal]:
    """Build a dependency that allows only the given roles.

    ``super_admin`` always satisfies the requirement (it implies all access).
    """
    allowed_set = set(allowed)

    def _checker(principal: Principal = Depends(get_current_principal)) -> Principal:
        if Role.SUPER_ADMIN in principal.roles:
            return principal
        if not allowed_set.intersection(principal.roles):
            raise AuthorizationError(
                'Insufficient permissions',
                details={'required_roles': sorted(r.value for r in allowed_set)},
            )
        return principal

    return _checker


# Re-exported for convenience so routers can import from one place.
__all__ = [
    'AsyncSession',
    'Depends',
    'Principal',
    'Role',
    'Settings',
    'get_current_principal',
    'get_db',
    'get_optional_principal',
    'get_request_principal',
    'get_settings',
    'require_roles',
]
