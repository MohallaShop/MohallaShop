import Link from 'next/link'
import type { ProductOut } from '@/lib/api/types'
import { formatMoney } from '@/lib/utils/format'

/**
 * Compact horizontal product card for the home row. Shows real API data only:
 * price, unit and availability. Discounts/MRP are deliberately omitted because
 * the backend does not model promotions yet.
 */
const TINTS = ['bg-amber-50', 'bg-brand-50', 'bg-emerald-50', 'bg-rose-50', 'bg-sky-50']
const EMOJIS = ['🍌', '🥛', '🌾', '🍎', '🧴', '🍪']

export function DealCard({ product, index }: { product: ProductOut; index: number }) {
  let h = 0
  for (const c of product.id) h = (h * 31 + c.charCodeAt(0)) | 0
  const emoji = EMOJIS[Math.abs(h) % EMOJIS.length]

  return (
    <Link
      href={`/products/${product.id}`}
      className={`${TINTS[index % TINTS.length]} border-border hover:shadow-elevated flex w-36 shrink-0 snap-start flex-col items-center rounded-2xl border p-4 text-center transition hover:-translate-y-0.5`}
    >
      <span className="grid h-16 w-16 place-items-center text-4xl">{emoji}</span>
      <span className="text-content mt-2 line-clamp-1 text-sm font-semibold">{product.name}</span>
      <span className="text-muted text-[11px]">({product.unit})</span>
      <span className="text-content mt-1 text-sm font-bold">{formatMoney(product.price)}</span>
      <span
        className={`mt-1 text-[11px] font-semibold ${
          product.in_stock ? 'text-emerald-600' : 'text-muted'
        }`}
      >
        {product.in_stock ? 'In stock' : 'Out of stock'}
      </span>
    </Link>
  )
}
