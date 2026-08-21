"""Pydantic schemas for the shops domain."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.api.common import Money


class ShopAddressOut(BaseModel):
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None


class ShopSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    phone: str | None = None
    city: str | None = None
    status: str


class ShopDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    phone: str | None = None
    address: ShopAddressOut
    status: str
    delivery_fee: Money


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shop_id: UUID
    name: str
    description: str | None = None
    price: Money
    unit: str
    image_url: str | None = None
    in_stock: bool
    category_id: UUID | None = None


class ShopkeeperShop(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    phone: str | None = None
    status: str
    delivery_fee: Money
    product_count: int
    pending_order_count: int


class ShopCreate(BaseModel):
    """Shopkeeper self-registration. Starts in `pending` until an admin approves."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    phone: str | None = Field(default=None, max_length=20)
    address_line1: str = Field(min_length=1, max_length=200)
    address_line2: str | None = Field(default=None, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=12)
    delivery_fee: Decimal = Field(default=Decimal('20'), ge=0, decimal_places=2, max_digits=12)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    sort_order: int


class CategorySummary(BaseModel):
    id: UUID
    name: str
    slug: str
    product_count: int


class ProductSummary(BaseModel):
    """Lightweight product used in global search results."""

    id: UUID
    shop_id: UUID
    shop_name: str
    name: str
    price: Money
    unit: str
    image_url: str | None = None
    in_stock: bool


class ShopkeeperProductOut(BaseModel):
    """Full product + inventory view for the seller managing their catalog."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shop_id: UUID
    category_id: UUID | None = None
    name: str
    description: str | None = None
    price: Money
    unit: str
    image_url: str | None = None
    is_active: bool
    quantity_available: int
    low_stock_threshold: int | None = None


class ShopkeeperProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    price: Decimal = Field(ge=0, decimal_places=2, max_digits=12)
    unit: str = Field(min_length=1, max_length=40)
    image_url: str | None = Field(default=None, max_length=2048)
    category_id: UUID | None = None
    is_active: bool = True
    quantity_available: int = Field(default=0, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ShopkeeperProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2, max_digits=12)
    unit: str | None = Field(default=None, min_length=1, max_length=40)
    image_url: str | None = Field(default=None, max_length=2048)
    category_id: UUID | None = None
    is_active: bool | None = None
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ShopkeeperInventoryUpdate(BaseModel):
    quantity_available: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
