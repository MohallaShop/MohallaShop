import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { ProductManager } from '@/components/shopkeeper/ProductManager'
import { listShopProducts } from '@/lib/api/shopkeeper'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function ShopkeeperProductsPage() {
  const token = await requireServerToken('/shop/products')

  let products
  try {
    const page = await listShopProducts(token, { page_size: 50 })
    products = page.items
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/shop/products')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <div className="mb-3">
        <Link href="/shop" className="text-brand-700 text-sm font-semibold">
          ← Dashboard
        </Link>
      </div>
      <PageHeader
        title="Products"
        description="Create, price and stock the items customers see in your shop."
      />
      <ProductManager token={token} products={products} />
    </Container>
  )
}
