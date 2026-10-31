'use client'

import ProtectedAdminPage from '../../../../src/next/ProtectedAdminPage'
import SiteScanDetail from '../../../../src/admin/pages/SiteScanDetail'

export default function AdminSiteScanDetailPage() { return <ProtectedAdminPage><SiteScanDetail /></ProtectedAdminPage> }
