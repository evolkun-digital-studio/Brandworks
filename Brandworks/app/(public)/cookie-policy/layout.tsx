import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Cookie policy | Brand Works',
  '/cookie-policy',
  'The cookies Brand Works uses on this site, what each one does and how to change your choice.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
