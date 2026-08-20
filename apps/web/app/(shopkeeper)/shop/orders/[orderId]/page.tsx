import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { Badge } from '@/components/ui/Badge'
import { OrderActions } from '@/components/shopkeeper/OrderActions'
import { OrderItems, OrderTotals } from '@/components/orders/OrderItems'
import { OrderHistory } from '@/components/orders/OrderHistory'
import { getShopOrder } from '@/lib/api/shopkeeper'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError, isNotFound } from '@/lib/api/errors'
import { formatDateTime, statusMeta } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

type Params = { orderId: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: `Order ${orderId.slice(0, 8)}`,
    robots: { index: false, follow: false },
  }
}

export default async function ShopOrderDetailPage({ params }: { params: Promise<Params> }) {
  const { orderId } = await params
  const token = await requireServerToken(`/shop/orders/${orderId}`)

  let order
  try {
    order = await getShopOrder(token, orderId)
  } catch (err) {
    if (isAuthError(err)) redirect(`/login?next=/shop/orders/${orderId}`)
    if (isNotFound(err)) notFound()
    return <ErrorState error={err} />
  }

  const addr = order.delivery_address
  const meta = statusMeta(order.status)
  const customer = order.customer

  return (
    <Container>
      <div className="mb-4">
        <Link href="/shop/orders" className="text-brand-700 text-sm font-semibold">
          ← All orders
        </Link>
      </div>

      <PageHeader title={order.order_no} description={`Placed ${formatDateTime(order.placed_at)}`}>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {customer ? (
            <section className="border-border bg-surface shadow-card rounded-2xl border p-5 text-sm">
              <h2 className="text-content text-sm font-semibold">Customer</h2>
              <p className="text-content/80 mt-1">{customer.display_name ?? 'Customer'}</p>
            </section>
          ) : null}

          <OrderItems items={order.items} />

          <section>
            <h2 className="text-content mb-2 text-sm font-semibold">Status history</h2>
            <OrderHistory history={order.history} />
          </section>
        </div>

        <div className="space-y-4">
          <div className="border-border bg-surface shadow-card rounded-2xl border p-5">
            <h2 className="text-content mb-3 text-sm font-semibold">Actions</h2>
            <OrderActions orderId={order.id} status={order.status} />
          </div>
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
              <h2 className="text-content text-sm font-semibold">Customer notes</h2>
              <p className="text-content/80 mt-1">{order.notes}</p>
            </section>
          ) : null}
        </div>
      </div>
    </Container>
  )
}
