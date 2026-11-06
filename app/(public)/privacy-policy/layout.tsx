import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Privacy policy | BrandWorks',
  '/privacy-policy',
  'How BrandWorks collects, uses and protects personal data, and the rights you have under India’s DPDP Act, 2023 and DPDP Rules, 2025.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
