import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'
import { getServerAuth } from '@/lib/api/session'
import { getProfile, listAddresses } from '@/lib/api/profile'

export const metadata: Metadata = {
  title: 'Shop',
  robots: { index: false, follow: false },
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let name: string | null = null
  let location: string | null = null
  const auth = await getServerAuth()

  if (auth) {
    try {
      const [profile, addresses] = await Promise.all([
        getProfile(auth.token),
        listAddresses(auth.token),
      ])
      name = profile.display_name
      const addr = addresses.items.find((item) => item.is_default) ?? addresses.items[0]
      if (addr) location = addr.label ? `${addr.label} - ${addr.city}` : addr.city
    } catch {
      // Shell account and location chrome are best-effort.
    }
  }

  return (
    <AppShell role="customer" user={{ name, location, signedIn: Boolean(auth) }}>
      {children}
    </AppShell>
  )
}
