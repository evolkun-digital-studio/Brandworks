'use client'

import type { ReactNode } from 'react'
import RequireAdminAuth from '../admin/components/RequireAdminAuth'

export default function ProtectedAdminPage({ children }: { children: ReactNode }) {
  return <RequireAdminAuth>{children}</RequireAdminAuth>
}
