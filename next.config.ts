import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number]

/** Media Manager's public R2 domain (R2_PUBLIC_URL), read at build time. */
function mediaManagerPattern(): RemotePattern[] {
  const raw = process.env.R2_PUBLIC_URL?.trim()
  if (!raw) return []
  try {
    const url = new URL(raw)
    const base = url.pathname.replace(/\/+$/, '')
    return [{ protocol: url.protocol === 'http:' ? 'http' : 'https', hostname: url.hostname, pathname: `${base}/media/**` }]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  // Hide the dev-only route badge; compile and runtime errors still surface.
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-4a67635800e64547a1a4fd524f7a2783.r2.dev',
        pathname: '/Photography/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-4a67635800e64547a1a4fd524f7a2783.r2.dev',
        pathname: '/media/**',
      },
      ...mediaManagerPattern(),
    ],
  },
}

export default bundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false })(nextConfig)
