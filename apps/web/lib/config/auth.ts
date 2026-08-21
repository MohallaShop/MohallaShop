/**
 * Authentication entry configuration.
 *
 * Every method shown as active must actually work (ADR-0002). A method stays
 * listed but disabled ("Coming soon") until its provider is configured AND
 * live-tested in the Supabase project:
 *
 * - `email` — active. Email + password (`signInWithPassword` / `signUp`).
 *   New accounts verify via the link in Supabase's default "Confirm signup"
 *   email (`{{ .ConfirmationURL }}`), which lands on `/auth/callback` — no
 *   email template edits required. (The old one-time-code flow was removed:
 *   Supabase's default email templates do not carry `{{ .Token }}`.)
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
    note: 'Google sign-in is not enabled yet. Sign in with email and password.',
  },
  email: { label: 'Email', enabled: true },
  phone: {
    label: 'Phone',
    enabled: false,
    note: 'SMS sign-in is not enabled yet. Sign in with email and password.',
  },
}
