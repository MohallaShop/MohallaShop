import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { RemoveFavoriteButton } from '@/components/customer/RemoveFavoriteButton'
import { listFavoriteShops } from '@/lib/api/favorites'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Favorites',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function FavoritesPage() {
  const token = await requireServerToken('/favorites')

  let favorites
  try {
    favorites = await listFavoriteShops(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/favorites')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Favorites" description="Shops you’ve saved for quick access." />
      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on a shop to save it here."
          action={{ label: 'Browse shops', href: '/shops' }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <li
              key={f.id}
              className="border-border bg-surface shadow-card flex flex-col rounded-2xl border p-4"
            >
              <Link href={`/shops/${f.shop_id}`} className="text-content font-semibold hover:underline">
                {f.shop_name}
              </Link>
              <p className="text-muted text-xs">{f.shop_city ?? '—'}</p>
              <div className="mt-auto pt-4">
                <RemoveFavoriteButton token={token} favoriteId={f.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
