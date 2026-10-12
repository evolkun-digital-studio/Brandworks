'use client'

import BlogList from '../admin/pages/blogs/BlogList'
import ProtectedAdminPage from './ProtectedAdminPage'

export default function AdminBlogsClient() {
  return <ProtectedAdminPage><BlogList /></ProtectedAdminPage>
}
