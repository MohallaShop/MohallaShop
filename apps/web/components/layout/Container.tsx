import { cn } from '@/lib/utils/cn'

/** Centered, max-width content container for page sections. */
export function Container({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 md:px-6', className)}>{children}</div>
}
