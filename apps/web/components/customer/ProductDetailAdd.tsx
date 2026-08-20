'use client'

import { useState } from 'react'
import { AddProductButton } from '@/components/customer/AddProductButton'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import type { ProductOut } from '@/lib/api/types'

export function ProductDetailAdd({ product }: { product: ProductOut }) {
  const [qty, setQty] = useState(1)
  return (
    <div className="flex flex-wrap items-center gap-4">
      <QuantityStepper value={qty} onChange={setQty} ariaLabel={`Quantity for ${product.name}`} />
      <div className="min-w-[12rem] flex-1">
        {product.in_stock ? (
          <AddProductButton
            productId={product.id}
            shopId={product.shop_id}
            quantity={qty}
            size="lg"
            fullWidth
          />
        ) : (
          <button
            type="button"
            disabled
            className="bg-muted/10 text-muted inline-flex h-12 w-full items-center justify-center rounded-xl px-6 font-semibold"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  )
}
