'use client'

import MediaLibrary from '../../../src/admin/pages/MediaLibrary'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminMediaPage() {
  return <ProtectedAdminPage><MediaLibrary /></ProtectedAdminPage>
}
