# MohallaShop — Implementation Audit

> **Audit date:** 2026-08-09
> **Auditor:** Lead Software Architect (opencode)
> **Scope:** Phase 1 — Web MVP validation
> **Status:** Pre-implementation (greenfield)

---

## 0. Executive Summary

The MohallaShop repository at `C:\Users\ravi7\OneDrive\Documents\GitHub\MohallaShop` is **completely empty**. There is no existing source code, configuration, migrations, assets, environment files, or documentation of any kind (including hidden files). The repository is a clean greenfield.

Critically, **the MohallaShop product documentation referenced as the "source of truth" is not present in the repository.** The Master Coding Prompt lists the following documents as primary inputs, none of which exist:

- PRD
- System Architecture
- Database & ERD Schema
- API Specification
- Product Workflows & State Machines
- RBAC & Security Specification
- UI/UX & Design System Specification
- Testing & QA Strategy
- DevOps / CI/CD
- Logging / Monitoring / Analytics
- Release / Pilot Checklist
- Phase Roadmap
- Web MVP Implementation Specification

The Master Coding Prompt itself is the **only** source of product/architectural truth currently available. It is detailed enough to establish the repository **foundation (Phase 0)**, but it does **not** define the detailed database schema, API contracts, or exact RBAC permission matrix required to safely implement business domains (orders, inventory, payments, deliveries).

This is a **stop condition** (see §10 below) that must be resolved before building business logic. The recommended path is to proceed with Phase 0 foundation using the Master Prompt as the de-facto spec, and to author the missing detailed docs (starting with DB/ERD and API spec) in lockstep with implementation.

---

## 1. Current Repository Structure

```text
MohallaShop/          # empty — 0 entries, 0 bytes of content
```

No `apps/`, `backend/`, `packages/`, `infrastructure/`, `docs/` (created during this audit), `.github/`, or any root config files exist.

---

## 2. What Already Exists

Nothing. The repository contains no applications, backend code, database migrations, dependencies, or environment configuration.

The only artifact after this audit is this document (`docs/IMPLEMENTATION_AUDIT.md`).

---

## 3. What Can Be Reused

N/A — there is no existing code to reuse. All work is net-new.

---

## 4. What Must Be Changed

N/A — there is nothing to change. We are creating the canonical structure from scratch.

---

## 5. What Must Be Removed

N/A — nothing exists to remove. No deletions are required or recommended.

---

## 6. Missing Components

Everything required for a production platform is missing. Grouped by the target architecture defined in the Master Prompt:

### 6.1 Monorepo / tooling

- Root layout: `apps/web`, `backend`, `packages`, `infrastructure`, `docs`, `.github`
- `.gitignore`, `.env.example`, `docker-compose.yml`, `README.md`
- Linting / formatting / type-check configuration (frontend + backend)
- CI foundation (`.github/workflows`)
- Node package manager + workspace config (pnpm/npm workspaces)
- Python tooling ( Poetry/uv/pip + `pyproject.toml`, ruff/black/mypy, pytest)

### 6.2 Frontend (`apps/web`)

- Next.js + TypeScript app
- Tailwind CSS + design-system foundation (tokens, primitives)
- Responsive layout architecture (mobile app-like / desktop web)
- Route groups: `customer`, `shopkeeper`, `rider`, `admin`
- Supabase Auth client integration (Phone OTP)
- API client foundation (typed, env-driven base URL)
- PWA shell (manifest, service worker) — non-transactional cache only
- SEO foundation (metadata, canonical, sitemap, robots, structured data)
- Analytics event layer

### 6.3 Backend (`backend`)

- FastAPI app shell, `main.py`, `/api/v1` versioning
- Domain folders: `auth, users, shops, products, inventory, carts, orders, payments, deliveries, riders, notifications, complaints, admin`
- Per-domain separation: router / schema / service / repository / tests
- `core/`: config, security, deps, exceptions, logging, DB session
- Supabase JWT verification dependency
- RBAC dependency (`customer, shopkeeper, rider, admin, super_admin`)
- Health endpoint (`/health`) + DB connectivity check
- Consistent error response envelope
- Rate limiting, secure headers, CORS

### 6.4 Database / migrations

- PostgreSQL schema per the (missing) ERD
- Version-controlled migration tool (Alembic) + migration workflow
- Constraints: PKs, FKs, unique, check, indexes, timestamps, cascades
- Idempotent migration discipline

### 6.5 Payments

- Razorpay integration (UPI/online + COD)
- Server-side signature verification
- Idempotent webhook handler

### 6.6 Infrastructure

- `docker-compose.yml` (postgres, backend, web, optional redis)
- Environment strategy: development / staging / production
- `.env.example` with documented placeholders (no secrets)

### 6.7 Documentation

- All 13 documents listed in §0 (none present)
- `docs/ADR/`, `docs/API/`, `docs/DATABASE/`, `docs/DEVELOPMENT.md`

---

## 7. Architectural Conflicts

No conflicts can exist yet (empty repo). The notable **risk** is that the only spec we have (the Master Prompt) is high-level on data and API details. Building domains without a ratified ERD/API spec will create conflicts later. Mitigation: author `docs/DATABASE/SCHEMA.md` and `docs/API/` before implementing each domain.

---

## 8. Security Concerns

- No authentication or authorization is in place (trivially true — nothing exists).
- Phase 0 must enforce the trust boundary from day one:
  - Supabase Auth = identity/session only.
  - FastAPI = business authorization (never trust frontend role/price/total/inventory/payment flags).
  - Secrets via env only; `.env.example` ships placeholders; `.gitignore` blocks real secrets.
- Payment verification must be server-side and webhook-idempotent (Razorpay signature + event dedup).

---

## 9. Dependency Concerns

No dependencies exist yet. Recommended selections (to be ratified in ADRs):

| Concern        | Recommendation                               | Rationale                      |
| -------------- | -------------------------------------------- | ------------------------------ |
| Frontend       | Next.js (App Router) + TypeScript + Tailwind | Master Prompt §5               |
| Auth client    | `@supabase/supabase-js`                      | Supabase Auth                  |
| Backend web    | FastAPI + Uvicorn                            | Master Prompt §7               |
| Backend DB     | SQLAlchemy 2.0 (async) + Alembic             | Standard, migrations versioned |
| DB driver      | `asyncpg`                                    | Async PostgreSQL               |
| Validation     | Pydantic v2                                  | Ships with FastAPI             |
| Migrations     | Alembic                                      | Version-controlled schema      |
| Payments       | `razorpay` Python SDK                        | Master Prompt §13              |
| Settings       | Pydantic Settings                            | Typed env config               |
| Tests (BE)     | pytest + pytest-asyncio + httpx              | Master Prompt §23              |
| Tests (FE)     | Vitest + Playwright (E2E)                    | Master Prompt §23              |
| Python tooling | `uv` or Poetry + ruff + mypy                 | Master Prompt §22              |
| JS tooling     | pnpm workspaces + ESLint + Prettier          | Master Prompt §22              |
| Container      | Docker + docker-compose                      | Master Prompt §30              |

Keep the stack a **modular monolith** (Next.js → FastAPI → PostgreSQL). Do **not** introduce Kubernetes, microservices, message buses, or Redis unless a concrete Phase-1 requirement justifies it (Master Prompt §30).

---

## 10. Stop Conditions Encountered

Per Master Prompt §32, the following require a decision before proceeding past Phase 0:

1. **Missing source-of-truth documentation.** The PRD, ERD/DB schema, API spec, RBAC matrix, and workflows are absent. Implementing business domains (orders, inventory, payments) without them would require guessing business rules — explicitly prohibited (§3, §32).
2. **Ambiguous database requirements.** No ERD → cannot safely create tables. Must author `docs/DATABASE/SCHEMA.md` first.
3. **Ambiguous payment behavior.** Razorpay flow details (capture mode, refund rules, settlement) undefined.
4. **No credentials provided.** Supabase project, PostgreSQL, and Razorpay keys are unavailable locally — acceptable for scaffolding (placeholders), but blocks live integration testing.

---

## 11. Recommended Implementation Sequence

Aligned to Master Prompt §26 (`AUDIT → FOUNDATION → AUTH → DB → CUSTOMER → SHOP → ORDER → RIDER → ADMIN → PAYMENT → REALTIME → ANALYTICS → TESTING → STAGING`).

### Phase 0 — Foundation (can begin immediately)

1. Monorepo structure + `.gitignore` + `.env.example` + `README.md`
2. `apps/web` Next.js + TS + Tailwind + design tokens + responsive layout shell
3. `backend` FastAPI shell + `/health` + config + error envelope + logging
4. PostgreSQL + Alembic bootstrap + DB connectivity check
5. Supabase Auth client (FE) + JWT verification dependency (BE) + RBAC skeleton
6. Typed API client (FE) + `/api/v1` versioning (BE)
7. Docker Compose local dev
8. Lint/format/typecheck + CI foundation (`.github/workflows`)
9. `docs/DEVELOPMENT.md`, `docs/ADR/0001-*.md` (stack choices)

### Phase 1a — First vertical slice (requires DB/API docs first)

Auth → DB schema → Customer (login, profile, shops, products, cart, checkout, create order) → Shopkeeper (dashboard, incoming order). **Stop and verify end-to-end** before adding rider delivery (Master Prompt §28).

### Phase 1b onward

Rider delivery → Admin → Payments → Realtime → Analytics → Testing hardening → Staging.

---

## 12. Decisions Required Before Phase 1a

1. Confirm we proceed with Phase 0 using the **Master Prompt as the de-facto spec**, given the detailed docs are missing.
2. Confirm whether the missing documents (especially ERD/DB schema and API spec) will be **supplied** or should be **authored by us** as ADRs/spec docs during implementation.
3. Confirm stack selections in §9 (or provide alternates) before scaffolding.

---

## 13. Recommendation

Proceed to **Phase 0 (Foundation)** now — it requires no business-rule guessing and unblocks all subsequent work. Treat the Master Prompt as the working spec, and author `docs/DATABASE/SCHEMA.md` + `docs/API/` as the immediate next artifacts (before any business domain code) so Phase 1a is built against a ratified, reviewable contract rather than ad-hoc decisions.
