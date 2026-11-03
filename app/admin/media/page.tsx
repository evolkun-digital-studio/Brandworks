'use client'

import SiteMediaManager from '../../../src/admin/pages/SiteMediaManager'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminMediaPage() {
  return <ProtectedAdminPage><SiteMediaManager /></ProtectedAdminPage>
}
