import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { matches } from './lib/scrollMotion'

const LOGO_SRC = 'https://ik.imagekit.io/rxoyjxx4c/Asset%204@4x.png'

const navLinks:{ label: string; href: string }[] = [
  { label: 'Home', href: '#' },
  { label: 'Work', href: '#' },
  { label: 'About', href: '#' },
  { label: 'Services', href: '#' },
  { label: 'Resources', href: '#' },
  { label: 'Blog', href: '/blog' },
]

function Header() {
  const [headerVisible, setHeaderVisible] = useState(true)
  const [atTop, setAtTop] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY
          const difference = currentY - lastScrollY.current
          
          setAtTop(currentY <= 20)
          
          if (Math.abs(difference) > 4) {
            if (difference > 0 && currentY > 80) {
              setHeaderVisible(false)
            } else if (difference < 0) {
              setHeaderVisible(true)
            }
            lastScrollY.current = currentY
          }
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // The homepage hero currently has a white background. White text on a white background 
  // made the header appear invisible. Changing this to use dark text so it can be seen.
  const isDarkHero = false
  
  const topTextColor = isDarkHero ? 'text-white' : 'text-neutral-900'

  const fixedTextColor = 'text-[#111]'

  const textColor = atTop ? topTextColor : fixedTextColor

  let headerStyle: React.CSSProperties = {
    transition: 'transform 500ms cubic-bezier(0.76, 0, 0.24, 1), background-color 350ms ease, color 350ms ease',
    willChange: 'transform',
  }

  // Accessibility: respect reduced motion. `matches` is the shared
  // helper the scroll sections use — it also guards against
  // environments where `matchMedia` itself is missing (jsdom, and any
  // server render), which calling it directly here did not.
  if (matches('(prefers-reduced-motion: reduce)')) {
    headerStyle.transitionDuration = '0.01ms'
  }

  let containerClass = "z-50 w-full left-0 "
  
  if (atTop) {
    containerClass += "absolute top-0 bg-transparent "
    headerStyle.transform = "translateY(0)"
  } else {
    containerClass += "fixed top-0 bg-[rgba(255,255,255,0.96)] "
    if (headerVisible) {
      headerStyle.transform = "translateY(0)"
    } else {
      headerStyle.transform = "translateY(-110%)"
      containerClass += "pointer-events-none "
    }
  }

  return (
    <header className={containerClass} style={headerStyle}>
      {/* Desktop Layout */}
      <div 
        className="hidden lg:grid w-full h-[65px] items-center px-[4vw] pl-[5vw]" 
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Left */}
        <div className="justify-self-start flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            <img src={LOGO_SRC} alt="BrandWorks" className="block h-auto w-[175px] object-contain" />
          </Link>
        </div>

        {/* Center */}
        <nav
          aria-label="Primary"
          className="justify-self-center flex items-center gap-[42px]"
        >
          {navLinks.map((link) => {
            const className = `font-primary text-[14px] font-normal leading-none tracking-normal normal-case whitespace-nowrap antialiased [text-rendering:optimizeLegibility] ${textColor} opacity-80 transition-opacity duration-200 hover:opacity-100`

            return link.href.startsWith('/') ? (
              <Link key={link.label} to={link.href} className={className}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className={className}>
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Right */}
        <a
          href="#"
          className={`group justify-self-end flex items-center gap-[7px] font-primary text-[14px] font-normal leading-none tracking-normal normal-case whitespace-nowrap antialiased [text-rendering:optimizeLegibility] ${textColor} opacity-80 transition-opacity duration-200 hover:opacity-100`}
        >
          Let's Talk
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
            aria-hidden="true"
          >
            <line x1="6" y1="18" x2="18" y2="6" />
            <polyline points="8 6 18 6 18 16" />
          </svg>
        </a>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="flex lg:hidden w-full h-[68px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center">
          <Link to="/" aria-label="Brandworks home" className="block">
            <img src={LOGO_SRC} alt="BrandWorks" className="block h-auto w-[145px] object-contain" />
          </Link>
        </div>
        
        <button
          aria-label="Open menu"
          className={`font-primary text-[14px] font-normal tracking-normal normal-case antialiased [text-rendering:optimizeLegibility] ${textColor} opacity-80 hover:opacity-100 transition-opacity`}
        >
          Menu
        </button>
      </div>
    </header>
  )
}

export default Header
