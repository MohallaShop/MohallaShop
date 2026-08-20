import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Shop Portal',
  robots: { index: false, follow: false },
}

export default function ShopkeeperLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="shopkeeper" brand="Shop Portal">
      {children}
    </AppShell>
  )
}
