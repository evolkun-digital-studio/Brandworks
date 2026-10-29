import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Brand Positioning & Strategy | BrandWorks',
  '/services/brand-positioning-strategy',
  'Building a brand without a strategy? BrandWorks defines who you’re for, what you stand for and why you win, then turns it into a 90-day growth roadmap.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
