import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import AdminShell from './AdminShell'

/**
 * Gate for every authenticated admin route. While the initial session
 * check is in flight, shows a minimal loading state rather than
 * flashing the login page. Once resolved, unauthenticated visitors are
 * redirected to /admin/login (remembering where they were headed).
 */
function RequireAdminAuth() {
  const { admin, loading } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <span className="text-[14px] text-neutral-500">Loading…</span>
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <AdminShell />
}

export default RequireAdminAuth
