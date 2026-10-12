import type { ReactNode } from 'react'
import { heroPhotograph } from '../../../../src/data/photography.data'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Commercial & Brand Photography Services | BrandWorks',
  '/services/photography',
  'Commercial, campaign and product photography, editorial portraits and hospitality imagery. Explore photography and creative production with BrandWorks.',
  heroPhotograph.src,
)
export default function Layout({ children }: { children: ReactNode }) { return children }
