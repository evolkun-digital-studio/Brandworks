import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Graphic Design & Motion | BrandWorks',
  '/services/graphic-design',
  'Brand identity, campaign design, graphic design, motion and visual systems by BrandWorks.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
