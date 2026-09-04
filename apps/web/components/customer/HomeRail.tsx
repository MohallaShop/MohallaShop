import Link from 'next/link'
import type { OrderSummary } from '@/lib/api/types'
import { TrackOrderCard } from './TrackOrderCard'
import { CartIcon, HeartIcon, HelpCircleIcon, UserIcon } from '@/components/icons'

const QUICK_ACTIONS = [
  {
    href: '/cart',
    title: 'Review cart',
    desc: 'Check items from your current shop.',
    icon: CartIcon,
  },
  {
    href: '/favorites',
    title: 'Saved shops',
    desc: 'Open your favourite local stores.',
    icon: HeartIcon,
  },
  {
    href: '/profile',
    title: 'Addresses',
    desc: 'Manage delivery details before checkout.',
    icon: UserIcon,
  },
]

export function HomeRail({ activeOrder }: { activeOrder: OrderSummary | null }) {
  return (
    <aside className="grid gap-4 xl:flex xl:flex-col">
      <TrackOrderCard order={activeOrder} />

      <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
        <h3 className="text-content text-sm font-bold sm:text-base">Quick actions</h3>
        <div className="divide-border mt-3 divide-y">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="hover:bg-surface-hover -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition"
              >
                <span className="bg-brand-500/10 text-brand-700 dark:text-brand-300 grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-content block text-sm font-semibold">{action.title}</span>
                  <span className="text-muted block text-xs leading-snug">{action.desc}</span>
                </span>
                <span className="text-muted text-sm" aria-hidden="true">
                  -&gt;
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <HelpCircleIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-content text-sm font-bold sm:text-base">Need help?</h3>
            <p className="text-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Get help with orders, delivery details, or shop information.
            </p>
            <Link
              href="/support"
              className="text-brand-700 dark:text-brand-400 hover:text-brand-800 mt-2.5 inline-flex items-center gap-1 text-xs font-bold hover:underline"
            >
              Visit support -&gt;
            </Link>
          </div>
        </div>
      </section>
    </aside>
  )
}
