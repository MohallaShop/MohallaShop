import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="admin" brand="Admin">
      {children}
    </AppShell>
  )
}
