import Link from 'next/link'
import type { OrderSummary } from '@/lib/api/types'
import { TrackOrderCard } from './TrackOrderCard'
import { ZapIcon } from '@/components/icons'

/**
 * Right-hand rail for customer home — order tracker, pay-later promo,
 * and referral card. High contrast, unified surface cards in both themes.
 */
export function HomeRail({ activeOrder }: { activeOrder: OrderSummary | null }) {
  return (
    <aside className="flex flex-col gap-4">
      <TrackOrderCard order={activeOrder} />

      {/* Pay Later promo */}
      <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-content text-sm font-bold sm:text-base">Pay Later. Shop Now.</h3>
          <span
            aria-hidden="true"
            className="bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 grid h-8 w-8 place-items-center rounded-xl text-base"
          >
            📅
          </span>
        </div>
        <ul className="text-content-secondary mt-3 space-y-1.5 text-xs">
          <li className="flex items-center gap-2">
            <ZapIcon className="text-brand-600 dark:text-brand-400 h-3.5 w-3.5 shrink-0" />
            <span>Shop from local stores now</span>
          </li>
          <li className="flex items-center gap-2">
            <ZapIcon className="text-brand-600 dark:text-brand-400 h-3.5 w-3.5 shrink-0" />
            <span>Pay within 15–30 days</span>
          </li>
          <li className="flex items-center gap-2">
            <ZapIcon className="text-brand-600 dark:text-brand-400 h-3.5 w-3.5 shrink-0" />
            <span>0% interest, no hidden charges</span>
          </li>
        </ul>
        <button className="bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 mt-3.5 w-full rounded-xl py-2 text-xs font-bold text-white shadow-sm transition hover:shadow-md">
          Activate Credit
        </button>
      </section>

      {/* Refer & Earn */}
      <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-content text-sm font-bold sm:text-base">Refer &amp; Earn</h3>
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-base text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          >
            🎁
          </span>
        </div>
        <p className="text-muted mt-2 text-xs leading-relaxed sm:text-sm">
          Invite your neighbours and friends to earn ₹100 MohallaShop credits each.
        </p>
        <Link
          href="/profile"
          className="text-brand-700 dark:text-brand-400 hover:text-brand-800 mt-2.5 inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          Invite Now →
        </Link>
      </section>

      {/* Support */}
      <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
        <h3 className="text-content text-sm font-bold sm:text-base">Need help?</h3>
        <p className="text-muted mt-1.5 text-xs leading-relaxed sm:text-sm">
          Questions about an order, delivery or a shop? Our support team is here.
        </p>
        <Link
          href="/support"
          className="text-brand-700 dark:text-brand-400 hover:text-brand-800 mt-2.5 inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          Visit support →
        </Link>
      </section>
    </aside>
  )
}
