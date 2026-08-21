'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/StateFeedback'
import { formatMoney } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/client'
import {
  createShopProduct,
  deleteShopProduct,
  updateShopInventory,
  updateShopProduct,
} from '@/lib/api/shopkeeper'
import type { ShopkeeperProductOut } from '@/lib/api/types'

/**
 * Seller catalog manager. Lists all products (active or not) for the signed-in
 * shopkeeper and provides inline create / edit / inventory / delete with
 * server-authoritative state and rollback on failure.
 */
export function ProductManager({
  token,
  products: initial,
}: {
  token: string
  products: ShopkeeperProductOut[]
}) {
  const [products, setProducts] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const router = useRouter()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted text-sm">{products.length} product(s)</p>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Close' : '+ Add product'}
        </Button>
      </div>

      {showCreate ? (
        <CreateProductForm
          token={token}
          onCreated={(p) => {
            setProducts((cur) => [p, ...cur])
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {products.length === 0 ? (
        <p className="text-muted text-sm">
          No products yet. Click “Add product” to create your first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              token={token}
              product={p}
              onChange={(updated) =>
                setProducts((cur) => cur.map((x) => (x.id === updated.id ? updated : x)))
              }
              onDelete={(id) => {
                setProducts((cur) => cur.filter((x) => x.id !== id))
                router.refresh()
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ProductRow({
  token,
  product,
  onChange,
  onDelete,
}: {
  token: string
  product: ShopkeeperProductOut
  onChange: (updated: ShopkeeperProductOut) => void
  onDelete: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [qty, setQty] = useState(String(product.quantity_available))
  const [error, setError] = useState<string | null>(null)

  async function toggleActive() {
    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopProduct(token, product.id, {
        is_active: !product.is_active,
      })
      onChange(updated)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveQty() {
    const n = Math.max(0, Math.floor(Number(qty) || 0))
    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopInventory(token, product.id, { quantity_available: n })
      onChange(updated)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function doDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteShopProduct(token, product.id)
      onDelete(product.id)
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  return (
    <li className="border-border bg-surface shadow-card rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-content font-semibold">{product.name}</p>
          <p className="text-muted text-xs">
            {formatMoney(product.price)} · {product.unit}
          </p>
          <p className="text-muted mt-1 text-xs">
            Stock: <span className="text-content font-semibold">{product.quantity_available}</span>
            {product.low_stock_threshold != null &&
            product.quantity_available <= product.low_stock_threshold ? (
              <span className="text-warning ml-2 font-semibold">Low stock</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleActive}
            disabled={busy}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted/20 text-muted'
            }`}
          >
            {product.is_active ? 'Active' : 'Hidden'}
          </button>
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Edit'}
          </Button>
          {confirmDelete ? (
            <>
              <Button size="sm" variant="danger" onClick={doDelete} disabled={busy}>
                Confirm delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <EditProductForm
          token={token}
          product={product}
          onSaved={(updated) => {
            onChange(updated)
            setEditing(false)
          }}
        />
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <label className="text-muted text-xs">Set stock:</label>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="border-border bg-surface text-content focus:border-brand-500 w-24 rounded-lg border px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={saveQty} disabled={busy}>
            {busy ? <Spinner /> : 'Save'}
          </Button>
        </div>
      )}

      {error ? <p className="text-danger mt-2 text-xs">{error}</p> : null}
    </li>
  )
}

function EditProductForm({
  token,
  product,
  onSaved,
}: {
  token: string
  product: ShopkeeperProductOut
  onSaved: (updated: ShopkeeperProductOut) => void
}) {
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(product.price)
  const [unit, setUnit] = useState(product.unit)
  const [description, setDescription] = useState(product.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopProduct(token, product.id, {
        name: name.trim(),
        price,
        unit: unit.trim(),
        description: description.trim() || undefined,
      })
      onSaved(updated)
    } catch (e2) {
      setError(messageOf(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="border-border mt-3 space-y-2 border-t pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Price (₹)">
          <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Unit">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Spinner /> : 'Save changes'}
        </Button>
        {error ? <p className="text-danger text-xs">{error}</p> : null}
      </div>
    </form>
  )
}

function CreateProductForm({
  token,
  onCreated,
  onCancel,
}: {
  token: string
  onCreated: (p: ShopkeeperProductOut) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [qty, setQty] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !price || !unit.trim()) {
      setError('Name, price and unit are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createShopProduct(token, {
        name: name.trim(),
        price,
        unit: unit.trim(),
        quantity_available: Math.max(0, Math.floor(Number(qty) || 0)),
      })
      onCreated(created)
    } catch (e2) {
      setError(messageOf(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-surface shadow-card mb-4 space-y-3 rounded-2xl border p-4"
    >
      <h3 className="text-content text-sm font-bold">Add a product</h3>
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Price (₹)">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="1 kg"
            className={inputCls}
          />
        </Field>
        <Field label="Stock">
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Spinner /> : 'Create product'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {error ? <p className="text-danger text-xs">{error}</p> : null}
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted block text-xs font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'border-border bg-surface text-content focus:border-brand-500 block w-full rounded-lg border px-3 py-1.5 text-sm outline-none'

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return 'Something went wrong. Please try again.'
}
