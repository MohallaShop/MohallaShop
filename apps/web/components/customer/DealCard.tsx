import Link from 'next/link'
import type { ProductOut } from '@/lib/api/types'
import { formatMoney } from '@/lib/utils/format'

const TINTS = [
  'bg-amber-500/10 ring-amber-500/20',
  'bg-brand-500/10 ring-brand-500/20',
  'bg-emerald-500/10 ring-emerald-500/20',
  'bg-rose-500/10 ring-rose-500/20',
  'bg-sky-500/10 ring-sky-500/20',
]
const EMOJIS: string[] = ['🍌', '🥛', '🌾', '🍎', '🧴', '🍪', '🥚', '🧈']
const DISCOUNTS: number[] = [10, 15, 20, 25, 5, 12, 18, 8]

/**
 * Compact horizontal product deal card — high-contrast in light & dark modes.
 */
export function DealCard({ product, index }: { product: ProductOut; index: number }) {
  let h = 0
  for (const c of product.id) h = (h * 31 + c.charCodeAt(0)) | 0
  const emoji = EMOJIS[Math.abs(h) % EMOJIS.length]
  const discount = (DISCOUNTS[Math.abs(h) % DISCOUNTS.length] ?? 10) as number
  const priceNum = Number(product.price)
  const mrp = Math.round(priceNum * (1 + discount / 100))

  return (
    <Link
      href={`/products/${product.id}`}
      className="border-border bg-surface shadow-card hover:shadow-card-hover group flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:w-[9.5rem] lg:w-[10.25rem]"
    >
      {/* Image area */}
      <div
        className={`${TINTS[index % TINTS.length]} relative flex h-28 items-center justify-center ring-1`}
      >
        <span className="text-4xl transition-transform duration-200 group-hover:scale-110">
          {emoji}
        </span>
        {/* Discount badge */}
        <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
          {discount}% OFF
        </span>
        {!product.in_stock ? (
          <div className="bg-surface/85 absolute inset-0 grid place-items-center backdrop-blur-[2px]">
            <span className="bg-muted/15 text-muted rounded-full px-2.5 py-1 text-xs font-bold">
              Out of stock
            </span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-3">
        <span className="text-content line-clamp-1 text-sm font-semibold">{product.name}</span>
        <span className="text-muted mt-0.5 block text-xs">({product.unit})</span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-content text-base font-extrabold">
            {formatMoney(product.price)}
          </span>
          <span className="text-muted text-xs line-through">{formatMoney(mrp)}</span>
        </div>
      </div>
    </Link>
  )
}
