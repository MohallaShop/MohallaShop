"""Thin async wrapper over the Supabase Auth Admin API.

Used exclusively by admin tooling — role assignment lives in Supabase
(``app_metadata.roles``), not in our database, so changing roles means
calling Supabase with the service-role key. Roles are JWT claims, so after
an update the user is also force-signed-out; their next login mints a token
with the new claims.

Requires ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY``. When they are
absent every call raises :class:`SupabaseAdminConfigError` — surfaced to
admins in the settings screen instead of silently no-op'ing.

Functions are plain module-level coroutines taking ``settings`` explicitly,
which keeps them trivially monkeypatchable in tests (no network).
"""

from __future__ import annotations

import contextlib
from typing import Any
from uuid import UUID

import httpx

from app.core.config import Settings
from app.core.exceptions import AppError

_TIMEOUT = httpx.Timeout(10.0)


class SupabaseAdminConfigError(AppError):
    """The service-role credentials are missing — admin user tools unavailable."""

    status_code = 503
    code = 'supabase_admin_unconfigured'


class SupabaseAdminUpstreamError(AppError):
    """Supabase answered with an error status."""

    status_code = 502
    code = 'supabase_admin_request_failed'


def _client(settings: Settings) -> httpx.AsyncClient:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseAdminConfigError(
            'Supabase admin API is not configured. Set SUPABASE_URL and '
            'SUPABASE_SERVICE_ROLE_KEY to manage user roles.'
        )
    base = settings.supabase_url.rstrip('/')
    return httpx.AsyncClient(
        base_url=f'{base}/auth/v1/admin',
        headers={
            'apikey': settings.supabase_service_role_key,
            'Authorization': f'Bearer {settings.supabase_service_role_key}',
        },
        timeout=_TIMEOUT,
    )


async def _request(settings: Settings, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    async with _client(settings) as client:
        try:
            res = await client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise SupabaseAdminUpstreamError(
                'Could not reach Supabase. Try again in a moment.'
            ) from exc
    if res.status_code >= 400:
        detail = ''
        with contextlib.suppress(ValueError):
            detail = res.json().get('msg') or res.json().get('message') or ''
        raise SupabaseAdminUpstreamError(
            f'Supabase rejected the request ({res.status_code}).',
            details={'upstream': detail[:200]} if detail else None,
        )
    data = res.json() if res.content else {}
    if not isinstance(data, dict):
        raise SupabaseAdminUpstreamError('Unexpected response shape from Supabase.')
    return data


async def get_user(settings: Settings, user_id: UUID) -> dict[str, Any]:
    """Fetch a user (email, phone, email_confirmed_at, app_metadata, …)."""
    return await _request(settings, 'GET', f'/users/{user_id}')


async def update_app_metadata(
    settings: Settings, user_id: UUID, app_metadata: dict[str, Any]
) -> dict[str, Any]:
    """Replace the user's app_metadata with the given object (read-merge-write
    is the caller's job — GoTrue replaces the whole object)."""
    return await _request(
        settings, 'PUT', f'/users/{user_id}', json={'app_metadata': app_metadata}
    )


async def sign_out(settings: Settings, user_id: UUID) -> None:
    """Invalidate the user's sessions so fresh JWT claims are minted."""
    await _request(settings, 'POST', f'/users/{user_id}/sign_out')
