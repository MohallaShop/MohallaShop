# MohallaShop — Development Guide

This guide covers local setup, tooling, conventions, and workflows for
contributing to MohallaShop. Start with the [README](../README.md) for the
product overview, and [`IMPLEMENTATION_AUDIT.md`](./IMPLEMENTATION_AUDIT.md) for
the current state and roadmap.

---

## 1. Prerequisites

| Tool    | Version       | Notes                                |
| ------- | ------------- | ------------------------------------ |
| Node.js | ≥ 20 (22 LTS) | Use `.nvmrc` (`nvm use`)             |
| pnpm    | ≥ 10          | Package manager for the monorepo     |
| Python  | ≥ 3.11        | Backend runtime                      |
| uv      | ≥ 0.6         | Python dependency + venv management  |
| Docker  | latest        | Optional, for PostgreSQL via compose |
| Git     | ≥ 2.40        | —                                    |

---

## 2. Repository layout

```text
apps/web/        Next.js frontend (Customer / Shopkeeper / Rider / Admin)
backend/         FastAPI backend (domain-organized modular monolith)
packages/        Shared TS packages (reserved for future use)
infrastructure/  Deployment configs (reserved)
docs/            Audit, ADRs, API & database specs, this guide
.github/         CI workflows
```

---

## 3. First-time setup

```bash
# 1. Clone
git clone <repo-url> MohallaShop && cd MohallaShop

# 2. Frontend + workspace deps
pnpm install

# 3. Backend deps (creates backend/.venv)
cd backend && uv sync --extra dev && cd ..

# 4. Environment files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# 5. Start PostgreSQL (or use an existing local instance)
docker compose up -d db

# 6. Apply migrations
cd backend && uv run alembic upgrade head && cd ..

# 7. Run the apps (two terminals)
pnpm dev
uv run --directory backend uvicorn app.main:app --reload --port 8000
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000/api/v1>
- Health: <http://localhost:8000/health>
- Docs (dev only): <http://localhost:8000/docs>

---

## 4. Environment variables

All variables are documented in [`.env.example`](../.env.example) and
[`apps/web/.env.local.example`](../apps/web/.env.local.example). Rules:

- **Never** commit real secrets. Real `.env*` files are git-ignored.
- Frontend-exposed vars **must** be prefixed `NEXT_PUBLIC_`.
- The service-role Supabase key and Razorpay secrets are **server-only** — never
  expose them to the browser bundle.

---

## 5. Common commands

### Root (monorepo)

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Run the frontend                |
| `pnpm build`     | Production build (frontend)     |
| `pnpm lint`      | Lint all workspaces             |
| `pnpm typecheck` | TypeScript check all workspaces |
| `pnpm test`      | Run frontend tests              |
| `pnpm format`    | Format the repo with Prettier   |

### Backend (inside `backend/`)

| Command                             | Description      |
| ----------------------------------- | ---------------- |
| `uv run ruff check .`               | Lint             |
| `uv run ruff format .`              | Format           |
| `uv run mypy app`                   | Type-check       |
| `uv run pytest`                     | Run tests        |
| `uv run alembic upgrade head`       | Apply migrations |
| `uv run alembic revision -m "name"` | New migration    |

### Frontend (inside `apps/web/`)

| Command           | Description       |
| ----------------- | ----------------- |
| `pnpm dev`        | Dev server        |
| `pnpm build`      | Production build  |
| `pnpm lint`       | ESLint            |
| `pnpm typecheck`  | `tsc --noEmit`    |
| `pnpm test`       | Vitest (run once) |
| `pnpm test:watch` | Vitest (watch)    |

---

## 6. Conventions

### Code style

- **TypeScript:** strict mode, no `any` without justification, `noUncheckedIndexedAccess`.
- **Python:** ruff (lint + format), mypy strict, type hints everywhere.
- One concern per file; no giant components or god-modules.

### Architecture

- Next.js → FastAPI → PostgreSQL (modular monolith). No microservices, Kubernetes,
  or message buses unless a concrete requirement demands it (see
  [ADR-0001](./ADR/0001-tech-stack.md)).
- **Trust boundary:** Supabase Auth establishes identity; FastAPI authorizes
  every business action. The frontend is never trusted for role, price, totals,
  inventory, or payment status (see [ADR-0002](./ADR/0002-authentication-and-rbac.md)).
- **Auth entry flow:** role-first login at `/login` (customer primary;
  shopkeeper/rider secondary; admin internal-only). Role selection is UX only —
  the verified JWT decides the destination, and FastAPI `require_roles` is the
  real boundary (see [ADR-0004](./ADR/0004-authentication-entry-flow.md)).
  Authentication methods: Supabase Email OTP (active) and Phone OTP (deferred).
  Google OAuth is deliberately disabled in the UI until it is configured in the
  Supabase project (see `apps/web/lib/config/auth.ts`).

### Auth provider setup (Supabase dashboard)

- **Email OTP (active).** Authentication → Emails → Templates → **Email OTP**
  must include `{{ .Token }}` so the email shows the numeric verification code —
  e.g. `Your MohallaShop verification code is: {{ .Token }}`. The frontend flow
  is `signInWithOtp({ email })` → user enters the code → `verifyOtp({ email,
token, type: 'email' })`. A template relying only on `{{ .ConfirmationURL }}`
  sends a magic link instead of a code and breaks the OTP flow.
- **Phone OTP (deferred).** The UI keeps Phone disabled ("Coming soon") until an
  SMS provider is configured (Authentication → Phone → Twilio or another
  provider) and delivery is live-tested. The implementation
  (`apps/web/components/auth/PhoneSignIn.tsx`) stays intact; re-enable by
  flipping `phone.enabled` in `apps/web/lib/config/auth.ts`.
- **Google OAuth (deferred).** Configure the provider + redirect URL in the
  Supabase dashboard, then flip `google.enabled` in
  `apps/web/lib/config/auth.ts`.
- Backend domains (`backend/app/<domain>/`) separate router / schema / service /
  repository / tests. No business logic inside route handlers.

### Database

- Schema changes are made **only** via Alembic migrations, committed to the repo.
- Never run destructive migrations against shared environments without sign-off.

---

## 7. Git workflow

Long-lived branches: `main` (releaseable), `develop` (integration).

Short-lived branches follow Conventional Commits:

```
feat(orders): implement order lifecycle
fix(inventory): prevent overselling during checkout
chore(ci): add typecheck step
docs(adr): record auth decision
```

Branch prefixes: `feature/*`, `fix/*`, `hotfix/*`, `chore/*`, `docs/*`.

CI (`.github/workflows/ci.yml`) runs on every push and PR: backend lint/typecheck/test
and frontend lint/typecheck/test/build must be green before merge.

---

## 8. Testing strategy (Phase 0 baseline)

- **Backend:** pytest + httpx (ASGI transport). Covers health, JWT verification,
  principal extraction, and RBAC. Domain tests (orders, inventory, payments) are
  added with each vertical slice in Phase 1a/1b.
- **Frontend:** Vitest + Testing Library for units/components. Playwright E2E for
  the full Customer→Shop→Rider flow is added in Phase 1a.

---

## 9. Where decisions live

- [`IMPLEMENTATION_AUDIT.md`](./IMPLEMENTATION_AUDIT.md) — current state, gaps, roadmap.
- [`ADR/`](./ADR/) — Architecture Decision Records (stack, auth, routes, …).
- [`API/`](./API/) and [`DATABASE/`](./DATABASE/) — authored before each domain in Phase 1a.
