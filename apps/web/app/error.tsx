'use client'

import { ErrorState } from '@/components/ui/StateFeedback'

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} />
}
