import { useEffect, useRef } from 'react'
import { Link } from '../../routing'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import './Footer.css'
import LegalLinks from '../../legacy-pages/legal/LegalLinks'
import type { SiteSocialLink } from '../../server/site-settings/types'
import { CONFIG, createFooterPhysics } from './footerPhysics'

const LOGO_SRC = '/BWorksLogo-01.svg'

gsap.registerPlugin(useGSAP)

const mainLinks = CONFIG.links
const socials = CONFIG.socials

function Arrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 15 15 5M7 5h8v8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Footer({ contactEmail = 'hello@brandworks.com', footerTagline = 'Based in India, working worldwide.', socialLinks = socials }: { contactEmail?: string; footerTagline?: string; socialLinks?: Array<SiteSocialLink | { label: string; href: string }> }) {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blobRef = useRef<HTMLDivElement>(null)

  const reducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const blob = blobRef.current

    if (!stage || !canvas || !blob) return

    return createFooterPhysics(stage, canvas, blob, reducedMotion)
  }, [reducedMotion])

  useGSAP(
    () => {
      const root = rootRef.current

      if (
        !root ||
        reducedMotion ||
        typeof IntersectionObserver === 'undefined'
      ) {
        return
      }

      const timeline = gsap.timeline({
        paused: true,
      })

      const observer =
        new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return

            timeline.play()
            observer.disconnect()
          },
          {
            rootMargin:
              '0px 0px -18% 0px',
          },
        )

      observer.observe(root)

      timeline
        .fromTo(
          '.footer-brand-strip',
          {
            scaleX: 0,
          },
          {
            scaleX: 1,
            duration: 0.9,
            ease: 'power3.inOut',
            transformOrigin:
              'left center',
          },
          0.05,
        )
        .fromTo(
          '.footer-logo, .footer-cta',
          {
            autoAlpha: 0,
            y: 20,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.68,
            stagger: 0.08,
            ease: 'power3.out',
          },
          0.38,
        )
        .fromTo(
          '.footer-main-nav, .footer-contact',
          {
            autoAlpha: 0,
            y: 24,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.72,
            ease: 'power3.out',
          },
          0.5,
        )
        .fromTo(
          '.footer-meta',
          {
            autoAlpha: 0,
            y: 14,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.62,
            ease: 'power3.out',
          },
          0.62,
        )

      return () => {
        observer.disconnect()
      }
    },
    {
      scope: rootRef,
      dependencies: [
        reducedMotion,
      ],
    },
  )

  return (
    <footer
      id="footer"
      ref={rootRef}
      className="brandworks-footer"
    >
      {/* PHYSICS STAGE */}
      <div
        ref={stageRef}
        className="footer-stage"
      >
        <canvas
          ref={canvasRef}
          className="footer-canvas"
          aria-hidden="true"
        />

        <div
          ref={blobRef}
          className="footer-blob"
          aria-hidden="true"
        />

        {/* BRAND STRIP */}
        <div className="footer-brand-strip">
          <Link
            to="/"
            className="footer-logo"
            aria-label="BrandWorks home"
          >
            <img
              src={LOGO_SRC}
              alt="BrandWorks"
            />
          </Link>

          <nav
            className="footer-main-nav"
            aria-label="Footer navigation"
          >
            <ul>
              {mainLinks.map(
                (link) => (
                  <li key={link.label}>
                    {link.href.startsWith(
                      '/',
                    ) ? (
                      <Link
                        to={link.href}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={
                          link.href
                        }
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="footer-contact">
            <ul className="footer-socials">
              {socialLinks.map(
                (social) => (
                  <li
                    key={social.label}
                  >
                    <a
                      href={
                        'url' in social ? social.url : social.href
                      }
                    >
                      {social.label}{' '}
                      <span
                        aria-hidden="true"
                      >
                        ↗
                      </span>
                    </a>
                  </li>
                ),
              )}
            </ul>

            <a
              className="footer-email"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
          </div>

          <a
            href={`mailto:${contactEmail}`}
            className="footer-cta"
          >
            <span>
              Start a conversation
            </span>

            <Arrow />
          </a>
        </div>
      </div>

      {/* META */}
      <div className="footer-meta">
        <span className="footer-meta__left">
          {footerTagline}
        </span>

        <div className="footer-meta__center">
          <span>©2026 BRANDWORKS</span>
          <LegalLinks
            className="footer-legal"
            linkClassName="footer-legal__link"
          />
        </div>

        <span className="footer-meta__right">
          India / Worldwide
        </span>
      </div>
    </footer>
  )
}

export default Footer
