'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { getBrowserToken } from '@/lib/api/browser'
import { setAdminShopStatus, type AdminShopStatusTarget } from '@/lib/api/admin'

interface Action {
  target: AdminShopStatusTarget
  label: string
  variant?: 'primary' | 'danger' | 'ghost' | 'outline'
  confirm?: string
}

/** Legal actions per current shop status (mirrors the backend transition map). */
const ACTIONS_BY_STATUS: Record<string, Action[]> = {
  pending: [{ target: 'active', label: 'Approve' }],
  active: [
    { target: 'suspended', label: 'Suspend', variant: 'danger', confirm: 'Suspend this shop?' },
    { target: 'inactive', label: 'Close', variant: 'outline', confirm: 'Close this shop?' },
  ],
  suspended: [
    { target: 'active', label: 'Restore' },
    { target: 'inactive', label: 'Close', variant: 'outline', confirm: 'Close this shop?' },
  ],
  inactive: [{ target: 'active', label: 'Reopen' }],
}

/**
 * Admin shop lifecycle controls (approve / suspend / restore / close).
 * The backend rejects illegal transitions; we also only offer legal ones.
 */
export function ShopStatusActions({ shopId, status }: { shopId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const actions = ACTIONS_BY_STATUS[status] ?? []

  async function apply(action: Action) {
    if (action.confirm && !window.confirm(action.confirm)) return
    setError(null)
    setBusy(action.target)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/admin/shops')
        return
      }
      await setAdminShopStatus(token, shopId, action.target)
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setBusy(null)
    }
  }

  if (actions.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {actions.map((a) => (
          <Button
            key={a.target}
            size="sm"
            variant={a.variant ?? 'primary'}
            onClick={() => apply(a)}
            disabled={busy !== null}
            isLoading={busy === a.target}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {error ? (
        <span role="alert" className="text-danger text-xs">
          {error}
        </span>
      ) : null}
    </div>
  )
}
