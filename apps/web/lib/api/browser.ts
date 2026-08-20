'use client'

import { createClient } from '@/lib/supabase/client'
import { rolesFromAppMetadata } from '@/lib/auth/redirect'
import type { Role } from './types'

/**
 * Browser-side access token retrieval for client components that perform
 * mutations (cart, checkout, order actions). The backend remains the
 * authorization boundary; this only forwards the verified-session JWT.
 */

export interface BrowserAuth {
  token: string
  userId: string
  roles: Role[]
}

/** Resolve the current browser auth, or `null` if not authenticated. */
export async function getBrowserAuth(): Promise<BrowserAuth | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token ?? null
  if (!token) return null
  return { token, userId: user.id, roles: rolesFromAppMetadata(user.app_metadata) as Role[] }
}

export async function getBrowserToken(): Promise<string | null> {
  const auth = await getBrowserAuth()
  return auth?.token ?? null
}
