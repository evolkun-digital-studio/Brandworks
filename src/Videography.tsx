import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { clamp01, lerp, matches, smoothstep, write } from './lib/scrollMotion'

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * Where a film comes from. YouTube for now; switching a project to a
 * hosted MP4 (e.g. ImageKit) is just `type: 'video'` plus a `videoUrl`.
 */
type MediaProject = {
  type: 'youtube' | 'video'
  /** YouTube video ID — the clean ID only, no `?si=` share parameters. */
  videoId?: string
  /** Direct MP4 (H.264) / WebM URL, web-optimised. */
  videoUrl?: string
  /** Shown until the film has loaded. Defaults to YouTube's thumbnail. */
  poster?: string
}

type VideoProject = MediaProject & {
  id: string
  title: string
  category: string
  client?: string
  year?: string
}

const VIDEO_PROJECTS: VideoProject[] = [
  { id: '01', title: 'Brand Film', category: 'Videography', type: 'youtube', videoId: 'PJWHAiDARMQ' },
  { id: '02', title: 'Campaign Film', category: 'Videography', type: 'youtube', videoId: '5EpyN_6dqyk' },
  { id: '03', title: 'Visual Story', category: 'Videography', type: 'youtube', videoId: 'weeI1G46q0o' },
  { id: '04', title: 'Creative Film', category: 'Videography', type: 'youtube', videoId: '_r-nPqWGG6c' },
]

// Scene order through the pinned sequence: the first film opens the
// section, the second is revealed as it splits, the middle ones take over
// the viewport one at a time, and the last carries the closing statement.
const INTRO_PROJECT = VIDEO_PROJECTS[0]
const REVEAL_PROJECT = VIDEO_PROJECTS[1]
const SCENE_PROJECTS = VIDEO_PROJECTS.slice(2, -1)
const CLOSING_PROJECT = VIDEO_PROJECTS[VIDEO_PROJECTS.length - 1]

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const youtubeSrc = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}` +
  `?autoplay=1` +
  `&mute=1` +
  `&loop=1` +
  `&playlist=${videoId}` + // required for a single video to loop
  `&controls=0` +
  `&rel=0` +
  `&modestbranding=1` +
  `&playsinline=1`

const posterOf = (media: MediaProject) =>
  media.poster ?? (media.type === 'youtube' && media.videoId ? `https://i.ytimg.com/vi/${media.videoId}/hqdefault.jpg` : undefined)

type YouTubeVideoProps = {
  videoId: string
  className?: string
}

/** A muted, looping, chrome-free YouTube embed that can't be clicked into. */
function YouTubeVideo({ videoId, className = '' }: YouTubeVideoProps) {
  // Fade in once the player has loaded, so its black loading frame never
  // flashes over the poster.
  const [loaded, setLoaded] = useState(false)
  return (
    <iframe
      src={youtubeSrc(videoId)}
      title="BrandWorks videography project"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      tabIndex={-1}
      aria-hidden="true"
      onLoad={() => setLoaded(true)}
      className={className}
      style={{
        border: 0,
        pointerEvents: 'none',
        opacity: loaded ? 1 : 0,
        transition: 'opacity 700ms ease 300ms',
      }}
    />
  )
}

/**
 * Renders a project's film inside a cover-fitted frame, over its poster.
 * `live` mounts the player; when false only the poster remains, so a scene
 * that is far from view costs nothing.
 */
function Media({ media, live, crop }: { media: MediaProject; live: boolean; crop?: number }) {
  const poster = posterOf(media)
  return (
    <div aria-hidden="true" className="video-frame" style={crop ? ({ '--yt-crop': crop } as CSSProperties) : undefined}>
      {poster && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${poster})` }} />}
      {live &&
        (media.type === 'youtube' && media.videoId ? (
          <YouTubeVideo videoId={media.videoId} className="youtube-cover" />
        ) : media.videoUrl ? (
          <video
            src={media.videoUrl}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="metadata"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scroll choreography helpers
// ---------------------------------------------------------------------------

/** 0→1 across [a, b], smoothstepped (the brief's segment helper). */
const seg = (p: number, a: number, b: number) => smoothstep(clamp01((p - a) / (b - a)))
/** Rises over [a, b], holds, falls over [c, d]. */
const segmentInOut = (p: number, a: number, b: number, c: number, d: number) => seg(p, a, b) * (1 - seg(p, c, d))
/** Close to cubic-bezier(0.22, 1, 0.36, 1): a long, soft landing. */
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

const filterOf = (blur: number, brightness: number) =>
  blur < 0.05 && brightness > 0.995 ? 'none' : `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`

/** clip-path window: [top, right, bottom, left] % scaled by t, with rounded corners. */
const insetOf = (t: number, [a, b, c, d]: [number, number, number, number], radius: number) =>
  t < 0.001 ? 'none' : `inset(${(a * t).toFixed(2)}% ${(b * t).toFixed(2)}% ${(c * t).toFixed(2)}% ${(d * t).toFixed(2)}% round ${(radius * t).toFixed(1)}px)`

/**
 * The frame with a vertical opening of ±gap% around its centre: the two
 * halves stay, the middle is cut away. One film, so no seam to keep in sync.
 */
const splitOf = (gap: number) => {
  if (gap < 0.01) return 'none'
  const l = (50 - gap).toFixed(3)
  const r = (50 + gap).toFixed(3)
  return `polygon(0 0, ${l}% 0, ${l}% 100%, ${r}% 100%, ${r}% 0, 100% 0, 100% 100%, 0 100%)`
}

const CAT_START = 0.6
const CAT_STEP = 0.225 / Math.max(1, SCENE_PROJECTS.length)
const CLOSING_START = CAT_START + SCENE_PROJECTS.length * CAT_STEP

type Mode = 'desktop' | 'mobile'

function useMode(): { mode: Mode; reduce: boolean } {
  const read = () => ({
    mode: (matches('(min-width: 768px)') ? 'desktop' : 'mobile') as Mode,
    reduce: matches('(prefers-reduced-motion: reduce)'),
  })
  const [state, setState] = useState(read)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const queries = ['(min-width: 768px)', '(prefers-reduced-motion: reduce)'].map((q) => window.matchMedia(q))
    const onChange = () => setState(read())
    queries.forEach((q) => q.addEventListener('change', onChange))
    return () => queries.forEach((q) => q.removeEventListener('change', onChange))
  }, [])
  return state
}

/** When each scene's film is on screen, as [from, to] progress. */
function sceneWindows(split: boolean, reduce: boolean): Record<string, [number, number]> {
  const windows: Record<string, [number, number]> = {
    intro: [0, split ? 0.53 : reduce ? 0.45 : 0.52],
    reveal: [0.33, CAT_START + 0.04],
    closing: [CLOSING_START, 0.95],
  }
  SCENE_PROJECTS.forEach((_, k) => {
    const start = CAT_START + k * CAT_STEP
    windows[`c${k}`] = [start, start + CAT_STEP + 0.03]
  })
  return windows
}

// ---------------------------------------------------------------------------
// The scroll engine: one requestAnimationFrame loop eases its own copy of
// the scroll position and publishes everything as CSS custom properties
// on the stage. Film wrappers read those variables in their own
// transforms, so React never re-renders while scrolling and the players
// themselves are never touched by the animation — they just play.
//
// The only thing React hears about is which scenes are near enough to
// mount their player (current, and the previous/next where they overlap):
// a string that changes a handful of times across the whole sequence.
// ---------------------------------------------------------------------------

function useVideographyEngine(
  runwayRef: RefObject<HTMLDivElement | null>,
  stageRef: RefObject<HTMLDivElement | null>,
  galleryRef: RefObject<HTMLDivElement | null>,
  mode: Mode,
  reduce: boolean,
  setMounted: (key: string) => void,
) {
  useLayoutEffect(() => {
    const runway = runwayRef.current
    const stage = stageRef.current
    const gallery = galleryRef.current
    if (!runway || !stage || !gallery) return

    const desktop = mode === 'desktop'
    const split = desktop && !reduce
    const motion = reduce ? 0 : desktop ? 1 : 0.5 // scale/travel amount
    const pointerOn = desktop && !reduce && matches('(hover: hover) and (pointer: fine)')
    const cache: Record<string, string> = {}
    const set = (name: string, value: string) => write(stage, cache, name, name, value)

    // A player mounts a little before its scene appears (embeds take a
    // moment to start) and unmounts just after it has gone.
    const windows = sceneWindows(split, reduce)
    const sceneIds = Object.keys(windows)
    const lead = desktop ? 0.08 : 0.05
    const trail = 0.01
    let mountedKey: string | null = null
    const updateMounted = (p: number | null) => {
      let key = ''
      if (p !== null) {
        for (const id of sceneIds) {
          const [a, b] = windows[id]
          if (p >= a - lead && p <= b + trail) key += `${id} `
        }
      }
      if (key === mountedKey) return
      mountedKey = key
      setMounted(key)
    }

    let target = 0
    let smooth = 0
    let initialised = false
    const ptr = { tx: 0, ty: 0, x: 0, y: 0 }
    let galleryLive: boolean | null = null

    const onPointer = (ev: PointerEvent) => {
      ptr.tx = ev.clientX / window.innerWidth - 0.5
      ptr.ty = ev.clientY / window.innerHeight - 0.5
    }
    const resetPointer = () => {
      ptr.tx = 0
      ptr.ty = 0
    }
    if (pointerOn) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.documentElement.addEventListener('mouseleave', resetPointer)
      window.addEventListener('blur', resetPointer)
    }

    let raf = 0
    let last = performance.now()

    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min(64, now - last)
      last = now

      const rect = runway.getBoundingClientRect()
      const vh = window.innerHeight
      const travel = rect.height - vh
      target = travel > 0 ? clamp01(-rect.top / travel) : 0

      if (rect.bottom < -vh || rect.top > vh * 2) {
        smooth = target
        updateMounted(null)
        if (cache.wc !== 'auto') {
          cache.wc = 'auto'
          stage.style.setProperty('--wc', 'auto')
        }
        return
      }
      if (cache.wc !== 'transform, opacity, filter') {
        cache.wc = 'transform, opacity, filter'
        stage.style.setProperty('--wc', 'transform, opacity, filter')
      }

      // targetScroll → smoothScroll (0.12 per 60fps frame); none in reduced motion.
      if (!initialised || reduce) {
        smooth = target
        initialised = true
      } else {
        smooth = lerp(smooth, target, 1 - Math.pow(1 - 0.12, dt / 16.67))
        if (Math.abs(target - smooth) < 0.00005) smooth = target
      }
      if (pointerOn) {
        ptr.x = lerp(ptr.x, ptr.tx, 0.1)
        ptr.y = lerp(ptr.y, ptr.ty, 0.1)
        set('--ptr-x', ptr.x.toFixed(4))
        set('--ptr-y', ptr.y.toFixed(4))
      }

      const p = smooth
      updateMounted(p)

      // --- Scene 1: the opening film -----------------------------------
      const drift = seg(p, 0, 0.35) * motion
      set('--video-bg-scale', (1 + 0.08 * drift).toFixed(4))
      set('--video-bg-y', `${(-30 * drift).toFixed(1)}px`)
      set('--video-bg-dim', (0.14 * drift).toFixed(3))
      set('--video-mid-scale', (1 + 0.12 * drift).toFixed(4))
      set('--video-mid-y', `${(-50 * drift).toFixed(1)}px`)
      set('--video-edge', clamp01(drift * 4).toFixed(3))
      set('--video-lift-opacity', (1 - seg(p, 0.3, 0.42)).toFixed(3))

      const title = seg(p, 0.15, 0.32)
      set('--title-y', `${(-160 * title * (reduce ? 0 : 1)).toFixed(1)}px`)
      set('--title-scale', (1 - 0.06 * title * (reduce ? 0 : 1)).toFixed(4))
      set('--title-opacity', (1 - title).toFixed(3))
      const desc = seg(p, 0.12, 0.28)
      set('--desc-y', `${(60 * desc * (reduce ? 0 : 1)).toFixed(1)}px`)
      set('--desc-opacity', (1 - desc).toFixed(3))

      // --- Scene 2: the film splits open over the next one --------------
      if (split) {
        // The halves open outward from the centre while the frame pushes
        // toward camera, carrying each half's picture outward with it.
        const opening = seg(p, 0.35, 0.52)
        set('--intro-clip', splitOf(50 * opening))
        set('--intro-scale', (1 + 0.35 * opening).toFixed(4))
        set('--intro-y', `${(-40 * opening).toFixed(1)}px`)
        set('--intro-filter', filterOf(8 * opening, 1 - 0.18 * opening))
        set('--intro-opacity', (1 - seg(p, 0.46, 0.53)).toFixed(3))
      } else {
        // Mobile / reduced motion: it closes into a rounded frame and fades.
        const exit = seg(p, 0.35, 0.5)
        set('--intro-clip', reduce ? 'none' : insetOf(exit, [10, 6, 10, 6], 20))
        set('--intro-filter', reduce ? 'none' : filterOf(4 * exit, 1 - 0.12 * exit))
        set('--intro-opacity', (1 - seg(p, reduce ? 0.35 : 0.44, reduce ? 0.45 : 0.52)).toFixed(3))
      }

      // Film revealed underneath; later it departs with a blur.
      const bIn = seg(p, 0.33, 0.45)
      const bOut = seg(p, CAT_START, CAT_START + 0.04)
      set('--b-opacity', (bIn * (1 - bOut)).toFixed(3))
      set('--b-scale', (1 + 0.05 * (1 - seg(p, 0.35, 0.55)) * (reduce ? 0 : 1)).toFixed(4))
      set('--b-filter', reduce ? 'none' : filterOf((desktop ? 8 : 4) * bOut, 1 - 0.18 * bOut))

      const p1 = segmentInOut(p, 0.47, 0.52, 0.58, 0.62)
      set('--panel-opacity', p1.toFixed(3))
      set('--panel-y', `${((50 * (1 - seg(p, 0.47, 0.52)) - 70 * seg(p, 0.58, 0.62)) * (reduce ? 0 : 1)).toFixed(1)}px`)

      // --- Scene 3: one film takes over the viewport at a time ---------
      for (let k = 0; k < SCENE_PROJECTS.length; k++) {
        const start = CAT_START + k * CAT_STEP
        const enter = seg(p, start, start + 0.03)
        const leave = seg(p, start + CAT_STEP, start + CAT_STEP + 0.03)
        const local = clamp01((p - start) / (CAT_STEP + 0.03))
        set(`--c${k}-opacity`, (enter * (1 - leave)).toFixed(3))
        // Opens from a rounded window to the full frame as it arrives.
        set(`--c${k}-clip`, reduce ? 'none' : insetOf(1 - enter, desktop ? [12, 8, 12, 8] : [6, 4, 6, 4], 24))
        set(`--c${k}-scale`, (1 + (0.05 * (1 - enter) + 0.06 * local) * (reduce ? 0 : desktop ? 1 : 0.5)).toFixed(4))
        set(`--c${k}-filter`, reduce ? 'none' : filterOf((desktop ? 8 : 4) * leave, 1 - 0.18 * leave))
      }

      // --- Scene 4: closing statement over the last film ---------------
      const dIn = seg(p, CLOSING_START, CLOSING_START + 0.03)
      set('--d-opacity', dIn.toFixed(3))
      set('--d-scale', (1 + 0.06 * (1 - dIn) * motion + 0.05 * seg(p, CLOSING_START, 0.95) * motion).toFixed(4))
      const p2 = segmentInOut(p, CLOSING_START + 0.015, CLOSING_START + 0.045, 0.885, 0.915)
      set('--panel2-opacity', p2.toFixed(3))
      set('--panel2-y', `${((50 * (1 - seg(p, CLOSING_START + 0.015, CLOSING_START + 0.045)) - 70 * seg(p, 0.885, 0.915)) * (reduce ? 0 : 1)).toFixed(1)}px`)

      // --- Resolve to white, then the reel flies in --------------------
      set('--veil', seg(p, 0.89, 0.95).toFixed(3))
      const g = clamp01((p - 0.88) / 0.12)
      const gx = reduce ? 0 : 400 * (1 - easeOutQuint(g))
      set('--gallery-x', `${gx.toFixed(3)}vw`)
      set('--gallery-opacity', reduce ? seg(p, 0.9, 0.97).toFixed(3) : '1')
      const live = g > 0.85
      if (live !== galleryLive) {
        galleryLive = live
        gallery.style.pointerEvents = live ? 'auto' : 'none'
        gallery.inert = !live
      }
    }

    render(performance.now())

    return () => {
      cancelAnimationFrame(raf)
      if (pointerOn) {
        window.removeEventListener('pointermove', onPointer)
        document.documentElement.removeEventListener('mouseleave', resetPointer)
        window.removeEventListener('blur', resetPointer)
      }
    }
  }, [runwayRef, stageRef, galleryRef, mode, reduce, setMounted])
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

const WC: CSSProperties = { willChange: 'var(--wc)' as CSSProperties['willChange'] }

/** Pointer parallax of ±amp px horizontally (half that vertically). */
const ptrX = (amp: number) => `calc(var(--ptr-x, 0) * ${amp * 2}px)`
const ptrY = (amp: number) => `calc(var(--ptr-y, 0) * ${amp}px)`

/** A full-frame film on its own depth plane, driven entirely by CSS variables. */
function VideoLayer({
  media,
  live,
  scale,
  y = '0px',
  ptr = 0,
}: {
  media: MediaProject
  live: boolean
  scale: string
  y?: string
  /** Pointer parallax amplitude in px. */
  ptr?: number
}) {
  return (
    <div
      aria-hidden="true"
      // Bleeds past the frame so pointer parallax never exposes an edge.
      className={ptr ? 'absolute -inset-5' : 'absolute inset-0'}
      style={{
        ...WC,
        transform: `translate3d(${ptrX(ptr)}, calc(${y} + ${ptrY(ptr)}), 0) scale(var(${scale}))`,
      }}
    >
      <Media media={media} live={live} />
    </div>
  )
}

/** Just enough tone for white type — the film stays the hero. */
const INTRO_SHADE = 'linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.28))'

/**
 * The opening film. Desktop: it splits open from the centre over the next
 * film. Mobile / reduced motion: it closes into a rounded frame and fades.
 */
function IntroFilm({ live }: { live: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        ...WC,
        clipPath: 'var(--intro-clip)',
        transform: 'translate3d(0, var(--intro-y, 0), 0) scale(var(--intro-scale, 1))',
        filter: 'var(--intro-filter)',
        opacity: 'var(--intro-opacity, 1)',
      }}
    >
      <VideoLayer media={INTRO_PROJECT} live={live} scale="--video-bg-scale" y="var(--video-bg-y)" ptr={5} />
      <div className="absolute inset-0 bg-black" style={{ opacity: 'var(--video-bg-dim, 0)' }} />
      <div className="absolute inset-0" style={{ background: INTRO_SHADE }} />
    </div>
  )
}

/**
 * Desktop midground: a hairline frame that lifts off the opening film at
 * its own depth and dissolves just before the split.
 */
function IntroDepth() {
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ ...WC, opacity: 'var(--video-lift-opacity, 1)' }}>
      <div
        className="absolute inset-0"
        style={{ ...WC, transform: `translate3d(${ptrX(10)}, calc(var(--video-mid-y) + ${ptrY(10)}), 0) scale(var(--video-mid-scale))` }}
      >
        <div
          className="absolute top-[14%] right-[20%] bottom-[14%] left-[20%] rounded-[4px] border border-white/30"
          style={{ opacity: 'var(--video-edge, 0)' }}
        />
      </div>
    </div>
  )
}

function SceneLabel({ project }: { project: VideoProject }) {
  return (
    <p className="font-inter absolute bottom-[8vh] left-5 text-[11px] font-medium tracking-[0.12em] text-white/85 uppercase md:left-12 md:text-xs">
      {project.id} / {project.title}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Final reel — native horizontal scrolling (swipe / trackpad / arrows).
// Each card shows its poster and mounts its player only while it is in
// view, so the reel never holds more players than are on screen.
// ---------------------------------------------------------------------------

function ReelCard({ project }: { project: VideoProject }) {
  const ref = useRef<HTMLElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <figure
      ref={ref}
      data-gallery-card
      className="m-0 shrink-0"
      style={{ width: 'min(clamp(320px, 28vw, 520px), calc((100vh - 280px) * 1.7778), 84vw)' }}
    >
      <div className="relative aspect-video overflow-hidden rounded-[20px] bg-neutral-900">
        <div className="absolute inset-0">
          <Media media={project} live={live} crop={1.2} />
        </div>
      </div>
      <figcaption className="font-inter mt-3 flex items-baseline gap-3 text-[11px] tracking-[0.12em] text-[rgba(17,17,17,0.55)] uppercase md:text-xs">
        <span>
          {project.id} / {project.title}
        </span>
        {(project.client || project.year) && (
          <span className="tracking-normal text-[#111] normal-case">{[project.client, project.year].filter(Boolean).join(', ')}</span>
        )}
      </figcaption>
    </figure>
  )
}

function Gallery({ galleryRef }: { galleryRef: RefObject<HTMLDivElement | null> }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const step = (dir: 1 | -1) => {
    const el = scrollerRef.current
    const card = el?.querySelector<HTMLElement>('[data-gallery-card]')
    if (!el || !card) return
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' })
  }

  return (
    <div
      ref={galleryRef}
      className="absolute inset-0 z-40 flex flex-col justify-center"
      style={{ ...WC, transform: 'translate3d(var(--gallery-x), 0, 0)', opacity: 'var(--gallery-opacity)', pointerEvents: 'none' }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-end justify-between px-5 md:px-12">
        <p className="font-inter text-[11px] font-medium tracking-[0.14em] text-[rgba(17,17,17,0.55)] uppercase md:text-xs">
          Videography — selected films
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous films"
            onClick={() => step(-1)}
            className="font-inter flex size-11 items-center justify-center rounded-full border border-black/15 text-[#111] transition-colors hover:border-black/40"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next films"
            onClick={() => step(1)}
            className="font-inter flex size-11 items-center justify-center rounded-full border border-black/15 text-[#111] transition-colors hover:border-black/40"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-6 flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] md:mt-8 md:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {VIDEO_PROJECTS.map((project) => (
          <ReelCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function Videography() {
  const { mode, reduce } = useMode()
  const runwayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  // Space-separated ids of the scenes whose players are mounted.
  const [mounted, setMounted] = useState('')
  useVideographyEngine(runwayRef, stageRef, galleryRef, mode, reduce, setMounted)

  const isLive = (scene: string) => mounted.split(' ').includes(scene)
  const desktop = mode === 'desktop'
  const split = desktop && !reduce

  return (
    <section aria-labelledby="videography-heading" className="bg-white">
      <div
        ref={runwayRef}
        className="relative"
        style={{ height: desktop ? 'calc(100vh + 3200px)' : 'calc(100vh + 2000px)' }}
      >
        <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden bg-[#111] [isolation:isolate]">
          {/* Scene 2 film, revealed beneath the split. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ ...WC, opacity: 'var(--b-opacity, 0)', filter: 'var(--b-filter)', transform: 'scale(var(--b-scale, 1.05))' }}
          >
            <Media media={REVEAL_PROJECT} live={isLive('reveal')} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.38), rgba(0,0,0,0) 65%)' }} />
          </div>

          {/* Scene 1: the opening film. */}
          <IntroFilm live={isLive('intro')} />
          {split && <IntroDepth />}

          {/* Scene 3: one film per sequence takes over the viewport. */}
          {SCENE_PROJECTS.map((project, k) => (
            <div
              key={project.id}
              className="absolute inset-0"
              style={{ ...WC, opacity: `var(--c${k}-opacity, 0)`, clipPath: `var(--c${k}-clip)`, filter: `var(--c${k}-filter)` }}
            >
              <VideoLayer media={project} live={isLive(`c${k}`)} scale={`--c${k}-scale`} ptr={desktop && !reduce ? 5 : 0} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0) 45%)' }} />
              <SceneLabel project={project} />
            </div>
          ))}

          {/* Scene 4: closing statement over the last film. */}
          <div
            className="absolute inset-0"
            style={{ ...WC, opacity: 'var(--d-opacity, 0)', transform: 'scale(var(--d-scale, 1))' }}
          >
            <Media media={CLOSING_PROJECT} live={isLive('closing')} />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.38), rgba(0,0,0,0) 55%), linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0) 40%)' }}
            />
            <SceneLabel project={CLOSING_PROJECT} />
          </div>

          {/* Intro typography. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[1440px] px-5 pb-[10vh] md:px-12">
            <div
              style={{ ...WC, transform: 'translate3d(0, var(--title-y, 0), 0) scale(var(--title-scale, 1))', opacity: 'var(--title-opacity, 1)', transformOrigin: 'left bottom' }}
            >
              <p className="font-inter text-[11px] font-medium tracking-[0.14em] text-white/80 uppercase md:text-xs">
                Videography
              </p>
              <h2
                id="videography-heading"
                className="font-instrument mt-5 text-[clamp(52px,8vw,140px)] leading-[0.92] font-normal tracking-[-0.03em] text-white"
              >
                Motion that carries
                <br />
                <em>the idea forward.</em>
              </h2>
            </div>
            <p
              className="font-inter mt-8 max-w-[460px] text-base leading-[1.45] text-white/80 md:text-lg"
              style={{ ...WC, transform: 'translate3d(0, var(--desc-y, 0), 0)', opacity: 'var(--desc-opacity, 1)' }}
            >
              From campaign films to branded stories, product motion and founder-led narratives, we use film to give ideas rhythm, atmosphere and emotional weight.
            </p>
          </div>

          {/* Story panel 1 — over the revealed film. */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full max-w-[1440px] items-center px-5 md:left-1/2 md:-translate-x-1/2 md:px-12"
            style={{ ...WC, opacity: 'var(--panel-opacity, 0)' }}
          >
            <div style={{ transform: 'translate3d(0, var(--panel-y, 0), 0)' }}>
              <p className="font-instrument text-[clamp(40px,5.4vw,92px)] leading-[0.95] tracking-[-0.03em] text-white">
                Film is where the concept
                <br />
                <em>learns to move.</em>
              </p>
              <p className="font-inter mt-6 max-w-[380px] text-base leading-[1.45] text-white/75 md:text-lg">
                Rhythm, performance, sound and pacing turn an idea into something people can feel.
              </p>
            </div>
          </div>

          {/* Story panel 2 — over the shaded top of the last film. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-[16vh] z-20 mx-auto w-full max-w-[1440px] px-5 md:px-12"
            style={{ ...WC, opacity: 'var(--panel2-opacity, 0)' }}
          >
            <div style={{ transform: 'translate3d(0, var(--panel2-y, 0), 0)' }}>
              <p className="font-instrument text-[clamp(40px,5.4vw,92px)] leading-[0.95] tracking-[-0.03em] text-white">
                Every cut should carry
                <br />
                <em>the story forward.</em>
              </p>
              <p className="font-inter mt-6 max-w-[420px] text-base leading-[1.45] text-white/75 md:text-lg">
                From the first frame to the final transition, every decision should serve the concept.
              </p>
            </div>
          </div>

          {/* Resolve to the page's white before the reel arrives. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 bg-white"
            style={{ opacity: 'var(--veil, 0)' }}
          />

          <Gallery galleryRef={galleryRef} />
        </div>
      </div>
    </section>
  )
}

export default Videography
