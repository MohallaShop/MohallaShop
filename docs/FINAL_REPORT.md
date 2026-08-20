# Final Report — MohallaShop capability + hardening pass

> Date: 2026-08-11
> Status: Implemented and verified in this environment; live provider/deployment
> verification remains BLOCKED (see Known limitations).

## A. Architecture audit

Existing stack (preserved, not rewritten):
- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind v4 (`apps/web`).
- Backend: FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL (`backend`).
- Auth: Supabase Auth (session cookies) in Next.js; FastAPI verifies the bearer
  JWT and enforces roles server-side. Frontend role checks are UX-only.
- Integration: typed FastAPI client (`apps/web/lib/api`); PostgreSQL accessed
  only by FastAPI.

The repository had no committed Git history (all source untracked). The existing
Phase 1a slice (auth, profile, addresses, shop/product discovery, single-shop
cart, COD checkout, customer orders, shopkeeper order workflow) was internally
coherent and is preserved.

## B. Existing functionality discovered

Complete Phase 1a vertical slice (detailed in `docs/PRODUCTION_READINESS_AUD.md`).

## C–E. Features completed / fixed / newly implemented

### Fixed (root causes)
- Order cancellation/rejection no longer races: order row locked
  `FOR UPDATE`; restock runs inside the same transaction and can no longer
  double-restock on concurrent/retried requests.
- Checkout no longer inner-joins inventory (which could drop a cart line); each
  cart line's inventory is locked individually and a missing row fails loudly.
- Alembic now imports the model registry so future autogeneration works.
- Customer placeholder routes were missing middleware protection; `/categories`
  and `/favorites` are now protected.

### Newly implemented (backend + UI)
- Categories API + Categories page.
- Global product search (`/products`) + rewritten Search page.
- Seller catalog management (product CRUD + inventory) + `/shop/products` page.
- Admin read-only oversight (dashboard/users/shops/products/orders) + rewritten
  admin pages, RBAC-isolated.
- Favorites (new `favorite_shops` table + migration `0002`) + Favorites page +
  shop favorite toggle.

### Truthfulness
- Removed all fabricated customer-facing values (wallet balance, credit limit,
  BNPL promo, Gold Member badge, 500+ shops, 15–30 min ETA, deal countdown,
  shop ratings/ETA/distance/minimum-order, product discounts/MRP).

## F. Backend/API changes
- New domains/routers: `admin`, `favorites`.
- New endpoints under `shops`: `/categories`, `/categories/summary`, `/products`
  (global search), `/shopkeeper/products` CRUD + inventory.
- New admin endpoints: `/admin/dashboard`, `/admin/users`, `/admin/shops`,
  `/admin/products`, `/admin/orders`.
- New favorites endpoints: `/favorites/shops`, `/favorites/shops/{shop_id}`,
  `/favorites/{favorite_id}`.

## G. Database/migration changes
- `0002_favorite_shops`: `favorite_shops` table (user_id, shop_id) with a unique
  pair constraint and ON DELETE CASCADE.
- `Product.inventory` relationship set to `passive_deletes=True` to defer to the
  DB cascade on product deletion.

## H. Authentication/RBAC changes
- Production config is fail-closed (weak JWT secret, missing issuer/audience,
  wildcard CORS, placeholder DB URL all reject startup).
- JWT now validates issuer/audience when configured; JWKS has timeout + cache.
- SlowAPI rate limits on checkout, cancel, and shopkeeper transitions.
- Admin/seller/favorites endpoints are role- and ownership-scoped server-side.

## I. UI/UX redesign changes
- Customer nav trimmed to real capabilities; dead promo rail removed.
- Categories, search, favorites, seller products, and admin pages rebuilt on
  real API data with empty/error/loading states.

## J–K. Responsive / Accessibility
- Existing responsive shell (sidebar + bottom nav + compact header) preserved.
- Tap-target and focus-ring rules retained in `globals.css`; new forms use
  labelled inputs and ARIA where applicable.

## L. Performance
- API client gained a 15 s timeout + abort handling (prevents hung requests).
- No new heavy dependencies added.

## M. Security improvements
- CSP + HSTS headers; CORS method/header allow-list.
- No secrets committed (`.env`, `backend/.env`, `apps/web/.env.local` ignored).
- `.env.example` updated with `SUPABASE_JWT_ISSUER`/`AUDIENCE` placeholders.

## N. Tests before/after
- Backend: 41 → 64 (`pytest`). New: categories/search (4), seller catalog (6),
  admin oversight + RBAC (6), favorites lifecycle + ownership (7).
- Frontend: 80 → 80 (`vitest`), no regressions.

## O. Build result
- `pnpm build` PASS — 38 routes, no errors.

## P. Routes verified
Build compiled all routes; server-rendered dynamic routes cover customer
(home, shops, shop detail, products, search, categories, cart, checkout, orders,
order detail, profile, favorites, support), shopkeeper (dashboard, products,
orders, order detail), and admin (dashboard, shops, products, orders, customers,
plus placeholder analytics/complaints/riders/settings).

## Q. Known limitations
- Payments, wallet, credits, subscriptions, referrals, notifications, support
  tickets, deliveries, rider availability/earnings, and admin writes are NOT
  implemented: their persistence/provider contracts do not exist. They remain
  honestly absent rather than faked.
- Live Supabase/Razorpay/production-Postgres verification BLOCKED (no
  credentials in this environment).
- Browser/device testing at specific widths BLOCKED (no browser runner here);
  reviewed via Tailwind breakpoints only.

## R. Remaining blockers
- First Git commit + remote not created.
- Rider delivery state machine + audit trail design needed before rider/admin
  write features.
- Razorpay integration (capture, signature verify, idempotent webhooks) needed
  before online payments.

## S. Production deployment requirements
- Set `APP_ENV=production` plus strong `SUPABASE_JWT_SECRET` (or JWKS),
  `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`, explicit `BACKEND_CORS_ORIGINS`,
  real `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`.
- Run `alembic upgrade head` (applies 0001 + 0002).
- Serve Next.js with SPA-friendly hosting; backend behind HTTPS with CORS.

## T–V. Files changed / added / deleted
Added:
- `backend/app/admin/` (__init__, schemas, service, router)
- `backend/app/favorites/` (__init__, models, schemas, service, router)
- `backend/app/core/rate_limit.py`
- `backend/alembic/versions/0002_favorite_shops.py`
- `backend/tests/test_admin.py`, `backend/tests/test_favorites.py`
- `apps/web/lib/api/admin.ts`, `apps/web/lib/api/favorites.ts`
- `apps/web/components/customer/ProductSearchCard.tsx`
- `apps/web/components/customer/RemoveFavoriteButton.tsx`
- `apps/web/components/shopkeeper/ProductManager.tsx`
- `apps/web/app/(shopkeeper)/shop/products/page.tsx`
- `apps/web/app/(admin)/admin/products/page.tsx` (new)
- `docs/PRODUCTION_READINESS_AUDIT.md`, `docs/FINAL_REPORT.md`

Modified:
- `backend/app/core/{config,security}.py`, `backend/app/main.py`,
  `backend/app/orders/{service,router,schemas}.py`,
  `backend/app/shops/{service,router,schemas,models}.py`,
  `backend/alembic/env.py`, `backend/app/db/__init__.py`,
  `backend/app/api/v1/__init__.py`, `backend/tests/{conftest,test_shops,test_shopkeeper}.py`
- `apps/web/lib/api/{client,types,shops,shopkeeper}.ts`,
  `apps/web/lib/config/nav.ts`, `apps/web/lib/supabase/middleware.ts`
- `apps/web/components/customer/{HomeRail,ShopCard,DealCard,DealTimer,FeatureStrip,HeroBanner}.tsx`
- `apps/web/components/layout/{AppShell,Header}.tsx`
- `apps/web/app/(customer)/{home,categories,search,favorites,shops/[shopId]}/page.tsx`
- `apps/web/app/(admin)/admin/{dashboard,shops,orders,customers}/page.tsx`
- `.env.example`, `backend/.env.example`

Deleted:
- `apps/web/components/layout/SidebarPromoCard.tsx`
- `apps/web/app/(customer)/{wallet,credits,subscriptions,refer,sell}/` (placeholders for unsupported domains)

## W. Intentionally NOT implemented
Wallet, credits, subscriptions, referrals, notifications, support tickets,
online payments, deliveries, rider availability/earnings, and admin write
operations — because their backend persistence and/or provider contracts do not
exist, and the "real data only" rule forbids faking them.
