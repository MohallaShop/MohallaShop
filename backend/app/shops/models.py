"""ORM models for the shops domain."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKey, enum_values


class ShopStatus(StrEnum):
    PENDING = 'pending'  # registered, awaiting admin approval
    ACTIVE = 'active'
    INACTIVE = 'inactive'  # closed by the owner
    SUSPENDED = 'suspended'  # temporarily hidden by an admin


class Category(UUIDPrimaryKey, Base):
    __tablename__ = 'categories'

    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    parent_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('categories.id', ondelete='SET NULL')
    )
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text('0'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Shop(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'shops'

    owner_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ShopStatus] = mapped_column(
        SAEnum(ShopStatus, name='shop_status', create_type=False, values_callable=enum_values),
        server_default=text("'active'"),
        nullable=False,
    )
    address_line1: Mapped[str | None] = mapped_column(Text)
    address_line2: Mapped[str | None] = mapped_column(Text)
    address_city: Mapped[str | None] = mapped_column(Text)
    address_state: Mapped[str | None] = mapped_column(Text)
    address_pincode: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), server_default=text('20'), nullable=False
    )

    __table_args__ = (
        CheckConstraint('char_length(name) BETWEEN 1 AND 120', name='shops_name_len_check'),
        Index('ix_shops_owner_user_id', 'owner_user_id'),
        Index('ix_shops_status', 'status'),
        Index('ix_shops_address_city', 'address_city'),
    )


class Product(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'products'

    shop_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('shops.id', ondelete='CASCADE'), nullable=False
    )
    category_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('categories.id', ondelete='SET NULL')
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text('true'), nullable=False)

    inventory: Mapped[Inventory] = relationship(
        back_populates='product',
        uselist=False,
        lazy='raise_on_sql',
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint('price >= 0', name='products_price_check'),
        CheckConstraint('char_length(name) BETWEEN 1 AND 160', name='products_name_len_check'),
        Index('ix_products_shop_id', 'shop_id'),
        Index('ix_products_shop_id_is_active', 'shop_id', 'is_active'),
        Index('ix_products_category_id', 'category_id'),
    )


class Inventory(UUIDPrimaryKey, Base):
    """1:1 stock for a product. Concurrency-safe (see SCHEMA §4)."""

    __tablename__ = 'inventory'

    product_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
    )
    quantity_available: Mapped[int] = mapped_column(
        Integer, server_default=text('0'), nullable=False
    )
    low_stock_threshold: Mapped[int | None] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    product: Mapped[Product] = relationship(back_populates='inventory', lazy='raise_on_sql')

    __table_args__ = (
        CheckConstraint('quantity_available >= 0', name='inventory_qty_available_check'),
        CheckConstraint(
            'low_stock_threshold IS NULL OR low_stock_threshold >= 0',
            name='inventory_low_stock_check',
        ),
    )
