import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PackageIcon } from '@/components/icons'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { Badge } from '@/components/ui/Badge'
import { ProductDetailAdd } from '@/components/customer/ProductDetailAdd'
import { getProduct } from '@/lib/api/shops'
import { getServerAuth } from '@/lib/api/session'
import { isNotFound } from '@/lib/api/errors'
import { productImageUrl } from '@/lib/catalog/productImages'
import { formatMoney } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>
}): Promise<Metadata> {
  const { productId } = await params
  // Guest-browsable catalogue page (ADR-0006).
  const token = (await getServerAuth())?.token ?? null
  try {
    const p = await getProduct(token, productId)
    return { title: p.name, description: p.description ?? undefined, robots: { index: false } }
  } catch {
    return { title: 'Product', robots: { index: false } }
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  // Guest-browsable catalogue page (ADR-0006).
  const token = (await getServerAuth())?.token ?? null
  let product
  try {
    product = await getProduct(token, productId)
  } catch (err) {
    if (isNotFound(err)) notFound()
    return <ErrorState error={err} />
  }
  const imageUrl = productImageUrl(product)

  return (
    <Container>
      <div className="mb-4">
        <Link href={`/shops/${product.shop_id}`} className="text-brand-700 text-sm font-semibold">
          ← Back to shop
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-brand-50 text-brand-700 grid aspect-square place-items-center overflow-hidden rounded-2xl text-6xl">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <PackageIcon className="h-16 w-16" />
          )}
        </div>
        <div>
          <PageHeader title={product.name} description={product.description ?? undefined}>
            {product.in_stock ? (
              <Badge tone="success">In stock</Badge>
            ) : (
              <Badge tone="muted">Out of stock</Badge>
            )}
          </PageHeader>
          <p className="text-content text-2xl font-bold">
            {formatMoney(product.price)}{' '}
            <span className="text-muted text-base font-normal">/ {product.unit}</span>
          </p>
          <div className="mt-6">
            <ProductDetailAdd product={product} />
          </div>
        </div>
      </div>
    </Container>
  )
}
