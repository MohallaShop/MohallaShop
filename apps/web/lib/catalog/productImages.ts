const PRODUCT_IMAGES: Array<{ pattern: RegExp; url: string }> = [
  {
    pattern: /\b(atta|flour|wheat)\b/i,
    url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(rice|basmati)\b/i,
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(tomato|tomatoes)\b/i,
    url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(potato|potatoes)\b/i,
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(onion|onions)\b/i,
    url: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(banana|bananas)\b/i,
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(milk)\b/i,
    url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(paneer|cheese)\b/i,
    url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(bread|bakery)\b/i,
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(egg|eggs)\b/i,
    url: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(tea|chai)\b/i,
    url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=640&q=80',
  },
  {
    pattern: /\b(oil|ghee)\b/i,
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=640&q=80',
  },
]

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=640&q=80'

export function productImageUrl(product: { name: string; image_url?: string | null }): string {
  if (product.image_url) return product.image_url
  return PRODUCT_IMAGES.find((item) => item.pattern.test(product.name))?.url ?? FALLBACK_IMAGE
}
