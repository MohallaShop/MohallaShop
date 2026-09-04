import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MohallaShop',
    short_name: 'MohallaShop',
    description: 'Your neighbourhood, delivered.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7faf8',
    theme_color: '#059669',
    orientation: 'portrait',
    icons: [
      {
        src: `${siteUrl}/icon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
