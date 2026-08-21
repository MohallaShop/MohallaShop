'use client'

import { Button } from './Button'

/**
 * Accessible quantity stepper for cart lines and product pickers.
 * Emits the new absolute quantity via onChange. The backend re-validates
 * bounds; this only gates the local UX (min 1).
 */
export function QuantityStepper({
  value,
  min = 1,
  max = 999,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number
  min?: number
  max?: number
  onChange: (next: number) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div
      className="border-border bg-surface inline-flex items-center rounded-full border"
      role="group"
      aria-label={ariaLabel ?? 'Quantity'}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="text-content hover:bg-surface-hover flex h-9 w-9 items-center justify-center rounded-l-full text-lg leading-none disabled:opacity-40"
      >
        −
      </button>
      <span
        className="text-content w-8 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="text-content hover:bg-surface-hover flex h-9 w-9 items-center justify-center rounded-r-full text-lg leading-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

export function AddToCartButton({
  onAdd,
  loading,
  disabled,
  label = 'Add to cart',
}: {
  onAdd: () => void
  loading?: boolean
  disabled?: boolean
  label?: string
}) {
  return (
    <Button onClick={onAdd} isLoading={loading} disabled={disabled} size="md" className="w-full">
      {label}
    </Button>
  )
}
