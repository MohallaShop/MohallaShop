"""Supabase JWT verification and principal extraction.

The Supabase Auth service issues access tokens. We verify them here (signature +
expiry) and translate the claims into an application :class:`Principal`. This is
the identity → authorization boundary:

* **Identity** (who you are) is decided by Supabase Auth.
* **Authorization** (what you may do) is decided by FastAPI using the roles in
  the verified token.

Two verification modes are supported:

* **HS256 (legacy projects):** tokens are signed with the project JWT secret
  (``SUPABASE_JWT_SECRET``).
* **JWKS (new projects):** tokens are signed with a rotating asymmetric key
  (RS256/ES256) published at ``SUPABASE_JWKS_URL`` (e.g.
  ``{SUPABASE_URL}/auth/v1/.well-known/jwks.json``). The signing key is fetched
  per-token ``kid`` and cached by ``PyJWKClient``.

When ``SUPABASE_JWKS_URL`` is configured it takes precedence (see ADR-0002).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from jwt import InvalidTokenError, PyJWKClient, PyJWTError
from jwt.exceptions import PyJWKClientError

from app.auth.roles import Role
from app.core.config import Settings
from app.core.exceptions import AuthenticationError

# Claim keys inside a Supabase access token.
_CLAIM_SUB = 'sub'
_CLAIM_EMAIL = 'email'
_CLAIM_PHONE = 'phone'
_CLAIM_APP_METADATA = 'app_metadata'
# Where MohallaShop roles live inside app_metadata.
_ROLES_KEY = 'roles'

_jwks_clients: dict[str, PyJWKClient] = {}


@dataclass(frozen=True)
class Principal:
    """A verified, authenticated subject."""

    user_id: UUID
    phone: str | None
    email: str | None
    roles: list[Role]


def _get_jwks_client(url: str) -> PyJWKClient:
    """Return (and cache) the JWKS client for a project URL."""
    client = _jwks_clients.get(url)
    if client is None:
        # cache_keys=True: fetched signing keys are cached per kid and the
        # JWKS set is re-fetched on kid miss, matching key rotation.
        client = PyJWKClient(url, cache_keys=True, lifespan=300, timeout=5)
        _jwks_clients[url] = client
    return client


def _decode_verified(raw_token: str, key: Any, settings: Settings) -> dict[str, Any]:
    """Decode a token with the configured algorithm and optional claims."""
    options: dict[str, Any] = {'require': ['exp', _CLAIM_SUB]}
    kwargs: dict[str, Any] = {
        'algorithms': [settings.supabase_jwt_algorithm],
        'options': options,
    }
    if settings.supabase_jwt_audience:
        kwargs['audience'] = settings.supabase_jwt_audience
    else:
        options['verify_aud'] = False
    if settings.supabase_jwt_issuer:
        kwargs['issuer'] = settings.supabase_jwt_issuer
    return jwt.decode(raw_token, key, **kwargs)


def _verify_with_jwks(raw_token: str, settings: Settings) -> dict[str, Any]:
    if not settings.supabase_jwks_url:
        raise AuthenticationError('JWKS verification is not configured on the server')
    try:
        signing_key = _get_jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(
            raw_token
        )
        return _decode_verified(raw_token, signing_key.key, settings)
    except (PyJWKClientError, PyJWTError) as exc:
        raise AuthenticationError('Invalid or expired access token') from exc


def verify_access_token(raw_token: str, settings: Settings) -> dict[str, Any]:
    """Decode and verify a Supabase access token. Raises on failure."""
    if settings.supabase_jwks_url:
        return _verify_with_jwks(raw_token, settings)

    if not settings.supabase_jwt_secret or settings.supabase_jwt_secret.startswith('replace-with'):
        raise AuthenticationError('JWT secret is not configured on the server')
    try:
        payload = _decode_verified(raw_token, settings.supabase_jwt_secret, settings)
    except PyJWTError as exc:
        raise AuthenticationError('Invalid or expired access token') from exc
    return payload


def principal_from_claims(claims: dict[str, Any]) -> Principal:
    """Convert verified JWT claims into a :class:`Principal`."""
    try:
        user_id = UUID(str(claims[_CLAIM_SUB]))
    except (KeyError, ValueError) as exc:
        raise AuthenticationError('Token is missing a valid subject') from exc

    app_metadata = claims.get(_CLAIM_APP_METADATA) or {}
    raw_roles = app_metadata.get(_ROLES_KEY) or []
    if isinstance(raw_roles, str):
        raw_roles = [raw_roles]

    roles: list[Role] = []
    for raw in raw_roles:
        try:
            roles.append(Role(str(raw)))
        except ValueError:
            # Unknown roles are ignored rather than rejected, so adding new
            # roles does not break older tokens.
            continue

    if not roles:
        # A freshly authenticated identity with no explicit roles is a
        # customer. Roles are additive privileges granted server-side
        # (ADR-0002); a role-less token can only ever reach customer
        # endpoints because every shopkeeper/rider/admin route declares its
        # roles via `require_roles`. This lets new email/phone signups use the
        # marketplace without any frontend role assignment.
        roles = [Role.CUSTOMER]

    return Principal(
        user_id=user_id,
        phone=claims.get(_CLAIM_PHONE) or None,
        email=claims.get(_CLAIM_EMAIL) or None,
        roles=roles,
    )


def decode_principal(raw_token: str, settings: Settings) -> Principal:
    """Verify a token and return the :class:`Principal` (convenience)."""
    claims = verify_access_token(raw_token, settings)
    return principal_from_claims(claims)


__all__ = [
    'InvalidTokenError',
    'Principal',
    'decode_principal',
    'principal_from_claims',
    'verify_access_token',
]
