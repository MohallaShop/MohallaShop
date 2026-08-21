import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export default function NotFound() {
  return (
    <main>
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <div className="border-border bg-surface shadow-card max-w-md rounded-2xl border p-8 text-center">
          <p className="text-brand-600 text-sm font-semibold">404</p>
          <h1 className="text-content mt-1 text-2xl font-bold">Page not found</h1>
          <p className="text-muted mt-2 text-sm">
            The page you are looking for doesn&apos;t exist or may have moved.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href="/home"
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
            >
              Go to home
            </Link>
            <Link
              href="/shops"
              className="border-border bg-background text-content hover:bg-brand-50 inline-flex h-10 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
            >
              Browse shops
            </Link>
          </div>
        </div>
      </Container>
    </main>
  )
}
