import type { ReactNode } from 'react'
import NextPublicLayout from '../../src/next/PublicLayout'

export default function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <NextPublicLayout>{children}</NextPublicLayout>
}
