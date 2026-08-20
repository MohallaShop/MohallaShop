import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Public marketing pages are indexable; authenticated app surfaces
        // (dashboards) carry noindex via route metadata in later phases.
        userAgent: '*',
        allow: '/',
        disallow: ['/shop', '/rider', '/admin', '/orders', '/cart', '/checkout', '/profile'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
