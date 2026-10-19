'use client'

import SeoWorkspace from '../../../src/admin/pages/SeoWorkspace'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminSeoPage() {
  return <ProtectedAdminPage><SeoWorkspace /></ProtectedAdminPage>
}
