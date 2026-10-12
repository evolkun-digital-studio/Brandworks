import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Creative, Digital & Marketing Services | BrandWorks',
  '/services',
  'Explore BrandWorks services across brand strategy, graphic design, content creation, photography, videography, social media marketing, PR, founder reputation management, performance marketing, SEO, and web design and development.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
