import { Link, useLocation } from '../../routing'
import { useState, useEffect, useRef } from 'react'
import Logo from '../Logo/Logo'
import { getSmoothScroll } from '../../lib/smoothScroll'
import './Header.css'
import type { SiteNavigationLabels } from '../../server/site-settings/types'

/** Horizontal line (px from the viewport top) through the middle of the nav capsules. */
const NAV_LINE_Y = 50
/** Ignore scroll jitter smaller than this when deciding scroll direction. */
const DIRECTION_DELTA = 6


const navLinks:{ label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Projects', href: '/work' },
  { label: 'Insights', href: '/blog' },
]

/** Label that rolls to an identical copy on hover; the copy is hidden from assistive tech. */
function RollLabel({ children }: { children: string }) {
  return (
    <span className="nav-roll">
      <span className="nav-roll__track">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </span>
  )
}

function Header({ navLabels }: { navLabels?: SiteNavigationLabels }) {
  // Server render and first client render both start "not scrolled, shown".
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastScrollY = useRef(0)
  const { pathname } = useLocation()

  // The homepage and photography page open on full-bleed dark imagery; every
  // other public page starts on white. This is only the first-paint guess
  // (identical on server and client); the observer below takes over after mount.
  const isDarkHero = pathname === '/' || pathname === '/services/photography'
  const [overDark, setOverDark] = useState(isDarkHero)

  // "Scrolled": a sentinel covering the first 40px of the page. No scroll
  // listener, so trackpad overscroll at the top can't bounce the state.
  useEffect(() => {
    const sentinel = document.createElement('div')
    sentinel.setAttribute('aria-hidden', 'true')
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none'
    document.body.prepend(sentinel)
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(sentinel)
    return () => { observer.disconnect(); sentinel.remove() }
  }, [])

  // Hide on scroll down / show on scroll up. Position only — never colour.
  // rAF-throttled, ignores tiny deltas, and only sets state when it 
  useEffect(() => {
    if (pathname === '/services') return // the services header never hides
    let frame = 0
    lastScrollY.current = window.scrollY
    const update = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const delta = y - lastScrollY.current
      if (y <= 5) setHidden(false)
      else if (Math.abs(delta) < DIRECTION_DELTA) return
      else setHidden(delta > 0)
      lastScrollY.current = y
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pathname])

  // Dark variant only while a section marked data-nav-theme="dark" is actually
  // under the capsules: the observer root is shrunk to a 1px line at NAV_LINE_Y.
  useEffect(() => {
    let observer: IntersectionObserver | undefined
    let targets: Element[] = []
    let height = -1
    const visible = new Set<Element>()
    const connect = () => {
      const next = Array.from(document.querySelectorAll('[data-nav-theme="dark"]'))
      const sameTargets = next.length === targets.length && next.every((el, i) => el === targets[i])
      if (sameTargets && height === window.innerHeight) return
      targets = next
      height = window.innerHeight
      observer?.disconnect()
      visible.clear()
      const bottom = Math.max(0, height - NAV_LINE_Y - 1)
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)))
          setOverDark(visible.size > 0) // React bails out when the value is unchanged
        },
        { rootMargin: `-${NAV_LINE_Y}px 0px -${bottom}px 0px` },
      )
      targets.forEach((el) => observer!.observe(el))
      if (targets.length === 0) setOverDark(false)
    }
    connect()
    // Sections can mount after the header (route change, lazy content).
    let pending = 0
    const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; connect() }) }
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-nav-theme'] })
    window.addEventListener('resize', schedule)
    return () => {
      observer?.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
      if (pending) cancelAnimationFrame(pending)
    }
  }, [pathname])

  // /services keeps an opaque white header bar, so its capsules always use dark ink.
  const tone = overDark && pathname !== '/services' ? 'is-on-dark' : 'is-on-light'

  // Keep the mobile menu usable like a modal layer: it owns the viewport while
  // open (page scroll locked, Lenis included), traps Tab focus between the
  // close button and the menu links, and closes on Escape. Navigation links
  // close it before routing; focus returns to the menu button on close.
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const html = document.documentElement
    const previousOverflow = document.body.style.overflow
    const previousHtmlOverflow = html.style.overflow
    const lenis = getSmoothScroll()
    const toggle = toggleRef.current

    const focusables = () => [
      ...(toggle ? [toggle] : []),
      ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []),
    ]
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const index = items.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && (index <= 0)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (index === -1 || index === items.length - 1)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    lenis?.stop()
    document.addEventListener('keydown', onKeyDown)
    // Move focus into the menu once its links are focusable.
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true }))
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      html.style.overflow = previousHtmlOverflow
      lenis?.start()
      document.removeEventListener('keydown', onKeyDown)
      toggle?.focus({ preventScroll: true })
    }
  }, [menuOpen])

  // The menu exists only below lg; growing past it closes the menu so the
  // page is never left scroll-locked behind a hidden layer.
  useEffect(() => {
    if (!menuOpen || typeof window.matchMedia !== 'function') return
    const desktop = window.matchMedia('(min-width: 1024px)')
    const close = () => { if (desktop.matches) setMenuOpen(false) }
    close()
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [menuOpen])

  // The project planner keeps only the logo so the questionnaire stays focused.
  if (pathname === '/start-project') {
    return (
      // Phones show only the full-screen question card, so the logo bar starts at tablet width.
      // Same logo, size and position as the main header; it's drawn for dark grounds, like the planner's film.
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 mt-[18px] hidden h-[64px] items-center px-[var(--hero-gutter)] sm:flex lg:mt-[20px]">
        <Link to="/" aria-label="Brandworks home" className="pointer-events-auto block">
          <Logo preload className="site-header__logo block h-[25px] lg:h-[30px]" />
        </Link>
      </header>
    )
  }

  return (
    <header className={`site-header ${hidden && !menuOpen && pathname !== "/services" ? "is-hidden" : ""} ${menuOpen ? "is-menu-open" : ""} ${pathname === "/services" ? "site-header--services" : ""} ${scrolled ? "is-scrolled" : ""}`}>
      {/* Desktop Layout */}
      <div
        className={`site-header__surface ${tone} hidden lg:grid w-full h-[64px] items-center px-[var(--hero-gutter)] mt-[18px] lg:mt-[20px]`}
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Left */}
        <div className="justify-self-start flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            <Logo className="site-header__logo block h-[30px]" />
          </Link>
        </div>

        {/* Center */}
        <nav
          aria-label="Primary"
          className="justify-self-center flex items-center gap-[10px]"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="nav-pill"
              data-nav-reveal
              aria-current={link.href === "/" ? (pathname === "/" ? "page" : undefined) : pathname.startsWith(link.href) ? "page" : undefined}
            >
              <RollLabel>{navLabels?.[link.label.toLowerCase() as keyof SiteNavigationLabels] ?? link.label}</RollLabel>
            </Link>
          ))}
        </nav>

        {/* Right */}
        <Link to="/start-project" className="nav-pill nav-pill--cta justify-self-end" data-nav-reveal>
          <RollLabel>{"Let's Talk"}</RollLabel>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="nav-pill__arrow h-3.5 w-3.5"
            aria-hidden="true"
          >
            <line x1="6" y1="18" x2="18" y2="6" />
            <polyline points="8 6 18 6 18 16" />
          </svg>
        </Link>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className={`site-header__surface ${tone} flex lg:hidden w-full h-[64px] items-center justify-between px-[var(--hero-gutter)] mt-[18px] lg:mt-[20px]`}>
        <div className="flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            {/* ~120px wide on phones, ~150px on tablets (the artwork is 176×30). */}
            <Logo className="site-header__logo block h-[20.5px] md:h-[25.5px]" />
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="nav-pill site-menu-toggle"
          data-nav-reveal
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-menu-toggle__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <div
        ref={menuRef}
        id="mobile-navigation"
        className={`site-mobile-menu ${tone} ${menuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal={menuOpen ? true : undefined}
        aria-label="Site menu"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        data-lenis-prevent
      >
        <div className="site-mobile-menu__backdrop" onClick={() => setMenuOpen(false)} />
        <nav className="site-mobile-menu__panel" aria-label="Mobile primary navigation">
          <div className="site-mobile-menu__links">
            {navLinks.map((link, index) => (
              <Link
                key={link.label}
                to={link.href}
                tabIndex={menuOpen ? 0 : -1}
                className="site-mobile-menu__link"
                aria-current={link.href === "/" ? (pathname === "/" ? "page" : undefined) : pathname.startsWith(link.href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                style={{ transitionDelay: menuOpen ? `${index * 35 + 80}ms` : '0ms' }}
              >
                <span>{navLabels?.[link.label.toLowerCase() as keyof SiteNavigationLabels] ?? link.label}</span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <Link
            to="/start-project"
            tabIndex={menuOpen ? 0 : -1}
            className="site-mobile-menu__cta"
            onClick={() => setMenuOpen(false)}
          >
            {"Let's Talk"} <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
