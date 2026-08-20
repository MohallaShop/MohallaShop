"""Pydantic schemas for the auth domain."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.auth.roles import Role


class PrincipalOut(BaseModel):
    """The authenticated subject as derived from a verified Supabase JWT."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    phone: str | None = None
    email: str | None = None
    roles: list[Role] = []
