import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'SEO Services: Technical SEO, Content & Local SEO | BrandWorks',
  '/services/seo',
  'SEO services from BrandWorks: technical audits, keyword research, on-page and content work, local SEO, link earning and plain-English reporting. No ranking guarantees.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
