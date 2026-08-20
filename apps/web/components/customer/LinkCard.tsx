import Link from 'next/link'

export function LinkCard({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface shadow-card hover:shadow-elevated group flex flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5"
    >
      <span className="text-content font-semibold">{title}</span>
      <span className="text-muted mt-1 flex-1 text-sm">{description}</span>
      <span className="text-brand-700 group-hover:text-brand-800 mt-3 text-sm font-semibold">
        Open →
      </span>
    </Link>
  )
}
