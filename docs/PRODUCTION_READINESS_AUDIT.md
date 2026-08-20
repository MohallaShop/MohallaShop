# MohallaShop Production-Readiness Audit

> Audit date: 2026-08-11
> Scope: repository state before the current hardening and capability pass

## Architecture

- `apps/web`: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4.
- `backend`: FastAPI, SQLAlchemy async, Alembic, PostgreSQL.
- Authentication: Supabase Auth session cookies in Next.js; FastAPI verifies the
  bearer JWT and enforces roles.
- Integration boundary: Next.js server components and client components call a
  typed FastAPI client. PostgreSQL is accessed only by FastAPI.
- The repository currently has no committed Git history or configured remote.
  All source is present as an untracked working tree and must be reviewed before
  the first commit.

## Feature Map

### Complete for the current Phase 1a contract

- Email OTP authentication and SSR session refresh.
- Customer profile and address CRUD.
- Active shop and product discovery.
- Single-shop cart with server-side ownership checks.
- COD order creation with server-authoritative prices and inventory deduction.
- Customer order history, detail, and permitted cancellation.
- Shopkeeper order listing and the `accept -> preparing -> ready` workflow.
- Structured API errors, health endpoints, basic security headers, responsive
  application shells, and metadata foundations.

### Partial or misleading

- Home contains hardcoded wallet, credit, membership, delivery, rating, and
  promotion claims that do not exist in the backend.
- Search only searches shops; product/category discovery is not global.
- Order tracking is a static status card; no delivery or rider state exists.
- Customer navigation exposes unsupported wallet, credits, subscriptions,
  referrals, and seller-onboarding surfaces.
- Seller portal only handles orders; catalog and inventory management are absent.
- Rider and admin pages are shells without corresponding business APIs.
- Public shop metadata is disabled because the current shop API requires auth.

### UI only / unsupported

- Wallet, credits, subscriptions, referrals, notifications, support tickets,
  online payments, deliveries, rider availability/earnings, and admin writes.
- These areas must not display balances, statuses, timers, or success states until
  their backend persistence and authorization rules are implemented.

### Broken or unsafe risks found

- Customer placeholder routes were missing from middleware protection.
- Order cancellation/rejection did not lock the order row; duplicate requests
  could restock inventory more than once.
- Checkout used an inner join for inventory and could omit a cart line with a
  missing inventory row.
- Alembic did not import the model registry, so future autogeneration could miss
  model changes.
- API response parsing could throw on an HTML/non-JSON upstream error and had no
  timeout or abort handling.
- JWT validation disabled audience checking and accepted the development JWT
  default in a production-shaped configuration.
- CORS allowed all methods and headers, while configured rate limiting had no
  route limits.

## Implementation Order

1. Remove unsupported customer claims and align navigation, route guards, and
   empty/error states with actual capabilities.
2. Add categories and global product search using the existing tables.
3. Add seller shop/product/inventory management using server-side ownership and
   validation.
4. Add read-only admin oversight for existing users, shops, products, and orders.
5. Add product/shop favorites with persistence and rollback-safe UI.
6. Lock order transitions and make inventory restocking idempotent.
7. Harden JWT/configuration/CORS/rate limits and the frontend transport layer.
8. Update tests, documentation, and production verification results.

## Explicit Blockers

The current schema has no tables or provider contracts for payments, wallets,
credits, deliveries, riders, notifications, complaints, subscriptions,
referrals, or analytics. Implementing those screens as real production features
would require inventing business rules and financial/provider behavior. They are
therefore not represented as live functionality in this pass.

Live Supabase, Razorpay, deployment, browser-device, and production database
verification require credentials and infrastructure that are not available in
the repository environment.

---

## Work completed in this pass

### Backend hardening (security & concurrency)

- Production configuration is now fail-closed: `app_env=production` rejects
  weak/placeholder JWT secrets, missing issuer/audience, wildcard CORS, and
  placeholder database URLs (`backend/app/core/config.py`).
- JWT verification honours `SUPABASE_JWT_ISSUER` and `SUPABASE_JWT_AUDIENCE`
  when set, and the dev placeholder JWT secret default was removed
  (`backend/app/core/security.py`).
- JWKS client has a 5 s timeout and 300 s key cache lifespan.
- CORS now restricts methods/headers to a known allow-list; CSP and HSTS
  security headers were added (`backend/app/main.py`).
- Sensitive mutation routes now carry SlowAPI rate limits
  (`backend/app/orders/router.py`, `backend/app/core/rate_limit.py`).
- Order cancellation and shopkeeper transitions lock the order row with
  `SELECT ... FOR UPDATE`; restocking now loads and updates the inventory row in
  the same locked transaction, preventing double-restock on concurrent requests
  (`backend/app/orders/service.py`).
- Checkout no longer inner-joins inventory (which could drop a cart line); it
  loads products, counts cart lines, then locks inventory rows individually and
  rejects any product lacking an inventory record.
- Alembic now imports the model registry so autogeneration sees every domain
  (`backend/alembic/env.py`).

### Frontend transport

- The API client now has a 15 s timeout, abort handling, safe non-JSON response
  parsing, and a `network_error` envelope for offline/timeout failures
  (`apps/web/lib/api/client.ts`).

### Truthfulness fixes (no fabricated data)

- Removed fake wallet balance, credit limit, BNPL promo, Gold Member badge,
  500+ shops claim, 15–30 min delivery claim, deal countdown timer, fabricated
  shop ratings/ETA/distance/minimum-order, and fabricated product discounts/MRP.
- Customer navigation now only lists surfaces with real backend support.
- Deleted placeholder routes for wallet, credits, subscriptions, refer, and sell.
- Middleware protection list now covers `/categories` and `/favorites`.

### New capabilities (backend + UI)

- **Categories API** (`GET /categories`, `GET /categories/summary`) backed by the
  existing `categories` table, plus a real Categories page.
- **Global product search** (`GET /products`) across active shops with text +
  category filters, wired into a rewritten Search page.
- **Seller catalog management**: `GET/POST /shopkeeper/products`,
  `PATCH /shopkeeper/products/{id}`,
  `PATCH /shopkeeper/products/{id}/inventory`,
  `DELETE /shopkeeper/products/{id}` — all server-side ownership-scoped and
  validated — plus a `/shop/products` management page with inline create, edit,
  stock update, activate/hide, and delete.
- **Admin read-only oversight**: `/admin/dashboard`, `/admin/users`,
  `/admin/shops`, `/admin/products`, `/admin/orders` aggregating real database
  state; RBAC-isolated and wired into rewritten admin pages.
- **Favorites**: new `favorite_shops` table (migration `0002_favorite_shops`),
  `/favorites/shops` CRUD endpoints (customer-only, ownership-checked), a
  Favorites page, and a favorite toggle on the shop detail page.

### Tests

- Backend: 41 → 64 tests (added categories/search, seller catalog, admin
  oversight + RBAC isolation, favorites lifecycle + ownership).
- Frontend: 80 tests still green (no regressions).

## Verification (this environment)

- `pnpm typecheck` — PASS
- `pnpm lint` — PASS (0 errors)
- `pnpm test` — PASS (13 files, 80 tests)
- `pnpm build` — PASS (38 routes, no errors)
- `uv run ruff check .` — PASS
- `uv run mypy app` — PASS (50 source files)
- `uv run pytest` — PASS (64 tests)

## Not verified (BLOCKED)

- Live Supabase Auth round-trip, Razorpay payments, and real PostgreSQL
  connectivity beyond the test `pgserver` instance: credentials/providers not
  available in this environment.
- Browser/device responsive testing at specific widths: no browser runner
  available here; verified by code review and Tailwind breakpoints only.
- Rider delivery lifecycle and admin write operations (approvals, suspensions,
  role assignment): intentionally deferred — they require a delivery state
  machine / audit-trail design that is out of scope for this pass.

## Not implemented (intentional)

- Wallet, credits, subscriptions, referrals, notifications, support tickets,
  online payments, deliveries, rider availability/earnings, and admin writes:
  their persistence and provider contracts do not exist; faking them would
  violate the "real data only" rule. These remain honestly absent or marked as
  future work.
