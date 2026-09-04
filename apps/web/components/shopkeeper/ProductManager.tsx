'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/StateFeedback'
import { PackageIcon, SearchIcon } from '@/components/icons'
import { formatMoney } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/client'
import {
  createShopProduct,
  deleteShopProduct,
  updateShopInventory,
  updateShopProduct,
} from '@/lib/api/shopkeeper'
import type { CategoryOut, ShopkeeperProductOut } from '@/lib/api/types'

export function ProductManager({
  token,
  products: initial,
  categories,
}: {
  token: string
  products: ShopkeeperProductOut[]
  categories: CategoryOut[]
}) {
  const [products, setProducts] = useState(initial)
  const [showCreate, setShowCreate] = useState(initial.length === 0)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) => {
      const category = categories.find((item) => item.id === product.category_id)?.name ?? ''
      return [product.name, product.description ?? '', product.unit, category]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [categories, products, query])

  const live = products.filter((product) => product.is_active && product.quantity_available > 0)
  const hidden = products.filter((product) => !product.is_active)
  const outOfStock = products.filter(
    (product) => product.is_active && product.quantity_available <= 0,
  )
  const lowStock = products.filter(
    (product) =>
      product.is_active &&
      product.low_stock_threshold != null &&
      product.quantity_available > 0 &&
      product.quantity_available <= product.low_stock_threshold,
  )

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryMetric label="Live products" value={live.length} tone="success" />
        <InventoryMetric label="Low stock" value={lowStock.length} tone="warning" />
        <InventoryMetric label="Out of stock" value={outOfStock.length} tone="danger" />
        <InventoryMetric label="Hidden" value={hidden.length} tone="muted" />
      </section>

      <section className="border-border bg-surface shadow-card rounded-lg border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-content text-base font-bold">Inventory</h2>
            <p className="text-muted text-sm">
              Active products with stock are visible on the customer website.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block">
              <span className="sr-only">Search inventory</span>
              <SearchIcon className="text-muted h-4.5 w-4.5 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="border-border bg-background text-content focus:border-brand-500 h-10 w-full rounded-lg border pl-9 pr-3 text-sm outline-none sm:w-64"
              />
            </label>
            <Button size="sm" onClick={() => setShowCreate((value) => !value)}>
              {showCreate ? 'Close' : 'Add product'}
            </Button>
          </div>
        </div>

        {showCreate ? (
          <CreateProductForm
            token={token}
            categories={categories}
            onCreated={(product) => {
              setProducts((current) => [product, ...current])
              setShowCreate(false)
              router.refresh()
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : null}
      </section>

      {filtered.length === 0 ? (
        <div className="border-border bg-surface rounded-lg border p-6 text-center">
          <p className="text-content font-semibold">
            {products.length === 0 ? 'No products yet' : 'No matching products'}
          </p>
          <p className="text-muted mt-1 text-sm">
            {products.length === 0
              ? 'Add your first product with stock and pricing.'
              : 'Clear the search field or try another product name.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((product) => (
            <ProductRow
              key={product.id}
              token={token}
              product={product}
              categories={categories}
              onChange={(updated) =>
                setProducts((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                )
              }
              onDelete={(id) => {
                setProducts((current) => current.filter((item) => item.id !== id))
                router.refresh()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductRow({
  token,
  product,
  categories,
  onChange,
  onDelete,
}: {
  token: string
  product: ShopkeeperProductOut
  categories: CategoryOut[]
  onChange: (updated: ShopkeeperProductOut) => void
  onDelete: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [qty, setQty] = useState(String(product.quantity_available))
  const [threshold, setThreshold] = useState(String(product.low_stock_threshold ?? ''))
  const [error, setError] = useState<string | null>(null)

  const visibleToCustomers = product.is_active && product.quantity_available > 0
  const categoryName =
    categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized'

  async function toggleActive() {
    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopProduct(token, product.id, {
        is_active: !product.is_active,
      })
      onChange(updated)
    } catch (errorValue) {
      setError(messageOf(errorValue))
    } finally {
      setBusy(false)
    }
  }

  async function saveInventory(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopInventory(token, product.id, {
        quantity_available: parseWholeNumber(qty),
        low_stock_threshold: threshold.trim() ? parseWholeNumber(threshold) : undefined,
      })
      setQty(String(updated.quantity_available))
      setThreshold(String(updated.low_stock_threshold ?? ''))
      onChange(updated)
    } catch (errorValue) {
      setError(messageOf(errorValue))
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
    } catch (errorValue) {
      setError(messageOf(errorValue))
      setBusy(false)
    }
  }

  return (
    <article className="border-border bg-surface shadow-card rounded-lg border p-4">
      <div className="grid gap-4 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(16rem,20rem)]">
        <ProductImage product={product} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-content truncate text-base font-bold">{product.name}</h3>
            <Badge tone={visibilityTone(product)}>
              {visibleToCustomers ? 'Live' : product.is_active ? 'Out of stock' : 'Hidden'}
            </Badge>
          </div>
          <p className="text-muted mt-1 text-sm">
            {formatMoney(product.price)} / {product.unit}
          </p>
          <p className="text-muted mt-1 text-xs">
            {categoryName} | Stock {product.quantity_available}
            {product.low_stock_threshold != null
              ? ` | Alert at ${product.low_stock_threshold}`
              : ''}
          </p>
          {product.description ? (
            <p className="text-muted mt-2 line-clamp-2 text-sm">{product.description}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing((value) => !value)}>
              {editing ? 'Close edit' : 'Edit details'}
            </Button>
            <Button size="sm" variant="ghost" onClick={toggleActive} disabled={busy}>
              {product.is_active ? 'Hide' : 'Make live'}
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" onClick={doDelete} disabled={busy}>
                  Delete
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
                Remove
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={saveInventory} className="border-border rounded-lg border p-3">
          <p className="text-content text-sm font-bold">Stock controls</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Available">
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Low alert">
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </Field>
          </div>
          <Button type="submit" size="sm" className="mt-3" disabled={busy}>
            {busy ? <Spinner /> : 'Save stock'}
          </Button>
        </form>
      </div>

      {editing ? (
        <EditProductForm
          token={token}
          product={product}
          categories={categories}
          onSaved={(updated) => {
            setThreshold(String(updated.low_stock_threshold ?? ''))
            onChange(updated)
            setEditing(false)
          }}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </article>
  )
}

function EditProductForm({
  token,
  product,
  categories,
  onSaved,
}: {
  token: string
  product: ShopkeeperProductOut
  categories: CategoryOut[]
  onSaved: (updated: ShopkeeperProductOut) => void
}) {
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(product.price)
  const [unit, setUnit] = useState(product.unit)
  const [categoryId, setCategoryId] = useState(product.category_id ?? '')
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '')
  const [description, setDescription] = useState(product.description ?? '')
  const [threshold, setThreshold] = useState(String(product.low_stock_threshold ?? ''))
  const [active, setActive] = useState(product.is_active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !price.trim() || !unit.trim()) {
      setError('Name, price and unit are required.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const updated = await updateShopProduct(token, product.id, {
        name: name.trim(),
        price: normalizeMoney(price),
        unit: unit.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        category_id: categoryId || null,
        low_stock_threshold: threshold.trim() ? parseWholeNumber(threshold) : null,
        is_active: active,
      })
      onSaved(updated)
    } catch (errorValue) {
      setError(messageOf(errorValue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="border-border mt-4 space-y-3 border-t pt-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Product name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Price">
          <input
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="1 kg"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Category">
          <CategorySelect value={categoryId} categories={categories} onChange={setCategoryId} />
        </Field>
        <Field label="Image URL">
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </Field>
        <Field label="Low stock alert">
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={inputCls}
        />
      </Field>

      <label className="text-content flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="accent-brand-600 h-4 w-4"
        />
        Visible to customers when stock is available
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Spinner /> : 'Save details'}
        </Button>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function CreateProductForm({
  token,
  categories,
  onCreated,
  onCancel,
}: {
  token: string
  categories: CategoryOut[]
  onCreated: (product: ShopkeeperProductOut) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [qty, setQty] = useState('0')
  const [threshold, setThreshold] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !price.trim() || !unit.trim()) {
      setError('Name, price and unit are required.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const created = await createShopProduct(token, {
        name: name.trim(),
        price: normalizeMoney(price),
        unit: unit.trim(),
        quantity_available: parseWholeNumber(qty),
        low_stock_threshold: threshold.trim() ? parseWholeNumber(threshold) : null,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        category_id: categoryId || undefined,
        is_active: active,
      })
      onCreated(created)
    } catch (errorValue) {
      setError(messageOf(errorValue))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-border mt-4 space-y-3 border-t pt-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Product name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Amul milk"
            className={inputCls}
          />
        </Field>
        <Field label="Price">
          <input
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="52.00"
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="500 ml"
            className={inputCls}
          />
        </Field>
        <Field label="Opening stock">
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Category">
          <CategorySelect value={categoryId} categories={categories} onChange={setCategoryId} />
        </Field>
        <Field label="Image URL">
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </Field>
        <Field label="Low stock alert">
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Fresh stock, packet size, brand, or notes"
          className={inputCls}
        />
      </Field>

      <label className="text-content flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="accent-brand-600 h-4 w-4"
        />
        Publish when stock is available
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Spinner /> : 'Create product'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function ProductImage({ product }: { product: ShopkeeperProductOut }) {
  return (
    <div className="bg-surface-hover text-muted grid aspect-square min-h-24 place-items-center overflow-hidden rounded-lg">
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <PackageIcon className="h-8 w-8" />
      )}
    </div>
  )
}

function InventoryMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'warning' | 'danger' | 'muted'
}) {
  return (
    <div className="border-border bg-surface shadow-card rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted text-xs font-bold uppercase">{label}</p>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <p className="text-content mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}

function CategorySelect({
  value,
  categories,
  onChange,
}: {
  value: string
  categories: CategoryOut[]
  onChange: (value: string) => void
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputCls}>
      <option value="">Uncategorized</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted block text-xs font-bold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function parseWholeNumber(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

function normalizeMoney(value: string): string {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return value.trim()
  return parsed.toFixed(2)
}

function visibilityTone(product: ShopkeeperProductOut): 'success' | 'warning' | 'muted' {
  if (!product.is_active) return 'muted'
  if (product.quantity_available <= 0) return 'warning'
  return 'success'
}

function messageOf(errorValue: unknown): string {
  if (errorValue instanceof ApiError) return errorValue.message
  return 'Something went wrong. Please try again.'
}

const inputCls =
  'border-border bg-background text-content focus:border-brand-500 block min-h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none'
