'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { completeDelivery, failDelivery, pickDelivery } from '@/lib/api/rider'
import type { DeliveryStatus } from '@/lib/api/types'

type Action = 'pick' | 'complete' | 'fail'

/**
 * Rider delivery transitions. The backend owns the state machine; only the
 * currently allowed actions are offered. A concurrent change in another tab
 * surfaces as a 409 and the page re-fetches truth.
 */
export function DeliveryActions({
  deliveryId,
  status,
}: {
  deliveryId: string
  status: DeliveryStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmFail, setConfirmFail] = useState(false)
  const [failReason, setFailReason] = useState('')

  async function run(action: Action) {
    setError(null)
    setBusy(action)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/rider/deliveries')
        return
      }
      switch (action) {
        case 'pick':
          await pickDelivery(token, deliveryId)
          break
        case 'complete':
          await completeDelivery(token, deliveryId)
          break
        case 'fail':
          await failDelivery(token, deliveryId, { reason: failReason || undefined })
          break
      }
      setConfirmFail(false)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'illegal_state_transition') {
        setError('This delivery has changed. Refreshing…')
        setTimeout(() => router.refresh(), 800)
      } else {
        setError(classifyError(err).message)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="text-danger mb-3 text-sm">
          {error}
        </p>
      ) : null}

      {status === 'assigned' ? (
        <Button onClick={() => run('pick')} isLoading={busy === 'pick'}>
          Pick up
        </Button>
      ) : null}

      {status === 'picked_up' ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run('complete')} isLoading={busy === 'complete'}>
            Mark delivered
          </Button>
          <Button variant="danger" onClick={() => setConfirmFail(true)} disabled={busy !== null}>
            Mark failed
          </Button>
        </div>
      ) : null}

      {confirmFail ? (
        <div className="border-border bg-surface mt-3 rounded-2xl border p-4">
          <label htmlFor="fail_reason" className="text-content block text-sm font-medium">
            Reason <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="fail_reason"
            rows={2}
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            maxLength={500}
            className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2 text-sm outline-none"
            placeholder="e.g. Customer not reachable"
          />
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={() => run('fail')} isLoading={busy === 'fail'}>
              Confirm failure
            </Button>
            <Button variant="ghost" onClick={() => setConfirmFail(false)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'delivered' ? (
        <p className="text-success text-sm">Delivered — nothing left to do.</p>
      ) : null}
      {status === 'failed' ? (
        <p className="text-muted text-sm">This attempt failed and the order was reassigned.</p>
      ) : null}
    </div>
  )
}
