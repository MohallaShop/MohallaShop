import { Badge } from '@/components/ui/Badge'
import { statusMeta } from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/api/types'

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const meta = statusMeta(status)
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
