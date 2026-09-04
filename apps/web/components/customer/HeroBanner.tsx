import Link from 'next/link'
import { CartIcon, SearchIcon, StoreIcon } from '@/components/icons'

export function HeroBanner() {
  return (
    <section className="border-border border-b pb-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-brand-700 dark:text-brand-300 text-sm font-bold">
            Neighbourhood shopping
          </p>
          <h1 className="text-content mt-2 text-3xl font-extrabold leading-tight md:text-4xl">
            Daily essentials from nearby stores.
          </h1>
          <p className="text-muted mt-2 max-w-xl text-sm leading-6 md:text-base">
            Browse active local shops, add available products directly to cart, and place
            cash-on-delivery orders from one clean storefront.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/shops"
            className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white transition"
          >
            <StoreIcon className="h-4.5 w-4.5" />
            Browse shops
          </Link>
          <Link
            href="/search"
            className="border-border bg-surface text-content hover:bg-surface-hover inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-bold transition"
          >
            <SearchIcon className="h-4.5 w-4.5" />
            Search products
          </Link>
          <Link
            href="/cart"
            className="border-border bg-surface text-content hover:bg-surface-hover inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-bold transition"
          >
            <CartIcon className="h-4.5 w-4.5" />
            Cart
          </Link>
        </div>
      </div>
    </section>
  )
}
