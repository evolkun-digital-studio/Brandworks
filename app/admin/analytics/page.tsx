'use client'

import Analytics from '../../../src/admin/pages/Analytics'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminAnalyticsPage() {
  return <ProtectedAdminPage><Analytics /></ProtectedAdminPage>
}
