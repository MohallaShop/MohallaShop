import Link from 'next/link'
import { GridIcon, PackageIcon } from '@/components/icons'
import { AddProductButton } from './AddProductButton'
import type { ProductSummary } from '@/lib/api/types'
import { formatMoney } from '@/lib/utils/format'

/** Card used in global search results. Backed by /products. */
export function ProductSearchCard({ product }: { product: ProductSummary }) {
  return (
    <div className="border-border bg-surface shadow-card flex min-w-0 flex-col rounded-2xl border p-4">
      <div className="bg-surface-hover text-muted mb-3 grid h-20 place-items-center overflow-hidden rounded-xl text-xl">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <PackageIcon className="h-7 w-7" />
        )}
      </div>
      <h3 className="text-content line-clamp-2 min-h-11 font-semibold leading-snug">
        {product.name}
      </h3>
      <p className="text-muted mt-0.5 truncate text-xs">{product.shop_name}</p>
      <div className="text-content mt-2 flex min-w-0 items-baseline gap-1">
        <span className="truncate text-lg font-bold">{formatMoney(product.price)}</span>
        <span className="text-muted shrink-0 text-xs">/ {product.unit}</span>
      </div>
      <div className="mt-auto pt-4">
        {product.in_stock ? (
          <AddProductButton
            productId={product.id}
            shopId={product.shop_id}
            size="sm"
            fullWidth
            label="Add to cart"
          />
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="bg-muted/10 text-muted inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-xl px-3 text-sm font-semibold"
          >
            Out of stock
          </button>
        )}
      </div>
    </div>
  )
}

/** Small card variant used on the categories grid. */
export function CategoryCard({ category, href }: { category: CategorySummaryLike; href: string }) {
  return (
    <Link
      href={href}
      className="border-border bg-surface shadow-card hover:shadow-elevated group flex min-w-0 items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5"
    >
      <span className="bg-brand-500/10 text-brand-600 dark:text-brand-400 border-border/50 grid h-12 w-12 shrink-0 place-items-center rounded-xl border">
        <GridIcon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="text-content block truncate font-semibold">{category.name}</span>
        <span className="text-muted text-xs">
          {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
        </span>
      </span>
    </Link>
  )
}

interface CategorySummaryLike {
  name: string
  product_count: number
}
