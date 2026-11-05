import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AdminProviders from './AdminProviders'

// The admin panel must never appear in search results. robots.txt only stops
// crawling; this noindex tag (plus the X-Robots-Tag header in next.config.ts)
// stops indexing even when an admin URL is linked from elsewhere.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>
}
