"""Shared ORM mixins: UUID primary key and timestamps."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func


class UUIDPrimaryKey:
    """UUID primary key with a server-side ``gen_random_uuid()`` default.

    Not used for ``users`` (whose id is the external Supabase subject).
    """

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()')
    )


class TimestampMixin:
    """``created_at`` / ``updated_at`` columns.

    ``updated_at`` is advanced by a per-table trigger created in the migration;
    the default covers inserts.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


def enum_values(enum: type[Enum]) -> list[str]:
    """Values-callable so SA persists ``Enum.value`` (not ``Enum.name``).

    Our PG enum types store lowercase values (e.g. ``'active'``); without this,
    SQLAlchemy would persist member names (e.g. ``'ACTIVE'``).
    """
    return [member.value for member in enum]
