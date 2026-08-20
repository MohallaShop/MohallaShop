# ADR-0001 — Technology stack and architecture (Phase 1)

- **Status:** Accepted
- **Date:** 2026-08-09
- **Phase:** 0 (Foundation)

## Context

MohallaShop is in Phase 1 (Web MVP validation). We must choose a stack that is
fast to build, cheap to operate at pilot scale, and able to grow without a
rewrite. The Master Coding Prompt constrains the high-level choices
(Next.js + FastAPI + PostgreSQL + Supabase Auth); this ADR records the
specific tooling selected and the **modular monolith** posture.

## Decision

| Layer        | Choice                                                            |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| Auth client  | `@supabase/ssr` (cookie-based sessions)                           |
| Backend      | FastAPI · Python 3.11+                                            |
| ORM / DB     | SQLAlchemy 2.0 (async) · asyncpg · PostgreSQL 16                  |
| Migrations   | Alembic (async-aware)                                             |
| Settings     | pydantic-settings                                                 |
| Logging      | structlog (JSON in prod, console in dev)                          |
| Rate limit   | slowapi                                                           |
| Payments     | Razorpay (Phase 1b)                                               |
| Tooling (JS) | pnpm workspaces · ESLint · Prettier · Vitest                      |
| Tooling (Py) | uv · ruff · mypy (strict) · pytest                                |
| Infra (dev)  | Docker Compose (PostgreSQL)                                       |

**Architecture:** a single deployable backend (modular monolith) and a single
web client. Domains live as folders under `backend/app/`, each with
router/schema/service/repository/tests separation.

## Alternatives considered

- **Microservices / event bus / Kubernetes:** rejected for Phase 1 — premature
  complexity, no requirement justifies it. Adopted posture: add Redis/queues/
  services only when a concrete need appears.
- **Flutter native apps:** explicitly out of scope for Phase 1 (per Master
  Prompt). One responsive web client serves all four roles.
- **Prisma/Drizzle on the backend:** rejected — Python backend uses SQLAlchemy.
- **Node/Express backend:** rejected in favour of FastAPI (Python) per spec.

## Consequences

- One language per side (TS frontend, Python backend); shared contracts are
  authored in `docs/API/` before each domain.
- Async DB stack (asyncpg + SQLAlchemy async) requires an event loop in tests
  and in Alembic (handled in `alembic/env.py`).
- uv.lock and pnpm-lock.yaml are committed for reproducible installs.
