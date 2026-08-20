# MohallaShop — Phase 1a RBAC Matrix

> Authorization is enforced **server-side** in FastAPI (ADR-0002). The frontend is
> never trusted. Roles travel in the verified JWT (`app_metadata.roles`):
> `customer`, `shopkeeper`, `admin`, `super_admin` (`rider` exists but is unused
> in Phase 1a). `super_admin` satisfies any requirement.
>
> **Role-less default:** a verified principal with no roles is treated as
> `customer` (server-side, `core/security.principal_from_claims`). Roles are
> additive privileges — a role-less token can never reach shopkeeper/rider/admin
> endpoints because each declares its roles via `require_roles`.

Legend: **R** read · **C** create · **U** update · **D** delete · **M** manage
(state transitions) · **—** no access.

## 1. Capability matrix

| Resource / Action                           | Customer                | Shopkeeper               | Admin                          |
| ------------------------------------------- | ----------------------- | ------------------------ | ------------------------------ |
| `GET /auth/me`, `/me/profile`               | R / U own               | R / U own                | R / U own                      |
| Bootstrap own `users` row on first call     | yes (idempotent)        | yes                      | yes                            |
| Own addresses                               | **CRUD**                | CRUD (own)               | R (own)                        |
| **Shop discovery** `GET /shops`             | R (active only)         | R (active only)          | R (all)                        |
| Shop detail `GET /shops/{id}`               | R (active only)         | R (active only)          | R (all)                        |
| **Own shop** `GET /shopkeeper/shop`         | —                       | R                        | — (uses admin endpoints in 1b) |
| Own shop config                             | —                       | U (own shop)             | M (all shops)                  |
| **Shop products** (read)                    | R (active, active shop) | R (active)               | R (all)                        |
| Shop products (create/update/price)         | —                       | C/U on **own shop only** | C/U (all)                      |
| **Own cart**                                | **CRUD**                | —                        | —                              |
| **Own orders** (customer view)              | R; cancel (limited)     | —                        | R (all)                        |
| **Shop orders** `GET /shopkeeper/orders`    | —                       | R **own shop only**      | R (all)                        |
| Order transitions: accept/reject/prep/ready | —                       | M **own shop only**      | M (all)                        |
| **Cross-shop** orders / inventory           | —                       | **— (hard deny, 404)**   | R/M                            |
| User management / role assignment           | —                       | —                        | M (via Supabase admin API)     |

## 2. Hard rules (must hold invariant)

1. **Shop isolation:** a shopkeeper can read or act on **only** orders whose
   `shop.owner_user_id == principal.user_id`. Any other shop's order returns
   `404` (not `403`, to avoid leaking existence) before any mutation.
2. **Customer isolation:** a customer sees **only** their own cart, addresses, and
   orders. Another customer's resources return `404`.
3. **Server-side money & inventory:** no endpoint trusts a client-supplied price,
   total, quantity-on-hand, or inventory figure. Totals are recomputed; stock is
   revalidated with a conditional UPDATE.
4. **State machine authority:** clients request _events_ (`/accept`, `/reject`, …),
   never set `status` directly. Transitions are validated by the service.
5. **Ownership before role:** even with the correct role, every object access
   re-checks ownership; role alone is insufficient.

## 3. Mapping to dependencies (implementation reference)

| Route prefix                             | Dependency guard                                       |
| ---------------------------------------- | ------------------------------------------------------ |
| `/me/*`, `/cart/*`, `/orders` (customer) | `require_roles(Role.CUSTOMER)` (+admin read)           |
| `/shopkeeper/*`                          | `require_roles(Role.SHOPKEEPER)` then resolve own shop |
| `/admin/*` (1b)                          | `require_roles(Role.ADMIN)`                            |

## 4. Supabase RLS boundary

**Not used** for Phase 1a application tables. The application Postgres is accessed
exclusively by the FastAPI service role; clients never connect to it directly (they
use Supabase Auth only). Duplicating authorization in RLS would create two sources
of truth. If direct Postgres access is introduced later (e.g., real-time via
Postgres/Supabase from the browser), RLS will be revisited in a new ADR.
