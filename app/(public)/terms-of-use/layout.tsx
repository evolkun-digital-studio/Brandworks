import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Terms of use | Brand Works',
  '/terms-of-use',
  'The terms for using the Brand Works website, including how you may use our content and portfolio.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
