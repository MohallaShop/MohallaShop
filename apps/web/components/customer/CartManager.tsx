'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PackageIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { EmptyState } from '@/components/ui/StateFeedback'
import { classifyError } from '@/lib/api/errors'
import { getBrowserToken } from '@/lib/api/browser'
import { clearCart, deleteCartItem, getCart, updateCartItem } from '@/lib/api/cart'
import { productImageUrl } from '@/lib/catalog/productImages'
import { formatMoney } from '@/lib/utils/format'
import type { CartOut } from '@/lib/api/types'

export function CartManager({ initial }: { initial: CartOut }) {
  const router = useRouter()
  const [cart, setCart] = useState<CartOut>(initial)
  const [, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  async function refresh() {
    const token = await getBrowserToken()
    if (!token) {
      router.push('/login?next=/cart')
      return null
    }
    const fresh = await getCart(token)
    setCart(fresh)
    startTransition(() => router.refresh())
    return fresh
  }

  async function changeQty(itemId: string, quantity: number) {
    setError(null)
    setBusyId(itemId)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/cart')
        return
      }
      const updated = await updateCartItem(token, itemId, { quantity })
      setCart(updated)
    } catch (err) {
      setError(classifyError(err).message)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function removeItem(itemId: string) {
    setError(null)
    setBusyId(itemId)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/cart')
        return
      }
      const updated = await deleteCartItem(token, itemId)
      setCart(updated)
      startTransition(() => router.refresh())
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setBusyId(null)
    }
  }

  async function clearAll() {
    setError(null)
    setClearing(true)
    try {
      const token = await getBrowserToken()
      if (!token) return
      const updated = await clearCart(token)
      setCart(updated)
      startTransition(() => router.refresh())
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setClearing(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add items from a shop to get started."
        action={{ label: 'Browse shops', href: '/shops' }}
      />
    )
  }

  const subtotal = cart.items.reduce((sum, it) => sum + Number(it.line_total), 0)
  const firstShop = cart.shop_id

  return (
    <div>
      {error ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {cart.items.map((it) => {
          const imageUrl = productImageUrl({ name: it.product_name, image_url: it.image_url })
          return (
            <li
              key={it.id}
              className="border-border bg-surface shadow-card flex gap-3 rounded-2xl border p-4 sm:gap-4"
            >
              <div className="bg-surface-hover text-muted grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-xl">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={it.product_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <PackageIcon className="h-7 w-7" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-content truncate font-semibold">{it.product_name}</p>
                    <p className="text-muted text-xs">
                      {formatMoney(it.unit_price)} / {it.unit}
                    </p>
                  </div>
                  <p className="text-content shrink-0 font-semibold">
                    {formatMoney(it.line_total)}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantityStepper
                    value={it.quantity}
                    onChange={(q) => changeQty(it.id, q)}
                    disabled={busyId === it.id}
                    ariaLabel={`Quantity for ${it.product_name}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={busyId === it.id}
                    className="text-danger text-sm font-medium hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="border-border bg-surface shadow-card mt-6 rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="text-content font-semibold">Estimated subtotal</span>
          <span className="text-content text-lg font-bold">{formatMoney(subtotal)}</span>
        </div>
        <p className="text-muted mt-1 text-xs">
          Product prices and delivery charge are calculated when you place the order.
        </p>
        {firstShop ? (
          <p className="text-muted mt-1 text-xs">
            Single-shop cart — checkout creates one order.{' '}
            <button
              type="button"
              onClick={clearAll}
              disabled={clearing}
              className="text-danger hover:underline disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Empty cart to switch shops'}
            </button>
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/checkout" className="flex-1">
            <Button size="lg" fullWidth>
              Proceed to checkout
            </Button>
          </Link>
          <Link href="/shops" className="flex-1">
            <Button size="lg" variant="outline" fullWidth>
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
