import { Route, Routes } from 'react-router-dom'
import { AdminAuthProvider } from './context/AdminAuthContext'
import RequireAdminAuth from './components/RequireAdminAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Users from './pages/Users'
import BlogList from './pages/blogs/BlogList'
import BlogEditor from './pages/blogs/BlogEditor'

/**
 * Everything under /admin lives here, isolated from the public site's
 * routes in App.tsx. The auth session (GET /api/admin/auth/me) is only
 * ever fetched for visitors who actually navigate into /admin/*.
 */
function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<RequireAdminAuth />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Users />} />
          <Route path="blogs" element={<BlogList />} />
          <Route path="blogs/new" element={<BlogEditor />} />
          <Route path="blogs/:id/edit" element={<BlogEditor />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  )
}

export default AdminRoutes
