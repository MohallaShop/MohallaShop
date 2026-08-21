'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { goOffline, goOnline } from '@/lib/api/rider'

/**
 * Rider availability toggle. Going online also triggers a catch-up pass on
 * the backend: orders that were readied while nobody was online are assigned
 * to this rider if they are the least loaded.
 */
export function RiderStatusCard({
  isOnline,
  activeDeliveries,
}: {
  isOnline: boolean
  activeDeliveries: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setError(null)
    setBusy(true)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/rider/dashboard')
        return
      }
      if (isOnline) {
        await goOffline(token)
      } else {
        await goOnline(token)
      }
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'conflict') {
        setError('Your availability changed elsewhere. Refreshing…')
        setTimeout(() => router.refresh(), 800)
      } else {
        setError(classifyError(err).message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-border bg-surface shadow-card rounded-2xl border p-6 text-center">
      <p className="text-muted text-sm">You are currently</p>
      <p className={`mt-1 text-xl font-bold ${isOnline ? 'text-success' : 'text-content'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </p>

      {isOnline ? (
        <p className="text-muted mt-2 text-sm">
          {activeDeliveries > 0
            ? `${activeDeliveries} active ${activeDeliveries === 1 ? 'delivery' : 'deliveries'}`
            : 'Waiting for a delivery to be assigned.'}
        </p>
      ) : (
        <p className="text-muted mt-2 text-sm">
          Go online to receive delivery assignments from nearby shops.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}

      <Button
        className="mt-4"
        fullWidth
        variant={isOnline ? 'outline' : 'primary'}
        onClick={toggle}
        isLoading={busy}
      >
        {isOnline ? 'Go offline' : 'Go online'}
      </Button>
    </div>
  )
}
