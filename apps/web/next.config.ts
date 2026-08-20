import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep build output small and reproducible.
  productionBrowserSourceMaps: false,
  experimental: {
    // Typed routes are enabled once stable; left default for now.
  },
}

export default nextConfig
