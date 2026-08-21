'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { classifyError } from '@/lib/api/errors'
import { getBrowserToken } from '@/lib/api/browser'
import { getAdminUser, updateAdminUserRoles } from '@/lib/api/admin'
import { PLATFORM_ROLES, type PlatformRole } from '@/lib/api/types'

const ROLE_HINTS: Record<PlatformRole, string> = {
  customer: 'Shop and place orders (default for everyone)',
  shopkeeper: 'Own and manage a shop',
  rider: 'Pick up and deliver orders',
  admin: 'Access the admin console',
  super_admin: 'Unrestricted — grant sparingly',
}

/**
 * Inline role editor for one user. Roles live in the Supabase JWT
 * (app_metadata.roles), so editing them calls the Supabase Admin API through
 * the backend — and the user is force-signed-out: they must sign in again
 * before the new roles take effect.
 */
export function UserRolesEditor({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setOpen(true)
    setLoading(true)
    setError(null)
    setConfirmed(false)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/admin/customers')
        return
      }
      const detail = await getAdminUser(token, userId)
      setRoles(rolesFrom(detail.roles))
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setLoading(false)
    }
  }

  function toggle(role: PlatformRole) {
    setConfirmed(false)
    setRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
    )
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const token = await getBrowserToken()
      if (!token) return
      await updateAdminUserRoles(token, userId, roles)
      setConfirmed(true)
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={load}>
        Manage roles
      </Button>
    )
  }

  return (
    <div className="border-border bg-background w-full rounded-xl border p-4 text-left">
      {loading ? (
        <p className="text-muted text-sm">Loading roles…</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_ROLES.map((role) => (
              <label key={role} className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggle(role)}
                  className="accent-brand-600 mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="text-content text-sm font-semibold">{role}</span>
                  <span className="text-muted block text-xs">{ROLE_HINTS[role]}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-muted mt-3 text-xs">
            An empty selection means a plain customer. Saving signs the user out everywhere — they
            must sign in again for the new roles to apply.
          </p>
        </>
      )}

      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}
      {confirmed ? (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <Badge tone="success">saved</Badge>
          <span className="text-muted">User signed out; changes apply at next sign-in.</span>
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save} disabled={loading} isLoading={saving}>
          Save roles
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
          Close
        </Button>
      </div>
    </div>
  )
}

/** Keep only known roles, deduped, order-stable. */
function rolesFrom(raw: string[]): PlatformRole[] {
  const known = new Set<string>(PLATFORM_ROLES)
  return raw.filter((r) => known.has(r)) as PlatformRole[]
}
