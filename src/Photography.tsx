import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import photo4 from './Photo/Photo4.png'
import photo7 from './Photo/Photo7.png'
import photo8 from './Photo/Photo8.png'
import photo12 from './Photo/Photo12.png'
import photo13 from './Photo/Photo13.png'
import photo14 from './Photo/Photo14.png'
import { clamp01, lerp, matches, smoothstep, write } from './lib/scrollMotion'

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const INTRO_IMAGE = photo13

const CATEGORIES = [
  { image: photo4, label: 'Product' },
  { image: photo8, label: 'Fashion' },
  { image: photo7, label: 'People' },
]

// Final strip. Project names are only given where the project is known
// from Featured Work; the rest carry their discipline alone.
const GALLERY = [
  { image: photo13, category: 'Editorial' },
  { image: photo4, category: 'Product', name: 'Aerolink' },
  { image: photo8, category: 'Fashion', name: 'Nexa Solutions' },
  { image: photo14, category: 'Product' },
  { image: photo7, category: 'People', name: 'Delhi-6' },
  { image: photo12, category: 'Campaign' },
]

const pad = (n: number) => String(n).padStart(2, '0')

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

const CAT_START = 0.6
const CAT_STEP = 0.075

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

// ---------------------------------------------------------------------------
// The scroll engine: one requestAnimationFrame loop eases its own copy of
// the scroll position and publishes everything as CSS custom properties
// on the stage. Layers read those variables in their own transforms, so
// React never re-renders while scrolling.
// ---------------------------------------------------------------------------

function usePhotographyEngine(
  runwayRef: RefObject<HTMLDivElement | null>,
  stageRef: RefObject<HTMLDivElement | null>,
  galleryRef: RefObject<HTMLDivElement | null>,
  mode: Mode,
  reduce: boolean,
) {
  useLayoutEffect(() => {
    const runway = runwayRef.current
    const stage = stageRef.current
    const gallery = galleryRef.current
    if (!runway || !stage || !gallery) return

    const desktop = mode === 'desktop'
    const motion = reduce ? 0 : desktop ? 1 : 0.5 // scale/travel amount
    const pointerOn = desktop && !reduce && matches('(hover: hover) and (pointer: fine)')
    const cache: Record<string, string> = {}
    const set = (name: string, value: string) => write(stage, cache, name, name, value)

    let target = 0
    let smooth = 0
    let initialised = false
    const ptr = { tx: 0, ty: 0, x: 0, y: 0 }
    let primed = false
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

      // Later scenes' images load a little ahead of time.
      if (!primed && p > 0.2) {
        primed = true
        stage.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
          img.loading = 'eager'
        })
      }

      // --- Scene 1: layered intro -------------------------------------
      const drift = seg(p, 0, 0.35) * motion
      set('--photo-bg-scale', (1 + 0.12 * drift).toFixed(4))
      set('--photo-bg-y', `${(-40 * drift).toFixed(1)}px`)
      set('--photo-mid-scale', (1 + 0.18 * drift).toFixed(4))
      set('--photo-mid-y', `${(-70 * drift).toFixed(1)}px`)
      set('--photo-front-scale', (1 + 0.28 * drift).toFixed(4))
      set('--photo-bg-dim', (0.28 * drift).toFixed(3))
      set('--photo-edge', clamp01(drift * 4).toFixed(3))
      set('--photo-front-y', `${(-120 * drift).toFixed(1)}px`)

      const title = seg(p, 0.15, 0.32)
      set('--title-y', `${(-160 * title * (reduce ? 0 : 1)).toFixed(1)}px`)
      set('--title-scale', (1 - 0.06 * title * (reduce ? 0 : 1)).toFixed(4))
      set('--title-opacity', (1 - title).toFixed(3))
      const desc = seg(p, 0.12, 0.28)
      set('--desc-y', `${(60 * desc * (reduce ? 0 : 1)).toFixed(1)}px`)
      set('--desc-opacity', (1 - desc).toFixed(3))

      // --- Scene 2: the frame splits open ------------------------------
      const split = seg(p, 0.35, 0.52)
      const splitX = (desktop ? 42 : 14) * split * (reduce ? 0 : 1)
      set('--split-lx', `${(-splitX).toFixed(3)}vw`)
      set('--split-rx', `${splitX.toFixed(3)}vw`)
      set('--split-y', `${(-120 * split * motion).toFixed(1)}px`)
      set('--split-scale', (1 + (desktop ? 0.55 : 0) * split * (reduce ? 0 : 1)).toFixed(4))
      set('--split-filter', reduce ? 'none' : filterOf((desktop ? 12 : 6) * split, 1 - 0.22 * split))
      set('--split-opacity', (1 - seg(p, reduce ? 0.35 : 0.46, reduce ? 0.45 : 0.53)).toFixed(3))

      // Photograph revealed underneath; later it departs with a blur.
      const bIn = seg(p, 0.33, 0.45)
      const bOut = seg(p, CAT_START, CAT_START + 0.04)
      set('--b-opacity', (bIn * (1 - bOut)).toFixed(3))
      set('--b-scale', (1.08 - 0.08 * seg(p, 0.35, 0.55) * (reduce ? 1 : 1)).toFixed(4))
      set('--b-filter', reduce ? 'none' : filterOf(12 * bOut, 1 - 0.22 * bOut))

      const p1 = segmentInOut(p, 0.47, 0.52, 0.58, 0.62)
      set('--panel-opacity', p1.toFixed(3))
      set('--panel-y', `${((50 * (1 - seg(p, 0.47, 0.52)) - 70 * seg(p, 0.58, 0.62)) * (reduce ? 0 : 1)).toFixed(1)}px`)

      // --- Scene 3: one discipline per sequence ------------------------
      for (let k = 0; k < CATEGORIES.length; k++) {
        const start = CAT_START + k * CAT_STEP
        const enter = seg(p, start, start + 0.03)
        const leave = seg(p, start + CAT_STEP, start + CAT_STEP + 0.03)
        const local = clamp01((p - start) / (CAT_STEP + 0.03))
        set(`--c${k}-opacity`, (enter * (1 - leave)).toFixed(3))
        set(`--c${k}-bg-scale`, (1 + (0.08 * (1 - enter) + 0.1 * local) * (reduce ? 0 : desktop ? 1 : 0.5)).toFixed(4))
        set(`--c${k}-fg-scale`, (1 + 0.25 * local * motion).toFixed(4))
        set(`--c${k}-dim`, (0.3 * local * motion).toFixed(3))
        set(`--c${k}-edge`, clamp01(local * motion * 4).toFixed(3))
        set(`--c${k}-filter`, reduce ? 'none' : filterOf(12 * leave, 1 - 0.22 * leave))
      }

      // --- Scene 4: closing statement over the last photograph ---------
      const dStart = CAT_START + CATEGORIES.length * CAT_STEP
      const dIn = seg(p, dStart, dStart + 0.03)
      set('--d-opacity', dIn.toFixed(3))
      set('--d-scale', (1 + 0.06 * (1 - dIn) * motion + 0.05 * seg(p, dStart, 0.95) * motion).toFixed(4))
      const p2 = segmentInOut(p, dStart + 0.015, dStart + 0.045, 0.885, 0.915)
      set('--panel2-opacity', p2.toFixed(3))
      set('--panel2-y', `${((50 * (1 - seg(p, dStart + 0.015, dStart + 0.045)) - 70 * seg(p, 0.885, 0.915)) * (reduce ? 0 : 1)).toFixed(1)}px`)

      // --- Resolve to white, then the gallery flies in -----------------
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
  }, [runwayRef, stageRef, galleryRef, mode, reduce])
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

const WC: CSSProperties = { willChange: 'var(--wc)' as CSSProperties['willChange'] }

/** One photograph plane, driven entirely by CSS variables. */
function Plane({
  src,
  scale,
  y = '0px',
  ptr = 0,
  eager = false,
  alt = '',
}: {
  src: string
  scale: string
  y?: string
  ptr?: number
  eager?: boolean
  alt?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        ...WC,
        transform: `translate3d(calc(var(--ptr-x, 0) * ${ptr}px), calc(${y} + var(--ptr-y, 0) * ${ptr / 2}px), 0) scale(var(${scale}))`,
      }}
    />
  )
}

/**
 * A foreground crop that behaves like a separate print lifted off the
 * photograph: the frame and its image scale and rise together (clip-path
 * in local space, then transformed), so its edges stay clean while it
 * pulls away from the background at its own rate.
 */
function Crop({
  src,
  inset,
  scale,
  edge,
  y = '0px',
  ptr = 0,
  eager = false,
}: {
  src: string
  /** Window as [top, right, bottom, left] percentages. */
  inset: [number, number, number, number]
  scale: string
  /** CSS variable (0–1) fading in the print's hairline edge as it lifts. */
  edge: string
  y?: string
  ptr?: number
  eager?: boolean
}) {
  const [t, r, b, l] = inset
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        ...WC,
        transform: `translate3d(calc(var(--ptr-x, 0) * ${ptr}px), calc(${y} + var(--ptr-y, 0) * ${ptr / 2}px), 0) scale(var(${scale}))`,
      }}
    >
      <div className="absolute inset-0" style={{ clipPath: `inset(${t}% ${r}% ${b}% ${l}%)` }}>
        <img
          src={src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      {/* Hairline edge, so the lifted print reads as a deliberate layer. */}
      <div
        className="absolute border border-white/45"
        style={{ top: `${t}%`, right: `${r}%`, bottom: `${b}%`, left: `${l}%`, opacity: `var(${edge}, 0)` }}
      />
    </div>
  )
}

/**
 * The layered intro photograph: background, a mid window and a front
 * window onto the same frame. They start aligned (reading as one image)
 * and separate in depth as each plane scales and rises at its own rate.
 */
function IntroLayers({ layered }: { layered: boolean }) {
  return (
    <>
      <Plane src={INTRO_IMAGE} scale="--photo-bg-scale" y="var(--photo-bg-y)" ptr={6} eager />
      {layered && (
        <>
          {/* Background settles back as the prints lift off it. */}
          <div className="absolute inset-0 bg-black" style={{ opacity: 'var(--photo-bg-dim, 0)' }} />
          <Crop src={INTRO_IMAGE} inset={[14, 20, 14, 20]} scale="--photo-mid-scale" y="var(--photo-mid-y)" edge="--photo-edge" ptr={12} eager />
          <Crop src={INTRO_IMAGE} inset={[30, 34, 26, 36]} scale="--photo-front-scale" y="var(--photo-front-y)" edge="--photo-edge" ptr={20} eager />
        </>
      )}
      <div className="absolute inset-0 bg-black/20" />
    </>
  )
}

function SplitHalf({ side, layered }: { side: 'left' | 'right'; layered: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        ...WC,
        clipPath: side === 'left' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)',
        transform: `translate3d(var(${side === 'left' ? '--split-lx' : '--split-rx'}), var(--split-y), 0) scale(var(--split-scale))`,
        filter: 'var(--split-filter)',
        opacity: 'var(--split-opacity)',
      }}
    >
      <IntroLayers layered={layered} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Final gallery — native horizontal scrolling (swipe / trackpad / arrows),
// with three copies of the set so it loops seamlessly from the middle one.
// ---------------------------------------------------------------------------

const LOOP = [0, 1, 2].flatMap((copy) => GALLERY.map((item, i) => ({ ...item, i, copy })))

function Gallery({ galleryRef }: { galleryRef: RefObject<HTMLDivElement | null> }) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Jump silently back into the middle copy whenever scrolling settles
  // outside it; the frames are identical, so nothing visibly moves.
  const recentre = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const setW = el.scrollWidth / 3
    if (el.scrollLeft < setW * 0.5) el.scrollLeft += setW
    else if (el.scrollLeft >= setW * 1.5) el.scrollLeft -= setW
  }, [])

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const start = () => {
      el.scrollLeft = el.scrollWidth / 3
    }
    start()
    let timer = 0
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(recentre, 140)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(start) : null
    ro?.observe(el)
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
    }
  }, [recentre])

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
          Photography — selected frames
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous photographs"
            onClick={() => step(-1)}
            className="font-inter flex size-11 items-center justify-center rounded-full border border-black/15 text-[#111] transition-colors hover:border-black/40"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next photographs"
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
        {LOOP.map((item) => (
          <figure
            key={`${item.copy}-${item.i}`}
            data-gallery-card
            aria-hidden={item.copy !== 1 ? true : undefined}
            className="m-0 shrink-0"
            style={{ width: 'min(clamp(320px, 24vw, 480px), calc((100vh - 280px) * 0.8), 78vw)' }}
          >
            <div className="aspect-[4/5] overflow-hidden rounded-[20px] bg-neutral-100">
              <img
                src={item.image}
                alt={item.copy === 1 ? `${item.category}${item.name ? ` — ${item.name}` : ''}` : ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="font-inter mt-3 flex items-baseline gap-3 text-[11px] tracking-[0.12em] text-[rgba(17,17,17,0.55)] uppercase md:text-xs">
              <span>
                {pad(item.i + 1)} / {item.category}
              </span>
              {item.name && <span className="tracking-normal text-[#111] normal-case">{item.name}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function Photography() {
  const { mode, reduce } = useMode()
  const runwayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  usePhotographyEngine(runwayRef, stageRef, galleryRef, mode, reduce)

  const desktop = mode === 'desktop'
  const layered = desktop && !reduce

  return (
    <section aria-labelledby="photography-heading" className="bg-white">
      <div
        ref={runwayRef}
        className="relative"
        style={{ height: desktop ? 'calc(100vh + 3200px)' : 'calc(100vh + 2000px)' }}
      >
        <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden bg-[#111] [isolation:isolate]">
          {/* Scene 2 photograph, revealed beneath the split. */}
          <div
            className="absolute inset-0"
            style={{ ...WC, opacity: 'var(--b-opacity, 0)', filter: 'var(--b-filter)', transform: 'scale(var(--b-scale, 1.08))' }}
          >
            <img src={photo14} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </div>

          {/* Scene 1: the layered intro photograph, as two halves that split apart. */}
          <SplitHalf side="left" layered={layered} />
          <SplitHalf side="right" layered={layered} />

          {/* Scene 3: one discipline per sequence — full frame plus a tighter foreground crop. */}
          {CATEGORIES.map((cat, k) => (
            <div
              key={cat.label}
              className="absolute inset-0"
              style={{ ...WC, opacity: `var(--c${k}-opacity, 0)`, filter: `var(--c${k}-filter)` }}
            >
              <Plane src={cat.image} scale={`--c${k}-bg-scale`} ptr={desktop ? 6 : 0} alt={cat.label} />
              {layered && (
                <>
                  <div className="absolute inset-0 bg-black" style={{ opacity: `var(--c${k}-dim, 0)` }} />
                  <Crop src={cat.image} inset={[18, 28, 16, 28]} scale={`--c${k}-fg-scale`} edge={`--c${k}-edge`} ptr={18} />
                </>
              )}
              <div className="absolute inset-0 bg-black/15" />
              <p className="font-inter absolute bottom-[8vh] left-5 text-[11px] font-medium tracking-[0.12em] text-white/85 uppercase md:left-12 md:text-xs">
                {pad(k + 1)} / {cat.label}
              </p>
            </div>
          ))}

          {/* Scene 4: closing statement over the last photograph. */}
          <div
            className="absolute inset-0"
            style={{ ...WC, opacity: 'var(--d-opacity, 0)', transform: 'scale(var(--d-scale, 1))' }}
          >
            <img src={photo12} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </div>

          {/* Intro typography. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[1440px] px-5 pb-[10vh] md:px-12">
            <div
              style={{ ...WC, transform: 'translate3d(0, var(--title-y, 0), 0) scale(var(--title-scale, 1))', opacity: 'var(--title-opacity, 1)', transformOrigin: 'left bottom' }}
            >
              <p className="font-inter text-[11px] font-medium tracking-[0.14em] text-white/80 uppercase md:text-xs">
                Photography
              </p>
              <h2
                id="photography-heading"
                className="font-instrument mt-5 text-[clamp(52px,8vw,140px)] leading-[0.92] font-normal tracking-[-0.03em] text-white"
              >
                Images that do more
                <br />
                <em>than look good.</em>
              </h2>
            </div>
            <p
              className="font-inter mt-8 max-w-[420px] text-base leading-[1.45] text-white/80 md:text-lg"
              style={{ ...WC, transform: 'translate3d(0, var(--desc-y, 0), 0)', opacity: 'var(--desc-opacity, 1)' }}
            >
              We use photography to create atmosphere, character and a visual language people remember.
            </p>
          </div>

          {/* Story panel 1 — over the light photograph, so near-black type. */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full max-w-[1440px] items-center px-5 md:left-1/2 md:-translate-x-1/2 md:px-12"
            style={{ ...WC, opacity: 'var(--panel-opacity, 0)' }}
          >
            <div style={{ transform: 'translate3d(0, var(--panel-y, 0), 0)' }}>
              <p className="font-instrument text-[clamp(40px,5.4vw,92px)] leading-[0.95] tracking-[-0.03em] text-[#111]">
                Photography is
                <br />
                not decoration.
              </p>
              <p className="font-inter mt-6 max-w-[360px] text-base leading-[1.45] text-[rgba(17,17,17,0.7)] md:text-lg">
                It is how a brand learns to be seen.
              </p>
            </div>
          </div>

          {/* Story panel 2 — over the dark top of the last photograph. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-[16vh] z-20 mx-auto w-full max-w-[1440px] px-5 md:px-12"
            style={{ ...WC, opacity: 'var(--panel2-opacity, 0)' }}
          >
            <div style={{ transform: 'translate3d(0, var(--panel2-y, 0), 0)' }}>
              <p className="font-instrument text-[clamp(40px,5.4vw,92px)] leading-[0.95] tracking-[-0.03em] text-white">
                Every frame should carry
                <br />
                <em>the idea forward.</em>
              </p>
              <p className="font-inter mt-6 max-w-[420px] text-base leading-[1.45] text-white/75 md:text-lg">
                From campaign worlds to product detail, the concept remains the visual anchor.
              </p>
            </div>
          </div>

          {/* Resolve to the page's white before the gallery arrives. */}
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

export default Photography
