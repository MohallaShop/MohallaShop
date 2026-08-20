import { Badge } from '@/components/ui/Badge'
import { statusMeta } from '@/lib/utils/format'
import { formatDateTime } from '@/lib/utils/format'
import type { OrderHistoryOut } from '@/lib/api/types'

export function OrderHistory({ history }: { history: OrderHistoryOut[] }) {
  if (history.length === 0) return null
  const ordered = [...history].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return (
    <ol className="relative space-y-4 pl-5">
      <span
        aria-hidden="true"
        className="border-border absolute bottom-1 left-1.5 top-1 w-px border-l"
      />
      {ordered.map((h, i) => {
        const meta = statusMeta(h.to_state)
        const fromMeta = h.from_state ? statusMeta(h.from_state) : null
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.15rem] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                {
                  brand: 'bg-brand-500',
                  success: 'bg-success',
                  warning: 'bg-warning',
                  danger: 'bg-danger',
                  info: 'bg-info',
                  muted: 'bg-muted',
                }[meta.tone]
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {fromMeta ? <span className="text-muted text-xs">from {fromMeta.label}</span> : null}
              {h.actor_role ? <span className="text-muted text-xs">· {h.actor_role}</span> : null}
            </div>
            <p className="text-muted mt-0.5 text-xs">{formatDateTime(h.created_at)}</p>
            {h.reason ? <p className="text-content/80 mt-0.5 text-sm">{h.reason}</p> : null}
          </li>
        )
      })}
    </ol>
  )
}
