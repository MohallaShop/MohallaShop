# Database Schema

MohallaShop runs on PostgreSQL 16. Schema changes are made **only** through
Alembic migrations committed to `backend/alembic/versions/`.

## Status

Phase 0 ships the database foundation:

- Async engine + session factory (`backend/app/core/db.py`)
- Declarative `Base`
- Alembic bootstrap (`backend/alembic/env.py`, async-aware)

No tables exist yet — the first migration (e.g. `users`, `shops`) is created in
**Phase 1a** once `docs/DATABASE/SCHEMA.md` (the ERD-derived contract) is
ratified. Migrations will enforce primary/foreign keys, unique and check
constraints, indexes, timestamps, and appropriate cascade behaviour per the
Master Prompt §9.
