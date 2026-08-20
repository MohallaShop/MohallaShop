"""Pydantic schemas for the favorites domain."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class FavoriteShopOut(BaseModel):
    id: UUID
    shop_id: UUID
    shop_name: str
    shop_city: str | None = None
    shop_status: str
