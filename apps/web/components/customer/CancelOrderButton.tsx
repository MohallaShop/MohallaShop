'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { cancelOrder } from '@/lib/api/orders'
import type { OrderStatus } from '@/lib/api/types'

/**
 * Cancel is only offered where the backend permits it (pending_shop, accepted).
 * The button is rendered server-side only for those states, but the backend
 * remains authoritative — an illegal transition returns 409 and is shown here.
 */
export function CancelOrderButton({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (status !== 'pending_shop' && status !== 'accepted') return null

  async function cancel() {
    setError(null)
    setLoading(true)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/orders/' + orderId)
        return
      }
      await cancelOrder(token, orderId)
      setConfirming(false)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'illegal_state_transition') {
        setError('This order can no longer be cancelled.')
        setConfirming(false)
        router.refresh()
      } else {
        setError(classifyError(err).message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      {!confirming ? (
        <Button variant="outline" onClick={() => setConfirming(true)} disabled={loading}>
          Cancel order
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">Cancel this order?</span>
          <Button variant="danger" size="sm" onClick={cancel} isLoading={loading}>
            Yes, cancel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
            Keep
          </Button>
        </div>
      )}
    </div>
  )
}
