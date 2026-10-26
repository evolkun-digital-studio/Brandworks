import type { NextConfig } from 'next'

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
    ],
  },
}

export default nextConfig
