'use client'

import Dashboard from '../../src/admin/pages/Dashboard'
import ProtectedAdminPage from '../../src/next/ProtectedAdminPage'

export default function AdminDashboardPage() {
  return <ProtectedAdminPage><Dashboard /></ProtectedAdminPage>
}
