import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import HeroMedia from './components/Hero/HeroMedia'
import HeroCaption from './components/Hero/HeroCaption'
import ServiceSwitcher from './components/Hero/ServiceSwitcher'
import type { HeroServiceId } from './data/heroServices'
import {
  DEFAULT_HERO_SERVICE,
  HERO_DESCRIPTION,
  HERO_HEADLINE,
  HERO_SERVICE_ORDER,
} from './data/heroServices'
import './components/Hero/Hero.css'

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/**
 * Full-viewport cinematic hero. The service capsules switch the
 * photography behind the copy in place; Photography (the default) shows
 * an interactive two-level editorial gallery, while the other services
 * show a single full-bleed frame or film.
 * The site Header floats over it from PublicLayout.
 */
function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion() ?? false
  const [activeId, setActiveId] = useState<HeroServiceId>(DEFAULT_HERO_SERVICE)
  const [mounted, setMounted] = useState<ReadonlySet<HeroServiceId>>(() => new Set([DEFAULT_HERO_SERVICE]))
  const [inView, setInView] = useState(true)

  const warm = useCallback((id: HeroServiceId) => {
    setMounted((current) => (current.has(id) ? current : new Set(current).add(id)))
  }, [])

  const select = useCallback(
    (id: HeroServiceId) => {
      warm(id)
      setActiveId(id)
    },
    [warm],
  )

  // Once the page has finished loading and gone quiet, fetch the other
  // services' stills in the background (never the film — that waits for
  // a click). Skipped when the visitor has asked to save data.
  useEffect(() => {
    const win = window as IdleWindow
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) return

    let idleHandle: number | undefined
    let timer: number | undefined
    const warmAll = () => setMounted((current) => new Set([...current, ...HERO_SERVICE_ORDER]))
    const schedule = () => {
      if (win.requestIdleCallback) idleHandle = win.requestIdleCallback(warmAll, { timeout: 3000 })
      else timer = window.setTimeout(warmAll, 1500)
    }

    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })

    return () => {
      window.removeEventListener('load', schedule)
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  // The film only plays while the hero is actually on screen.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="hero" aria-labelledby="hero-heading">
      <HeroMedia activeId={activeId} mounted={mounted} inView={inView} reducedMotion={reducedMotion} />
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-copy">
          <h1 id="hero-heading" className="hero-title">
            <span className="sr-only">BrandWorks: </span>
            {HERO_HEADLINE[0]}
            <br />
            {HERO_HEADLINE[1]}
          </h1>
          <p className="hero-description">{HERO_DESCRIPTION}</p>
        </div>

        <div className="hero-aside">
          <HeroCaption activeId={activeId} reducedMotion={reducedMotion} />
          <ServiceSwitcher activeId={activeId} onSelect={select} onIntent={warm} />
        </div>
      </div>
    </section>
  )
}

export default Hero
