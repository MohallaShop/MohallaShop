"""Pydantic schemas for the carts domain."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.api.common import Money


class CartItemOut(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    unit: str
    unit_price: Money
    image_url: str | None = None
    quantity: int
    line_total: Money


class CartOut(BaseModel):
    id: UUID
    shop_id: UUID | None = None
    items: list[CartItemOut] = []


class AddCartItem(BaseModel):
    product_id: UUID
    quantity: int = Field(ge=1, le=999)


class UpdateCartItem(BaseModel):
    quantity: int = Field(ge=1, le=999)
