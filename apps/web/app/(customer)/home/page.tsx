import Link from 'next/link'
import { ShopCard } from '@/components/customer/ShopCard'
import { HeroBanner } from '@/components/customer/HeroBanner'
import { CategoryRow } from '@/components/customer/CategoryRow'
import { DealCard } from '@/components/customer/DealCard'
import { FeatureStrip } from '@/components/customer/FeatureStrip'
import { HomeRail } from '@/components/customer/HomeRail'
import { EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { listCategorySummary, listShops, listShopProducts } from '@/lib/api/shops'
import { listOrders } from '@/lib/api/orders'
import { getServerAuth } from '@/lib/api/session'
import type { CategorySummary, OrderSummary, ProductOut } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['placed', 'pending_shop', 'accepted', 'preparing', 'ready_for_pickup']

export default async function CustomerHome() {
  // Catalogue pages are guest-browsable (ADR-0006): no session required.
  const auth = await getServerAuth()
  const token = auth?.token ?? null

  let shops
  try {
    const page = await listShops(token, { page_size: 8 })
    shops = page.items
  } catch (err) {
    return <ErrorState error={err} />
  }

  // Secondary panels fail soft — the core catalogue still renders.
  let categories: CategorySummary[] = []
  let activeOrder: OrderSummary | null = null
  let deals: ProductOut[] = []
  try {
    categories = await listCategorySummary(token)
  } catch {
    /* category row is hidden when unavailable */
  }
  if (auth) {
    // Order tracking is personal — only fetched for signed-in users.
    try {
      const ordersPage = await listOrders(auth.token, { page_size: 10 })
      activeOrder =
        ordersPage.items.find((o) => (ACTIVE_STATUSES as string[]).includes(o.status)) ?? null
    } catch {
      /* tracker card shows its empty state */
    }
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
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {/* Hero */}
        <HeroBanner />

        {/* Categories */}
        <CategoryRow categories={categories} />

        {/* Popular Local Shops */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-content text-xl font-extrabold">Popular Local Shops</h2>
            <Link
              href="/shops"
              className="text-brand-700 hidden items-center gap-1 text-sm font-semibold hover:underline sm:flex"
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
            <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
              {shops.slice(0, 6).map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          )}
        </section>

        {/* In Stock Near You — horizontal product rail */}
        {deals.length > 0 ? (
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-content text-xl font-extrabold">In Stock Near You</h2>
              <Link
                href="/search"
                className="text-brand-700 hidden text-sm font-semibold hover:underline sm:inline"
              >
                Browse all products →
              </Link>
            </div>
            <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
              {deals.map((p, i) => (
                <DealCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Trust strip */}
        <FeatureStrip />
      </div>

      {/* Right rail */}
      <HomeRail activeOrder={activeOrder} />
    </div>
  )
}
