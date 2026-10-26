import { Link, useLocation } from '../../routing'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import './Header.css'
import type { SiteNavigationLabels } from '../../server/site-settings/types'

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
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const { pathname } = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY

      if (currentY <= 5) {
        setHidden(false)
      } else if (currentY > lastScrollY.current) {
        setHidden(true)
      } else if (currentY < lastScrollY.current) {
        setHidden(false)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // The homepage and photography page open on full-bleed dark imagery; every
  // other public page starts on white, so the header keeps dark ink there.
  const isDarkHero = pathname === '/' || pathname === '/services/photography'
  const tone = isDarkHero ? 'is-on-dark' : 'is-on-light'
  const logoSrc = '/BWorksLogo-01.svg'
  const logoDarkSrc = '/BWorksLogo-dark.svg'

  // The project planner keeps only the logo so the questionnaire stays focused.
  if (pathname === '/start-project') {
    return (
      // Phones show only the full-screen question card, so the logo bar starts at tablet width.
      // Same logo, size and position as the main header; it's drawn for dark grounds, like the planner's film.
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 mt-[18px] hidden h-[64px] items-center px-[var(--hero-gutter)] sm:flex lg:mt-[20px]">
        <Link to="/" aria-label="Brandworks home" className="pointer-events-auto block">
          <Image
            src={logoSrc}
            alt="BrandWorks"
            width={175}
            height={30}
            priority
            className="site-header__logo block h-auto w-[145px] object-contain lg:w-[175px]"
          />
        </Link>
      </header>
    )
  }

  return (
    <header className={`site-header ${hidden ? "is-hidden" : ""}`}>
      {/* Desktop Layout */}
      <div
        className={`site-header__surface ${tone} hidden lg:grid w-full h-[64px] items-center px-[var(--hero-gutter)] mt-[18px] lg:mt-[20px]`}
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Left */}
        <div className="justify-self-start flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            <Image
              src={logoSrc}
              alt="BrandWorks"
              width={175}
              height={30}
              className="site-header__logo site-header__logo--light block h-auto w-[175px] object-contain"
            />
            {/* Shown instead while the hero's light Web Design & Dev slide is up (Header.css). */}
            <Image
              src={logoDarkSrc}
              alt=""
              aria-hidden="true"
              width={175}
              height={30}
              className="site-header__logo site-header__logo--dark h-auto w-[175px] object-contain"
            />
          </Link>
        </div>

        {/* Center */}
        <nav
          aria-label="Primary"
          className="justify-self-center flex items-center gap-[10px]"
        >
          {navLinks.map((link) => (
            <Link key={link.label} to={link.href} className="nav-pill">
              <RollLabel>{navLabels?.[link.label.toLowerCase() as keyof SiteNavigationLabels] ?? link.label}</RollLabel>
            </Link>
          ))}
        </nav>

        {/* Right */}
        <Link to="/start-project" className="nav-pill nav-pill--cta justify-self-end">
          <RollLabel>Let's Talk</RollLabel>
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
            <Image
              src={logoSrc}
              alt="BrandWorks"
              width={145}
              height={25}
              className="site-header__logo site-header__logo--light block h-auto w-[145px] object-contain"
            />
            {/* Shown instead while the hero's light Web Design & Dev slide is up (Header.css). */}
            <Image
              src={logoDarkSrc}
              alt=""
              aria-hidden="true"
              width={145}
              height={25}
              className="site-header__logo site-header__logo--dark h-auto w-[145px] object-contain"
            />
          </Link>
        </div>

        <button aria-label="Open menu" className="nav-pill">
          Menu
        </button>
      </div>
    </header>
  )
}

export default Header
