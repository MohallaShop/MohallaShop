import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MohallaShop — Your neighbourhood, delivered',
    template: '%s · MohallaShop',
  },
  description:
    'Order daily essentials from trusted local shops in your neighbourhood. Fast delivery, fair prices, real people.',
  applicationName: 'MohallaShop',
  keywords: ['local shops', 'grocery delivery', 'neighbourhood marketplace', 'kirana', 'India'],
  authors: [{ name: 'MohallaShop' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'MohallaShop',
    title: 'MohallaShop — Your neighbourhood, delivered',
    description: 'Order daily essentials from trusted local shops near you.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MohallaShop',
    description: 'Your neighbourhood, delivered.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
