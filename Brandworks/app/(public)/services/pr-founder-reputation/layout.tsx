import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'PR and Founder Reputation Management | BrandWorks',
  '/services/pr-founder-reputation',
  'PR and founder reputation management from BrandWorks: media relations, thought leadership, speaking, search reputation, crisis response and founder portraits.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
