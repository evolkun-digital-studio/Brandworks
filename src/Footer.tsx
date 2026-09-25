import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import showreelPoster from './assets/footer-showreel-poster.webp'
import { matches } from './lib/scrollMotion'
import './Footer.css'

gsap.registerPlugin(useGSAP)

const LOGO_SRC =
  'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2023,%202026,%2003_32_46%20PM.png'

// Web copies of Pexels video 4488715.
// Phones get the lighter encode; the choice is made once,
// when the video is first attached.
const SHOWREEL = {
  desktop: '/video/footer-showreel-1080.mp4',
  mobile: '/video/footer-showreel-540.mp4',
}

/** Where the fullscreen cursor follows the pointer instead of a button. */
const CURSOR_QUERY =
  '(hover: hover) and (pointer: fine) and (min-width: 1024px)'

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FullscreenShell = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
}

const VIDEO_FPS = 30

const THUMB_SEEKS = [0.12, 0.5, 0.84] as const

function formatTimecode(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00 : 00 : 00'
  }

  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const secs = whole % 60

  const frames = Math.min(
    VIDEO_FPS - 1,
    Math.floor((seconds - whole) * VIDEO_FPS),
  )

  return `${String(minutes).padStart(2, '0')} : ${String(secs).padStart(
    2,
    '0',
  )} : ${String(frames).padStart(2, '0')}`
}

const mainLinks = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '/about' },
  { label: 'Insights', href: '/blog' },
]

const socials = [
  { label: 'Instagram', href: '#' },
  { label: 'LinkedIn', href: '#' },
  { label: 'X', href: '#' },
]

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

function Footer() {
  const rootRef = useRef<HTMLElement>(null)
  const videoRef = useRef<FullscreenVideo>(null)
  const fullscreenShellRef = useRef<FullscreenShell>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const cursorApiRef = useRef<{
    move: (x: number, y: number) => void
    show: (
      next: boolean,
      x?: number,
      y?: number,
    ) => void
  } | null>(null)

  const inViewRef = useRef(false)
  const fullscreenRef = useRef(false)

  const reducedMotion = useReducedMotion() ?? false

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [timecode, setTimecode] = useState('00 : 00 : 00')

  /**
   * The silent background loop:
   * muted, no controls, playing only while on screen.
   */
  const resumeBackground = useCallback(() => {
    const video = videoRef.current

    if (!video) return

    video.controls = false
    video.muted = true

    if (inViewRef.current && !reducedMotion) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [reducedMotion])

  /**
   * Attach the film only as the footer approaches,
   * then play it while it's visible.
   */
  useEffect(() => {
    const root = rootRef.current
    const video = videoRef.current

    if (!root || !video) return

    const attach = () => {
      if (video.getAttribute('src')) return

      video.src = matches('(max-width: 767px)')
        ? SHOWREEL.mobile
        : SHOWREEL.desktop
    }

    if (typeof IntersectionObserver === 'undefined') {
      attach()
      return
    }

    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        attach()
        nearby.disconnect()
      },
      {
        rootMargin: '600px 0px',
      },
    )

    const visible = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting

      if (!fullscreenRef.current) {
        resumeBackground()
      }
    })

    nearby.observe(root)
    visible.observe(root)

    return () => {
      nearby.disconnect()
      visible.disconnect()
    }
  }, [resumeBackground])

  /**
   * Leaving fullscreen hands the same element
   * back to the silent background loop.
   */
  useEffect(() => {
    const video = videoRef.current

    if (!video) return

    const onExit = () => {
      fullscreenRef.current = false
      resumeBackground()
    }

    const onFullscreenChange = () => {
      if (
        document.fullscreenElement !== video &&
        fullscreenRef.current
      ) {
        onExit()
      }
    }

    document.addEventListener(
      'fullscreenchange',
      onFullscreenChange,
    )

    document.addEventListener(
      'webkitfullscreenchange',
      onFullscreenChange,
    )

    video.addEventListener(
      'webkitendfullscreen',
      onExit,
    )

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        onFullscreenChange,
      )

      document.removeEventListener(
        'webkitfullscreenchange',
        onFullscreenChange,
      )

      video.removeEventListener(
        'webkitendfullscreen',
        onExit,
      )
    }
  }, [resumeBackground])

  /**
   * Same video element, same playback position:
   * controls on, sound allowed, fullscreen.
   */
  const openFullscreen = useCallback(async () => {
    const video = videoRef.current

    if (!video) return

    if (!video.getAttribute('src')) {
      video.src = matches('(max-width: 767px)')
        ? SHOWREEL.mobile
        : SHOWREEL.desktop
    }

    fullscreenRef.current = true

    video.controls = true
    video.muted = false

    void video.play().catch(() => undefined)

    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen()
      } else if (video.webkitRequestFullscreen) {
        await video.webkitRequestFullscreen()
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen()
      } else {
        throw new Error('Fullscreen unavailable')
      }
    } catch {
      fullscreenRef.current = false
      resumeBackground()
    }
  }, [resumeBackground])

  /**
   * "Play fullscreen" cursor —
   * desktop pointer devices only.
   */
  useEffect(() => {
    const cursor = cursorRef.current

    if (!cursor || !matches(CURSOR_QUERY)) return

    const follow = reducedMotion ? 0.01 : 0.28

    const toX = gsap.quickTo(cursor, 'x', {
      duration: follow,
      ease: 'power3.out',
    })

    const toY = gsap.quickTo(cursor, 'y', {
      duration: follow,
      ease: 'power3.out',
    })

    let shown = false

    gsap.set(cursor, {
      autoAlpha: 0,
      scale: 0.8,
    })

    cursorApiRef.current = {
      move: (x, y) => {
        toX(x)
        toY(y)
      },

      show: (next, x, y) => {
        if (next === shown) return

        shown = next

        if (
          next &&
          x !== undefined &&
          y !== undefined
        ) {
          gsap.set(cursor, {
            x,
            y,
          })
        }

        gsap.to(cursor, {
          autoAlpha: next ? 1 : 0,
          scale: next ? 1 : 0.8,
          duration: next ? 0.35 : 0.2,
          ease: 'power3.out',
          overwrite: 'auto',
        })
      },
    }

    const hide = () => {
      cursorApiRef.current?.show(false)
    }

    window.addEventListener(
      'scroll',
      hide,
      { passive: true },
    )

    return () => {
      window.removeEventListener(
        'scroll',
        hide,
      )

      cursorApiRef.current = null
    }
  }, [reducedMotion])

  const onZoneEnter = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === 'mouse') {
      cursorApiRef.current?.show(
        true,
        event.clientX,
        event.clientY,
      )
    }
  }

  const onZoneMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType !== 'mouse') return

    cursorApiRef.current?.show(
      true,
      event.clientX,
      event.clientY,
    )

    cursorApiRef.current?.move(
      event.clientX,
      event.clientY,
    )
  }

  const onZoneLeave = () => {
    cursorApiRef.current?.show(false)
  }

  const onZoneClick = () => {
    if (matches(CURSOR_QUERY)) {
      void openFullscreen()
    }
  }

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
          '.footer-background',
          {
            scale: 1.08,
          },
          {
            scale: 1,
            duration: 1.3,
            ease: 'power3.out',
          },
          0,
        )
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
          '.footer-content',
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
      {/* BACKGROUND SHOWREEL */}
      <div
        className="footer-background"
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          className="footer-video"
          poster={showreelPoster}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        />

        <div className="footer-video-overlay" />
      </div>

      {/* FULLSCREEN INTERACTION AREA */}
      <div
        className="footer-video-zone"
        aria-hidden="true"
        onPointerEnter={
          onZoneEnter
        }
        onPointerMove={
          onZoneMove
        }
        onPointerLeave={
          onZoneLeave
        }
        onClick={
          onZoneClick
        }
      />

      <button
        type="button"
        className="footer-fullscreen-button"
        onClick={() =>
          void openFullscreen()
        }
      >
        View fullscreen{' '}
        <span aria-hidden="true">
          ↗
        </span>
      </button>

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

        <a
          href="mailto:hello@brandworks.com"
          className="footer-cta"
        >
          <span>
            Start a conversation
          </span>

          <Arrow />
        </a>
      </div>

      {/* FOOTER CONTENT */}
      <div className="footer-content">
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
            {socials.map(
              (social) => (
                <li
                  key={social.label}
                >
                  <a
                    href={
                      social.href
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
            href="mailto:hello@brandworks.com"
          >
            hello@brandworks.com
          </a>
        </div>
      </div>

      {/* META */}
      <div className="footer-meta">
        <span className="footer-meta__left">
          Based in India, working
          worldwide.
        </span>

        <div className="footer-meta__center">
          <a href="#">
            ©2026 BRANDWORKS — Legal
            Notice
          </a>
        </div>

        <span className="footer-meta__right">
          India / Worldwide
        </span>
      </div>

      {/* DESKTOP FOLLOW CURSOR */}
      <div
        ref={cursorRef}
        className="footer-cursor"
        aria-hidden="true"
      >
        <span>
          Play fullscreen{' '}
          <span className="footer-cursor__arrow">
            ↗
          </span>
        </span>
      </div>
    </footer>
  )
}

export default Footer