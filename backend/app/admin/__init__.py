"""Admin domain: platform oversight, shop lifecycle, and user role management.

Admin endpoints aggregate real database state and provide two write operations:
shop status transitions (approve / suspend / close) and Supabase-backed user
role assignment. All writes are audited through the standard order/state
history machinery and Supabase's own audit trails where applicable.
"""

from __future__ import annotations
