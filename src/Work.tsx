import { useCallback, useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
// Cropped WebP copy of the hosted Canon frame (transparent background and
// screen). Screen insets in index.css are measured from it.
import cameraFrame from './assets/canon-camera-frame.webp'

gsap.registerPlugin(ScrollTrigger)

const photographyImages = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=2400&q=85',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=2400&q=85',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=2400&q=85',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=85',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=2400&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=85',
]

const TOTAL = photographyImages.length
const pad = (n: number) => String(n).padStart(2, '0')

type Direction = 1 | -1
type Viewport = 'desktop' | 'tablet' | 'mobile'

/** How long each photograph stays up in the fullscreen gallery. */
const AUTO_CHANGE_DELAY = 2000

/**
 * The display opening inside the camera frame, as fractions of the frame's
 * width and height. Mirrors .photo-camera__screen in index.css.
 */
const SCREEN = { left: 0.13831, top: 0.43496, width: 0.48718, height: 0.43191 }

/**
 * The scroll sequence, as [start, end] positions on one timeline whose
 * transition runs 0 → 1 (then holds on the fullscreen gallery for HOLD).
 * The tracks overlap so they read as a single motion:
 *   zoom      the camera grows about its display, which travels to centre
 *   frameOut  the camera body fades once the zoom is clearly under way
 *   expand    the display box itself grows out to cover the whole section
 *   layer     the photo lifts above the (by then invisible) frame
 *   controls  the carousel controls arrive as fullscreen is reached
 * Scrolling back up plays the same timeline in reverse.
 */
const SEQUENCE = {
  heading: [0.04, 0.24],
  zoom: [0.15, 0.8],
  frameOut: [0.35, 0.8],
  expand: [0.55, 1],
  layer: 0.8,
  controls: [0.84, 1],
} as const
const HOLD = 0.4

/**
 * Per viewport: how much of the section the display may fill at the end of
 * the zoom, before it expands to cover, and how far the section stays
 * pinned. Phones zoom less and expand more, avoiding extreme scale.
 */
const ZOOM_LAYOUT: Record<Viewport, { fit: number; end: string }> = {
  desktop: { fit: 0.9, end: '+=220%' },
  tablet: { fit: 0.92, end: '+=190%' },
  mobile: { fit: 0.92, end: '+=160%' },
}

/**
 * Works out the zoom from the camera's layout box. Layout offsets are used
 * rather than getBoundingClientRect() because ScrollTrigger re-measures on
 * refresh while the camera may already be mid-zoom, and offsets ignore
 * transforms. The transform origin is the centre of the display opening,
 * so scaling grows the screen in place, and x/y carry that point to the
 * centre of the section.
 *
 * `cover` is the display box, in the camera's own (pre-scale) pixels, that
 * exactly covers the section once the zoom has finished, centred on the
 * same point, with a few pixels of bleed so no edge ever shows.
 */
const BLEED = 4

function measureZoom(section: HTMLElement, camera: HTMLElement, viewport: Viewport) {
  const width = section.clientWidth
  const height = section.clientHeight

  // Fractional layout size: offsetWidth rounds, and the zoom magnifies it.
  const style = getComputedStyle(camera)
  const cameraW = parseFloat(style.width)
  const cameraH = parseFloat(style.height)

  const originX = cameraW * (SCREEN.left + SCREEN.width / 2)
  const originY = cameraH * (SCREEN.top + SCREEN.height / 2)
  const screenW = cameraW * SCREEN.width
  const screenH = cameraH * SCREEN.height

  const { fit } = ZOOM_LAYOUT[viewport]
  const scale = Math.min((width * fit) / screenW, (height * fit) / screenH)
  const coverW = (width + BLEED * 2) / scale
  const coverH = (height + BLEED * 2) / scale

  return {
    origin: `${originX}px ${originY}px`,
    scale,
    x: width / 2 - (camera.offsetLeft + originX),
    y: height / 2 - (camera.offsetTop + originY),
    screen: {
      left: cameraW * SCREEN.left,
      top: cameraH * SCREEN.top,
      width: screenW,
      height: screenH,
    },
    cover: { left: originX - coverW / 2, top: originY - coverH / 2, width: coverW, height: coverH },
  }
}

const span = ([start, end]: readonly [number, number]) => ({ at: start, duration: end - start })

function PhotographyGallery() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLImageElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLImageElement | null)[]>([])

  const currentRef = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  // Autoplay runs only in the fullscreen gallery, while the section is on
  // screen, the tab is visible and nobody is on the controls.
  const autoplayRef = useRef<number | null>(null)
  const inGalleryRef = useRef(false)
  const visibleRef = useRef(false)
  const holdRef = useRef(false)

  const [active, setActive] = useState(0)

  const { contextSafe } = useGSAP({ scope: sectionRef })

  // Only the photograph on the display changes, as a soft crossfade with a
  // slight breath in scale.
  const show = useCallback(
    (dir: Direction) =>
      contextSafe(() => {
        // A click mid-fade finishes the current one first, so the display
        // never shows more than the two photos being exchanged.
        timelineRef.current?.progress(1)

        const from = currentRef.current
        const to = (from + dir + TOTAL) % TOTAL
        const outgoing = slideRefs.current[from]
        const incoming = slideRefs.current[to]
        if (!outgoing || !incoming) return

        currentRef.current = to
        setActive(to)

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const duration = reduced ? 0.4 : 0.8

        const tl = gsap.timeline({
          defaults: { duration, ease: 'power2.inOut' },
          onComplete: () => {
            gsap.set(outgoing, { opacity: 0, scale: 1, zIndex: 0 })
            gsap.set(incoming, { zIndex: 0 })
            timelineRef.current = null
          },
        })
        timelineRef.current = tl

        tl.set(incoming, { zIndex: 1 })
        tl.fromTo(outgoing, { opacity: 1, scale: 1 }, { opacity: 0, scale: reduced ? 1 : 1.02 }, 0)
        tl.fromTo(incoming, { opacity: 0, scale: reduced ? 1 : 0.98 }, { opacity: 1, scale: 1 }, 0)
      })(),
    [contextSafe],
  )

  const syncAutoplay = useCallback(() => {
    if (autoplayRef.current !== null) window.clearTimeout(autoplayRef.current)
    autoplayRef.current = null
    if (!inGalleryRef.current || !visibleRef.current || holdRef.current || document.hidden) return

    autoplayRef.current = window.setTimeout(() => {
      show(1)
      syncAutoplay()
    }, AUTO_CHANGE_DELAY)
  }, [show])

  /** A manual step: changes the photo and restarts the autoplay countdown. */
  const go = useCallback(
    (dir: Direction) => {
      show(dir)
      syncAutoplay()
    },
    [show, syncAutoplay],
  )

  const holdAutoplay = (hold: boolean) => {
    holdRef.current = hold
    syncAutoplay()
  }

  // Scroll-driven entry: the pinned section scrubs one timeline from the
  // whole camera, into its display, out to a fullscreen photograph — and
  // scrolling up scrubs the same timeline back.
  useGSAP(
    () => {
      const section = sectionRef.current
      const heading = headingRef.current
      const camera = cameraRef.current
      const screen = screenRef.current
      const frame = frameRef.current
      const controls = controlsRef.current
      if (!section || !heading || !camera || !screen || !frame || !controls) return

      const mm = gsap.matchMedia()
      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          tablet: '(min-width: 768px) and (max-width: 1023px)',
          mobile: '(max-width: 767px)',
        },
        (context) => {
          const { motion, tablet, mobile } = context.conditions as Record<string, boolean>
          if (!motion) return

          const viewport: Viewport = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop'
          let zoom = measureZoom(section, camera, viewport)
          // Switches the controls to their fullscreen overlay layout.
          section.classList.add('photo-gallery--zoom')

          const setGallery = (inGallery: boolean) => {
            if (inGallery === inGalleryRef.current) return
            inGalleryRef.current = inGallery
            syncAutoplay()
          }

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: ZOOM_LAYOUT[viewport].end,
              pin: true,
              scrub: mobile ? 0.6 : 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onRefreshInit: () => {
                zoom = measureZoom(section, camera, viewport)
              },
            },
            // Fullscreen is reached at 1; the hold follows.
            onUpdate: () => setGallery(tl.time() >= 0.999),
          })

          const headingSpan = span(SEQUENCE.heading)
          const zoomSpan = span(SEQUENCE.zoom)
          const frameSpan = span(SEQUENCE.frameOut)
          const expandSpan = span(SEQUENCE.expand)
          const controlsSpan = span(SEQUENCE.controls)

          // The title makes way as the zoom begins.
          tl.fromTo(heading, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -32, duration: headingSpan.duration }, headingSpan.at)

          // The camera grows about its display and carries it to the centre.
          tl.fromTo(
            camera,
            { x: 0, y: 0, scale: 1, transformOrigin: () => zoom.origin },
            {
              x: () => zoom.x,
              y: () => zoom.y,
              scale: () => zoom.scale,
              duration: zoomSpan.duration,
              ease: 'sine.inOut',
              force3D: false,
            },
            zoomSpan.at,
          )

          // The body fades out while the zoom carries it past the edges.
          tl.fromTo(frame, { opacity: 1 }, { opacity: 0, duration: frameSpan.duration }, frameSpan.at)

          // The same display box — same photo layer — grows out of the bezel
          // until it covers the section, losing its rounded corners.
          tl.fromTo(
            screen,
            {
              left: () => zoom.screen.left,
              top: () => zoom.screen.top,
              width: () => zoom.screen.width,
              height: () => zoom.screen.height,
              borderRadius: () => getComputedStyle(screen).borderTopLeftRadius,
            },
            {
              left: () => zoom.cover.left,
              top: () => zoom.cover.top,
              width: () => zoom.cover.width,
              height: () => zoom.cover.height,
              borderRadius: 0,
              duration: expandSpan.duration,
              ease: 'sine.inOut',
            },
            expandSpan.at,
          )

          // Once the frame is gone the photo lifts above it; nothing visible
          // changes, but the fullscreen layer order is then true.
          tl.set(screen, { zIndex: 10 }, SEQUENCE.layer)

          // The carousel controls arrive with fullscreen, and on the way
          // back are the first thing to go.
          tl.fromTo(controls, { autoAlpha: 0 }, { autoAlpha: 1, duration: controlsSpan.duration }, controlsSpan.at)

          // The fullscreen gallery holds before the page moves on.
          tl.to({}, { duration: HOLD }, 1)

          return () => {
            setGallery(false)
            section.classList.remove('photo-gallery--zoom')
            gsap.set([heading, camera, screen, frame, controls], { clearProps: 'all' })
          }
        },
      )
    },
    { scope: sectionRef, dependencies: [syncAutoplay] },
  )

  // Autoplay pauses whenever the section is off screen.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      syncAutoplay()
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [syncAutoplay])

  // …and while the tab is hidden.
  useEffect(() => {
    document.addEventListener('visibilitychange', syncAutoplay)
    return () => document.removeEventListener('visibilitychange', syncAutoplay)
  }, [syncAutoplay])

  useEffect(
    () => () => {
      timelineRef.current?.kill()
      if (autoplayRef.current !== null) window.clearTimeout(autoplayRef.current)
    },
    [],
  )

  // Arrow keys, only while the gallery is the thing on screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      const section = sectionRef.current
      if (!section) return
      const { top, bottom } = section.getBoundingClientRect()
      const vh = window.innerHeight
      if (top > vh * 0.5 || bottom < vh * 0.5) return

      event.preventDefault()
      go(event.key === 'ArrowRight' ? 1 : -1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1)
  }

  return (
    <section
      ref={sectionRef}
      id="photography"
      aria-roledescription="carousel"
      aria-label="Photography"
      className="photo-gallery relative w-full bg-white"
    >
      <h2
        ref={headingRef}
        className="px-5 text-center text-[clamp(44px,6.5vw,96px)] font-bold uppercase leading-[0.82] tracking-[-0.055em] text-[#111]"
        style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
      >
        Photography
      </h2>

      <div ref={cameraRef} className="photo-camera" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* The photographs, stacked and clipped to the display opening. Only
           the active one is visible. */}
        <div ref={screenRef} className="photo-camera__screen">
          {photographyImages.map((image, index) => (
            <img
              key={image}
              ref={(element) => {
                slideRefs.current[index] = element
              }}
              src={image}
              alt={`BrandWorks photography project ${index + 1}`}
              aria-hidden={index !== active}
              draggable={false}
              decoding="async"
              loading="lazy"
              className="photo-camera__slide"
            />
          ))}
        </div>

        <img
          ref={frameRef}
          src={cameraFrame}
          alt=""
          aria-hidden="true"
          width={1287}
          height={984}
          draggable={false}
          decoding="async"
          loading="lazy"
          className="photo-camera__frame"
        />
      </div>

      <div
        ref={controlsRef}
        className="photo-controls"
        onPointerEnter={() => holdAutoplay(true)}
        onPointerLeave={() => holdAutoplay(false)}
        onFocus={() => holdAutoplay(true)}
        onBlur={() => holdAutoplay(false)}
      >
        <button type="button" className="photo-nav photo-nav--prev" onClick={() => go(-1)}>
          <span className="photo-nav__line" aria-hidden="true" />
          <span className="site-ui">Previous</span>
        </button>

        <span className="photo-count site-ui tabular-nums" aria-live="polite">
          <span className="sr-only">Photo </span>
          <span className="photo-count__current">{pad(active + 1)}</span>
          <span aria-hidden="true"> / </span>
          <span className="sr-only"> of </span>
          {pad(TOTAL)}
        </span>

        <button type="button" className="photo-nav photo-nav--next" onClick={() => go(1)}>
          <span className="site-ui">Next</span>
          <span className="photo-nav__line" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

export default PhotographyGallery
