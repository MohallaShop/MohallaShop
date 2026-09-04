import Link from 'next/link'
import { MapPinIcon, StoreIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import type { ShopSummary } from '@/lib/api/types'
import { cn } from '@/lib/utils/cn'

const BANNERS = [
  'from-brand-100 to-brand-200 dark:from-brand-950/70 dark:to-slate-900',
  'from-emerald-100 to-teal-100 dark:from-emerald-950/70 dark:to-slate-900',
  'from-amber-100 to-orange-100 dark:from-amber-950/70 dark:to-slate-900',
  'from-rose-100 to-pink-100 dark:from-rose-950/70 dark:to-slate-900',
  'from-sky-100 to-cyan-100 dark:from-sky-950/70 dark:to-slate-900',
]

export function ShopCard({
  shop,
  variant = 'grid',
}: {
  shop: ShopSummary
  variant?: 'grid' | 'rail'
}) {
  const h = Math.abs(shop.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  const active = shop.status === 'active'

  return (
    <Link
      href={`/shops/${shop.id}`}
      className={cn(
        'border-border bg-surface shadow-card hover:shadow-card-hover group flex min-w-0 flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5',
        variant === 'rail' ? 'w-[16rem] max-w-[86vw] shrink-0' : 'w-full',
      )}
    >
      <div
        className={`bg-gradient-to-br ${BANNERS[h % BANNERS.length]} relative grid h-28 place-items-center`}
      >
        <span className="bg-surface/90 text-brand-700 dark:text-brand-300 grid h-14 w-14 place-items-center rounded-2xl shadow-sm ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-105">
          <StoreIcon className="h-7 w-7" />
        </span>
        <span className="absolute left-2.5 top-2.5">
          <Badge tone={active ? 'success' : 'muted'}>{active ? 'Open' : shop.status}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-content truncate text-sm font-bold sm:text-base">{shop.name}</h3>
        {shop.description ? (
          <p className="text-muted mt-0.5 line-clamp-2 min-h-8 text-xs leading-snug">
            {shop.description}
          </p>
        ) : (
          <p className="text-muted mt-0.5 min-h-8 text-xs leading-snug">Local shop</p>
        )}

        <div className="text-muted mt-3 space-y-1.5 text-xs font-medium">
          {shop.city ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="text-brand-600 dark:text-brand-400 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{shop.city}</span>
            </div>
          ) : null}
          {shop.phone ? <div className="truncate">Phone: {shop.phone}</div> : null}
        </div>

        <div className="border-border/70 mt-auto flex items-center justify-between border-t pt-3">
          <span className="text-muted min-w-0 truncate text-xs font-medium">
            Products and prices from shop
          </span>
          <span className="text-brand-700 dark:text-brand-400 group-hover:text-brand-800 shrink-0 text-xs font-bold transition">
            View -&gt;
          </span>
        </div>
      </div>
    </Link>
  )
}
