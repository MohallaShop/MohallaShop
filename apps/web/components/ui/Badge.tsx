import { cn } from '@/lib/utils/cn'
import type { StatusMeta } from '@/lib/utils/format'

type Tone = StatusMeta['tone']

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-success ring-emerald-200',
  warning: 'bg-amber-50 text-warning ring-amber-200',
  danger: 'bg-red-50 text-danger ring-red-200',
  info: 'bg-blue-50 text-info ring-blue-200',
  muted: 'bg-gray-100 text-muted ring-gray-200',
}

export function Badge({
  tone = 'muted',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
