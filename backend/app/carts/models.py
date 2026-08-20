"""ORM models for the carts domain."""

from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKey, enum_values


class CartStatus(StrEnum):
    ACTIVE = 'active'
    ABANDONED = 'abandoned'


class Cart(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'carts'

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    shop_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('shops.id', ondelete='SET NULL')
    )
    status: Mapped[CartStatus] = mapped_column(
        SAEnum(CartStatus, name='cart_status', create_type=False, values_callable=enum_values),
        server_default=text("'active'"),
        nullable=False,
    )

    items: Mapped[list[CartItem]] = relationship(
        back_populates='cart',
        cascade='all, delete-orphan',
        lazy='raise_on_sql',
        order_by='CartItem.created_at',
    )

    __table_args__ = (
        # Exactly one active cart per user.
        Index(
            'carts_active_user_uniq',
            'user_id',
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )


class CartItem(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'cart_items'

    cart_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('carts.id', ondelete='CASCADE'), nullable=False
    )
    product_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    cart: Mapped[Cart] = relationship(back_populates='items', lazy='raise_on_sql')

    __table_args__ = (
        CheckConstraint('quantity >= 1', name='cart_items_quantity_check'),
        CheckConstraint('unit_price_snapshot >= 0', name='cart_items_price_snapshot_check'),
        UniqueConstraint('cart_id', 'product_id', name='cart_items_cart_product_uniq'),
        Index('ix_cart_items_cart_id', 'cart_id'),
    )
