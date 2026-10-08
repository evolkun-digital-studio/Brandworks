import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Social Club | BRANDWORKS',
  '/services/social-club',
  'A people-first social media agency building strategy, content and community into a connected story for brands.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
