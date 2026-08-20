import Link from 'next/link'
import type { ShopSummary } from '@/lib/api/types'

/**
 * Shop discovery card. Shows only real backend fields. Ratings, distance,
 * delivery ETA, minimum order and offers are NOT displayed because those fields
 * do not exist in the current API; surfacing them would mean fabricating data.
 */
const BANNERS = [
  'from-brand-100 to-brand-200',
  'from-emerald-100 to-teal-100',
  'from-amber-100 to-orange-100',
  'from-rose-100 to-pink-100',
]
const EMOJIS = ['🛒', '🥬', '🏪', '🧺']

export function ShopCard({ shop }: { shop: ShopSummary }) {
  const h = Math.abs(shop.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  const open = shop.status === 'active'
  return (
    <Link
      href={`/shops/${shop.id}`}
      className="border-border bg-surface shadow-card hover:shadow-elevated group overflow-hidden rounded-2xl border transition hover:-translate-y-0.5"
    >
      <div
        className={`bg-gradient-to-br ${BANNERS[h % BANNERS.length]} grid h-28 place-items-center text-4xl`}
      >
        {EMOJIS[h % EMOJIS.length]}
      </div>
      <div className="p-4">
        <h3 className="text-content truncate font-semibold">{shop.name}</h3>
        {shop.description ? (
          <p className="text-muted mt-1 line-clamp-1 text-xs">{shop.description}</p>
        ) : null}
        {shop.city ? <p className="text-muted mt-1 text-xs">{shop.city}</p> : null}
        <div className="mt-3 flex items-center justify-between">
          {open ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Open
            </span>
          ) : (
            <span className="rounded-full bg-muted/20 px-2.5 py-1 text-[11px] font-semibold text-muted">
              {shop.status}
            </span>
          )}
          <span className="text-brand-700 text-xs font-semibold">View shop →</span>
        </div>
      </div>
    </Link>
  )
}
