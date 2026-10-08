import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

const title = 'Performance Marketing Agency | BrandWorks'
const description = 'BrandWorks connects paid media, Meta Ads, Google Ads, campaign strategy, conversion optimization and analytics to measurable business growth.'
export const metadata = routeMetadata(title, '/services/performance-marketing', description)
export default function Layout({ children }: { children: ReactNode }) { return children }
