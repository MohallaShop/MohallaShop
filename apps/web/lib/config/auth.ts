/**
 * Authentication entry configuration.
 *
 * Every method shown as active must actually work (ADR-0002 / Master Prompt
 * §14). A method stays listed but disabled ("Coming soon") until its provider
 * is configured AND live-tested in the Supabase project:
 *
 * - `email` — active. Requires the Supabase **Email OTP** template to include
 *   `{{ .Token }}` so the email carries the numeric verification code (see
 *   docs/DEVELOPMENT.md — a template relying only on `{{ .ConfirmationURL }}`
 *   sends a magic link, which the customer OTP flow does not use).
 * - `phone` — deferred. The SMS provider is NOT configured in Supabase yet;
 *   the implementation (`PhoneSignIn.tsx`) stays intact and is re-enabled by
 *   flipping `enabled` once SMS is configured and live-tested.
 * - `google` — deferred. Requires the Google provider + redirect URL in the
 *   Supabase dashboard before enabling.
 */

export type AuthMethod = 'google' | 'email' | 'phone'

export interface AuthMethodConfig {
  label: string
  enabled: boolean
  note?: string
}

export const AUTH_METHODS: Record<AuthMethod, AuthMethodConfig> = {
  google: {
    label: 'Google',
    enabled: false,
    note: 'Google sign-in is not enabled yet. Sign in with email.',
  },
  email: { label: 'Email', enabled: true },
  phone: {
    label: 'Phone',
    enabled: false,
    note: 'SMS sign-in is not enabled yet. Sign in with email.',
  },
}
