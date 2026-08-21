import Link from 'next/link'
import type { OrderSummary } from '@/lib/api/types'
import { CheckIcon, ScooterIcon } from '@/components/icons'

const STEPS = ['Placed', 'Confirmed', 'Out for Delivery', 'Delivered'] as const

/** Map MVP order status onto the 4-step delivery timeline. */
function stepIndex(status: OrderSummary['status']): number {
  switch (status) {
    case 'placed':
    case 'pending_shop':
      return 0
    case 'accepted':
    case 'preparing':
      return 1
    case 'ready_for_pickup':
    case 'out_for_delivery':
      return 2
    case 'delivered':
      return 3
    default:
      return 0
  }
}

/** High-contrast, clean "Track Your Order" card for both light and dark modes. */
export function TrackOrderCard({ order }: { order: OrderSummary | null }) {
  return (
    <section className="border-border bg-surface shadow-card rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-content text-sm font-bold sm:text-base">Track Your Order</h3>
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-base text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        >
          🛵
        </span>
      </div>

      {order ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-content text-xs font-bold sm:text-sm">#{order.order_no}</span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold capitalize text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-4 flex items-start">
            {STEPS.map((label, i) => {
              const current = stepIndex(order.status)
              const done = i < current
              const isCurrent = i === current
              return (
                <div key={label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={
                        done || isCurrent
                          ? 'grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-surface-hover text-muted ring-border/80 grid h-7 w-7 place-items-center rounded-full ring-1'
                      }
                    >
                      {isCurrent ? (
                        <ScooterIcon className="h-3.5 w-3.5" />
                      ) : done ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current opacity-40" />
                      )}
                    </span>
                    <span
                      className={`w-14 text-center text-xs font-medium leading-tight ${
                        done || isCurrent
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'text-muted'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <span
                      className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${
                        i < current ? 'bg-emerald-500' : 'bg-border'
                      }`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          <Link
            href={`/orders/${order.id}`}
            className="text-brand-700 dark:text-brand-400 hover:text-brand-800 mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline"
          >
            View order details →
          </Link>
        </>
      ) : (
        <p className="text-muted mt-2 text-xs leading-relaxed sm:text-sm">
          No active orders right now.{' '}
          <Link
            href="/shops"
            className="text-brand-700 dark:text-brand-400 font-bold hover:underline"
          >
            Browse shops →
          </Link>
        </p>
      )}
    </section>
  )
}
