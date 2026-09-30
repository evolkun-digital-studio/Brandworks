import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'
import type { SocialReel } from '../../data/socialMedia'
import './ReelFeed.css'

const pad = (n: number) => String(n).padStart(2, '0')

/** How long each reel stays up before the next one slides in. */
const HOLD_MS = 6500
const SLIDE = { duration: 1.1, ease: 'power3.inOut' }

type Direction = 1 | -1

/**
 * The phone's screen: the reels stacked in place, one showing at a time,
 * moving on by themselves. The next reel slides up over the current one,
 * which eases a little way up behind it, like a feed being flicked.
 *   - only the showing reel plays, and only while the phone is on the
 *     page's screen and the tab is visible — off screen, everything pauses
 *     and the reels stop advancing;
 *   - the play/pause button stops both the video and the advancing;
 *   - arrow keys step through the reels when the screen has focus.
 * The page scroll is never captured, so Lenis needs no special handling.
 * With reduced motion nothing starts on its own and reels switch in place.
 */
function ReelFeed({ reels, label }: { reels: SocialReel[]; label: string }) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const shownRef = useRef(0)
  const directionRef = useRef<Direction>(1)
  const wheelDeltaRef = useRef(0)
  const wheelResetRef = useRef<number | null>(null)
  const wheelUnlockRef = useRef<number | null>(null)
  const wheelLockedRef = useRef(false)

  const [active, setActive] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  // null until the visitor chooses; then their choice wins over the default.
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const paused = userPaused ?? Boolean(reduceMotion)
  const playing = onScreen && !paused && !tabHidden

  const goTo = useCallback(
    (index: number, direction: Direction) => {
      directionRef.current = direction
      setActive((index + reels.length) % reels.length)
    },
    [reels.length],
  )

  // Stack the reels before first paint: the first in place, the rest
  // waiting below the screen.
  useGSAP(
    () => {
      slideRefs.current.forEach((slide, index) => {
        if (slide) gsap.set(slide, { yPercent: index === 0 ? 0 : 100, zIndex: index === 0 ? 1 : 0 })
      })
    },
    { scope: rootRef },
  )

  // Slide from the reel on screen to the active one.
  useEffect(() => {
    const from = shownRef.current
    if (from === active) return
    shownRef.current = active

    const slides = slideRefs.current.filter((slide): slide is HTMLElement => Boolean(slide))
    const incoming = slideRefs.current[active]
    const outgoing = slideRefs.current[from]
    if (!incoming || !outgoing) return
    const direction = directionRef.current

    // A reel still moving from an earlier, interrupted change goes back
    // to waiting below.
    gsap.killTweensOf(slides)
    slides.forEach((slide) => {
      if (slide !== incoming && slide !== outgoing) gsap.set(slide, { yPercent: 100, zIndex: 0 })
    })

    const settle = () => {
      gsap.set(outgoing, { yPercent: 100, zIndex: 0 })
      gsap.set(incoming, { zIndex: 1 })
      const video = videoRefs.current[from]
      if (video) video.currentTime = 0
    }

    if (reduceMotion) {
      gsap.set(incoming, { yPercent: 0 })
      settle()
      return
    }

    gsap.set(outgoing, { zIndex: 1 })
    gsap.fromTo(incoming, { yPercent: 100 * direction, zIndex: 2 }, { yPercent: 0, ...SLIDE, onComplete: settle })
    gsap.to(outgoing, { yPercent: -28 * direction, ...SLIDE })
  }, [active, reduceMotion])

  useEffect(() => () => gsap.killTweensOf(slideRefs.current.filter(Boolean)), [])

  // Desktop wheel / trackpad browsing. This is installed natively with
  // passive:false so the page's smooth-scroll handler does not consume the
  // gesture while the pointer is over the phone. Small trackpad deltas are
  // accumulated into one deliberate step and locked until the slide has
  // nearly settled, preventing one wheel gesture from skipping reels.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reels.length < 2) return

    const resetWheel = () => {
      wheelDeltaRef.current = 0
      wheelResetRef.current = null
    }

    const onWheel = (event: WheelEvent) => {
      const rawDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX

      if (rawDelta === 0) return

      event.preventDefault()
      event.stopPropagation()

      if (wheelLockedRef.current) return

      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? root.clientHeight
            : 1

      wheelDeltaRef.current += rawDelta * unit

      if (wheelResetRef.current !== null) {
        window.clearTimeout(wheelResetRef.current)
      }

      wheelResetRef.current = window.setTimeout(resetWheel, 160)

      if (Math.abs(wheelDeltaRef.current) < 36) return

      const direction: Direction = wheelDeltaRef.current > 0 ? 1 : -1
      resetWheel()
      wheelLockedRef.current = true
      goTo(shownRef.current + direction, direction)

      wheelUnlockRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false
        wheelUnlockRef.current = null
      }, SLIDE.duration * 900)
    }

    root.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      root.removeEventListener('wheel', onWheel)
      if (wheelResetRef.current !== null) {
        window.clearTimeout(wheelResetRef.current)
      }
      if (wheelUnlockRef.current !== null) {
        window.clearTimeout(wheelUnlockRef.current)
      }
      resetWheel()
      wheelLockedRef.current = false
    }
  }, [goTo, reels.length])

  // Whether the phone is on the page's screen at all.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // One reel plays at most.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return
      if (index === active && playing) video.play().catch(() => {})
      else video.pause()
    })
  }, [active, playing])

  // Move on after a while, only while playing.
  useEffect(() => {
    if (!playing || reels.length < 2) return
    const timer = window.setTimeout(() => goTo(active + 1, 1), HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [active, playing, goTo, reels.length])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') goTo(active + 1, 1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') goTo(active - 1, -1)
    else return
    event.preventDefault()
  }

  /* Pointer swipe: a vertical flick advances the reel (mouse & touch). */
  const pointerStart = useRef<{ y: number } | null>(null)

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    pointerStart.current = { y: event.clientY }
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return
    if (Math.abs(pointerStart.current.y - event.clientY) > 6) {
      event.preventDefault()
    }
  }

  const onPointerUp = (event: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dy = pointerStart.current.y - event.clientY
    pointerStart.current = null

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (Math.abs(dy) > 30) {
      goTo(active + (dy > 0 ? 1 : -1), dy > 0 ? 1 : -1)
    }
  }

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      ref={rootRef}
      className="reel-feed"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Social media reels, ${reels.length} videos. Use the arrow keys to browse.`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="reel-feed__slides" aria-live={playing ? 'off' : 'polite'}>
        {reels.map((reel, index) => (
          <article
            key={reel.id}
            ref={(node) => {
              slideRefs.current[index] = node
            }}
            className="social-reel"
            aria-roledescription="slide"
            aria-label={`Reel ${reel.id} of ${pad(reels.length)}: ${reel.caption}`}
            aria-hidden={index !== active}
          >
            <video
              ref={(node) => {
                videoRefs.current[index] = node
              }}
              className="social-reel__video"
              src={reel.src}
              poster={reel.poster}
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              aria-hidden="true"
            />
            <div className="social-reel__shade" aria-hidden="true" />
            <p className="social-reel__category">{reel.category}</p>
          </article>
        ))}
      </div>

      {/* Screen chrome above the reels: status dot, label and the count. */}
      <div className="reel-feed-chrome" aria-hidden="true">
        <span className="reel-feed-chrome__label">
          <span className="reel-feed-chrome__dot" />
          {label}
        </span>
        <span className="reel-feed-chrome__count">
          <span className="reel-feed-chrome__index">
            <span key={active} className="reel-feed-chrome__digits">
              {pad(active + 1)}
            </span>
          </span>
          <span className="reel-feed-chrome__total">/ {pad(reels.length)}</span>
        </span>
      </div>

      <button
        type="button"
        className="social-reel__toggle"
        onClick={() => setUserPaused(!paused)}
        aria-label={paused ? 'Play reels' : 'Pause reels'}
      >
        {paused ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5 3.5h2v9H5zM9.5 3.5h2v9h-2z" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default ReelFeed
