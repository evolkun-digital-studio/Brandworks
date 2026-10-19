import { AnimatePresence, motion } from 'motion/react'
import { FileText, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings2, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from '../../routing'
import type { ReactNode } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import AdminIconButton from './AdminIconButton'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const workspaceItems: NavigationItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Articles', to: '/admin/blogs', icon: FileText },
]

const manageItems: NavigationItem[] = [
  { label: 'Settings', to: '/admin/settings', icon: Settings2 },
]

function getInitials(username: string | undefined): string {
  if (!username) return 'BW'
  return username.slice(0, 2).toUpperCase()
}

function NavigationLink({ item, onNavigate }: { item: NavigationItem; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate} className="admin-nav-link">
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

/** Shared chrome for every authenticated admin page: responsive rail + workspace. */
function AdminShell({ children }: { children?: ReactNode }) {
  const { admin, logout } = useAdminAuth()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('brandworks.admin.sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const mobileMenuRef = useRef<HTMLButtonElement>(null)
  const hadMobileFocus = useRef(false)

  useEffect(() => {
    if (mobileOpen) {
      hadMobileFocus.current = true
      sidebarRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    } else if (hadMobileFocus.current) {
      hadMobileFocus.current = false
      mobileMenuRef.current?.focus()
    }
  }, [mobileOpen])

  useEffect(() => {
    try {
      window.localStorage.setItem('brandworks.admin.sidebar', collapsed ? 'collapsed' : 'expanded')
    } catch {
      // Ignore storage restrictions such as private browsing policies.
    }
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  function closeMobileNavigation() {
    setMobileOpen(false)
  }

  return (
    <div className="admin-app">
      <a className="admin-skip-link" href="#admin-main">Skip to workspace</a>

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            className="admin-mobile-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeMobileNavigation}
          />
        )}
      </AnimatePresence>

      <aside
        id="admin-navigation"
        aria-label="Content Studio navigation"
        ref={sidebarRef}
        className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''} ${mobileOpen ? 'admin-sidebar--mobile-open' : ''}`}
      >
        <div className="admin-sidebar__brand">
          <span className="admin-brand-mark" aria-hidden="true">B</span>
          <span className="admin-brand-wordmark">CONTENT STUDIO</span>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-nav-group">
            <p className="admin-nav-label">Workspace</p>
            {workspaceItems.map((item) => <NavigationLink key={item.to} item={item} onNavigate={closeMobileNavigation} />)}
          </div>

          <div className="admin-nav-group">
            <p className="admin-nav-label">Manage</p>
            {manageItems.map((item) => <NavigationLink key={item.to} item={item} onNavigate={closeMobileNavigation} />)}
            {admin?.role === 'admin' && (
              <NavigationLink item={{ label: 'Team', to: '/admin/users', icon: UsersRound }} onNavigate={closeMobileNavigation} />
            )}
          </div>
        </nav>

        <div className="admin-sidebar__account">
          <span className="admin-account-avatar" aria-hidden="true">{getInitials(admin?.username)}</span>
          <div className="admin-sidebar__account-copy">
            <p className="admin-sidebar__account-name">{admin?.username ?? 'Administrator'}</p>
            <p className="admin-sidebar__account-role">{admin?.role === 'admin' ? 'Administrator' : 'Sub-admin'}</p>
          </div>
          <AdminIconButton label="Log out" onClick={() => void logout()}>
            <LogOut size={16} strokeWidth={1.8} />
          </AdminIconButton>
        </div>
      </aside>

      <div className={`admin-shell__content ${collapsed ? 'admin-shell__content--expanded' : ''}`}>
        <header className="admin-topbar">
          <div className="flex items-center gap-2">
            <AdminIconButton
              label="Open navigation"
              className="admin-mobile-menu-button"
              ref={mobileMenuRef}
              aria-expanded={mobileOpen}
              aria-controls="admin-navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} strokeWidth={1.8} />
            </AdminIconButton>
            <AdminIconButton
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden md:inline-grid"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
            </AdminIconButton>
            <span className="admin-topbar__context">BRANDWORKS / Content Studio</span>
          </div>
          <div className="admin-topbar__actions">
            <span className="hidden text-[12px] text-neutral-500 sm:inline">{admin?.username}</span>
          </div>
        </header>

        <main id="admin-main" className="admin-main">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default AdminShell
