import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { OrderStatusBadge } from '@/components/customer/OrderStatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { listOrders } from '@/lib/api/orders'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatDateTime, formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { page?: string; status?: string }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/orders')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listOrders(token, { page, page_size: 10 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/orders')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Your orders" description="Track and manage your past orders." />
      {result.items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="When you place an order it will show up here."
          action={{ label: 'Start shopping', href: '/shops' }}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {result.items.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="border-border bg-surface shadow-card hover:shadow-elevated flex flex-col gap-2 rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-content font-semibold">{o.order_no}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="text-muted text-xs">{formatDateTime(o.placed_at)}</p>
                    <p className="text-muted mt-0.5 text-sm">
                      {o.item_count} {o.item_count === 1 ? 'item' : 'items'} ·{' '}
                      {formatMoney(o.total_amount)}
                    </p>
                  </div>
                  <span className="text-brand-700 text-sm font-semibold">View details →</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination data={result.pagination} base="/orders" />
        </>
      )}
    </Container>
  )
}
