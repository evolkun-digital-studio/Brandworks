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

/**
 * Baseline security headers for every response. Deliberately conservative so
 * nothing the site uses breaks:
 * - Permissions-Policy blocks only features nothing uses. The microphone stays
 *   available to this site (questionnaire voice input) and the YouTube embed's
 *   accelerometer / gyroscope / encrypted-media / picture-in-picture / web-share
 *   delegations are left untouched.
 * - HSTS has no includeSubDomains: other apps on brandworks.me subdomains must
 *   opt in on their own.
 * - No Content-Security-Policy yet: GTM, GA4, Clarity and Meta Pixel inject
 *   scripts, so a CSP needs its own rollout (Report-Only first). See
 *   docs/PRODUCTION_DEPLOYMENT.md, "Known remaining risks".
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone/server.js) with only the
  // node_modules it needs, so a release never ships the dev toolchain.
  // scripts/build-release.mjs copies public/ and .next/static/ next to it.
  output: 'standalone',
  // argon2 loads its native binary through node-gyp-build at runtime, which
  // the file tracer cannot see: without this the release ships no binary and
  // admin login crashes. All prebuilds are included so the same config works
  // on any build platform (scripts/build-release.mjs checks the target's one).
  // The MongoDB driver's @mongodb-js/saslprep is traced as package.json only
  // (its dist/ is missed), which breaks every database call in standalone.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/argon2/prebuilds/**/*', './node_modules/@mongodb-js/saslprep/dist/**/*'],
  },
  // Local-storage path resolution (cwd-relative `<root>/public`, source
  // folders) makes the tracer copy unrelated project folders into the bundle:
  // TypeScript sources (Node never executes them), earlier release output,
  // scratch files and local media. None belongs in a release.
  outputFileTracingExcludes: {
    '/**': ['./src/**/*.ts', './src/**/*.tsx', './dist/**/*', './scratch/**/*', './.media-storage/**/*'],
  },
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  // Hide the dev-only route badge; compile and runtime errors still surface.
  devIndicators: false,
  async headers() {
    // Keep the admin panel and its API out of search results. Covers the JSON
    // API responses too, which have no HTML <meta name="robots"> to carry it.
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: noindex },
      { source: '/api/admin/:path*', headers: noindex },
    ]
  },
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
