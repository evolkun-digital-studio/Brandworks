'use client'

import type { ReactNode } from 'react'
import { AdminAuthProvider } from '../../src/admin/context/AdminAuthContext'

/** Client-side providers for the admin app, kept apart so layout.tsx can stay a server component. */
export default function AdminProviders({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
