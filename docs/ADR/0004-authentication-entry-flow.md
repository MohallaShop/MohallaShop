# ADR-0004 — Authentication entry flow (role-first, customer-primary)

- **Status:** Accepted
- **Date:** 2026-08-10
- **Phase:** 1a

## Context

The Phase 0 login was a bare phone-OTP form with no role context, while the
landing page presented Shopkeeper/Rider/Admin cards with no customer entry
point. MohallaShop is a consumer marketplace first: a normal user should get
into the marketplace with the least friction, and internal roles must not make
the primary experience confusing (Master Prompt §1, §5, §6).

## Decision

### Consumer-first landing

The landing page leads with **Start shopping** → `/login?role=customer`.
Shopkeeper and rider get secondary, visible entry links ("Manage your shop",
"Become a rider"). **Admin is not exposed on the landing page** — it is an
internal role reachable only via a discreet "Platform administrator? Sign in"
link on the login role screen or a direct URL. Admin access is always
controlled by server-side RBAC (ADR-0002); frontend visibility is not
authorization.

### Role-first authentication flow

```
Role selection → Authentication method → Authentication → Role-specific surface
```

1. **Role selection** (`/login?role=<role>`): Customer (primary, highlighted),
   Shopkeeper, Rider. Admin via discreet link.
2. **Method selection:** Continue with Email or Phone. Google OAuth is shown
   disabled with a "coming soon" note until it is configured in Supabase
   (ADR-0002 — never fake an auth method).
3. **Authentication:** Supabase Email OTP or Phone OTP (no passwords stored;
   Supabase remains the identity provider).
4. **Destination:** the verified JWT's `app_metadata.roles` decides the landing
   (`/home`, `/shop`, `/rider/dashboard`, `/admin/dashboard`); the `next` query
   parameter (sanitized) is honoured first.

### Role selection is UX, never authorization

Selecting "Shopkeeper" grants nothing. The destination is derived from the
verified token; a user whose actual role differs is routed to their own area.
FastAPI `require_roles` remains the security boundary (§7 of the master
prompt). Route guards in Next.js middleware are UX-only (auth + coarse role
per surface).

### Route protection (middleware)

| Area                    | Guard                      |
| ----------------------- | -------------------------- |
| `/` `/about` `/login`   | public                     |
| `/home` `/shops` … etc. | authenticated              |
| `/shop/*`               | authenticated + shopkeeper |
| `/rider/*`              | authenticated + rider      |
| `/admin/*`              | authenticated + admin      |

### Onboarding

No forced onboarding in Phase 1a: profile completion is optional
(`display_name` is nullable). After authentication the user lands on their
surface; profile/address setup is available in-app and is never re-asked once
saved.

## Consequences

- Existing phone-authenticated users keep their identities and roles; nothing
  in `users`, roles, or JWT claims changes. The phone implementation remains
  intact but is **disabled in the UI** ("Coming soon") until the Supabase SMS
  provider is configured and live-tested — the code is re-enabled by flipping
  `phone.enabled` in `apps/web/lib/config/auth.ts`.
- New signups (email) with no `app_metadata.roles` are treated as customers by
  the backend (ADR-0002 role-less default).
- Email OTP is the customer entry flow. Both Supabase email variants work:
  a template with `{{ .Token }}` sends the numeric code entered in the OTP UI;
  a template with `{{ .ConfirmationURL }}` sends a magic link that lands on
  `/auth/callback` (PKCE `code` or `token_hash` verify) and completes sign-in
  there. `signInWithOtp` passes `emailRedirectTo = /auth/callback?next=…`, so
  that URL must be registered under Supabase → Authentication → URL
  Configuration → Redirect URLs.
- Google sign-in remains visibly "coming soon" until the provider is
  configured; documentation must make the enablement steps explicit.
