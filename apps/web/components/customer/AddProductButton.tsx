'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { addCartItem, clearCart } from '@/lib/api/cart'

/**
 * Add-to-cart trigger. Backend is authoritative: the single-shop rule is
 * enforced server-side (409 cart_cross_shop). On conflict we offer a clear
 * "switch shop" action that empties the cart and re-adds the item.
 */
export function AddProductButton({
  productId,
  shopId,
  disabled,
  quantity = 1,
  label = 'Add to cart',
  size = 'md',
  fullWidth,
}: {
  productId: string
  shopId: string
  disabled?: boolean
  quantity?: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function add() {
    setError(null)
    setConflict(false)
    setDone(false)
    setLoading(true)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/shops/' + shopId)
        return
      }
      await addCartItem(token, { product_id: productId, quantity })
      setDone(true)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'cart_cross_shop') {
        setConflict(true)
        return
      }
      setError(classifyError(err).message)
    } finally {
      setLoading(false)
    }
  }

  async function switchShop() {
    setError(null)
    setLoading(true)
    try {
      const token = await getBrowserToken()
      if (!token) return
      await clearCart(token)
      await addCartItem(token, { product_id: productId, quantity })
      setConflict(false)
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setLoading(false)
    }
  }

  if (conflict) {
    return (
      <div className="flex flex-col items-stretch gap-2">
        <p className="text-warning text-xs">
          Your cart has items from another shop. Empty it to shop here?
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={switchShop} isLoading={loading}>
            Empty &amp; add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConflict(false)} disabled={loading}>
            Keep cart
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          onClick={add}
          disabled={disabled}
          isLoading={loading}
          size={size}
          fullWidth={fullWidth}
        >
          {label}
        </Button>
        <span role="alert" className="text-danger text-xs">
          {error}
        </span>
      </div>
    )
  }

  return (
    <Button onClick={add} disabled={disabled} isLoading={loading} size={size} fullWidth={fullWidth}>
      {done ? 'Added ✓' : label}
    </Button>
  )
}
