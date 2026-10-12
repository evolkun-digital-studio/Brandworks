'use client'

import Users from '../../../src/admin/pages/Users'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminUsersPage() {
  return <ProtectedAdminPage><Users /></ProtectedAdminPage>
}
