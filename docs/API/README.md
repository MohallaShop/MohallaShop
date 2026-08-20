# API Specification (v1)

This directory holds the FastAPI v1 API contract.

The interactive OpenAPI docs are available in development at
<http://localhost:8000/docs> (disabled in production).

## Status

Phase 0 ships the foundational endpoints:

- `GET /health` — liveness
- `GET /health/ready` — readiness (DB ping)
- `GET /api/v1/auth/me` — current verified principal

Domain endpoints (shops, products, cart, orders, …) are specified and
implemented per vertical slice starting in **Phase 1a**. Each domain's contract
is documented here before its code lands, following the consistent error
envelope defined in `backend/app/core/exception_handlers.py`:

```json
{ "error": { "code": "not_found", "message": "...", "details": {} } }
```
