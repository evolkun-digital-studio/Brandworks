import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Contact — BRANDWORKS',
  '/contact',
  'Contact BrandWorks to discuss brand strategy, creative production, marketing, technology or a digital project.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
