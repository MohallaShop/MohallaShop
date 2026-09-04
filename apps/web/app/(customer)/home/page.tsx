import Link from 'next/link'
import { ShopCard } from '@/components/customer/ShopCard'
import { HeroBanner } from '@/components/customer/HeroBanner'
import { CategoryRow } from '@/components/customer/CategoryRow'
import { ProductCard } from '@/components/customer/ProductCard'
import { EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { listCategorySummary, listShops, listShopProducts } from '@/lib/api/shops'
import { getServerAuth } from '@/lib/api/session'
import type { CategorySummary, ProductOut } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

export default async function CustomerHome() {
  const auth = await getServerAuth()
  const token = auth?.token ?? null

  let shops
  try {
    const page = await listShops(token, { page_size: 8 })
    shops = page.items
  } catch (err) {
    return <ErrorState error={err} />
  }

  let categories: CategorySummary[] = []
  let products: ProductOut[] = []

  try {
    categories = await listCategorySummary(token)
  } catch {
    categories = []
  }

  try {
    if (shops[0]) {
      const productsPage = await listShopProducts(token, shops[0].id, {
        page_size: 8,
        only_in_stock: true,
      })
      products = productsPage.items
    }
  } catch {
    products = []
  }

  return (
    <div className="space-y-8">
      <HeroBanner />

      <CategoryRow categories={categories} />

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-content text-xl font-extrabold">Popular local shops</h2>
          <Link href="/shops" className="text-brand-700 text-sm font-bold hover:underline">
            View all
          </Link>
        </div>
        {shops.length === 0 ? (
          <EmptyState
            title="No shops available yet"
            description="Shops in your neighbourhood will appear here once they go live."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shops.slice(0, 8).map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      {products.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-content text-xl font-extrabold">In stock near you</h2>
            <Link href="/search" className="text-brand-700 text-sm font-bold hover:underline">
              Browse products
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
