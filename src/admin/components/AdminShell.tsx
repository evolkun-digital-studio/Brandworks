import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-[6px] px-3 py-2 text-[14px] font-medium uppercase tracking-wide transition-colors ${
    isActive
      ? 'bg-neutral-900 text-white'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
  }`

/** Shared chrome for every authenticated admin page: top bar + nav + content. */
function AdminShell() {
  const { admin, logout } = useAdminAuth()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-[72px] w-full max-w-[1100px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-[18px] font-medium tracking-normal text-neutral-900">
              BRANDWORKS
            </span>
            <span className="rounded-[4px] border border-neutral-300 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-[14px] font-medium text-neutral-900">
                {admin?.username}
              </div>
              <div className="text-[12px] uppercase tracking-wide text-neutral-500">
                {admin?.role === 'admin' ? 'Admin' : 'Sub-admin'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-[4px] border border-neutral-900 px-3 py-2 text-[13px] font-medium uppercase tracking-wide text-neutral-900 transition-opacity hover:opacity-70"
            >
              Log out
            </button>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="mx-auto flex w-full max-w-[1100px] items-center gap-2 px-6 pb-3"
        >
          <NavLink to="/admin" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/blogs" className={navLinkClass}>
            Blogs
          </NavLink>
          <NavLink to="/admin/settings" className={navLinkClass}>
            Settings
          </NavLink>
          {admin?.role === 'admin' && (
            <NavLink to="/admin/users" className={navLinkClass}>
              Admins
            </NavLink>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminShell
