import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { landingFor, rolesFromAppMetadata, sanitizeNext } from '@/lib/auth/redirect'

/**
 * Auth callback — completes email-link sign-in / email verification.
 *
 * Supabase's emails send a link ({{ .ConfirmationURL }}), not a numeric code.
 * Clicking it lands here with either:
 *  - `?code=…`        (PKCE flow — exchanged for a session), or
 *  - `?token_hash=…&type=…` (direct token-hash verify)
 *
 * On success the user is routed to the sanitized `next` target or their
 * role-based landing (ADR-0002/0004). This is the only path that verifies a
 * new password sign-up's email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNext(searchParams.get('next'))

  const supabase = await createClient()

  let authenticated = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authenticated = !error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authenticated = !error
  }

  if (authenticated) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await ensureBackendUser(supabase)
    await persistDisplayName(supabase, user?.user_metadata)
    const target = next ?? landingFor(rolesFromAppMetadata(user?.app_metadata))
    return NextResponse.redirect(new URL(target, origin))
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback', origin))
}

/**
 * Idempotently ensure the backend has a `users` row for this identity (same
 * best-effort bootstrap the sign-in UI performs in LoginFlow.onSuccess).
 */
async function ensureBackendUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    await fetch(`${base}/me/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
  } catch {
    // best-effort — the next authenticated call bootstraps anyway
  }
}

/**
 * Carry the display name captured at sign-up (`user_metadata.display_name`)
 * into the backend profile so the name survives without an extra client step.
 */
async function persistDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userMetadata: unknown,
) {
  const displayName = (userMetadata as { display_name?: unknown } | null)?.display_name
  if (typeof displayName !== 'string' || !displayName.trim()) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    await fetch(`${base}/me/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ display_name: displayName.trim() }),
      cache: 'no-store',
    })
  } catch {
    // best-effort — the profile can always be edited later
  }
}
