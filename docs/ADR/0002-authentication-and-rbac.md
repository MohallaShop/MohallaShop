# ADR-0002 — Authentication and authorization

- **Status:** Accepted
- **Date:** 2026-08-09 (updated 2026-08-10: email OTP, role-less default, Google deferred)
- **Phase:** 0 (Foundation)

## Context

MohallaShop authenticates users via **Supabase Auth (Phone OTP + Email OTP)**.
We must define a clear trust boundary: Supabase establishes _who you are_
(identity), but the FastAPI backend must independently authorize _what you may
do_. The frontend must never be trusted for role, price, totals, inventory, or
payment status (Master Prompt §8, §20).

## Decision

### Flow

```
User → Supabase Auth (Phone OTP | Email OTP) → Supabase session/JWT (ES256/JWKS)
      → Next.js (@supabase/ssr, cookie session)
      → FastAPI request with Authorization: Bearer <jwt>
      → core.security.verify_access_token (signature + expiry)
      → Principal (user_id, phone, email, roles)
      → dependency authorization (require_roles)
```

### Token verification

- Tokens are verified server-side using PyJWT (`app/core/security.py`) in one
  of two modes:
  - **HS256 (legacy projects):** verify with the project **JWT secret**
    (`SUPABASE_JWT_SECRET`).
  - **JWKS (new projects):** verify against the project's asymmetric signing
    key published at `SUPABASE_JWKS_URL` (RS256/ES256; e.g.
    `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`). `PyJWKClient` resolves the
    key by token `kid` and caches it; the JWKS is re-fetched on kid miss so key
    rotation needs no restart. JWKS mode takes precedence when configured.
- The verifier requires `exp` and `sub`; audience is not enforced (Supabase's
  default). Neither mode changes the `Principal` API.

### Roles & RBAC

Roles live in the Supabase user's `app_metadata.roles` claim, so they travel
inside the verified JWT. Roles: `customer`, `shopkeeper`, `rider`, `admin`,
`super_admin` (`app/auth/roles.py`).

- `get_current_principal` — verifies the bearer token, returns a `Principal`.
- `require_roles(*roles)` — FastAPI dependency enforcing role membership;
  `super_admin` implicitly satisfies any requirement.
- Unknown roles in a token are ignored (forward-compatible).
- **Role-less default:** a verified principal with **no** roles is treated as
  `customer` (server-side, in `principal_from_claims`). Roles are additive
  privileges granted server-side; a role-less token can only ever reach
  customer endpoints because every shopkeeper/rider/admin route declares its
  roles via `require_roles`. This keeps fresh email/phone signups working on
  the marketplace without any frontend role assignment. Frontend role
  _selection_ never grants or implies roles (see ADR-0004).

### Authentication methods

| Method       | Status                  | Notes                                                                                                                                                                                         |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email OTP    | ✅ active               | `signInWithOtp({ email })` + `verifyOtp(type: 'email')` — customer entry flow                                                                                                                 |
| Phone OTP    | ⏸️ deferred (code kept) | `signInWithOtp({ phone })` + `verifyOtp(type: 'sms')` implemented but **disabled in the UI** until an SMS provider is configured and live-tested in Supabase (`PhoneSignIn.tsx` stays intact) |
| Google OAuth | ⏸️ deferred             | Not configured in the Supabase project; UI shows it disabled until enabled                                                                                                                    |

**Supabase email template requirement (Email OTP).** The **Email OTP** template
under Authentication → Emails → Templates must include `{{ .Token }}` so the
email carries the numeric verification code, e.g. "Your MohallaShop verification
code is: {{ .Token }}". A template that relies only on `{{ .ConfirmationURL }}`
sends a magic link instead of a code, which the customer OTP flow does not use
(the frontend never shows an OTP input unless the code was actually sent).

**Deferred methods.** Phone and Google are not shown as functional: the UI marks
them "Coming soon" and never navigates to a form for them (no fake auth,
Master Prompt §14). Enabling later requires configuring the provider in the
Supabase dashboard (SMS provider / Google provider + redirect URL) and flipping
the corresponding `enabled` flag in `apps/web/lib/config/auth.ts`. No other code
changes are required because tokens are verified exactly like any other Supabase
session.

### Frontend sessions

- `@supabase/ssr` manages auth cookies. `middleware.ts` refreshes the session on
  navigation. Server and browser Supabase clients are in `lib/supabase/`.
- Route protection (redirects for unauthenticated users) is layered on in
  Phase 1a.

## Consequences

- Role assignment is a server-side operation (writes `app_metadata` via the
  Supabase service-role key, never from the browser).
- Every privileged endpoint declares its roles via `Depends(require_roles(...))`.
- Revoking/refreshing roles requires re-issuing the JWT (Supabase handles token
  refresh).
