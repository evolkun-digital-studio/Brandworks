import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Creative Portfolio & Selected Projects | BrandWorks',
  '/work',
  'Explore selected BrandWorks projects in brand identity, photography, film, social content and digital design. See how strategy and creative work shape distinctive brands.',
  'https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/Artboard%202.png',
)

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
