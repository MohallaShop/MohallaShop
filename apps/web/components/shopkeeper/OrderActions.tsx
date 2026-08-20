'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { acceptOrder, markPreparing, markReady, rejectOrder } from '@/lib/api/shopkeeper'
import type { OrderStatus } from '@/lib/api/types'

type Action = 'accept' | 'reject' | 'preparing' | 'ready'

/**
 * Shopkeeper order transitions. The backend owns the state machine; the buttons
 * offered here match the *currently allowed* transitions only. A concurrent
 * change in another tab is surfaced as a 409 and the page re-fetches truth.
 */
export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function run(action: Action) {
    setError(null)
    setBusy(action)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/shop/orders/' + orderId)
        return
      }
      switch (action) {
        case 'accept':
          await acceptOrder(token, orderId)
          break
        case 'reject':
          await rejectOrder(token, orderId, { reason: rejectReason || undefined })
          break
        case 'preparing':
          await markPreparing(token, orderId)
          break
        case 'ready':
          await markReady(token, orderId)
          break
      }
      setConfirmReject(false)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'illegal_state_transition') {
        setError('This order has changed. Refreshing…')
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

      {status === 'pending_shop' ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run('accept')} isLoading={busy === 'accept'}>
            Accept order
          </Button>
          <Button variant="danger" onClick={() => setConfirmReject(true)} disabled={busy !== null}>
            Reject
          </Button>
        </div>
      ) : null}

      {status === 'accepted' ? (
        <Button onClick={() => run('preparing')} isLoading={busy === 'preparing'}>
          Mark as preparing
        </Button>
      ) : null}

      {status === 'preparing' ? (
        <Button onClick={() => run('ready')} isLoading={busy === 'ready'}>
          Mark ready for pickup
        </Button>
      ) : null}

      {confirmReject ? (
        <div className="border-border bg-surface mt-3 rounded-2xl border p-4">
          <label htmlFor="reject_reason" className="text-content block text-sm font-medium">
            Reason <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="reject_reason"
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={300}
            className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2 text-sm outline-none"
            placeholder="e.g. Item out of stock"
          />
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={() => run('reject')} isLoading={busy === 'reject'}>
              Confirm reject
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmReject(false)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'ready_for_pickup' || status === 'rejected' || status === 'cancelled' ? (
        <p className="text-muted text-sm">No further actions for this order.</p>
      ) : null}
    </div>
  )
}
