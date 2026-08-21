import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { listAdminOrders } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatMoney, formatDateTime } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Admin · Orders',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { page?: string }

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/admin/orders')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listAdminOrders(token, { page, page_size: 20 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/orders')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Orders" description="All orders across the platform (read-only)." />
      {result.items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders will appear here as they are placed."
        />
      ) : (
        <>
          <ul className="border-border bg-surface shadow-card divide-border divide-y rounded-2xl border">
            {result.items.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-content font-semibold">{o.order_no}</p>
                  <p className="text-muted text-xs">{formatDateTime(o.placed_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-content font-semibold">{formatMoney(o.total_amount)}</p>
                  <p className="text-muted text-xs capitalize">{o.status.replace(/_/g, ' ')}</p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination data={result.pagination} base="/admin/orders" params={{}} />
        </>
      )}
    </Container>
  )
}
