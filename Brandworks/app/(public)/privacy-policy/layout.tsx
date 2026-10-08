import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Privacy policy | Brand Works',
  '/privacy-policy',
  'How Brand Works collects, uses and protects personal data, and the rights you have under India’s DPDP Act.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
