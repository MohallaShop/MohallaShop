import { cn } from '@/lib/utils/cn'
import type { StatusMeta } from '@/lib/utils/format'

type Tone = StatusMeta['tone']

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-brand-500/20',
  success: 'bg-emerald-500/10 text-success ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-warning ring-amber-500/20',
  danger: 'bg-red-500/10 text-danger ring-red-500/20',
  info: 'bg-blue-500/10 text-info ring-blue-500/20',
  muted: 'bg-muted/10 text-muted ring-border',
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
