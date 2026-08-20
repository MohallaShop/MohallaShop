import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rolesFromAppMetadata } from '@/lib/auth/redirect'
import type { Role } from './types'

/**
 * Server-side access token retrieval.
 *
 * The Supabase session (refreshed by middleware on every navigation) carries
 * the access JWT we forward to FastAPI as `Authorization: Bearer <token>`.
 * FastAPI verifies it server-side (ADR-0002) — the frontend never authorizes.
 */

export interface ServerAuth {
  token: string
  userId: string
  roles: Role[]
}

/** Resolve the current server-side auth, or `null` if not authenticated. */
export async function getServerAuth(): Promise<ServerAuth | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token ?? null
  if (!token) return null
  return {
    token,
    userId: user.id,
    roles: rolesFromAppMetadata(user.app_metadata) as Role[],
  }
}

/**
 * Resolve server-side auth or redirect to the login page. Use in protected
 * server components/layouts where a missing session is unrecoverable.
 */
export async function requireServerAuth(next?: string): Promise<ServerAuth> {
  const auth = await getServerAuth()
  if (!auth) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  return auth
}

/** Bearer token only (for pure data-fetch helpers). Redirects if absent. */
export async function requireServerToken(next?: string): Promise<string> {
  const auth = await requireServerAuth(next)
  return auth.token
}
