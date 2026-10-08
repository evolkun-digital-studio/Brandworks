'use client'

import BlogEditor from '../../../../src/admin/pages/blogs/BlogEditor'
import ProtectedAdminPage from '../../../../src/next/ProtectedAdminPage'

export default function NewAdminBlogPage() {
  return <ProtectedAdminPage><BlogEditor /></ProtectedAdminPage>
}
