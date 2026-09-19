import { useEffect, useRef, useState } from 'react'

interface LazyBackgroundVideoProps {
  src: string
  className?: string
  /**
   * Eager, immediate load+autoplay — reserved for the single video
   * that's visible the instant the page paints (the Hero's first
   * video). Every other video defers loading until it's about to
   * scroll into view (Phase 11, Part 3/4). Ignored entirely for a
   * visitor with `prefers-reduced-motion: reduce` — see below.
   */
  priority?: boolean
  /**
   * These are all silent, purely decorative brand-motion loops with
   * no meaningful spoken/informational content — true by default so
   * assistive tech skips them (Phase 11, Part 15). Every current
   * usage is decorative, so there's no case yet where this needs to
   * be false.
   */
  ariaHidden?: boolean
}

/** Same `prefers-reduced-motion` check already used by About.tsx's own (unrelated) scroll effect — kept local rather than refactoring that file's logic, which this phase has no reason to touch. Reactive to the setting changing while the page is open. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * A decorative, autoplaying, looping background video with a
 * deliberate loading strategy (Phase 11):
 *
 *  - `priority` videos load and autoplay immediately, exactly as
 *    before — but with `preload="metadata"` rather than the
 *    browser's default, so the file doesn't compete for bandwidth
 *    with critical CSS/JS/font requests any more aggressively than
 *    autoplay itself already requires.
 *  - Every other video renders with no `src` at all (`preload="none"`)
 *    until an IntersectionObserver reports it's about to enter the
 *    viewport (a `rootMargin` starts this slightly early, so there's
 *    no visible pop-in) — nothing is fetched before that.
 *  - A visitor with `prefers-reduced-motion: reduce` never gets
 *    immediate autoplay, even for a `priority` video: loading still
 *    waits for the same intersection check, and once activated the
 *    video is left paused (no fabricated poster image exists for any
 *    of these files — see Part 7 — so a paused video showing its own
 *    first frame once loaded is the closest honest substitute).
 *  - Once activated, a video is never deactivated and its `src` is
 *    never cleared, so scrolling away and back never re-fetches it.
 *  - Deliberately does NOT pause on scroll-away/resume-on-return —
 *    that would change the current always-looping UX for a visitor
 *    who scrolls past and back, which Part 4 only asks for "if this
 *    does not alter the intended UX." Keeping this simple also avoids
 *    building a bespoke video framework (Part 4/14).
 */
function LazyBackgroundVideo({ src, className, priority = false, ariaHidden = true }: LazyBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()

  const loadImmediately = priority && !reducedMotion
  const [activated, setActivated] = useState(loadImmediately)

  useEffect(() => {
    if (activated) return
    const el = videoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setActivated(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [activated])

  useEffect(() => {
    if (!activated || reducedMotion) return
    const el = videoRef.current
    if (!el) return
    // Attempted explicitly rather than relying only on the
    // declarative `autoPlay` attribute reacting to a `src` added
    // after mount — more reliable across browsers for this "attach
    // then play" sequence. The promise is deliberately ignored:
    // muted + playsInline already satisfy every major browser's
    // autoplay policy, so this reliably succeeds; if a browser ever
    // still blocks it, failing silently is correct here — there are
    // no user-facing controls to recover from an error with on a
    // purely decorative video.
    void el.play().catch(() => undefined)
  }, [activated, reducedMotion])

  return (
    <video
      ref={videoRef}
      src={activated ? src : undefined}
      muted
      loop
      playsInline
      autoPlay={loadImmediately}
      preload={activated ? 'metadata' : 'none'}
      aria-hidden={ariaHidden}
      className={className}
    />
  )
}

export default LazyBackgroundVideo
