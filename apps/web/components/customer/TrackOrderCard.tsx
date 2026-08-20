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
      return 2
    default:
      return 0
  }
}

/** Cream "Track Your Order" card — uses the real latest active order. */
export function TrackOrderCard({ order }: { order: OrderSummary | null }) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-content text-sm font-bold">Track Your Order</h3>
        <span aria-hidden="true" className="text-lg">
          🛵
        </span>
      </div>
      {order ? (
        <>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-content font-semibold">#{order.order_no}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold capitalize text-emerald-700">
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
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={
                        done || isCurrent
                          ? 'grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white'
                          : 'grid h-6 w-6 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200'
                      }
                    >
                      {isCurrent ? (
                        <ScooterIcon className="h-3.5 w-3.5" />
                      ) : done ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className="text-muted w-14 text-center text-[9px] leading-tight">
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <span
                      className={`mx-1 mb-4 h-0.5 flex-1 rounded ${i < current ? 'bg-emerald-400' : 'bg-slate-200'}`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
          <Link
            href={`/orders/${order.id}`}
            className="text-brand-700 mt-2 inline-block text-xs font-semibold hover:underline"
          >
            View order details →
          </Link>
        </>
      ) : (
        <p className="text-muted mt-2 text-xs">
          No active orders right now.{' '}
          <Link href="/shops" className="text-brand-700 font-semibold hover:underline">
            Browse shops →
          </Link>
        </p>
      )}
    </section>
  )
}
