import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { formatDateTime, formatMoney, statusMeta } from '@/lib/utils/format'
import { Badge } from '@/components/ui/Badge'
import { listShopOrders } from '@/lib/api/shopkeeper'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import type { OrderStatus } from '@/lib/api/types'

export const metadata: Metadata = {
  title: 'Shop orders',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const FILTERS: { label: string; value?: OrderStatus }[] = [
  { label: 'All' },
  { label: 'Incoming', value: 'pending_shop' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready_for_pickup' },
]

type SP = { page?: string; status?: string }

export default async function ShopOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/shop/orders')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const status = sp.status as OrderStatus | undefined

  let result
  try {
    result = await listShopOrders(token, { status, page, page_size: 15 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/shop/orders')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Orders" description="Incoming and active orders for your shop." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? undefined) === f.value
          const href = f.value ? `/shop/orders?status=${f.value}` : '/shop/orders'
          return (
            <Link
              key={f.label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border bg-surface text-muted hover:bg-brand-50 hover:text-content'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No orders here"
          description="Orders from customers will appear in real time as they are placed."
        />
      ) : (
        <>
          <div className="border-border bg-surface shadow-card overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted text-left text-xs uppercase tracking-wide">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Order
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                    Placed
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((o) => {
                  const meta = statusMeta(o.status)
                  return (
                    <tr key={o.id} className="border-border hover:bg-brand-50/40 border-t">
                      <td className="px-4 py-3">
                        <Link
                          href={`/shop/orders/${o.id}`}
                          className="text-content font-semibold hover:underline"
                        >
                          {o.order_no}
                        </Link>
                      </td>
                      <td className="border-border text-muted px-4 py-3 sm:table-cell">
                        {formatDateTime(o.placed_at)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.item_count}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatMoney(o.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination data={result.pagination} base="/shop/orders" params={{ status }} />
        </>
      )}
    </Container>
  )
}
