import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { landingFor, rolesFromAppMetadata, sanitizeNext } from '@/lib/auth/redirect'

/**
 * Auth callback — completes email magic-link sign-in.
 *
 * Supabase's default email template sends a link ({{ .ConfirmationURL }}),
 * not a numeric code. Clicking it lands here with either:
 *  - `?code=…`        (PKCE flow — exchanged for a session), or
 *  - `?token_hash=…&type=…` (direct token-hash verify)
 *
 * On success the user is routed to the sanitized `next` target or their
 * role-based landing (ADR-0002/0004). The numeric-code path in EmailSignIn
 * keeps working unchanged for templates that send `{{ .Token }}`.
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
    const target = next ?? landingFor(rolesFromAppMetadata(user?.app_metadata))
    return NextResponse.redirect(new URL(target, origin))
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback', origin))
}

/**
 * Idempotently ensure the backend has a `users` row for this identity (same
 * best-effort bootstrap the OTP UI flow performs in LoginFlow.onSuccess).
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
