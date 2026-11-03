import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Creative, Digital & Marketing Services | BrandWorks',
  '/services',
  'Explore BrandWorks services across brand strategy, graphic design, content creation, photography, videography, social media marketing, PR, founder reputation management, performance marketing, SEO, and web design and development.',
)
const display = localFont({ src: '../../../src/components/brandWorkFONT/creative-agency-font-grimblade-2026-04-07-06-20-57-utc/Grimblade.woff', weight: '300', display: 'swap', variable: '--font-services-display' })
const body = localFont({ src: [
  { path: '../../../src/components/brandWorkFONT/open-sans/OpenSans-Regular.ttf', weight: '400' },
  { path: '../../../src/components/brandWorkFONT/open-sans/OpenSans-Semibold.ttf', weight: '600' },
], display: 'swap', variable: '--font-services-body' })
const section = localFont({ src: '../../../src/Font/GoogleSansFlex_72pt-Display-wght100-600.woff2', weight: '100 600', display: 'swap', variable: '--font-services-section' })

export default function Layout({ children }: { children: ReactNode }) {
  return <div className={`${display.variable} ${body.variable} ${section.variable} services-fonts`}>{children}</div>
}
