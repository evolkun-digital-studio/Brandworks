import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

/**
 * This project's own directory. Pinned because Next otherwise infers the
 * workspace root from the nearest lockfile, and a stray package-lock.json in
 * a parent folder (e.g. the home directory) makes it pick that folder:
 * Turbopack then warns and watches far too much, and the standalone server
 * lands at a nested path that mirrors the build machine's directories.
 */
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

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
  // Self-contained server (.next/standalone/server.js) with only the
  // node_modules it traces. scripts/build-release.mjs adds public/ and
  // .next/static/ and packages it for the Linux server.
  output: 'standalone',
  turbopack: { root: projectRoot },
  // Same root for file tracing, so server.js sits at .next/standalone/server.js.
  outputFileTracingRoot: projectRoot,
  // argon2 loads its binary through node-gyp-build at runtime, which the
  // tracer cannot follow, so without this no binary ships and admin login
  // crashes. Only the Linux x64 prebuild (the production target) is included:
  // never argon2/build/, the build machine's own compile, which node-gyp-build
  // would prefer over the prebuild and which is a macOS binary on a Mac.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/argon2/prebuilds/linux-x64/**/*'],
  },
  // Local-storage path resolution makes the tracer copy unrelated project
  // folders: earlier release output, scratch files, local media and the
  // TypeScript sources Node never executes. None belongs in a release.
  // These globs match anywhere in a path, so each one names a path that cannot
  // occur inside node_modules: a bare './dist/**' would also drop every
  // package's dist/ folder (next/dist, @mongodb-js/saslprep/dist, ...).
  outputFileTracingExcludes: {
    '/**': [
      './dist/release/**/*',
      './dist/brandworks-next-*',
      './scratch/**/*',
      './.media-storage/**/*',
      './src/server/**/*.ts',
    ],
  },
  // Hide the dev-only route badge; compile and runtime errors still surface.
  devIndicators: false,
  // Keep the admin panel and its API out of search results. Covers the JSON
  // API responses too, which have no HTML <meta name="robots"> to carry it.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
    return [
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
