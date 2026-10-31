'use client'

import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'
import SiteScans from '../../../src/admin/pages/SiteScans'

export default function AdminSiteScansPage() { return <ProtectedAdminPage><SiteScans /></ProtectedAdminPage> }
