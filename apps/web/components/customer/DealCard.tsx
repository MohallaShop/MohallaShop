import Link from 'next/link'
import { PackageIcon } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { AddProductButton } from './AddProductButton'
import type { ProductOut } from '@/lib/api/types'
import { formatMoney } from '@/lib/utils/format'

const TINTS = [
  'bg-amber-500/10 ring-amber-500/20',
  'bg-brand-500/10 ring-brand-500/20',
  'bg-emerald-500/10 ring-emerald-500/20',
  'bg-rose-500/10 ring-rose-500/20',
  'bg-sky-500/10 ring-sky-500/20',
]

export function DealCard({ product, index }: { product: ProductOut; index: number }) {
  return (
    <article className="border-border bg-surface shadow-card hover:shadow-card-hover flex w-[11rem] shrink-0 snap-start flex-col overflow-hidden rounded-lg border transition">
      <Link
        href={`/products/${product.id}`}
        className={`${TINTS[index % TINTS.length]} relative grid h-28 place-items-center ring-1`}
      >
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="bg-surface text-brand-700 dark:text-brand-300 grid h-14 w-14 place-items-center rounded-lg shadow-sm">
            <PackageIcon className="h-7 w-7" />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/products/${product.id}`}
          className="text-content hover:text-brand-700 line-clamp-2 min-h-10 text-sm font-semibold leading-snug"
        >
          {product.name}
        </Link>
        <span className="text-muted mt-0.5 block truncate text-xs">{product.unit}</span>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-content text-base font-extrabold">
            {formatMoney(product.price)}
          </span>
        </div>
        <div className="mt-auto pt-3">
          {product.in_stock ? (
            <AddProductButton
              productId={product.id}
              shopId={product.shop_id}
              size="sm"
              fullWidth
              label="Add"
            />
          ) : (
            <Badge tone="muted">Out of stock</Badge>
          )}
        </div>
      </div>
    </article>
  )
}
