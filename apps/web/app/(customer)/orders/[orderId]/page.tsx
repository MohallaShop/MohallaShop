import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { OrderStatusBadge } from '@/components/customer/OrderStatusBadge'
import { CancelOrderButton } from '@/components/customer/CancelOrderButton'
import { OrderItems, OrderTotals } from '@/components/orders/OrderItems'
import { OrderHistory } from '@/components/orders/OrderHistory'
import { getOrder } from '@/lib/api/orders'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError, isNotFound } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

type SP = { placed?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>
}): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: `Order ${orderId.slice(0, 8)}`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<SP>
}) {
  const { orderId } = await params
  const token = await requireServerToken(`/orders/${orderId}`)
  const sp = await searchParams
  const justPlaced = sp.placed === '1'

  let order
  try {
    order = await getOrder(token, orderId)
  } catch (err) {
    if (isAuthError(err)) redirect(`/login?next=/orders/${orderId}`)
    if (isNotFound(err)) notFound()
    return <ErrorState error={err} />
  }

  const addr = order.delivery_address

  return (
    <Container>
      <div className="mb-4">
        <Link href="/orders" className="text-brand-700 text-sm font-semibold">
          ← All orders
        </Link>
      </div>

      {justPlaced ? (
        <div
          role="status"
          className="border-brand-200 bg-brand-50 text-brand-800 shadow-card mb-5 rounded-2xl border p-5"
        >
          <h1 className="text-lg font-bold">Order placed! 🎉</h1>
          <p className="text-sm">
            Your order <span className="font-semibold">{order.order_no}</span> was sent to the shop.
            We’ll update the status as it progresses.
          </p>
        </div>
      ) : null}

      <PageHeader title={order.order_no} description={`Placed ${formatDateTime(order.placed_at)}`}>
        <OrderStatusBadge status={order.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <OrderItems items={order.items} />
          <section>
            <h2 className="text-content mb-2 text-sm font-semibold">Status history</h2>
            <OrderHistory history={order.history} />
          </section>
        </div>

        <div className="space-y-4">
          <OrderTotals
            subtotal={order.subtotal}
            deliveryFee={order.delivery_fee}
            total={order.total_amount}
          />
          <section className="border-border bg-surface shadow-card rounded-2xl border p-5 text-sm">
            <h2 className="text-content text-sm font-semibold">Delivery address</h2>
            <p className="text-content/80 mt-1">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              <br />
              {addr.landmark ? (
                <>
                  {addr.landmark}
                  <br />
                </>
              ) : null}
              {addr.city}, {addr.state} {addr.pincode}
            </p>
            {(addr.contact_name || addr.contact_phone) && (
              <p className="text-muted mt-1 text-xs">
                {addr.contact_name ?? ''} {addr.contact_phone ? `· ${addr.contact_phone}` : ''}
              </p>
            )}
          </section>
          {order.notes ? (
            <section className="border-border bg-surface shadow-card rounded-2xl border p-5 text-sm">
              <h2 className="text-content text-sm font-semibold">Notes</h2>
              <p className="text-content/80 mt-1">{order.notes}</p>
            </section>
          ) : null}
          <div className="flex justify-end">
            <CancelOrderButton orderId={order.id} status={order.status} />
          </div>
        </div>
      </div>
    </Container>
  )
}
