import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import './Header.css'

const LOGO_SRC = 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2023,%202026,%2003_32_46%20PM.png'

const navLinks:{ label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '#' },
  { label: 'Services', href: '#' },
  { label: 'Work', href: '#' },
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

function Header() {
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

  // Only the homepage opens on the full-bleed photographic hero; every
  // other public page starts on white, so the header keeps dark ink there.
  const isDarkHero = pathname === '/'
  const tone = isDarkHero ? 'is-on-dark' : 'is-on-light'

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
            <img src={LOGO_SRC} alt="BrandWorks" className="site-header__logo block h-auto w-[175px] object-contain" />
          </Link>
        </div>

        {/* Center */}
        <nav
          aria-label="Primary"
          className="justify-self-center flex items-center gap-[10px]"
        >
          {navLinks.map((link) =>
            link.href.startsWith('/') ? (
              <Link key={link.label} to={link.href} className="nav-pill">
                <RollLabel>{link.label}</RollLabel>
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="nav-pill">
                <RollLabel>{link.label}</RollLabel>
              </a>
            ),
          )}
        </nav>

        {/* Right */}
        <a href="#" className="nav-pill nav-pill--cta justify-self-end">
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
        </a>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className={`site-header__surface ${tone} flex lg:hidden w-full h-[64px] items-center justify-between px-[var(--hero-gutter)] mt-[18px] lg:mt-[20px]`}>
        <div className="flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            <img src={LOGO_SRC} alt="BrandWorks" className="site-header__logo block h-auto w-[145px] object-contain" />
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
