import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Concept Creation | BrandWorks',
  '/services/concept-creation',
  'Concept creation from BrandWorks: we find one clear idea for your brand and show how it works across film, outdoor, packaging, social and retail.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
