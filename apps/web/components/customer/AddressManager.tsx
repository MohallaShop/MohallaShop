'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { getBrowserToken } from '@/lib/api/browser'
import { createAddress, deleteAddress, updateAddress } from '@/lib/api/profile'
import type { AddressCreate, AddressOut, AddressUpdate } from '@/lib/api/types'

const empty: AddressCreate = {
  label: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  contact_name: '',
  contact_phone: '',
  is_default: false,
}

function toForm(a: AddressOut): AddressCreate {
  return {
    label: a.label ?? '',
    line1: a.line1,
    line2: a.line2 ?? '',
    landmark: a.landmark ?? '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    contact_name: a.contact_name ?? '',
    contact_phone: a.contact_phone ?? '',
    is_default: a.is_default,
  }
}

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial: AddressCreate
  onSubmit: (value: AddressCreate) => void | Promise<void>
  onCancel?: () => void
  submitting?: boolean
}) {
  const [value, setValue] = useState<AddressCreate>(initial)
  const set = <K extends keyof AddressCreate>(key: K, v: AddressCreate[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
      className="space-y-3"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="label"
          label="Label (optional)"
          value={value.label ?? ''}
          onChange={(v) => set('label', v)}
          maxLength={60}
          placeholder="Home, Work…"
        />
        <Field
          id="pincode"
          label="Pincode"
          value={value.pincode}
          onChange={(v) => set('pincode', v)}
          maxLength={10}
          required
        />
      </div>
      <Field
        id="line1"
        label="Address line 1"
        value={value.line1}
        onChange={(v) => set('line1', v)}
        required
      />
      <Field
        id="line2"
        label="Address line 2 (optional)"
        value={value.line2 ?? ''}
        onChange={(v) => set('line2', v)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="landmark"
          label="Landmark (optional)"
          value={value.landmark ?? ''}
          onChange={(v) => set('landmark', v)}
        />
        <Field
          id="city"
          label="City"
          value={value.city}
          onChange={(v) => set('city', v)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="state"
          label="State"
          value={value.state}
          onChange={(v) => set('state', v)}
          required
        />
        <Field
          id="contact_phone"
          label="Contact phone (optional)"
          value={value.contact_phone ?? ''}
          onChange={(v) => set('contact_phone', v)}
        />
      </div>
      <Field
        id="contact_name"
        label="Contact name (optional)"
        value={value.contact_name ?? ''}
        onChange={(v) => set('contact_name', v)}
      />
      <label className="text-content flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.is_default ?? false}
          onChange={(e) => set('is_default', e.target.checked)}
          className="h-4 w-4 rounded border-border accent-brand-600"
        />
        Set as default address
      </label>
      <div className="flex gap-2">
        <Button type="submit" isLoading={submitting}>
          Save address
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  maxLength,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  maxLength?: number
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="text-content block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 outline-none"
      />
    </div>
  )
}

export function AddressManager({ addresses }: { addresses: AddressOut[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'closed' | 'create' | { edit: AddressOut }>('closed')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function submit(value: AddressCreate) {
    setError(null)
    setSubmitting(true)
    try {
      const token = await getBrowserToken()
      if (!token) throw new Error('Session expired. Please sign in again.')
      if (mode === 'create') {
        await createAddress(token, value)
      } else if (typeof mode === 'object') {
        const patch: AddressUpdate = { ...value }
        await updateAddress(token, mode.edit.id, patch)
      }
      setMode('closed')
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      const token = await getBrowserToken()
      if (!token) throw new Error('Session expired. Please sign in again.')
      await deleteAddress(token, id)
      router.refresh()
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-content text-base font-semibold">Saved addresses</h3>
        {mode !== 'create' ? (
          <Button size="sm" variant="outline" onClick={() => setMode('create')}>
            Add address
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}

      {mode === 'create' ? (
        <div className="border-border bg-surface mt-4 rounded-2xl border p-4">
          <AddressForm
            initial={empty}
            onSubmit={submit}
            onCancel={() => setMode('closed')}
            submitting={submitting}
          />
        </div>
      ) : null}

      {typeof mode === 'object' ? (
        <div className="border-border bg-surface mt-4 rounded-2xl border p-4">
          <AddressForm
            initial={toForm(mode.edit)}
            onSubmit={submit}
            onCancel={() => setMode('closed')}
            submitting={submitting}
          />
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {addresses.length === 0 && mode === 'closed' ? (
          <li className="text-muted text-sm">No saved addresses yet.</li>
        ) : null}
        {addresses.map((a) => (
          <li
            key={a.id}
            className="border-border bg-surface shadow-card flex flex-col gap-2 rounded-2xl border p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="text-content flex items-center gap-2 font-semibold">
                {a.label ? <span>{a.label}</span> : null}
                {a.is_default ? (
                  <span className="bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-brand-500/20 rounded-full px-2 py-0.5 text-xs font-semibold ring-1">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="text-content/80 mt-1 text-sm">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
              </p>
              {a.contact_name || a.contact_phone ? (
                <p className="text-muted mt-1 text-xs">
                  {a.contact_name ? a.contact_name : ''}
                  {a.contact_phone ? ` · ${a.contact_phone}` : ''}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={() => setMode({ edit: a })}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                isLoading={deletingId === a.id}
                onClick={() => remove(a.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
