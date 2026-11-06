import { Link } from '../../routing'
import Logo from '../Logo/Logo'
import './Footer.css'
import LegalLinks from '../../legacy-pages/legal/LegalLinks'
import type { SiteSocialLink } from '../../server/site-settings/types'

const mainLinks = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '/about' },
  { label: 'Insights', href: '/blog' },
  { label: 'Newsroom', href: '/news' },
]

const socials = [
  { label: 'Instagram', href: '#' },
  { label: 'LinkedIn', href: '#' },
  { label: 'X', href: '#' },
]

function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

function Footer({
  contactEmail = 'hello@brandworks.com',
  socialLinks = socials,
}: {
  contactEmail?: string
  footerTagline?: string
  socialLinks?: Array<SiteSocialLink | { label: string; href: string }>
}) {
  return (
    <footer id="footer" className="brandworks-footer" data-nav-theme="light">
      <div className="footer-body">
        <div className="footer-col footer-col--contact">
          <p className="footer-label">Contact</p>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <span>India / Worldwide</span>
        </div>

        <div className="footer-links">
          <nav className="footer-col" aria-label="Footer navigation">
            <p className="footer-label">Navigation</p>
            <ul>
              {mainLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link to={link.href}>{link.label}</Link>
                  ) : (
                    <a href={link.href}>{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-col">
            <p className="footer-label">Social</p>
            <ul>
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={'url' in social ? social.url : social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Link to="/" className="footer-wordmark" aria-label="BrandWorks home">
        <Logo alt="" className="footer-wordmark__logo" />
      </Link>

      <div className="footer-bar">
        <span className="footer-bar__left">© 2026 BRANDWORKS</span>
        <button type="button" className="footer-bar__top" onClick={scrollToTop}>
          Back to Top
        </button>
        <LegalLinks className="footer-legal" linkClassName="footer-legal__link" />
      </div>
    </footer>
  )
}

export default Footer
