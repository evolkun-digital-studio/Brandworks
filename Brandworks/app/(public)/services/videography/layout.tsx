import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Videography & Cinematography | BRANDWORKS',
  '/services/videography',
  'Brand films, commercial video and cinematic content developed from concept through production and post-production.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
