"""Application roles and RBAC primitives.

MohallaShop roles are stored in the Supabase user's ``app_metadata.roles`` claim
and are therefore available inside the access JWT. The frontend never grants or
trusts roles — every privileged action is re-checked here against the decoded
token.
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    """Roles recognized by the platform."""

    CUSTOMER = 'customer'
    SHOPKEEPER = 'shopkeeper'
    RIDER = 'rider'
    ADMIN = 'admin'
    SUPER_ADMIN = 'super_admin'


# Roles that may act on the admin surface. ``super_admin`` implicitly satisfies
# any admin requirement (handled in :func:`require_roles`).
_ADMIN_ROLES = {Role.ADMIN, Role.SUPER_ADMIN}


def is_admin(roles: list[Role]) -> bool:
    return any(r in _ADMIN_ROLES for r in roles)
