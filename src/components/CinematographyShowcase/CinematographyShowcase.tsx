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
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type PanInfo,
  type Transition,
  type Variants,
} from 'motion/react'
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react'
import { getSmoothScroll } from '../../lib/smoothScroll'
import { CINEMATOGRAPHY_PROJECTS, type CinematographyProject } from '../../data/cinematography'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
// Phones: the films are full-length, so they wait for a tap instead of autoplaying.
const PHONE = '(max-width: 767px)'
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

/** Without a poster, the media fragment makes the browser paint the first frame instead of a black box. */
const inlineSource = (project: CinematographyProject) => (project.poster ? project.src : `${project.src}#t=0.1`)

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 14" aria-hidden="true">
      <path d="M1 1.2v11.6a.6.6 0 0 0 .9.5l9.6-5.8a.6.6 0 0 0 0-1L1.9.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  )
}

function formatTimecode(time: number) {
  const totalSeconds = Math.max(0, Math.floor(time))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
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
  const [muted, setMuted] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  const reducedMotion = useReducedMotion() ?? false
  const finePointer = useMediaQuery(FINE_POINTER)
  const phone = useMediaQuery(PHONE)
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === 'visible', () => true)
  const framingDebug = useFramingDebug()

  const sectionRef = useRef<HTMLElement>(null)
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
    (index: number, requestedDirection?: 1 | -1) => {
      // Clicks during a running transition are dropped so slides can't stack.
      if (transitioningRef.current) return
      const next = Math.max(0, Math.min(count - 1, index))
      if (next === active) return
      transitioningRef.current = true
      fallbackTimer.current = window.setTimeout(() => finishTransition(next), TRANSITION_FALLBACK_MS)
      videos.current.get(projects[active].id)?.pause()
      setCurrentTime(0)
      setDirection(requestedDirection ?? (next > active ? 1 : -1))
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

  const shouldPlay = inView && pageVisible && lightbox === null && !reducedMotion && !phone
  const canPlay = shouldPlay

  const toggleMute = () => {
    const video = videos.current.get(current.id)
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

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
    <section
      ref={sectionRef}
      className="relative flex w-full flex-col justify-center overflow-x-clip bg-white pb-4 pt-20 font-secondary text-[#0a0a0a] [container-type:inline-size] sm:pb-5"
      aria-labelledby={headingId}
    >
      <header className="mx-auto mb-[var(--heading-gap)] w-full max-w-[var(--media-max-width)] px-[var(--media-pad)]">
        <h2
          id={headingId}
          className="m-0 font-primary text-[clamp(2.25rem,3.5vw,4rem)] font-light leading-none tracking-[-0.035em] text-charcoal-950 sm:text-[clamp(2.5rem,3.75vw,4rem)] sm:leading-[1.05] lg:text-[clamp(3rem,2.5vw,4rem)]"
        >
          Cinematography
        </h2>
        <p className="mt-4.5 max-w-[40ch] font-secondary text-sm leading-5 tracking-[-0.01em] text-[#111]/60 sm:text-base sm:leading-6">
          Stories, given movement.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-[var(--media-max-width)] flex-col [--arrow:clamp(2.25rem,3.6vw,3.25rem)] [--arrow-gap:clamp(0.25rem,1vw,1rem)] px-[var(--media-pad)] md:px-[max(var(--media-pad),calc(var(--arrow)_+_2_*_var(--arrow-gap)_-_max(0px,(100cqw_-_var(--media-max-width))_/_2)))]">
        <div
          className="relative h-[50vw] w-full outline-none min-[480px]:h-auto min-[480px]:aspect-[4/3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111] sm:aspect-video"
          role="region"
          aria-roledescription="carousel"
          aria-label="Cinematography projects"
          tabIndex={0}
          onKeyDown={onStageKeyDown}
        >
          <motion.div
            className="group relative isolate size-full touch-pan-y overflow-hidden rounded-[14px] bg-[#111] sm:rounded-[18px] lg:rounded-3xl"
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
                playing={canPlay && settled === active}
                muted={muted}
                reducedMotion={reducedMotion}
                hoverZoom={finePointer}
                videos={videos}
                onEntered={finishTransition}
                onMuteChange={setMuted}
                onTimeChange={setCurrentTime}
              />
            </AnimatePresence>

            {framingDebug && (
              <div
                className="pointer-events-none absolute inset-0 z-[4] rounded-[inherit] outline-dashed outline-1 -outline-offset-1 outline-white"
                aria-hidden="true"
              >
                <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-xs leading-[1.4] text-white">
                  zoom {current.zoom ?? 1} · objectPosition {current.objectPosition ?? '50% 50%'}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
              {finePointer ? (
                <span
                  className={`absolute left-1/2 top-1/2 hidden size-14 -translate-x-1/2 lg:grid -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-[10px] transition-opacity duration-200 ${cursorVisible ? 'opacity-0' : 'opacity-100'}`}
                >
                  <PlayGlyph className="ml-[3px] h-4 w-3.5" />
                </span>
              ) : null}
            </div>

            <button
              ref={hitRef}
              type="button"
              className={`absolute inset-0 z-[3] size-full rounded-[inherit] border-0 bg-transparent p-0 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white ${finePointer ? 'cursor-pointer lg:cursor-none' : 'cursor-pointer'}`}
              aria-label={`Watch ${current.title}`}
              aria-haspopup="dialog"
              onClick={() => {
                if (!draggedRef.current) openLightbox()
              }}
              onPointerEnter={showCursor}
              onPointerMove={trackPointer}
              onPointerLeave={hideCursor}
            />

            {/* Bottom scrim keeps the overlaid text readable over moving footage. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] hidden h-3/5 lg:block bg-[linear-gradient(to_top,rgb(0_0_0/0.6),rgb(0_0_0/0.25)_45%,transparent)]"
              aria-hidden="true"
            />

            <div className="pointer-events-none absolute bottom-16 left-4 right-4 z-[4] hidden lg:block sm:bottom-8 sm:left-8 sm:right-1/2 lg:bottom-10 lg:left-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={current.id} {...textMotion}>
                  <div className="min-w-0">
                    <h3 className="mb-2 font-secondary text-sm  leading-5 tracking-normal text-white sm:text-base">
                      {current.title}
                    </h3>
                    <p className="m-0 hidden line-clamp-2 max-w-[46ch] text-xs leading-5 text-white/80 sm:block sm:text-[15px] sm:leading-[1.5]">
                      {current.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              className="absolute bottom-3 left-1/2 z-[5] flex h-10 w-fit max-w-[calc(100%-24px)] -translate-x-1/2 items-center justify-start gap-1 rounded-full border border-white/15 bg-black/55 p-1 text-white shadow-[0_1px_12px_rgb(0_0_0/0.16)] backdrop-blur-[8px] sm:left-auto sm:right-6 sm:h-auto sm:max-w-none sm:translate-x-0 sm:gap-1.5 sm:bg-black/20 sm:p-1.5 lg:bottom-8 lg:right-8"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
              animate={{ opacity: inView ? 1 : 0, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, ease: EASE_OUT }}
            >
              <button
                type="button"
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-white/90 transition-[background-color,transform,color] duration-200 hover:bg-white/15 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-9"
                aria-label="Previous film"
                disabled={active === 0}
                onClick={() => goTo(active - 1, -1)}
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-white/90 transition-[background-color,transform,color] duration-200 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-9"
                aria-label={muted ? 'Unmute film' : 'Mute film'}
                aria-pressed={!muted}
                onClick={toggleMute}
              >
                {muted ? <VolumeX className="size-3.5" aria-hidden="true" strokeWidth={1.8} /> : <Volume2 className="size-3.5" aria-hidden="true" strokeWidth={1.8} />}
              </button>
              <span className="ml-1 hidden border-l border-white/20 pl-2 font-mono text-[9px] font-medium leading-none tracking-[0.08em] text-white/70 sm:inline sm:text-[10px]" aria-hidden="true">60FPS</span>
              <output className="w-[4.8rem] font-mono text-[10px] tabular-nums leading-none tracking-[0.06em] text-white sm:w-[5.25rem] sm:text-[11px]" aria-label={`Current time ${formatTimecode(currentTime)}`}>
                {formatTimecode(currentTime)}
              </output>
              <button
                type="button"
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-white/90 transition-[background-color,transform,color] duration-200 hover:bg-white/15 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-9"
                aria-label="Next film"
                disabled={active === count - 1}
                onClick={() => goTo(active + 1, 1)}
              >
                <ChevronRight className="size-3.5" aria-hidden="true" strokeWidth={1.8} />
              </button>
            </motion.div>

          </motion.div>

          <button
            type="button"
            className="absolute right-full top-1/2 mr-[var(--arrow-gap)] z-[5] hidden size-[var(--arrow)] -translate-y-1/2 cursor-pointer place-items-center border-0 bg-transparent p-0 text-[#0a0a0a]/55 transition-colors duration-200 hover:not-disabled:text-[#0a0a0a] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-35 md:grid"
            aria-label="Previous film"
            disabled={active === 0}
            onClick={() => goTo(active - 1)}
          >
            <ChevronLeft className="size-[clamp(1.5rem,2.6vw,2.5rem)]" aria-hidden="true" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="absolute left-full top-1/2 ml-[var(--arrow-gap)] z-[5] hidden size-[var(--arrow)] -translate-y-1/2 cursor-pointer place-items-center border-0 bg-transparent p-0 text-[#0a0a0a]/55 transition-colors duration-200 hover:not-disabled:text-[#0a0a0a] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-35 md:grid"
            aria-label="Next film"
            disabled={active === count - 1}
            onClick={() => goTo(active + 1)}
          >
            <ChevronRight className="size-[clamp(1.5rem,2.6vw,2.5rem)]" aria-hidden="true" strokeWidth={2} />
          </button>
        </div>

        {neighbours.map((project) =>
          project.poster ? (
            <link key={project.id} rel="preload" as="image" href={project.poster} />
          ) : (
            <video
              key={project.id}
              className="hidden"
              src={inlineSource(project)}
              muted
              playsInline
              preload="metadata"
              hidden
              aria-hidden="true"
            />
          ),
        )}

      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {finePointer &&
        createPortal(
          <AnimatePresence>
            {cursorVisible && lightbox === null && (
              <motion.div
                className="pointer-events-none fixed left-0 top-0 z-[60]"
                style={{ x: reducedMotion ? pointerX : springX, y: reducedMotion ? pointerY : springY }}
                aria-hidden="true"
              >
                <motion.span
                  className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-white px-[18px] py-2.5 lg:inline-flex font-secondary text-sm font-medium leading-none text-[#0a0a0a] [translate:-50%_-50%]"
                  initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                  <PlayGlyph className="h-5 w-3" />
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
  muted,
  reducedMotion,
  hoverZoom,
  videos,
  onEntered,
  onMuteChange,
  onTimeChange,
}: {
  project: CinematographyProject
  index: number
  count: number
  direction: number
  loaded: boolean
  playing: boolean
  muted: boolean
  reducedMotion: boolean
  hoverZoom: boolean
  videos: RefObject<Map<string, HTMLVideoElement>>
  onEntered: (index: number) => void
  onMuteChange: (muted: boolean) => void
  onTimeChange: (time: number) => void
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
      className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[#111]"
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
      <div className={hoverZoom ? 'relative size-full transition-transform duration-700 ease-out group-hover:scale-[1.035]' : 'relative size-full'}>
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
            className="pointer-events-none absolute inset-0 size-full object-cover"
            style={mediaStyle}
            src={inlineSource(project)}
            poster={project.poster}
            muted={muted}
            loop
            playsInline
            preload={playing ? 'auto' : 'metadata'}
            aria-label={project.title}
            onLoadedMetadata={(event) => {
              if (isPresent) onTimeChange(0)
              if (!DEV) return
              const { videoWidth, videoHeight } = event.currentTarget
              const ratio = videoWidth / videoHeight
              // Not 16:9 means cover crops it; it may need a zoom/objectPosition in data.
              if (Math.abs(ratio / SIXTEEN_NINE - 1) > 0.03) {
                console.info(`[cinematography] "${project.title}" is ${videoWidth}×${videoHeight} (${ratio.toFixed(3)}:1, not 16:9)`)
              }
            }}
            onVolumeChange={(event) => {
              if (isPresent) onMuteChange(event.currentTarget.muted)
            }}
            onTimeUpdate={(event) => {
              if (isPresent) onTimeChange(event.currentTarget.currentTime)
            }}
          />
        ) : project.poster ? (
          <img
            className="pointer-events-none absolute inset-0 size-full object-cover"
            style={mediaStyle}
            src={project.poster}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
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
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overscroll-contain border-0 bg-black/90 px-4 py-14 text-white backdrop:bg-transparent open:grid open:grid-rows-[minmax(0,1fr)] open:place-items-center sm:px-8 sm:py-16 lg:px-16 lg:py-20"
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
      <button
        type="button"
        className="absolute right-4 top-4 grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-white/15 p-0 text-white transition-colors duration-200 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Close film"
        onClick={onClose}
        autoFocus
      >
        <X className="size-5" aria-hidden="true" strokeWidth={1.5} />
      </button>
      <video
        ref={videoRef}
        className="size-full max-h-full max-w-full bg-black object-contain"
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
