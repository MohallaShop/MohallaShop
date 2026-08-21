import { Badge } from '@/components/ui/Badge'
import { AddProductButton } from './AddProductButton'
import { formatMoney } from '@/lib/utils/format'
import type { ProductOut } from '@/lib/api/types'

export function ProductCard({ product }: { product: ProductOut }) {
  const available = product.in_stock
  return (
    <div className="border-border bg-surface shadow-card flex flex-col rounded-2xl border p-4">
      <div className="bg-surface-hover text-muted mb-3 grid h-20 place-items-center rounded-xl text-xl">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          '🛒'
        )}
      </div>
      <h3 className="text-content font-semibold leading-snug">{product.name}</h3>
      {product.description ? (
        <p className="text-muted mt-1 line-clamp-2 text-sm">{product.description}</p>
      ) : null}
      <div className="text-content mt-2 flex items-baseline gap-1">
        <span className="text-lg font-bold">{formatMoney(product.price)}</span>
        <span className="text-muted text-xs">/ {product.unit}</span>
      </div>
      <div className="mt-1">
        {available ? (
          <Badge tone="success">In stock</Badge>
        ) : (
          <Badge tone="muted">Out of stock</Badge>
        )}
      </div>
      <div className="mt-auto pt-4">
        {available ? (
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
            Unavailable
          </button>
        )}
      </div>
    </div>
  )
}
