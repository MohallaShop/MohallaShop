import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShopCard } from '@/components/customer/ShopCard'
import { HeroBanner } from '@/components/customer/HeroBanner'
import { CategoryRow } from '@/components/customer/CategoryRow'
import { DealCard } from '@/components/customer/DealCard'
import { FeatureStrip } from '@/components/customer/FeatureStrip'
import { HomeRail } from '@/components/customer/HomeRail'
import { EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { listShops, listShopProducts } from '@/lib/api/shops'
import { listOrders } from '@/lib/api/orders'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import type { OrderSummary, ProductOut } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['placed', 'pending_shop', 'accepted', 'preparing', 'ready_for_pickup']

export default async function CustomerHome() {
  const token = await requireServerToken('/home')

  let shops
  try {
    const page = await listShops(token, { page_size: 8 })
    shops = page.items
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/home')
    return <ErrorState error={err} />
  }

  // Secondary panels fail soft — the core catalogue still renders.
  let activeOrder: OrderSummary | null = null
  let deals: ProductOut[] = []
  try {
    const ordersPage = await listOrders(token, { page_size: 10 })
    activeOrder =
      ordersPage.items.find((o) => (ACTIVE_STATUSES as string[]).includes(o.status)) ?? null
  } catch {
    /* tracker card shows its empty state */
  }
  try {
    if (shops[0]) {
      const productsPage = await listShopProducts(token, shops[0].id, {
        page_size: 6,
        only_in_stock: true,
      })
      deals = productsPage.items
    }
  } catch {
    /* deals row is hidden when empty */
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <HeroBanner />
        <CategoryRow />

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-content text-lg font-bold">Popular Local Shops</h2>
            <Link
              href="/shops"
              className="text-brand-700 flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              View all shops →
            </Link>
          </div>
          {shops.length === 0 ? (
            <EmptyState
              title="No shops available yet"
              description="Shops in your neighbourhood will appear here once they go live."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shops.slice(0, 4).map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          )}
        </section>

        {deals.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-content text-lg font-bold">In Stock Near You</h2>
              <Link
                href="/search"
                className="text-brand-700 hidden text-sm font-semibold hover:underline sm:inline"
              >
                Browse all products →
              </Link>
            </div>
            <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {deals.map((p, i) => (
                <DealCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        <FeatureStrip />
      </div>

      <HomeRail activeOrder={activeOrder} />
    </div>
  )
}
