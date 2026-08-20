"""ORM models for the users domain.

``User.id`` is the Supabase subject UUID (no server default). The application
stores no auth secrets. Roles are NOT stored here — they live in the JWT
``app_metadata.roles`` claim (ADR-0002).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKey


class User(TimestampMixin, Base):
    __tablename__ = 'users'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    phone: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        # Partial unique indexes: a value is unique only where present.
        Index(
            'users_phone_key',
            'phone',
            unique=True,
            postgresql_where=text('phone IS NOT NULL'),
        ),
        Index(
            'users_email_key',
            'email',
            unique=True,
            postgresql_where=text('email IS NOT NULL'),
        ),
    )


class UserProfile(TimestampMixin, Base):
    """1:1 display profile with a user. PK is the user id."""

    __tablename__ = 'user_profiles'

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    )
    display_name: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)


class Address(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'addresses'

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    label: Mapped[str | None] = mapped_column(Text)
    line1: Mapped[str] = mapped_column(Text, nullable=False)
    line2: Mapped[str | None] = mapped_column(Text)
    landmark: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    pincode: Mapped[str] = mapped_column(Text, nullable=False)
    contact_name: Mapped[str | None] = mapped_column(Text)
    contact_phone: Mapped[str | None] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, server_default=text('false'), nullable=False)

    __table_args__ = (
        CheckConstraint(
            'char_length(pincode) BETWEEN 3 AND 10', name='addresses_pincode_len_check'
        ),
        Index('ix_addresses_user_id', 'user_id'),
    )
