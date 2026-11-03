import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import NextPublicLayout from '../../src/next/PublicLayout'
import { getPublicSiteSettings } from '../../src/server/site-settings/service'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings()
  return {
    title: settings.siteName,
    description: settings.siteDescription,
    openGraph: { siteName: settings.siteName, title: settings.siteName, description: settings.siteDescription },
    twitter: { title: settings.siteName, description: settings.siteDescription },
    // Server-rendered so Search Console's HTML-tag check finds it without running JavaScript.
    ...(settings.tracking.gscVerification ? { verification: { google: settings.tracking.gscVerification } } : {}),
  }
}

export default async function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <NextPublicLayout settings={await getPublicSiteSettings()}>{children}</NextPublicLayout>
}
