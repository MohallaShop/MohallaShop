import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatMoney } from '@/lib/utils/format'
import type { RiderDelivery } from '@/lib/api/types'
import { DeliveryActions } from './DeliveryActions'

const DELIVERY_META: Record<
  RiderDelivery['status'],
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }
> = {
  assigned: { label: 'Assigned', tone: 'info' },
  picked_up: { label: 'Picked up', tone: 'warning' },
  delivered: { label: 'Delivered', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
}

export function DeliveryCard({ delivery }: { delivery: RiderDelivery }) {
  const meta = DELIVERY_META[delivery.status] ?? { label: delivery.status, tone: 'muted' as const }
  return (
    <li className="border-border bg-surface shadow-card rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-content truncate font-semibold">
            {delivery.order_no}
            <span className="text-muted ml-2 text-xs font-normal">{delivery.shop_name}</span>
          </p>
          <p className="text-muted mt-0.5 text-xs">
            Assigned {formatDateTime(delivery.assigned_at)}
            {delivery.completed_at ? ` · Finished ${formatDateTime(delivery.completed_at)}` : ''}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <dl className="text-sm">
        <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-muted text-xs font-semibold uppercase tracking-wide">
              Drop address
            </dt>
            <dd className="text-content mt-0.5 break-words">
              {delivery.drop_line1}, {delivery.drop_city}
              {delivery.drop_pincode ? ` ${delivery.drop_pincode}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Contact</dt>
            <dd className="text-content mt-0.5 break-words">
              {delivery.contact_name ?? '—'}
              {delivery.contact_phone ? ` · ${delivery.contact_phone}` : ''}
            </dd>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-muted text-xs">
            Order total{' '}
            <span className="text-content font-semibold">{formatMoney(delivery.total_amount)}</span>
            {delivery.rider_fee ? (
              <>
                {' '}
                · your fee{' '}
                <span className="text-success font-semibold">
                  {formatMoney(delivery.rider_fee)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {delivery.notes ? (
          <p className="text-warning mt-2 text-xs">
            <span className="font-semibold">Note:</span> {delivery.notes}
          </p>
        ) : null}
      </dl>

      <div className="mt-4">
        <DeliveryActions deliveryId={delivery.id} status={delivery.status} />
      </div>
    </li>
  )
}
