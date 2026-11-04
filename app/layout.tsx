import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../src/index.css'
import NextNavigationProvider from '../src/next/NextNavigationProvider'
import { PRELOAD_SCRIPT } from '../src/lib/preloadFlag'

const HOME_DESCRIPTION =
  'We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.'

// oxlint-disable-next-line react/only-export-components -- App Router metadata must be exported from the layout.
export const metadata: Metadata = {
  metadataBase: new URL('https://brandworks.me'),
  title: 'BRANDWORKS',
  description: HOME_DESCRIPTION,
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'BrandWorks',
    title: 'BRANDWORKS',
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: 'BRANDWORKS',
    description: HOME_DESCRIPTION,
  },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // The head script may add the preloader class to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run before first paint: decides whether this load opens on the preloader (src/lib/preloadFlag.ts). */}
        <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
        {/* Display faces for the Graphic & Motion logo tiles and the hero's mock client sites. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Pacifico&family=Bungee&family=Abril+Fatface&family=Righteous&family=Figtree:ital,wght@0,400..800;1,800&family=Fraunces:opsz,wght@9..144,500..600&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <NextNavigationProvider>{children}</NextNavigationProvider>
      </body>
    </html>
  )
}
