'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { socialReels, type SocialReel } from '../../data/socialReels'
import './SocialReelsCarousel.css'

const ADVANCE_MS = 5000
const INTERACTION_REST_MS = 8000

function ReelCard({ reel, active, canPlay, paused, muted, playAttempt, onSelect, onPause, onSound }: {
  reel: SocialReel
  active: boolean
  canPlay: boolean
  paused: boolean
  muted: boolean
  playAttempt: number
  onSelect: () => void
  onPause: (playing: boolean) => void
  onSound: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasFrame, setHasFrame] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    video.muted = !active || muted
    if (active && canPlay && !paused && reel.videoSrc && !failed) {
      // Attach a source only on first activation in the viewport. Other cards
      // display their posters without requesting video metadata or bytes.
      if (video.getAttribute('src') !== reel.videoSrc) {
        video.setAttribute('src', reel.videoSrc)
        video.load()
      }
      void video.play().then(() => {
        if (!cancelled) setBlocked(false)
      }).catch(() => {
        if (!cancelled) setBlocked(true)
      })
    } else {
      video.pause()
    }
    return () => {
      cancelled = true
      video.pause()
      video.muted = true
    }
  }, [active, canPlay, paused, muted, playAttempt, reel.videoSrc, failed])

  const unavailable = !reel.videoSrc || failed
  return (
    <article className={`bw-reels__card${active ? ' is-active' : ''}`}>
      <img className="bw-reels__poster" src={reel.posterSrc || undefined} alt="" loading="lazy" decoding="async"
        onError={(event) => { event.currentTarget.hidden = true }} />
      {reel.videoSrc && (
        <video ref={videoRef} className={`bw-reels__video${hasFrame && !failed ? ' is-ready' : ''}`}
          poster={reel.posterSrc || undefined} autoPlay muted={muted || !active} loop playsInline preload="none"
          onPlaying={() => { setHasFrame(true); setPlaying(true); setBlocked(false) }}
          onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false) }}
          aria-label={reel.title || reel.category} />
      )}
      <button type="button" className="bw-reels__select" onClick={onSelect}
        aria-label={`Select ${reel.category}${reel.title ? `: ${reel.title}` : ''}`} aria-pressed={active} />
      <span className="bw-reels__category">{reel.category}</span>
      <div className="bw-reels__caption">
        {reel.title && <span>{reel.title}</span>}
        {reel.client && <span>{reel.client}</span>}
        {unavailable && <span className="bw-reels__status">{failed ? 'Video unavailable' : 'Preview · reel coming soon'}</span>}
        {reel.sample && <span className="bw-reels__status">Sample showreel</span>}
        {reel.projectUrl && <a href={reel.projectUrl}>View project <ArrowRight size={14} /></a>}
      </div>
      {active && !unavailable && (
        <div className="bw-reels__media-controls">
          <button type="button" onClick={() => onPause(playing)} aria-label={playing ? 'Pause active reel' : 'Play active reel'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" onClick={onSound} aria-label={muted ? 'Unmute active reel' : 'Mute active reel'} aria-pressed={!muted}>
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      )}
      {active && blocked && !unavailable && <span className="bw-reels__play-hint">Press play to watch</span>}
    </article>
  )
}

/** Native scrolling and CSS snap provide touch/trackpad momentum without
 * cloned slides, translation calculations, or a second animation system. */
export default function SocialReelsCarousel({ reels = socialReels, autoplay = true }: {
  reels?: readonly SocialReel[]
  autoplay?: boolean
}) {
  const id = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expectedScroll = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const [selected, setSelected] = useState(0)
  const active = Math.min(selected, Math.max(0, reels.length - 1))
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(autoplay)
  const [resumeAt, setResumeAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [manualPlayback, setManualPlayback] = useState(false)
  const [playAttempt, setPlayAttempt] = useState(0)
  const activeRef = useRef(active)

  useEffect(() => { activeRef.current = active }, [active])

  const rest = useCallback(() => setResumeAt(Date.now() + INTERACTION_REST_MS), [])

  const select = useCallback((index: number, interaction = true) => {
    if (!reels.length) return
    const next = (index + reels.length) % reels.length
    setSelected(next)
    setPaused(false)
    setMuted(true)
    if (interaction) { rest(); setManualPlayback(true) }
    const viewport = viewportRef.current
    const card = viewport?.children[next] as HTMLElement | undefined
    if (viewport && card) {
      const left = Math.max(0, Math.min(card.offsetLeft - (viewport.firstElementChild as HTMLElement).offsetLeft, viewport.scrollWidth - viewport.clientWidth))
      expectedScroll.current = left
      viewport.scrollTo({ left, behavior: reducedMotion ? 'instant' : 'smooth' })
    }
  }, [reels.length, reducedMotion, rest])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(section)
    const visibility = () => setVisible(!document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [reels.length])

  useEffect(() => {
    if (!inView || !visible || hovering || focused || dragging || paused || !autoEnabled || reducedMotion || reels.length < 2) return
    const wait = Math.max(ADVANCE_MS, resumeAt - Date.now())
    const timer = setTimeout(() => select(active + 1, false), wait)
    return () => clearTimeout(timer)
  }, [active, inView, visible, hovering, focused, dragging, paused, autoEnabled, reducedMotion, reels.length, resumeAt, select])

  useEffect(() => () => { if (scrollTimer.current) clearTimeout(scrollTimer.current) }, [])

  // Re-align the selected card after a responsive breakpoint changes its width.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => {
      const card = viewport.children[activeRef.current] as HTMLElement | undefined
      if (!card) return
      const left = Math.min(card.offsetLeft - (viewport.firstElementChild as HTMLElement).offsetLeft, viewport.scrollWidth - viewport.clientWidth)
      expectedScroll.current = left
      viewport.scrollTo({ left, behavior: 'instant' })
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [reels.length])

  const settleScroll = () => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const viewport = viewportRef.current
      if (!viewport || dragRef.current) return
      if (expectedScroll.current !== null && Math.abs(viewport.scrollLeft - expectedScroll.current) < 3) {
        expectedScroll.current = null
        return
      }
      expectedScroll.current = null
      const cards = Array.from(viewport.children) as HTMLElement[]
      const origin = cards[0]?.offsetLeft ?? 0
      const closest = cards.reduce((best, card, index) =>
        Math.abs(card.offsetLeft - origin - viewport.scrollLeft) < Math.abs(cards[best].offsetLeft - origin - viewport.scrollLeft) ? index : best, 0)
      setSelected(closest)
      setMuted(true)
      setPaused(false)
    }, 140)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) { setDragging(false); rest(); return }
    suppressClick.current = drag.moved
    dragRef.current = null
    setDragging(false)
    rest()
    event.currentTarget.classList.remove('is-dragging')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    settleScroll()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a')) return
    if (event.key === 'ArrowRight') { event.preventDefault(); select(active + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(active - 1) }
    if (event.key === 'Home') { event.preventDefault(); select(0) }
    if (event.key === 'End') { event.preventDefault(); select(reels.length - 1) }
  }

  if (!reels.length) return null
  return (
    <section ref={sectionRef} className="bw-reels" aria-labelledby={`${id}-heading`}>
      <header className="bw-reels__header">
        <p className="bw-reels__eyebrow">Made for the feed</p>
        <h2 id={`${id}-heading`}>Content that moves.</h2>
        <p>From the first frame to the next conversation.</p>
      </header>
      <div className="bw-reels__carousel" role="region" aria-roledescription="carousel" aria-label="Social media content formats"
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); rest() } }}
        onKeyDown={onKeyDown}>
        <div ref={viewportRef} id={`${id}-viewport`} className="bw-reels__viewport" tabIndex={0} aria-label="Swipe or use arrow keys to browse reels"
          data-lenis-prevent onScroll={settleScroll} onWheel={() => { expectedScroll.current = null; rest() }}
          onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false } }}
          onPointerDown={(event) => {
            expectedScroll.current = null
            suppressClick.current = false
            rest()
            if (event.pointerType !== 'mouse') { setDragging(true); return }
            if (event.button !== 0 || (event.target as HTMLElement).closest('.bw-reels__media-controls, a')) return
            dragRef.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag) return
            const distance = event.clientX - drag.x
            if (Math.abs(distance) > 5 && !drag.moved) {
              drag.moved = true
              setDragging(true)
              event.currentTarget.classList.add('is-dragging')
              event.currentTarget.setPointerCapture(event.pointerId)
            }
            if (drag.moved) { event.preventDefault(); event.currentTarget.scrollLeft = drag.left - distance }
          }} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) endDrag(event) }}>
          {reels.map((reel, index) => (
            <ReelCard key={`${reel.id}:${reel.videoSrc}`} reel={reel} active={index === active}
              canPlay={inView && visible && (!reducedMotion || manualPlayback)} paused={paused} muted={muted} playAttempt={playAttempt}
              onSelect={() => select(index)}
              onPause={(playing) => { rest(); setManualPlayback(true); setPaused(playing); setPlayAttempt((value) => value + 1) }}
              onSound={() => { rest(); setManualPlayback(true); setMuted((value) => !value); setPlayAttempt((value) => value + 1) }} />
          ))}
        </div>
        <div className="bw-reels__navigation">
          <button type="button" className="bw-reels__auto" onClick={() => { setAutoEnabled((value) => !value); rest() }}
            aria-label={autoEnabled ? 'Pause carousel autoplay' : 'Enable carousel autoplay'} aria-pressed={autoEnabled}>
            {autoEnabled ? <Pause size={14} /> : <Play size={14} />}<span>Auto</span>
          </button>
          <div className="bw-reels__dots" aria-label="Choose a reel">
            {reels.map((reel, index) => <button key={reel.id} type="button" className={`bw-reels__dot${index === active ? ' is-active' : ''}`}
              aria-label={`Go to reel ${index + 1}: ${reel.category}`} aria-current={index === active ? 'true' : undefined}
              aria-controls={`${id}-viewport`} onClick={() => select(index)}><span /></button>)}
          </div>
          <div className="bw-reels__arrows">
            <button type="button" aria-label="Previous reel" onClick={() => select(active - 1)} disabled={reels.length < 2}><ArrowLeft size={18} /></button>
            <button type="button" aria-label="Next reel" onClick={() => select(active + 1)} disabled={reels.length < 2}><ArrowRight size={18} /></button>
          </div>
        </div>
        <p className="bw-reels__sr-only" role="status" aria-live="polite">{reels[active].category}, reel {active + 1} of {reels.length}</p>
      </div>
    </section>
  )
}
