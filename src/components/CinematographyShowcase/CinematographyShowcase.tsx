'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  motion,
  useInView,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type PanInfo,
  type Transition,
  type Variants,
} from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Link } from '../../routing'
import { getSmoothScroll } from '../../lib/smoothScroll'
import { CINEMATOGRAPHY_PROJECTS, type CinematographyProject } from '../../data/cinematography'
import './CinematographyShowcase.css'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
const SWIPE_DISTANCE = 50
const SWIPE_VELOCITY = 400
const EASE_OUT = [0.22, 1, 0.36, 1] as const
const SLIDE_EASE = [0.65, 0, 0.35, 1] as const
const DEV = process.env.NODE_ENV !== 'production'
const SIXTEEN_NINE = 16 / 9
// Releases the navigation lock if a slide's enter animation never reports
// completion (e.g. the tab was hidden mid-transition).
const TRANSITION_FALLBACK_MS = 1000

/** The incoming film pushes the outgoing one out; both stay inside the clipped frame. */
const SLIDE_VARIANTS: Variants = {
  enter: (direction: number) => ({ x: `${direction * 100}%`, opacity: 1 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: `${direction * -30}%`, opacity: 0.4 }),
}

const FADE_VARIANTS: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

const subscribeNothing = () => () => {}

/** `?framing=1` (development only) outlines the frame and shows each film's framing values. */
function useFramingDebug(): boolean {
  const requested = useSyncExternalStore(
    subscribeNothing,
    () => new URLSearchParams(window.location.search).has('framing'),
    () => false,
  )
  return DEV && requested
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Without a poster, the media fragment makes the browser paint the first frame instead of a black box. */
const inlineSource = (project: CinematographyProject) => (project.poster ? project.src : `${project.src}#t=0.1`)

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1 1.2v11.6a.6.6 0 0 0 .9.5l9.6-5.8a.6.6 0 0 0 0-1L1.9.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  )
}

export default function CinematographyShowcase() {
  const projects = CINEMATOGRAPHY_PROJECTS
  const count = projects.length
  const headingId = useId()

  const [active, setActive] = useState(0)
  // +1 when moving to the next film, -1 to the previous one.
  const [direction, setDirection] = useState(1)
  // The film whose enter animation has finished; only it may play.
  const [settled, setSettled] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [lightbox, setLightbox] = useState<{ index: number; startAt: number; returnTo: HTMLElement | null } | null>(null)
  const [nearView, setNearView] = useState(false)
  const [inView, setInView] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)

  const reducedMotion = useReducedMotion() ?? false
  const finePointer = useMediaQuery(FINE_POINTER)
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === 'visible', () => true)
  const framingDebug = useFramingDebug()

  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const headerRevealed = useInView(headerRef, { once: true, amount: 0.6 })
  const videos = useRef(new Map<string, HTMLVideoElement>())
  const hitRef = useRef<HTMLButtonElement>(null)
  const draggedRef = useRef(false)
  const transitioningRef = useRef(false)
  const fallbackTimer = useRef<number | undefined>(undefined)

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const springX = useSpring(pointerX, { stiffness: 500, damping: 40 })
  const springY = useSpring(pointerY, { stiffness: 500, damping: 40 })

  const finishTransition = useCallback((index: number) => {
    window.clearTimeout(fallbackTimer.current)
    transitioningRef.current = false
    setSettled(index)
  }, [])

  const goTo = useCallback(
    (index: number) => {
      // Clicks during a running transition are dropped so slides can't stack.
      if (transitioningRef.current) return
      const next = Math.max(0, Math.min(count - 1, index))
      if (next === active) return
      transitioningRef.current = true
      fallbackTimer.current = window.setTimeout(() => finishTransition(next), TRANSITION_FALLBACK_MS)
      videos.current.get(projects[active].id)?.pause()
      setDirection(next > active ? 1 : -1)
      setActive(next)
      setAnnouncement(`${projects[next].title}, ${next + 1} of ${count}`)
    },
    [active, count, projects, finishTransition],
  )

  useEffect(() => () => window.clearTimeout(fallbackTimer.current), [])

  // Two observers: one starts loading a little before the section arrives,
  // the other decides playback at 40% visibility.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearView(true)
          near.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    const visible = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4),
      { threshold: [0, 0.4] },
    )
    near.observe(section)
    visible.observe(section)
    return () => {
      near.disconnect()
      visible.disconnect()
    }
  }, [])

  const shouldPlay = inView && pageVisible && lightbox === null && !reducedMotion

  const openLightbox = () => {
    setCursorVisible(false)
    setLightbox({
      index: active,
      startAt: videos.current.get(projects[active].id)?.currentTime ?? 0,
      returnTo: hitRef.current,
    })
  }

  const onStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(active - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(active + 1)
    }
  }

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) goTo(active + 1)
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) goTo(active - 1)
  }

  const trackPointer = (event: ReactPointerEvent) => {
    pointerX.set(event.clientX)
    pointerY.set(event.clientY)
  }

  const showCursor = (event: ReactPointerEvent) => {
    if (!finePointer) return
    // Start the spring where the pointer is, not where it last left.
    pointerX.set(event.clientX)
    pointerY.set(event.clientY)
    springX.jump(event.clientX)
    springY.jump(event.clientY)
    setCursorVisible(true)
  }

  const hideCursor = () => setCursorVisible(false)

  const current = projects[active]
  // Only the films either side of the active one are fetched ahead of time.
  // A neighbour sharing the active film's file is skipped: a second element
  // would download the same (large) file again alongside the playing one.
  const neighbours = nearView
    ? [projects[active - 1], projects[active + 1]].filter((project) => project && project.src !== current.src)
    : []

  const textMotion = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
        exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: EASE_OUT } },
      }

  return (
    <section ref={sectionRef} className="cine" aria-labelledby={headingId}>
      <header ref={headerRef} className="cine-header" data-revealed={headerRevealed || undefined}>
        <h2 id={headingId} className="cine-heading">
          Cinematography
        </h2>
        <p className="cine-subheading">Stories, given movement.</p>
      </header>

      <div
        className="cine-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Cinematography projects"
        tabIndex={0}
        onKeyDown={onStageKeyDown}
      >
        <motion.div
          className="cine-frame"
          drag={finePointer ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          dragSnapToOrigin
          onPointerDownCapture={() => {
            draggedRef.current = false
          }}
          onDragStart={() => {
            draggedRef.current = true
          }}
          onDragEnd={onDragEnd}
        >
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <Slide
              key={current.id}
              project={current}
              index={active}
              count={count}
              direction={direction}
              loaded={nearView}
              playing={shouldPlay && settled === active}
              reducedMotion={reducedMotion}
              videos={videos}
              onEntered={finishTransition}
            />
          </AnimatePresence>

          {framingDebug && (
            <div className="cine-framing" aria-hidden="true">
              <span>
                zoom {current.zoom ?? 1} · objectPosition {current.objectPosition ?? '50% 50%'}
              </span>
            </div>
          )}

          <div className="cine-overlay" aria-hidden="true">
            <span className="cine-play" data-hidden={cursorVisible || undefined}>
              <PlayGlyph />
            </span>
            <span className="cine-watch">
              <PlayGlyph />
              Watch
            </span>
          </div>

          <button
            ref={hitRef}
            type="button"
            className="cine-frame__hit"
            aria-label={`Watch ${current.title}`}
            aria-haspopup="dialog"
            onClick={() => {
              if (!draggedRef.current) openLightbox()
            }}
            onPointerEnter={showCursor}
            onPointerMove={trackPointer}
            onPointerLeave={hideCursor}
          />
        </motion.div>
      </div>

      {neighbours.map((project) =>
        project.poster ? (
          <link key={project.id} rel="preload" as="image" href={project.poster} />
        ) : (
          <video
            key={project.id}
            className="cine-preload"
            src={inlineSource(project)}
            muted
            playsInline
            preload="metadata"
            hidden
            aria-hidden="true"
          />
        ),
      )}

      <div className="cine-info">
        <div className="cine-info__text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current.id} {...textMotion}>
              <h3 className="cine-info__title">{current.title}</h3>
              <p className="cine-info__desc">{current.description}</p>
              <Link to={current.href} className="cine-info__link">
                View case
                <ChevronRight aria-hidden="true" strokeWidth={1.75} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="cine-info__controls">
          <span className="cine-counter" aria-hidden="true">
            {pad(active + 1)} / {pad(count)}
          </span>
          <div className="cine-arrows">
            <button type="button" aria-label="Previous film" disabled={active === 0} onClick={() => goTo(active - 1)}>
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
            </button>
            <button type="button" aria-label="Next film" disabled={active === count - 1} onClick={() => goTo(active + 1)}>
              <ChevronRight aria-hidden="true" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <p className="cine-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {finePointer &&
        createPortal(
          <AnimatePresence>
            {cursorVisible && lightbox === null && (
              <motion.div
                className="cine-cursor"
                style={{ x: reducedMotion ? pointerX : springX, y: reducedMotion ? pointerY : springY }}
                aria-hidden="true"
              >
                <motion.span
                  className="cine-cursor__pill"
                  initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <PlayGlyph />
                  Watch case
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {lightbox && (
        <FilmLightbox
          project={projects[lightbox.index]}
          startAt={lightbox.startAt}
          returnTo={lightbox.returnTo}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  )
}

/**
 * One film inside the frame. While AnimatePresence plays its exit it keeps
 * the props it last rendered with, so presence (not `playing`) is what
 * pauses the outgoing video and drops it behind the incoming one.
 */
function Slide({
  project,
  index,
  count,
  direction,
  loaded,
  playing,
  reducedMotion,
  videos,
  onEntered,
}: {
  project: CinematographyProject
  index: number
  count: number
  direction: number
  loaded: boolean
  playing: boolean
  reducedMotion: boolean
  videos: RefObject<Map<string, HTMLVideoElement>>
  onEntered: (index: number) => void
}) {
  const isPresent = useIsPresent()
  const videoRef = useRef<HTMLVideoElement>(null)
  const run = playing && isPresent

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (run) void video.play().catch(() => undefined)
    else if (!video.paused) video.pause()
  }, [run, loaded])

  const objectPosition = project.objectPosition ?? '50% 50%'
  const zoom = project.zoom ?? 1
  const mediaStyle = {
    objectPosition,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: objectPosition,
  }

  const transition: Transition = reducedMotion
    ? { duration: 0.15, ease: 'linear' }
    : { duration: 0.6, ease: SLIDE_EASE }

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${project.title}`}
      aria-hidden={!isPresent || undefined}
      inert={!isPresent}
      className="cine-slide"
      style={{ zIndex: isPresent ? 1 : 0 }}
      custom={direction}
      variants={reducedMotion ? FADE_VARIANTS : SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      onAnimationComplete={(definition) => {
        if (definition === 'center' && isPresent) onEntered(index)
      }}
    >
      {loaded ? (
        <video
          ref={(node) => {
            videoRef.current = node
            if (!node) return
            videos.current.set(project.id, node)
            return () => {
              videoRef.current = null
              if (videos.current.get(project.id) === node) videos.current.delete(project.id)
            }
          }}
          className="cine-slide__media"
          style={mediaStyle}
          src={inlineSource(project)}
          poster={project.poster}
          muted
          loop
          playsInline
          preload={playing ? 'auto' : 'metadata'}
          aria-label={project.title}
          onLoadedMetadata={(event) => {
            if (!DEV) return
            const { videoWidth, videoHeight } = event.currentTarget
            const ratio = videoWidth / videoHeight
            // Not 16:9 means cover crops it; it may need a zoom/objectPosition in data.
            if (Math.abs(ratio / SIXTEEN_NINE - 1) > 0.03) {
              console.info(`[cinematography] "${project.title}" is ${videoWidth}×${videoHeight} (${ratio.toFixed(3)}:1), not 16:9`)
            }
          }}
        />
      ) : project.poster ? (
        <img className="cine-slide__media" style={mediaStyle} src={project.poster} alt="" loading="lazy" decoding="async" />
      ) : null}
    </motion.div>
  )
}

function FilmLightbox({
  project,
  startAt,
  returnTo,
  onClose,
}: {
  project: CinematographyProject
  startAt: number
  returnTo: HTMLElement | null
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Opened by a click, so playback with sound is allowed; asked for
  // explicitly rather than waiting on autoPlay's buffering threshold.
  useEffect(() => {
    void videoRef.current?.play().catch(() => undefined)
  }, [])

  // showModal() makes the rest of the page inert (the focus trap) and puts
  // the dialog in the top layer; Lenis is stopped so wheel/touch can't
  // scroll the page underneath.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    const lenis = getSmoothScroll()
    if (!dialog.open) dialog.showModal()
    lenis?.stop()
    html.style.overflow = 'hidden'
    return () => {
      if (dialog.open) dialog.close()
      lenis?.start()
      html.style.overflow = previousOverflow
      returnTo?.focus({ preventScroll: true })
    }
  }, [returnTo])

  return (
    <dialog
      ref={dialogRef}
      className="cine-lightbox"
      aria-label={`${project.title} film`}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button type="button" className="cine-lightbox__close" aria-label="Close film" onClick={onClose} autoFocus>
        <X aria-hidden="true" strokeWidth={1.5} />
      </button>
      <video
        ref={videoRef}
        className="cine-lightbox__video"
        src={project.src}
        poster={project.poster}
        controls
        autoPlay
        playsInline
        aria-label={project.title}
        onLoadedMetadata={(event) => {
          if (startAt > 0) event.currentTarget.currentTime = startAt
        }}
      />
    </dialog>
  )
}
