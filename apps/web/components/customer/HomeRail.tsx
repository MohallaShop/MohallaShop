import Link from 'next/link'
import type { OrderSummary } from '@/lib/api/types'
import { TrackOrderCard } from './TrackOrderCard'

/**
 * Right-hand rail for the customer home. Only the order tracker is live today;
 * wallet/credits/BNPL/referrals are intentionally omitted because those backend
 * domains do not exist yet. Adding them here would fabricate financial data.
 */
export function HomeRail({ activeOrder }: { activeOrder: OrderSummary | null }) {
  return (
    <aside className="flex flex-col gap-4">
      <TrackOrderCard order={activeOrder} />
      <SupportCard />
    </aside>
  )
}

function SupportCard() {
  return (
    <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
      <h3 className="text-content text-sm font-bold">Need help?</h3>
      <p className="text-muted mt-1 text-xs leading-relaxed">
        Questions about an order or a shop? Our support team is here to help.
      </p>
      <Link
        href="/support"
        className="text-brand-700 mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
      >
        Visit support →
      </Link>
    </section>
  )
}
