export const siteConfig = {
  name: 'MohallaShop',
  shortName: 'MohallaShop',
  domain: 'mohallashop.in',
  tagline: 'Your neighbourhood, delivered.',
  description:
    'Order daily essentials from trusted local shops in your neighbourhood. Fast delivery, fair prices, real people.',
} as const

export type SiteConfig = typeof siteConfig
