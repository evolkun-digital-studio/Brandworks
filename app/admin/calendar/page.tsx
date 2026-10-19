'use client'

import EditorialCalendar from '../../../src/admin/pages/EditorialCalendar'
import ProtectedAdminPage from '../../../src/next/ProtectedAdminPage'

export default function AdminCalendarPage() { return <ProtectedAdminPage><EditorialCalendar /></ProtectedAdminPage> }
