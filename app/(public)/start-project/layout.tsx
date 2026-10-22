import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Plan your website — BRANDWORKS',
  '/start-project',
  'Answer a few quick questions about your business and your website — new build, redesign or new features — and get a project plan from the BrandWorks team.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
