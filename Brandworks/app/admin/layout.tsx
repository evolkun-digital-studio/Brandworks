'use client'

import type { ReactNode } from 'react'
import { AdminAuthProvider } from '../../src/admin/context/AdminAuthContext'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
