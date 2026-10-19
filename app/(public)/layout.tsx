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
  }
}

export default async function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <NextPublicLayout settings={await getPublicSiteSettings()}>{children}</NextPublicLayout>
}
