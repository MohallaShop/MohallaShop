"""ORM models for the favorites domain (saved shops per customer)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.db.mixins import UUIDPrimaryKey


class FavoriteShop(UUIDPrimaryKey, Base):
    __tablename__ = 'favorite_shops'

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    shop_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('shops.id', ondelete='CASCADE'), nullable=False
    )

    __table_args__ = (
        UniqueConstraint('user_id', 'shop_id', name='favorite_shops_user_shop_uniq'),
        Index('ix_favorite_shops_user_id', 'user_id'),
    )
