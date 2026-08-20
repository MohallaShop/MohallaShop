'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { ApiError } from '@/lib/api/client'
import { getBrowserToken } from '@/lib/api/browser'
import { getCart } from '@/lib/api/cart'
import { createOrder } from '@/lib/api/orders'
import { formatMoney } from '@/lib/utils/format'
import type { AddressOut, CartOut } from '@/lib/api/types'

export function CheckoutForm({ addresses, cart }: { addresses: AddressOut[]; cart: CartOut }) {
  const router = useRouter()
  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0]
  const [addressId, setAddressId] = useState(defaultAddr?.id ?? '')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cart.items.reduce((sum, it) => sum + Number(it.line_total), 0)

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!addressId) {
      setError('Please choose a delivery address.')
      return
    }
    setPlacing(true)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/checkout')
        return
      }
      // Re-read the live cart just before placing; backend re-validates anyway.
      const live = await getCart(token)
      if (live.items.length === 0) {
        setError('Your cart is empty.')
        return
      }
      const order = await createOrder(token, {
        address_id: addressId,
        notes: notes.trim() || undefined,
      })
      router.push(`/orders/${order.id}?placed=1`)
      router.refresh()
    } catch (err) {
      // Specific, honest handling of backend conflicts.
      if (err instanceof ApiError) {
        if (err.code === 'empty_cart') setError('Your cart is empty.')
        else if (err.code === 'insufficient_inventory')
          setError('An item just went out of stock. Please review your cart.')
        else if (err.code === 'cart_cross_shop')
          setError('Your cart contains items from another shop.')
        else setError(classifyError(err).message)
      } else {
        setError(classifyError(err).message)
      }
    } finally {
      setPlacing(false)
    }
  }

  if (addresses.length === 0) {
    return (
      <div className="border-border bg-surface shadow-card rounded-2xl border border-dashed p-6 text-center">
        <h2 className="text-content text-lg font-semibold">No saved address</h2>
        <p className="text-muted mt-1 text-sm">Add a delivery address to place your order.</p>
        <div className="mt-4">
          <Link href="/profile" className="text-brand-700 font-semibold hover:underline">
            Add an address →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={placeOrder} className="space-y-6">
      <section className="border-border bg-surface shadow-card rounded-2xl border p-5">
        <h2 className="text-content text-lg font-semibold">Delivery address</h2>
        <ul className="mt-3 space-y-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <label className="border-border has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 flex cursor-pointer gap-3 rounded-xl border p-3">
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm">
                  <span className="text-content font-semibold">
                    {a.label ? a.label : 'Address'}
                    {a.is_default ? ' · Default' : ''}
                  </span>
                  <span className="text-muted block">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
                  </span>
                  {a.contact_phone ? (
                    <span className="text-muted block">{a.contact_phone}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="text-muted mt-2 text-xs">
          Need another?{' '}
          <Link href="/profile" className="text-brand-700 hover:underline">
            Manage addresses
          </Link>
        </div>
      </section>

      <section className="border-border bg-surface shadow-card rounded-2xl border p-5">
        <label htmlFor="notes" className="text-content block text-sm font-medium">
          Notes for the shop <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Please send fresh items."
          className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 outline-none"
        />
      </section>

      <section className="border-border bg-surface shadow-card rounded-2xl border p-5">
        <h2 className="text-content text-lg font-semibold">Payment</h2>
        <div className="border-border bg-brand-50/40 mt-3 flex items-center justify-between rounded-xl border p-3">
          <span className="text-content text-sm font-semibold">Cash on Delivery</span>
          <span className="text-muted text-xs">Online payment coming soon</span>
        </div>
        <p className="text-muted mt-2 text-xs">
          Pay in cash when your order arrives. The final amount is confirmed by the shop.
        </p>
      </section>

      <section className="border-border bg-surface shadow-card rounded-2xl border p-5">
        <h2 className="text-content text-lg font-semibold">Order summary</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {cart.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className="text-content/80">
                {it.product_name} × {it.quantity}
              </span>
              <span className="text-content">{formatMoney(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-content font-semibold">Estimated total</span>
          <span className="text-content text-lg font-bold">{formatMoney(subtotal)}</span>
        </div>
        <p className="text-muted mt-1 text-xs">
          Final pricing and delivery charges are set by the shop and shown on your order.
        </p>
      </section>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth isLoading={placing}>
        Place order
      </Button>
    </form>
  )
}
