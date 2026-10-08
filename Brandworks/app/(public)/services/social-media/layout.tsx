import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Social Media & Content Strategy | BrandWorks',
  '/services/social-media',
  'Strategic social media, content, reels and community management built as one connected brand system.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
