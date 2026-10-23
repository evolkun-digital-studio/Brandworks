import '../styles'
import { Navigate, useLocation } from '../../routing'
import type { ReactNode } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import { useAdminTheme } from '../hooks/useAdminTheme'
import AdminShell from './AdminShell'

/**
 * Gate for every authenticated admin route. While the initial session
 * check is in flight, shows a quiet loading state rather than flashing the
 * login page. Once resolved, unauthenticated visitors are redirected to
 * /admin/login (remembering where they were headed).
 */
function RequireAdminAuth({ children }: { children?: ReactNode }) {
  const { admin, loading } = useAdminAuth()
  const [theme] = useAdminTheme()
  const location = useLocation()

  if (loading) {
    return (
      <div className="admin-app grid min-h-dvh place-items-center" data-theme={theme}>
        <span className="admin-skeleton size-10 rounded-full" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <AdminShell>{children}</AdminShell>
}

export default RequireAdminAuth
