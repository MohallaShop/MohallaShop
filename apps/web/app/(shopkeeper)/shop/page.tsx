import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { RegisterShopForm } from '@/components/shopkeeper/RegisterShopForm'
import { formatDateTime, formatMoney } from '@/lib/utils/format'
import { getMyShop, listShopOrders } from '@/lib/api/shopkeeper'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError, isNotFound } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Shop dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function ShopkeeperDashboard() {
  const token = await requireServerToken('/shop')
  let shop
  try {
    shop = await getMyShop(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/shop')
    if (isNotFound(err)) return <NoShopYet />
    return <ErrorState error={err} />
  }

  // Operational counts from the documented order API (no invented analytics).
  const [pending, accepted, preparing, ready, recent] = await Promise.all([
    listShopOrders(token, { status: 'pending_shop', page_size: 5 }).catch(() => null),
    listShopOrders(token, { status: 'accepted', page_size: 5 }).catch(() => null),
    listShopOrders(token, { status: 'preparing', page_size: 5 }).catch(() => null),
    listShopOrders(token, { status: 'ready_for_pickup', page_size: 5 }).catch(() => null),
    listShopOrders(token, { page_size: 5 }).catch(() => null),
  ])

  const counts = [
    { label: 'Incoming', n: pending?.pagination.total ?? 0, tone: 'warning' as const },
    { label: 'Accepted', n: accepted?.pagination.total ?? 0, tone: 'info' as const },
    { label: 'Preparing', n: preparing?.pagination.total ?? 0, tone: 'warning' as const },
    { label: 'Ready', n: ready?.pagination.total ?? 0, tone: 'success' as const },
  ]

  return (
    <Container>
      <PageHeader title={shop.name} description={shop.description ?? 'Your shop dashboard'}>
        <SignOutButton />
      </PageHeader>

      {shop.status === 'pending' ? (
        <div className="border-warning/40 bg-warning/10 text-content mb-6 rounded-2xl border p-4 text-sm">
          <strong className="font-semibold">Awaiting approval.</strong> Your shop is queued for
          admin review. It is hidden from customers until it is approved — you can still set up your
          catalogue in the meantime.
        </div>
      ) : null}
      {shop.status === 'suspended' ? (
        <div className="border-danger/40 bg-danger/10 text-content mb-6 rounded-2xl border p-4 text-sm">
          <strong className="font-semibold">Shop suspended.</strong> An admin has temporarily hidden
          this shop from customers. Contact support to resolve it.
        </div>
      ) : null}

      <div className="bg-brand-600 shadow-card mb-6 rounded-2xl p-5 text-white">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Products" value={shop.product_count} />
          <Metric label="Incoming" value={shop.pending_order_count} highlight />
          <Metric label="Status" value={shop.status} />
          <Metric label="Delivery fee" value={formatMoney(shop.delivery_fee)} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div
            key={c.label}
            className="border-border bg-surface shadow-card rounded-2xl border p-4"
          >
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">{c.label}</p>
            <p className="text-content mt-1 text-2xl font-bold">{c.n}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-content text-lg font-semibold">Recent orders</h2>
          <Link href="/shop/orders" className="text-brand-700 text-sm font-semibold">
            View all →
          </Link>
        </div>
        {!recent || recent.items.length === 0 ? (
          <p className="text-muted text-sm">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.items.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/orders/${o.id}`}
                  className="border-border bg-surface shadow-card hover:shadow-elevated flex items-center justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5"
                >
                  <div>
                    <p className="text-content font-semibold">{o.order_no}</p>
                    <p className="text-muted text-xs">{formatDateTime(o.placed_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-content font-semibold">{formatMoney(o.total_amount)}</p>
                    <p className="text-muted text-xs capitalize">{o.status.replace(/_/g, ' ')}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: number | string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-brand-50/80 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${highlight && typeof value === 'number' && value > 0 ? 'text-accent-300' : 'text-white'}`}
      >
        {value}
      </p>
    </div>
  )
}

function NoShopYet() {
  return (
    <Container>
      <PageHeader
        title="Shop portal"
        description="Register your shop in a minute — an admin reviews it before it goes live."
      />
      <RegisterShopForm />
    </Container>
  )
}
