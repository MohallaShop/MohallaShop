import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { ProductSearchCard } from '@/components/customer/ProductSearchCard'
import { SearchBar } from '@/components/customer/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { listShops, searchProducts } from '@/lib/api/shops'
import { getServerAuth } from '@/lib/api/session'
import type { ProductSummary, ShopSummary } from '@/lib/api/types'

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { q?: string; category?: string; page?: string }

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  // Guest-browsable catalogue page (ADR-0006).
  const token = (await getServerAuth())?.token ?? null
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const categoryId = sp.category?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  // A category-only filter (no text) is a valid browse intent — show products.
  const hasFilter = Boolean(q || categoryId)

  let products: ProductSummary[] = []
  let shops: ShopSummary[] = []
  let pagination = { page, page_size: 12, total: 0, total_pages: 0 }
  try {
    if (hasFilter) {
      const productsPage = await searchProducts(token, {
        q,
        category_id: categoryId,
        page,
        page_size: 12,
      })
      products = productsPage.items
      pagination = productsPage.pagination
    } else {
      const shopsPage = await listShops(token, { page_size: 6 })
      shops = shopsPage.items
    }
  } catch (err) {
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Search" description="Find products and shops near you." />
      <div className="mb-6">
        <SearchBar defaultValue={q} basePath="/search" autoFocus />
      </div>

      {!hasFilter ? (
        <section>
          <h2 className="text-content mb-3 text-lg font-bold">Popular shops</h2>
          {shops.length === 0 ? (
            <EmptyState
              title="Search your neighbourhood"
              description="Try “groceries”, “dairy”, or a product/shop name."
            />
          ) : (
            <p className="text-muted text-sm">
              Showing {shops.length} shops. Start typing above to search products.
            </p>
          )}
        </section>
      ) : products.length === 0 ? (
        <EmptyState
          title={`No products match “${q ?? 'this filter'}”`}
          description="Try a different term, clear the filter, or browse all shops."
          action={{ label: 'Browse all shops', href: '/shops' }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductSearchCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination data={pagination} base="/search" params={{ q, category: categoryId }} />
        </>
      )}
    </Container>
  )
}
