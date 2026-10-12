import type { ReactNode } from 'react'
import { routeMetadata } from '../../../src/next/routeMetadata'

export const metadata = routeMetadata('About | BRANDWORKS', '/about', 'Meet BrandWorks: the journey, thinking and people behind an interdisciplinary creative and marketing studio.')
export default function Layout({ children }: { children: ReactNode }) { return children }
