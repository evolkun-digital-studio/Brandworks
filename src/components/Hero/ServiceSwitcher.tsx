import { useCallback, useEffect, useRef, useState } from 'react'
import type { HeroServiceId } from '../../data/heroServices'
import { heroServices, HERO_SERVICE_ORDER } from '../../data/heroServices'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The capsules drive the hero visual in place — they are toggle buttons,
 * not links. Pointing at or focusing one warms its media so the switch
 * lands on an image that's already loaded.
 *
 * They sit on one line that scrolls sideways; the glass button beside it
 * steps the row forward, and once the row is at its end, back to the start.
 */
function ServiceSwitcher({
  activeId,
  onSelect,
  onIntent,
}: {
  activeId: HeroServiceId
  onSelect: (id: HeroServiceId) => void
  onIntent: (id: HeroServiceId) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const max = track.scrollWidth - track.clientWidth
    setOverflows(max > 1)
    setAtStart(track.scrollLeft <= 1)
    setAtEnd(track.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure])

  // Keep the selected capsule in view without scrolling the page itself.
  useEffect(() => {
    const track = trackRef.current
    const pill = track?.querySelector<HTMLElement>('.hero-capsule.is-active')
    if (!track || !pill) return
    // The track is positioned, so offsetLeft is measured from its edge.
    const left = pill.offsetLeft
    const right = left + pill.offsetWidth
    if (left >= track.scrollLeft && right <= track.scrollLeft + track.clientWidth) return
    track.scrollTo({ left: left - 24, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [activeId])

  const next = () => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({
      left: atEnd ? 0 : track.scrollLeft + track.clientWidth * 0.6,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <div className="hero-switcher-wrap">
      <div
        ref={trackRef}
        role="group"
        aria-label="Preview our work by service"
        className={[
          'hero-switcher',
          overflows && !atStart ? 'is-cut-start' : '',
          overflows && !atEnd ? 'is-cut-end' : '',
        ].join(' ')}
        onScroll={measure}
      >
        {HERO_SERVICE_ORDER.map((id) => {
          const active = id === activeId
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(id)}
              onPointerEnter={() => onIntent(id)}
              onFocus={() => onIntent(id)}
              className={`hero-capsule ${active ? 'is-active' : ''}`}
            >
              {heroServices[id].label}
            </button>
          )
        })}
      </div>

      {overflows && (
        <button
          type="button"
          onClick={next}
          aria-label={atEnd ? 'Back to first services' : 'More services'}
          className={`hero-switcher-next ${atEnd ? 'is-back' : ''}`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default ServiceSwitcher
