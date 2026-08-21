'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui/StateFeedback'
import { EmailPasswordAuth } from './EmailPasswordAuth'
import { createClient } from '@/lib/supabase/client'
import { landingFor, rolesFromAppMetadata, sanitizeNext } from '@/lib/auth/redirect'

/**
 * Authentication entry: email + password sign-in / sign-up in one card.
 *
 * There is deliberately no role or method selection step — customers are the
 * overwhelming majority, and the selected role never granted anything anyway:
 * the destination is derived from the verified JWT `app_metadata.roles`
 * (ADR-0002). Shopkeepers/riders/admins use the same form and land in their
 * own dashboard. A legacy `?role=` query parameter is tolerated and ignored.
 */
export function LoginFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const next = sanitizeNext(params.get('next'))
  const linkError = params.get('error')

  const [bootstrapping, setBootstrapping] = useState(false)

  // Already authenticated → go straight to the right surface.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(destinationFor(user.app_metadata, next))
    })
  }, [router, next])

  function onSuccess(user: unknown, token: string | null) {
    setBootstrapping(true)
    // Best-effort: ensure the backend has a user row for this identity so the
    // first authenticated call doesn't fail. /me/profile is idempotent.
    ensureBackendUser(token).finally(() => {
      router.replace(destinationFor((user as { app_metadata?: unknown })?.app_metadata, next))
      router.refresh()
    })
  }

  return (
    <div>
      {linkError === 'auth_callback' ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          That sign-in link didn&apos;t work (it may have expired or been opened on another device).
          Sign in below or request a new link.
        </p>
      ) : null}

      <EmailPasswordAuth onSuccess={onSuccess} next={next} />

      {bootstrapping ? (
        <div className="text-muted mt-4 flex items-center justify-center gap-2 text-sm">
          <Spinner className="text-brand-600 h-4 w-4" />
          Setting up your account
        </div>
      ) : null}
    </div>
  )
}

/** Landing route after a successful sign-in: honour `next`, else role-based. */
function destinationFor(appMetadata: unknown, next: string | null): string {
  if (next) return next
  return landingFor(rolesFromAppMetadata(appMetadata))
}

/**
 * Idempotently ensure the backend has a `users` row for this identity. The
 * profile endpoint bootstraps one on first call. Failures here are non-fatal —
 * the next authenticated call would create it anyway.
 */
async function ensureBackendUser(token: string | null): Promise<void> {
  if (!token) return
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    await fetch(`${base}/me/profile`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // ignore — bootstrap is best-effort
  }
}
