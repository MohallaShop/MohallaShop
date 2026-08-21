'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/** Toggles the `only_in_stock` URL param, preserving the rest of the query. */
export function InStockToggle({ checked }: { checked: boolean }) {
  const router = useRouter()
  const params = useSearchParams()

  const toggle = useCallback(() => {
    const next = new URLSearchParams(params.toString())
    if (checked) next.delete('only_in_stock')
    else next.set('only_in_stock', '1')
    const qs = next.toString()
    router.push(qs ? `?${qs}` : window.location.pathname)
  }, [checked, params, router])

  return (
    <label className="text-muted flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        className="h-4 w-4 rounded border-border accent-brand-600"
      />
      In stock only
    </label>
  )
}
