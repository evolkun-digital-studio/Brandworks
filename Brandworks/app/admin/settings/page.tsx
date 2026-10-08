'use client'

import Settings from '../../../src/admin/pages/Settings'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminSettingsPage() {
  return <ProtectedAdminPage><Settings /></ProtectedAdminPage>
}
