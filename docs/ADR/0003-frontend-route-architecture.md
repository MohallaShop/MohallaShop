# ADR-0003 — Frontend route architecture

- **Status:** Accepted
- **Date:** 2026-08-09
- **Phase:** 0 (Foundation)

## Context

One Next.js App Router app must serve four audiences (Customer, Shopkeeper,
Rider, Admin) from distinct URL spaces while keeping a shared responsive shell
and clean SEO boundaries (public pages indexable; app surfaces not).

## Decision

Use Next.js **route groups** to organize audiences, with explicit URL prefixes
to avoid collisions between shared page names (e.g. `/orders`, `/profile`):

| Group        | URL space                                                                                                                  | Purpose                         | Indexed |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------- |
| (marketing)  | `/`, `/about`                                                                                                              | Public landing + content        | yes     |
| (customer)   | `/home`, `/shops`, `/shops/[id]`, `/products/[id]`, `/search`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`, `/profile` | Customer shopping               | no      |
| (shopkeeper) | `/shop`, `/shop/orders`, `/shop/orders/[id]`                                                                               | Shop portal                     | no      |
| (rider)      | `/rider/*`                                                                                                                 | Rider portal                    | no      |
| (admin)      | `/admin/*`                                                                                                                 | Admin dashboard (desktop-first) | no      |

> **Phase 1B update:** the shopkeeper surface moved from `/portal/*` to `/shop/*`
> to match the product URL vocabulary used across the marketplace. `/login` is a
> public OTP entry point (Phase 1B). Route protection is UX-only (ADR-0002).

### Responsive shell

A single `AppShell` component renders every authenticated surface:

- **Mobile (<md):** app-like — sticky brand bar + content + bottom navigation
  with large tap targets.
- **Desktop (md+):** web app — persistent left sidebar with richer content.

`AppShell` takes a serializable `role` string and resolves the nav config
**inside the client component** (nav items carry icon functions, which cannot
cross the server→client boundary).

### SEO / PWA

- `app/robots.ts`, `app/sitemap.ts`, and per-layout `metadata` control indexing;
  app surfaces set `robots: { index: false, follow: false }`.
- `app/manifest.ts` provides installability (standalone display, theme color).
- A service worker is deliberately deferred to avoid caching transactional
  data (prices/orders/inventory) — see Master Prompt §18.

## Alternatives considered

- **Separate Next.js apps per role:** rejected — duplicated shell, slower builds,
  worse DX for a single team.
- **Customer at root with app under `/app`:** rejected — the customer shopping
  experience _is_ the main product, so it lives at root-level URLs while
  marketing owns only `/` and `/about`.

## Consequences

- Adding a new page = create the file under the right group; the shell and nav
  apply automatically.
- Nav config lives in `lib/config/nav.ts`; a new role is one entry in
  `AppShell`'s `NAV_BY_ROLE`.
