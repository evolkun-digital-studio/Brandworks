import type { ReactNode } from 'react'
import { routeMetadata } from '../../../../src/next/routeMetadata'

export const metadata = routeMetadata(
  'Technology, AI & Automation | BrandWorks',
  '/services/technology',
  'AI agents, business automation, dashboards, ERP and custom systems designed around the way your business actually operates.',
)
export default function Layout({ children }: { children: ReactNode }) { return children }
