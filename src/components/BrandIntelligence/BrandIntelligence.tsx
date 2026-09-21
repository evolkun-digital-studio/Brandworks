import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { BRAND_INTELLIGENCE_COPY, BRAND_INTELLIGENCE_MOTION, BRAND_SIGNALS } from '../../data/brandIntelligence'
import { clamp01, lerp, matches, smoothstep } from '../../lib/scrollMotion'

// A pinned stage that turns vertical scroll into horizontal travel: the
// heading holds in the upper left while the card track slides right to
// left beneath it, and the section releases once the last card is fully
// in view. The section is exactly as tall as that travel plus one screen,
// so there is no dead scroll either side of it.
//
// Phones and reduced motion get no pinning at all: the stylesheet lays the
// same track out as a native, snap-scrolling horizontal list.

/** Must match the stylesheet's pinned-layout media query. */
const PINNED_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)'

function subscribePinned(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(PINNED_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const getPinned = () => matches(PINNED_QUERY)
const getServerPinned = () => false

const { focus: FOCUS } = BRAND_INTELLIGENCE_MOTION

/** Focus of a card `d` card-steps from the reading position: 1 there, 0 `span` steps away. */
const focusAt = (d: number) => 1 - smoothstep(clamp01((Math.abs(d) - FOCUS.hold) / (FOCUS.span - FOCUS.hold)))

function BrandIntelligence() {
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pinned = useSyncExternalStore(subscribePinned, getPinned, getServerPinned)

  // Horizontal travel in px, measured from the layout (never hardcoded).
  const distance = useMotionValue(0)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const smoothed = useSpring(scrollYProgress, BRAND_INTELLIGENCE_MOTION.spring)
  // Linear in scroll; the spring only takes the edge off it, and gives way
  // to the raw position at both ends so the first and last cards are
  // exactly home when the stage pins and releases.
  const x = useTransform(() => {
    const raw = scrollYProgress.get()
    const toEnd = Math.min(raw, 1 - raw) / BRAND_INTELLIGENCE_MOTION.edge
    return -lerp(raw, smoothed.get(), smoothstep(clamp01(toEnd))) * distance.get()
  })

  useEffect(() => {
    const section = sectionRef.current
    const sticky = stickyRef.current
    const track = trackRef.current
    if (!section || !sticky || !track) return
    const cards = Array.from(track.children) as HTMLElement[]

    // Layout facts the per-frame focus effect needs; refreshed on measure.
    let start = 0
    let end = 0
    let step = 1
    let lefts: number[] = []

    const paint = (offset: number) => {
      if (!pinned) return
      const travel = distance.get()
      // Reading position: the first card's place at the start, the last
      // card's resting place at the end.
      const focal = lerp(start, end, travel > 0 ? clamp01(-offset / travel) : 0)
      cards.forEach((card, i) => {
        const d = (lefts[i] + offset - focal) / step
        const f = focusAt(d)
        const dim = d > 0 ? FOCUS.ahead.opacity : FOCUS.behind.opacity
        const blur = (1 - f) * FOCUS.blur
        card.style.opacity = lerp(dim, 1, f).toFixed(3)
        card.style.transform = `scale(${lerp(FOCUS.scale, 1, f).toFixed(4)})`
        card.style.filter = blur < 0.05 ? '' : `blur(${blur.toFixed(2)}px)`
        card.style.setProperty('--focus', f.toFixed(3))
      })
    }

    const measure = () => {
      if (!pinned) {
        distance.set(0)
        section.style.removeProperty('height')
        return
      }
      // The track is max-content wide with the page gutter at both ends, so
      // this is exactly the travel that brings the last card to rest one
      // gutter in from the right edge.
      const travel = Math.max(0, track.scrollWidth - sticky.clientWidth)
      distance.set(travel)
      section.style.height = `${travel + sticky.clientHeight}px`

      start = parseFloat(getComputedStyle(track).paddingInlineStart) || 0
      lefts = cards.map((card) => card.offsetLeft)
      step = cards.length > 1 ? lefts[1] - lefts[0] : cards[0]?.offsetWidth || 1
      end = cards.length ? lefts[lefts.length - 1] - travel : start
      paint(x.get())
    }

    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(sticky)
    resize.observe(track)
    cards.forEach((card) => resize.observe(card))
    let live = true
    document.fonts?.ready.then(() => live && measure())
    const stop = x.on('change', paint)

    return () => {
      live = false
      resize.disconnect()
      stop()
      section.style.removeProperty('height')
      cards.forEach((card) => {
        card.style.removeProperty('opacity')
        card.style.removeProperty('transform')
        card.style.removeProperty('filter')
        card.style.removeProperty('--focus')
      })
    }
  }, [pinned, distance, x])

  return (
    <section ref={sectionRef} className="brand-intelligence" aria-label="Brand intelligence: eleven signals every brand sends">
      <div ref={stickyRef} className="brand-intelligence__sticky">
        <header className="brand-intelligence__header">
          <p className="section-label brand-intelligence__eyebrow">{BRAND_INTELLIGENCE_COPY.eyebrow}</p>
          <h2 className="brand-intelligence__heading">{BRAND_INTELLIGENCE_COPY.heading}</h2>
        </header>

        <motion.div
          ref={trackRef}
          className="brand-intelligence__track"
          style={{ x }}
          // Unpinned, the track is a native scroller: reachable by keyboard.
          role={pinned ? undefined : 'region'}
          aria-label={pinned ? undefined : 'Brand signals, scroll horizontally'}
          tabIndex={pinned ? undefined : 0}
        >
          {BRAND_SIGNALS.map((item) => (
            <article
              key={item.number}
              className="brand-signal-card"
              style={{ '--chars': item.title.length } as CSSProperties}
            >
              <div className="brand-signal-card__meta">
                <span className="brand-signal-card__number">{item.number}</span>
                <span className="brand-signal-card__indicator" aria-hidden="true" />
                <span className="brand-signal-card__label" aria-hidden="true">
                  {BRAND_INTELLIGENCE_COPY.label}
                </span>
              </div>
              <h3 className="brand-signal-card__title">{item.title}</h3>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default BrandIntelligence
