"""Database package.

Re-exports :class:`Base` and imports every domain model module so the ORM
metadata is complete for Alembic autogeneration and for `Base.metadata`.
"""

from __future__ import annotations

from app.carts import models as _carts_models  # noqa: F401
from app.core.db import Base
from app.favorites import models as _favorites_models  # noqa: F401
from app.orders import models as _orders_models  # noqa: F401
from app.riders import models as _riders_models  # noqa: F401
from app.shops import models as _shops_models  # noqa: F401
from app.users import models as _users_models  # noqa: F401

__all__ = ['Base']
