import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Selected Work — BRANDWORKS',
  '/work',
  'Selected BrandWorks projects across brand identity, photography, film, social content and digital work.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
