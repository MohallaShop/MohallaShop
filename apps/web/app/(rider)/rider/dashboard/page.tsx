import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

export default function RiderDashboard() {
  return (
    <Container>
      <div className="border-border bg-surface shadow-card rounded-2xl border p-6 text-center">
        <p className="text-muted text-sm">You are currently</p>
        <p className="text-content mt-1 text-xl font-bold">Offline</p>
        <Button className="mt-4" fullWidth>
          Go online
        </Button>
        <p className="text-muted mt-3 text-xs">
          Online/offline toggling, delivery offers and the rider lifecycle ship in Phase 1b.
        </p>
      </div>
    </Container>
  )
}
