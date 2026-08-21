'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/StateFeedback'
import { ApiError } from '@/lib/api/client'
import { addFavoriteShop, removeFavoriteShop } from '@/lib/api/favorites'

export function RemoveFavoriteButton({ token, favoriteId }: { token: string; favoriteId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await removeFavoriteShop(token, favoriteId)
      router.refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
        {busy ? <Spinner /> : 'Remove'}
      </Button>
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </div>
  )
}

export function FavoriteToggle({
  token,
  shopId,
  initialFavoriteId,
}: {
  token: string | null
  shopId: string
  initialFavoriteId: string | null
}) {
  const [favoriteId, setFavoriteId] = useState<string | null>(initialFavoriteId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isFavorite = favoriteId !== null

  async function toggle() {
    // Saving a shop is an account action — guests are asked to sign in and
    // come straight back (guest browsing, ADR-0006).
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(pathname ?? '/shops')}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (favoriteId) {
        await removeFavoriteShop(token, favoriteId)
        setFavoriteId(null)
      } else {
        const fav = await addFavoriteShop(token, shopId)
        setFavoriteId(fav.id)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update favorite.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={isFavorite ? 'secondary' : 'outline'}
      onClick={toggle}
      disabled={busy}
    >
      {busy ? <Spinner /> : isFavorite ? '★ Saved' : '☆ Save shop'}
      {error ? <span className="text-danger ml-2 text-xs">{error}</span> : null}
    </Button>
  )
}
