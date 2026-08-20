import { Container } from './Container'

/**
 * Honest placeholder for surfaces that exist structurally (so navigation never
 * 404s) but whose functionality ships in a later phase. Never fakes data.
 */
export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string
  description: string
  phase: string
}) {
  return (
    <Container>
      <div className="border-border bg-surface shadow-card rounded-2xl border border-dashed p-8 text-center">
        <span className="bg-accent-100 text-accent-700 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {phase}
        </span>
        <h1 className="text-content mt-4 text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="text-muted mx-auto mt-2 max-w-md">{description}</p>
      </div>
    </Container>
  )
}
