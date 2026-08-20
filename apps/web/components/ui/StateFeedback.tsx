import { Container } from '@/components/layout/Container'
import { Button, buttonClasses } from './Button'
import { classifyError } from '@/lib/api/errors'

/** Skeleton placeholder grid for list/card loading states. */
export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-surface shadow-card animate-pulse rounded-2xl border p-5"
        >
          <div className="bg-muted/20 mb-4 h-28 rounded-xl" />
          <div className="bg-muted/20 mb-2 h-4 w-3/4 rounded" />
          <div className="bg-muted/20 h-3 w-1/2 rounded" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Inline spinner for buttons / small areas. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? 'h-4 w-4'}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="text-muted flex items-center justify-center gap-3 py-16" role="status">
      <Spinner className="text-brand-600 h-5 w-5" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  return (
    <div className="border-border bg-surface shadow-card rounded-2xl border border-dashed p-8 text-center">
      <h2 className="text-content text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted mx-auto mt-1 max-w-md text-sm">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-5">
          {action.href ? (
            <a href={action.href} className={buttonClasses('primary', 'md')}>
              {action.label}
            </a>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const friendly = classifyError(error)
  return (
    <Container>
      <div
        role="alert"
        className="border-danger/30 shadow-card rounded-2xl border bg-red-50/60 p-8 text-center"
      >
        <h2 className="text-danger text-lg font-semibold">Something went wrong</h2>
        <p className="text-content/70 mx-auto mt-1 max-w-md text-sm">{friendly.message}</p>
        {onRetry ? (
          <div className="mt-5">
            <Button onClick={onRetry}>Try again</Button>
          </div>
        ) : null}
      </div>
    </Container>
  )
}

/** Page heading used at the top of most surfaces. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-content text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}
