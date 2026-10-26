import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../src/index.css'
import NextNavigationProvider from '../src/next/NextNavigationProvider'

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
    <html lang="en">
      <head>
        {/* Display faces for the Graphic & Motion logo tiles only. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Pacifico&family=Bungee&family=Abril+Fatface&family=Righteous&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <NextNavigationProvider>{children}</NextNavigationProvider>
      </body>
    </html>
  )
}
