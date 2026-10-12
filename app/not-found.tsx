import type { Metadata } from 'next'
import NotFoundClient from '../src/next/NotFoundClient'

export const metadata: Metadata = {
  title: 'Page Not Found | BRANDWORKS',
}

export default function NotFoundPage() {
  return <NotFoundClient />
}
