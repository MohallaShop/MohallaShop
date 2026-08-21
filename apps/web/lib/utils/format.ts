import type { OrderStatus } from '@/lib/api/types'

/** INR money formatting for display. Input is the backend's string money. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return String(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n)
}

/** Compact, locale-friendly date/time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(d)
}

export interface StatusMeta {
  label: string
  tone: 'brand' | 'warning' | 'danger' | 'muted' | 'info' | 'success'
}

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  placed: { label: 'Placed', tone: 'info' },
  pending_shop: { label: 'Awaiting shop', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'info' },
  preparing: { label: 'Preparing', tone: 'warning' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'success' },
  out_for_delivery: { label: 'Out for delivery', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

export function statusMeta(status: OrderStatus | string): StatusMeta {
  return STATUS_META[status as OrderStatus] ?? { label: status, tone: 'muted' as const }
}
