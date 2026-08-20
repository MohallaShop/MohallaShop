/**
 * Post-authentication destination resolution.
 *
 * The frontend never decides authorization (ADR-0002): role-aware landing
 * routes are a UX convenience derived from the verified JWT claims, never a
 * privilege grant. A user picking "Shopkeeper" without the role still lands on
 * their actual area.
 */

export type EntryRole = 'customer' | 'shopkeeper' | 'rider' | 'admin'

export const ENTRY_ROLES: EntryRole[] = ['customer', 'shopkeeper', 'rider', 'admin']

export function isEntryRole(value: string | null): value is EntryRole {
  return value !== null && (ENTRY_ROLES as string[]).includes(value)
}

/** Normalize `app_metadata.roles` (array or single string) into a string list. */
export function rolesFromAppMetadata(appMetadata: unknown): string[] {
  const raw = (appMetadata as { roles?: unknown } | null)?.roles
  if (Array.isArray(raw)) return raw.filter((r): r is string => typeof r === 'string')
  if (typeof raw === 'string') return [raw]
  return []
}

/**
 * Role-based landing page for an authenticated user. `super_admin` satisfies
 * admin; otherwise the highest-privileged role wins. Unrecognized roles fall
 * back to the customer marketplace.
 */
export function landingFor(roles: readonly string[]): string {
  if (roles.includes('super_admin') || roles.includes('admin')) return '/admin/dashboard'
  if (roles.includes('shopkeeper')) return '/shop'
  if (roles.includes('rider')) return '/rider/dashboard'
  return '/home'
}

/**
 * `next` is trusted only when it is a same-site pathname (no scheme, no
 * protocol-relative double slash, no backslash tricks).
 */
export function sanitizeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  if (next.includes('\\')) return null
  return next
}
