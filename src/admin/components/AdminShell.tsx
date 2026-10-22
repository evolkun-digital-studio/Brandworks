import '../styles'
import { AnimatePresence, motion } from 'motion/react'
import {
  Activity,
  Check,
  CalendarDays,
  ExternalLink,
  FilePlus2,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Search,
  SearchCheck,
  Settings2,
  Sun,
  SunMoon,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Toaster } from 'sonner'
import { Link, NavLink, Outlet, useLocation } from '../../routing'
import type { ReactNode } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import { ADMIN_THEMES, useAdminTheme } from '../hooks/useAdminTheme'
import type { AdminTheme } from '../hooks/useAdminTheme'
import AdminIconButton from './AdminIconButton'
import CommandPalette from './CommandPalette'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const NAV_GROUPS: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Content',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Articles', to: '/admin/blogs', icon: FileText },
      { label: 'Media', to: '/admin/media', icon: Images },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { label: 'Calendar', to: '/admin/calendar', icon: CalendarDays },
      { label: 'SEO', to: '/admin/seo', icon: SearchCheck },
      { label: 'Activity', to: '/admin/activity', icon: Activity },
    ],
  },
]

const THEME_ICONS: Record<AdminTheme, LucideIcon> = { system: SunMoon, light: Sun, dark: Moon }

const PAGE_TITLES: Array<[RegExp, string]> = [
  [/^\/admin\/?$/, 'Overview'],
  [/^\/admin\/blogs/, 'Articles'],
  [/^\/admin\/media/, 'Media'],
  [/^\/admin\/calendar/, 'Calendar'],
  [/^\/admin\/seo/, 'SEO'],
  [/^\/admin\/activity/, 'Activity'],
  [/^\/admin\/settings/, 'Settings'],
  [/^\/admin\/users/, 'Team'],
]

/** The article editor takes the whole window, like a document, with its own toolbar. */
const IMMERSIVE_ROUTE = /^\/admin\/blogs\/(new|[^/]+\/edit)\/?$/

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

/** Shared chrome for every authenticated admin page. */
function AdminShell({ children }: { children?: ReactNode }) {
  const { admin, logout } = useAdminAuth()
  const { pathname } = useLocation()
  const immersive = IMMERSIVE_ROUTE.test(pathname)
  const [theme, setTheme] = useAdminTheme()
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLButtonElement>(null)
  const hadMobileFocus = useRef(false)
  const isAdmin = admin?.role === 'admin'
  const pageTitle = PAGE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Studio'

  useEffect(() => {
    try {
      setSidebarHidden(window.localStorage.getItem('brandworks.admin.sidebar.v3') === 'hidden')
    } catch {
      // Ignore storage restrictions.
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarHidden((value) => {
      try {
        window.localStorage.setItem('brandworks.admin.sidebar.v3', value ? 'shown' : 'hidden')
      } catch {
        // Ignore storage restrictions.
      }
      return !value
    })
  }, [])

  // ⌘K / Ctrl+K opens quick search from anywhere, including the editor.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setAccountOpen(false)
  }, [pathname])

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
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!accountOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  const closeMobileNavigation = () => setMobileOpen(false)
  const isDark = theme === 'dark'

  return (
    <div className="admin-app" data-theme={theme}>
      <Toaster
        position="bottom-right"
        closeButton
        richColors
        visibleToasts={3}
        theme={theme === 'system' ? 'system' : isDark ? 'dark' : 'light'}
        toastOptions={{
          duration: 4000,
          classNames: { toast: 'admin-toast', title: 'admin-toast__title' },
        }}
      />
      <a className="admin-skip-link" href="#admin-main">Skip to content</a>
      <CommandPalette
        open={paletteOpen}
        isAdmin={isAdmin}
        onClose={() => setPaletteOpen(false)}
        onThemeChange={setTheme}
      />

      {!immersive && (
        <>
          <AnimatePresence>
            {mobileOpen && (
              <motion.button
                type="button"
                aria-label="Close navigation"
                className="admin-mobile-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMobileNavigation}
              />
            )}
          </AnimatePresence>

          <aside
            id="admin-navigation"
            aria-label="Studio navigation"
            ref={sidebarRef}
            className={`admin-sidebar ${sidebarHidden ? 'admin-sidebar--hidden' : ''} ${mobileOpen ? 'admin-sidebar--open' : ''}`}
          >
            <div className="admin-sidebar__brand">
              <span className="admin-brand-mark" aria-hidden="true">B</span>
              <span className="admin-brand-wordmark">Studio</span>
            </div>

            <nav className="admin-nav" aria-label="Primary">
              {NAV_GROUPS.map((group) => (
                <div className="admin-nav-group" key={group.label}>
                  <p className="admin-nav-label">{group.label}</p>
                  {group.items.map((item) => <NavigationLink key={item.to} item={item} onNavigate={closeMobileNavigation} />)}
                </div>
              ))}
              <div className="admin-nav-group">
                <p className="admin-nav-label">Workspace</p>
                <NavigationLink item={{ label: 'Settings', to: '/admin/settings', icon: Settings2 }} onNavigate={closeMobileNavigation} />
                {isAdmin && (
                  <NavigationLink item={{ label: 'Team', to: '/admin/users', icon: UsersRound }} onNavigate={closeMobileNavigation} />
                )}
              </div>
            </nav>

            <div className="admin-sidebar__foot" ref={accountRef}>
              {accountOpen && (
                <div className="admin-menu__panel admin-menu__panel--up" role="menu" aria-label="Account">
                  <div className="admin-menu__head">
                    <strong>{admin?.username ?? 'Administrator'}</strong>
                    <span>{isAdmin ? 'Administrator' : 'Sub-admin'}</span>
                  </div>
                  <div className="admin-menu__sep" />
                  <p className="admin-menu__label">Appearance</p>
                  {ADMIN_THEMES.map((option) => {
                    const Icon = THEME_ICONS[option.id]
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={theme === option.id}
                        className="admin-menu__item"
                        onClick={() => setTheme(option.id)}
                      >
                        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                        {option.label}
                        {theme === option.id && <Check size={14} className="admin-menu__check" aria-hidden="true" />}
                      </button>
                    )
                  })}
                  <div className="admin-menu__sep" />
                  <a className="admin-menu__item" href="/" target="_blank" rel="noreferrer" role="menuitem">
                    <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" /> View website
                  </a>
                  <button type="button" role="menuitem" className="admin-menu__item" onClick={() => void logout()}>
                    <LogOut size={15} strokeWidth={1.8} aria-hidden="true" /> Sign out
                  </button>
                </div>
              )}
              <button
                type="button"
                className="admin-account"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="admin-avatar" aria-hidden="true">{getInitials(admin?.username)}</span>
                <span className="admin-account__who">
                  <strong>{admin?.username ?? 'Administrator'}</strong>
                  <span>{isAdmin ? 'Administrator' : 'Sub-admin'}</span>
                </span>
              </button>
            </div>
          </aside>
        </>
      )}

      <div className={`admin-shell__content ${immersive || sidebarHidden ? 'admin-shell__content--wide' : ''}`}>
        {!immersive && (
          <header className="admin-topbar">
            <div className="admin-topbar__group">
              <AdminIconButton
                label="Open navigation"
                className="admin-mobile-menu-button"
                ref={mobileMenuRef}
                aria-expanded={mobileOpen}
                aria-controls="admin-navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} strokeWidth={1.8} />
              </AdminIconButton>
              <AdminIconButton
                label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
                className="max-md:hidden"
                onClick={toggleSidebar}
              >
                <PanelLeft size={18} strokeWidth={1.8} />
              </AdminIconButton>
              <span className="admin-topbar__title">{pageTitle}</span>
            </div>
            <div className="admin-topbar__group">
              <button type="button" className="admin-search-trigger" onClick={() => setPaletteOpen(true)} aria-label="Search">
                <Search size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Search</span>
                <kbd>⌘K</kbd>
              </button>
              <Link to="/admin/blogs/new" className="admin-button admin-button--primary max-sm:hidden">
                <FilePlus2 size={15} strokeWidth={1.9} aria-hidden="true" />
                <span>New article</span>
              </Link>
            </div>
          </header>
        )}

        <main id="admin-main" className={immersive ? undefined : 'admin-main'}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default AdminShell
