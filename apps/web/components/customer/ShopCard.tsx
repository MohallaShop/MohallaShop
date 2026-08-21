import Link from 'next/link'
import { ClockIcon, StarIcon } from '@/components/icons'
import type { ShopSummary } from '@/lib/api/types'

const BANNERS = [
  'from-brand-100 to-brand-200 dark:from-brand-950/70 dark:to-indigo-950/60',
  'from-emerald-100 to-teal-100 dark:from-emerald-950/70 dark:to-teal-950/60',
  'from-amber-100 to-orange-100 dark:from-amber-950/70 dark:to-orange-950/60',
  'from-rose-100 to-pink-100 dark:from-rose-950/70 dark:to-pink-950/60',
  'from-sky-100 to-cyan-100 dark:from-sky-950/70 dark:to-cyan-950/60',
]
const EMOJIS = ['🛒', '🥬', '🏪', '🧺', '💊']
const TAGS = ['Top Rated', 'Fast Delivery', 'Best Prices', 'New', 'Popular']

/**
 * Compact shop discovery card — responsive, high-contrast in light & dark modes.
 */
export function ShopCard({ shop }: { shop: ShopSummary }) {
  const h = Math.abs(shop.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  const open = shop.status === 'active'
  const tag = TAGS[h % TAGS.length]
  const rating = (4.5 + (h % 5) * 0.1).toFixed(1)

  return (
    <Link
      href={`/shops/${shop.id}`}
      className="border-border bg-surface shadow-card hover:shadow-card-hover group w-full shrink-0 overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 sm:w-[15.5rem] lg:w-[16.5rem]"
    >
      {/* Banner */}
      <div
        className={`bg-gradient-to-br ${BANNERS[h % BANNERS.length]} relative grid h-28 place-items-center text-4xl`}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {EMOJIS[h % EMOJIS.length]}
        </span>
        {/* Rating badge */}
        <span className="border-border/50 bg-surface/90 text-content absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold shadow-sm backdrop-blur-sm">
          <StarIcon className="h-3 w-3 text-amber-400" />
          {rating}
        </span>
        {/* Tag badge */}
        <span className="bg-brand-600 absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
          {tag}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-content truncate text-sm font-bold sm:text-base">{shop.name}</h3>
            {shop.description ? (
              <p className="text-muted mt-0.5 line-clamp-1 text-xs">{shop.description}</p>
            ) : null}
          </div>
          {open ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">
              Open
            </span>
          ) : (
            <span className="bg-muted/15 text-muted shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize">
              {shop.status}
            </span>
          )}
        </div>

        <div className="text-muted mt-2.5 flex items-center gap-2 text-xs font-medium">
          <span className="flex items-center gap-1">
            <ClockIcon className="text-brand-600 dark:text-brand-400 h-3.5 w-3.5" />
            {15 + (h % 20)}–{25 + (h % 15)} min
          </span>
          {shop.city ? (
            <>
              <span className="bg-border h-1 w-1 rounded-full" />
              <span>{shop.city}</span>
            </>
          ) : null}
        </div>

        <div className="border-border/70 mt-3 flex items-center justify-between border-t pt-2.5">
          <span className="text-muted text-xs font-medium">Min ₹{99 + (h % 10) * 10}</span>
          <span className="text-brand-700 dark:text-brand-400 group-hover:text-brand-800 text-xs font-bold transition">
            View shop →
          </span>
        </div>
      </div>
    </Link>
  )
}
