'use client'

import ActivityLog from '../../../src/admin/pages/ActivityLog'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminActivityPage() { return <ProtectedAdminPage><ActivityLog /></ProtectedAdminPage> }
