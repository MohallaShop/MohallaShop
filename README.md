# MohallaShop

> Neighbourhood commerce platform — connect local shops, customers, and riders.
> **Phase 1: Web MVP validation.**

MohallaShop is a single responsive web platform that serves four experiences from one codebase: **Customer**, **Shopkeeper**, **Rider**, and **Admin**. The web client is designed to feel app-like on mobile while providing a proper desktop application on larger screens.

Domain: `mohallashop.in`

---

## Status

🟢 **Phase 0 — Foundation** (in progress)

This phase establishes the repository, app shells, database, auth, and tooling.
Business domains (orders, inventory, payments, deliveries) are built in later phases — see [`docs/IMPLEMENTATION_AUDIT.md`](docs/IMPLEMENTATION_AUDIT.md) and the roadmap.

---

## Tech stack

| Layer       | Technology                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------ |
| Frontend    | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4                          |
| Backend     | FastAPI · Python 3.11+                                                                     |
| Database    | PostgreSQL 16 · SQLAlchemy 2.0 (async) · Alembic                                           |
| Auth        | Supabase Auth (Email OTP active; Phone OTP pending SMS provider) — JWT verified in FastAPI |
| Payments    | Razorpay (UPI/online + COD) — server-verified (Phase 1b)                                   |
| Tooling     | pnpm workspaces · uv · ESLint · Prettier · ruff · mypy · pytest · Vitest                   |
| Infra (dev) | Docker Compose (PostgreSQL)                                                                |

Architecture: **modular monolith** — `Next.js → FastAPI → PostgreSQL`.

---

## Repository layout

```text
mohallashop/
├── apps/
│   └── web/                 # Next.js frontend (customer/shopkeeper/rider/admin)
├── backend/                 # FastAPI backend (domain-organized)
│   ├── app/
│   │   ├── core/            # config, security (Supabase JWT), deps, db, exceptions
│   │   ├── api/v1/          # versioned API routers
│   │   ├── auth/            # auth domain
│   │   └── <domain>/        # shops, products, orders, ... (later phases)
│   ├── alembic/             # DB migrations
│   └── tests/
├── packages/                # shared TS packages (reserved)
├── infrastructure/          # deployment configs (reserved)
├── docs/                    # audit, ADRs, API, database, dev guide
├── .github/workflows/       # CI
├── docker-compose.yml       # local PostgreSQL
└── .env.example
```

---

## Quick start (local development)

### Prerequisites

- Node.js ≥ 20 · pnpm ≥ 10
- Python ≥ 3.11 · [uv](https://docs.astral.sh/uv/)
- Docker (only if you want Postgres via `docker compose`)

### 1. Clone & install dependencies

```bash
pnpm install                      # frontend + workspace deps
cd backend && uv sync && cd ..    # backend deps (creates .venv)
```

### 2. Configure environment

```bash
cp .env.example .env              # fill in Supabase + DB values
cp backend/.env.example backend/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Start PostgreSQL

```bash
docker compose up -d db           # or use a local PostgreSQL instance
```

### 4. Run database migrations

```bash
cd backend
uv run alembic upgrade head
cd ..
```

### 5. Run the apps

```bash
pnpm dev          # Next.js on http://localhost:3000
uv run --directory backend uvicorn app.main:app --reload --port 8000
```

Backend health: <http://localhost:8000/health>
API base: <http://localhost:8000/api/v1>

---

## Common scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start the frontend in dev mode  |
| `pnpm build`     | Production build (frontend)     |
| `pnpm lint`      | Lint all workspaces             |
| `pnpm typecheck` | TypeScript check all workspaces |
| `pnpm test`      | Run frontend tests              |
| `pnpm format`    | Format the repo with Prettier   |

Backend (run inside `backend/`):

| Command                       | Description            |
| ----------------------------- | ---------------------- |
| `uv run pytest`               | Run backend tests      |
| `uv run ruff check .`         | Lint                   |
| `uv run ruff format .`        | Format                 |
| `uv run mypy app`             | Type-check             |
| `uv run alembic upgrade head` | Apply migrations       |
| `uv run alembic revision -m`  | Create a new migration |

---

## Architecture notes

- **Auth boundary:** Supabase Auth handles identity/sessions. FastAPI authorizes every business action. The frontend is never trusted for role, price, totals, inventory, or payment status.
- **Order lifecycle** is enforced by a server-side state machine (see `docs/` once authored).
- **Inventory** is validated and decremented server-side at order creation to prevent overselling.
- **Payments** are verified server-side via Razorpay signature + idempotent webhooks.
- **No premature infra:** no Kubernetes, microservices, or message buses unless a concrete Phase-1 requirement demands it.

See [`docs/`](docs/) for the implementation audit, ADRs, and the development guide.

---

## Security

Never commit secrets. Real `.env` files are git-ignored. Only `.env.example` (placeholders) is tracked. See [`.env.example`](.env.example).

---

## License

Proprietary — © MohallaShop. All rights reserved.
