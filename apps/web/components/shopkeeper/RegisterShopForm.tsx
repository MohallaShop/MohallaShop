'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { getBrowserToken } from '@/lib/api/browser'
import { createMyShop } from '@/lib/api/shopkeeper'
import type { ShopCreate } from '@/lib/api/types'

const FIELDS = [
  {
    name: 'name',
    label: 'Shop name',
    type: 'text',
    required: true,
    placeholder: 'Sahu Kirana Store',
  },
  { name: 'phone', label: 'Phone', type: 'tel', required: false, placeholder: '+91 98000 00001' },
  {
    name: 'address_line1',
    label: 'Address line 1',
    type: 'text',
    required: true,
    placeholder: '12 Ganesh Colony',
  },
  {
    name: 'address_line2',
    label: 'Address line 2',
    type: 'text',
    required: false,
    placeholder: 'Near community hall',
  },
  { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Pune' },
  { name: 'state', label: 'State', type: 'text', required: false, placeholder: 'MH' },
  { name: 'pincode', label: 'Pincode', type: 'text', required: false, placeholder: '411001' },
  {
    name: 'delivery_fee',
    label: 'Delivery fee (₹)',
    type: 'number',
    required: false,
    placeholder: '20',
  },
] as const

type FieldName = (typeof FIELDS)[number]['name']

/**
 * Self-service shop registration (Phase 1b). The shop is created `pending`
 * and hidden from customers until an admin approves it — the confirmation
 * panel says so instead of pretending it is live.
 */
export function RegisterShopForm() {
  const router = useRouter()
  const [values, setValues] = useState<Partial<Record<FieldName, string>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function set(name: FieldName, value: string) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.name?.trim() || !values.address_line1?.trim() || !values.city?.trim()) {
      setError('Shop name, address line 1 and city are required.')
      return
    }
    setLoading(true)
    try {
      const token = await getBrowserToken()
      if (!token) {
        router.push('/login?next=/shop')
        return
      }
      const payload: ShopCreate = {
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address_line1: values.address_line1.trim(),
        address_line2: values.address_line2?.trim() || undefined,
        city: values.city.trim(),
        state: values.state?.trim() || undefined,
        pincode: values.pincode?.trim() || undefined,
        delivery_fee: values.delivery_fee?.trim() || undefined,
      }
      await createMyShop(token, payload)
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="border-border bg-surface shadow-card rounded-2xl border p-6 text-center">
        <h2 className="text-content text-lg font-semibold">Shop submitted for approval 🎉</h2>
        <p className="text-muted mx-auto mt-2 max-w-md text-sm">
          Your shop is queued for admin approval. Once approved it appears in the customer catalogue
          and can receive orders. Refresh this page to see the current status.
        </p>
        <Button className="mt-4" onClick={() => router.refresh()}>
          Refresh status
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-surface shadow-card rounded-2xl border p-6"
      noValidate
    >
      <h2 className="text-content text-lg font-semibold">Register your shop</h2>
      <p className="text-muted mt-1 text-sm">
        Tell us about your shop. An admin reviews new listings before they go live.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.name} className="block">
            <span className="text-content mb-1 block text-sm font-medium">
              {f.label}
              {f.required ? <span className="text-danger"> *</span> : null}
            </span>
            <input
              type={f.type}
              value={values[f.name] ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
              min={f.name === 'delivery_fee' ? 0 : undefined}
              step={f.name === 'delivery_fee' ? '0.01' : undefined}
              className="border-border bg-background text-content focus:border-brand-400 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            />
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-5" isLoading={loading}>
        Submit for approval
      </Button>
    </form>
  )
}
