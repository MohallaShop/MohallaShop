import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { ProductCard } from '@/components/customer/ProductCard'
import { SearchBar } from '@/components/customer/SearchBar'
import { InStockToggle } from '@/components/customer/InStockToggle'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { getShop, listShopProducts } from '@/lib/api/shops'
import { listFavoriteShops } from '@/lib/api/favorites'
import { FavoriteToggle } from '@/components/customer/RemoveFavoriteButton'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError, isNotFound } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

type SP = { q?: string; page?: string; only_in_stock?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopId: string }>
}): Promise<Metadata> {
  const { shopId } = await params
  const token = await requireServerToken(`/shops/${shopId}`)
  try {
    const shop = await getShop(token, shopId)
    return {
      title: shop.name,
      description: shop.description ?? undefined,
      robots: { index: false, follow: false },
    }
  } catch {
    return { title: 'Shop', robots: { index: false, follow: false } }
  }
}

export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>
  searchParams: Promise<SP>
}) {
  const { shopId } = await params
  const token = await requireServerToken(`/shops/${shopId}`)
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const onlyInStock = sp.only_in_stock === '1' || sp.only_in_stock === 'true'
  const page = Math.max(1, Number(sp.page) || 1)

  let shop, products
  try {
    ;[shop, products] = await Promise.all([
      getShop(token, shopId),
      listShopProducts(token, shopId, { q, page, page_size: 12, only_in_stock: onlyInStock }),
    ])
  } catch (err) {
    if (isAuthError(err)) redirect(`/login?next=/shops/${shopId}`)
    if (isNotFound(err)) notFound()
    return <ErrorState error={err} />
  }

  // Best-effort: mark this shop as favorited if it appears in the user's list.
  let favoriteId: string | null = null
  try {
    const favs = await listFavoriteShops(token)
    favoriteId = favs.find((f) => f.shop_id === shopId)?.id ?? null
  } catch {
    /* favorite state is non-critical */
  }

  const addr = shop.address
  const inStockParam = onlyInStock ? '1' : undefined

  return (
    <Container>
      <div className="mb-4">
        <Link href="/shops" className="text-brand-700 text-sm font-semibold">
          ← All shops
        </Link>
      </div>

      <PageHeader title={shop.name} description={shop.description ?? undefined}>
        <div className="flex items-center gap-2">
          <FavoriteToggle token={token} shopId={shopId} initialFavoriteId={favoriteId} />
          <Badge tone="success">{shop.status === 'active' ? 'Open' : shop.status}</Badge>
        </div>
      </PageHeader>

      <div className="border-border bg-surface shadow-card mb-6 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
        <div>
          <h2 className="text-content text-sm font-semibold">Address</h2>
          <p className="text-muted text-sm">
            {[addr?.line1, addr?.city, addr?.state, addr?.pincode].filter(Boolean).join(', ') ||
              'Not provided'}
          </p>
        </div>
        <div>
          <h2 className="text-content text-sm font-semibold">Contact</h2>
          <p className="text-muted text-sm">{shop.phone ?? 'Not provided'}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-content text-xl font-bold">Products</h2>
        <div className="flex flex-1 items-center gap-3 sm:max-w-md sm:justify-end">
          <InStockToggle checked={onlyInStock} />
        </div>
      </div>

      <div className="mb-6">
        <SearchBar defaultValue={q} basePath={`/shops/${shopId}`} />
      </div>

      {products.items.length === 0 ? (
        <EmptyState
          title={q ? 'No matching products' : 'No products yet'}
          description={
            q
              ? 'Try another search or clear filters.'
              : 'This shop has not listed any products yet.'
          }
          action={q ? { label: 'Clear', href: `/shops/${shopId}` } : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination
            data={products.pagination}
            base={`/shops/${shopId}`}
            params={{ q, only_in_stock: inStockParam }}
          />
        </>
      )}
    </Container>
  )
}
