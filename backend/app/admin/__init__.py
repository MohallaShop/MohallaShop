"""Admin domain: read-only platform oversight (Phase 1a scope).

Admin endpoints aggregate existing tables only. No customer PII beyond what the
admin role is permitted to see (users + shop ownership + order counts). Write
operations (approvals, suspensions) are deferred until a proper audit trail and
admin action log exist.
"""

from __future__ import annotations
