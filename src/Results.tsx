import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import photo9 from './Photo/Photo9.png'
import photo10 from './Photo/Photo10.png'
import photo11 from './Photo/Photo11.png'
import { clamp01, lerp, matches, phase, sample, smoothstep, write } from './lib/scrollMotion'

const results = [
  { image: photo9, stat: '+48%', label: 'Business Growth' },
  { image: photo10, stat: '1.5M', label: 'Audience Reach' },
  { image: photo11, stat: '+25%', label: 'Client Inquiries' },
]

type Result = (typeof results)[number]
const COUNT = results.length

// The cylinder holds two copies of the cards so there is always work
// curving away on both sides — the loop reads as endless. The second
// copy is decorative (hidden from assistive tech).
const RING = [...results, ...results]
const RING_SIZE = RING.length

// ---------------------------------------------------------------------------
// Mode: desktop/tablet coverflow, lighter phone variant, or the original
// static grid for reduced motion. Only one is ever rendered.
// ---------------------------------------------------------------------------

type Mode = 'coverflow' | 'mobile' | 'static'

const COVERFLOW_QUERY = '(min-width: 768px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function currentMode(): Mode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'static'
  if (matches(REDUCED_MOTION)) return 'static'
  return matches(COVERFLOW_QUERY) ? 'coverflow' : 'mobile'
}

function useMode() {
  const [mode, setMode] = useState<Mode>(currentMode)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const queries = [COVERFLOW_QUERY, REDUCED_MOTION].map((q) => window.matchMedia(q))
    const onChange = () => setMode(currentMode())
    queries.forEach((q) => q.addEventListener('change', onChange))
    return () => queries.forEach((q) => q.removeEventListener('change', onChange))
  }, [])

  return mode
}

// ---------------------------------------------------------------------------
// Cylinder profiles, sampled by distance (in cards) from the centre at
// 0 / 1 / 2. x is in card widths. Side cards turn to face the centre and
// sit behind it, like boards around the inside of a wide cylinder.
// ---------------------------------------------------------------------------

type Profile = {
  x: readonly number[]
  z: readonly number[]
  ry: readonly number[]
  s: readonly number[]
  o: readonly number[]
}

const DESKTOP_PROFILE: Profile = {
  x: [0, 0.95, 1.7],
  z: [240, 0, -180],
  ry: [0, 22, 38],
  s: [0.92, 0.84, 0.72],
  o: [1, 1, 0.65],
}

const MOBILE_PROFILE: Profile = {
  x: [0, 0.98, 1.8],
  z: [0, -60, -120],
  ry: [0, 10, 10],
  s: [1, 0.9, 0.8],
  o: [1, 1, 0],
}

// Normalised pinned progress (desktop).
const SEQ = {
  establish: [0.15, 0.25] as const,
  travel: [0.25, 0.85] as const,
  exit: [0.95, 1] as const,
}

const START = 1 // the middle card (02) starts in front, as in the original row

type Pose = { x: number; y: number; z: number; ry: number; s: number; o: number }

function mix(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a
  if (t >= 1) return b
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    ry: lerp(a.ry, b.ry, t),
    s: lerp(a.s, b.s, t),
    o: lerp(a.o, b.o, t),
  }
}

/** Offset of ring item i from the (fractional) active index, wrapped to [-3, 3). */
function ringOffset(i: number, active: number) {
  const raw = i - active
  return ((((raw + RING_SIZE / 2) % RING_SIZE) + RING_SIZE) % RING_SIZE) - RING_SIZE / 2
}

// ---------------------------------------------------------------------------
// Shared markup
// ---------------------------------------------------------------------------

function Header() {
  return (
    <>
      <span className="site-kicker flex w-fit max-w-full items-center justify-center gap-1 text-center whitespace-nowrap text-neutral-500">
        Results & Impact
        <sup className="text-[10px]">&reg;</sup>
      </span>

      <h2 className="site-display mt-4 flex w-full max-w-[760px] flex-col items-center text-center">
        <span className="text-neutral-500">How Brands Perform</span>
        <span className="text-neutral-900">With Brandworks</span>
      </h2>

      <p className="site-copy mt-5 w-full max-w-[760px] text-center text-neutral-600">
        See how brands work with BRANDWORKS to build stronger identities
        <br className="hidden sm:block" />
        reach wider audiences and create lasting impact.
      </p>
    </>
  )
}

function CardContent({ result }: { result: Result }) {
  return (
    <>
      <img
        data-media
        src={result.image}
        alt={result.label}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
      <div data-dim aria-hidden="true" className="absolute inset-0 bg-black opacity-0" />
      <div data-text className="absolute bottom-6 left-6 text-left">
        <div className="text-[22px] leading-[1.2] font-medium tracking-[-0.02em] text-white">{result.stat}</div>
        <div className="mt-1 text-[15px] leading-[1.4] font-normal text-white/90">{result.label}</div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// The coverflow loop: one requestAnimationFrame reads the (Lenis-smoothed)
// scroll position, eases its own copy of it and writes transforms directly.
// ---------------------------------------------------------------------------

type Els = {
  card: HTMLElement
  media: HTMLElement
  dim: HTMLElement
  text: HTMLElement
  cache: Record<string, string>
}

function useCoverflow(
  desktop: boolean,
  runwayRef: RefObject<HTMLDivElement | null>,
  sectionRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const runway = runwayRef.current
    const section = sectionRef.current
    if (!runway || !section) return

    const header = section.querySelector<HTMLElement>('[data-header]')
    const els: Els[] = Array.from(section.querySelectorAll<HTMLElement>('[data-card]')).map((card) => ({
      card,
      media: card.querySelector<HTMLElement>('[data-media]')!,
      dim: card.querySelector<HTMLElement>('[data-dim]')!,
      text: card.querySelector<HTMLElement>('[data-text]')!,
      cache: {},
    }))
    const profile = desktop ? DESKTOP_PROFILE : MOBILE_PROFILE
    const fineMouse = desktop && matches('(hover: hover) and (pointer: fine)')

    // ---- Layout metrics (re-read on resize / font load only) ----
    const m = { vw: 0, vh: 0, w: 0, h: 0, stageH: 0 }
    const measure = () => {
      m.vw = section.clientWidth
      m.vh = section.clientHeight
      const headerBottom = header ? header.offsetTop + header.offsetHeight : 0
      const stageTop = headerBottom + (desktop ? 56 : 32)
      m.stageH = Math.max(200, m.vh - stageTop)
      // Original card: 413 × 480, 16px radius.
      m.h = desktop ? Math.min(480, m.stageH - 40) : Math.min((m.vw * 0.72 * 480) / 413, m.stageH - 32)
      m.w = (m.h * 413) / 480
      section.style.setProperty('--stage-top', `${stageTop}px`)
      section.style.setProperty('--cw', `${m.w}px`)
      section.style.setProperty('--ch', `${m.h}px`)
      for (const e of els) e.cache = {}
    }

    // Cards hang from the top of the stage, exactly where the original
    // row sat under the paragraph.
    const rowY = () => -m.stageH / 2 + m.h / 2 + (desktop ? 0 : 8)

    const gridPose = (i: number): Pose => ({
      x: (i - START) * (m.w + 24),
      y: rowY(),
      z: 0,
      ry: 0,
      s: 1,
      o: i < COUNT ? 1 : 0,
    })

    const cylinderPose = (offset: number): Pose => {
      const d = Math.abs(offset)
      const sign = offset < 0 ? -1 : 1
      // Beyond the outer step, fade out well before the wrap point (±3)
      // so a card never visibly jumps from one side to the other.
      const o = d <= 2 ? sample(profile.o, d) : lerp(profile.o[2], 0, smoothstep(clamp01((d - 2) / 0.6)))
      return {
        x: sign * sample(profile.x, d) * m.w,
        y: rowY(),
        z: sample(profile.z, d),
        ry: -sign * sample(profile.ry, d),
        s: sample(profile.s, d),
        o,
      }
    }

    // ---- Input state ----
    let target = 0
    let current = 0
    let initialised = false
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 }
    const shared: Record<string, string> = {}

    const onPointer = (ev: PointerEvent) => {
      mouse.tx = (ev.clientX / window.innerWidth) * 2 - 1
      mouse.ty = (ev.clientY / window.innerHeight) * 2 - 1
    }
    const resetPointer = () => {
      mouse.tx = 0
      mouse.ty = 0
    }
    if (fineMouse) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.documentElement.addEventListener('mouseleave', resetPointer)
      window.addEventListener('blur', resetPointer)
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(section)
    if (header) ro?.observe(header)
    let alive = true
    document.fonts?.ready.then(() => alive && measure())

    let raf = 0
    let last = performance.now()

    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min(64, now - last)
      last = now
      // 0.075 per 60fps frame, frame-rate independent.
      const k = 1 - Math.pow(1 - 0.075, dt / 16.67)

      const rect = runway.getBoundingClientRect()
      const travel = rect.height - m.vh
      target = travel > 0 ? clamp01(-rect.top / travel) : 0
      if (!initialised) {
        current = target
        initialised = true
      }

      const near = rect.bottom > -m.vh && rect.top < m.vh * 2
      if (!near) {
        if (shared.wc !== 'auto') {
          shared.wc = 'auto'
          for (const e of els) e.card.style.willChange = 'auto'
        }
        current = target
        return
      }
      if (shared.wc !== 'transform') {
        shared.wc = 'transform'
        for (const e of els) e.card.style.willChange = 'transform'
      }

      current += (target - current) * k
      if (Math.abs(target - current) < 0.00005) current = target
      mouse.x += (mouse.tx - mouse.x) * 0.08
      mouse.y += (mouse.ty - mouse.y) * 0.08

      const p = current
      const open = desktop ? phase(p, SEQ.establish[0], SEQ.establish[1]) : 1
      const travelT = desktop
        ? clamp01((p - SEQ.travel[0]) / (SEQ.travel[1] - SEQ.travel[0]))
        : clamp01((p - 0.05) / 0.85)
      // One full turn of the three projects: 02 → 03 → 01 → 02.
      const active = START + travelT * COUNT
      const exit = desktop ? phase(p, SEQ.exit[0], SEQ.exit[1]) : 0

      for (let i = 0; i < els.length; i++) {
        const e = els[i]
        const offset = ringOffset(i, active)
        let pose = cylinderPose(offset)
        if (open < 1) pose = mix(gridPose(i), pose, open)

        // Exit: the cylinder gently flattens as the section releases.
        let { z, ry } = pose
        z *= 1 - exit
        ry *= 1 - exit
        const s = pose.s * (1 - 0.04 * exit)

        // How close this card is to the front (drives focus and tilt).
        const centre = Math.max(0, 1 - Math.abs(offset)) * open
        let rx = 0
        if (fineMouse) {
          const tilt = centre * (1 - exit)
          ry += mouse.x * 4 * tilt
          rx = -mouse.y * 3 * tilt
        }

        const hidden = pose.o <= 0.01
        write(e.card, e.cache, 'v', 'visibility', hidden ? 'hidden' : 'visible')
        if (hidden) continue
        write(
          e.card,
          e.cache,
          't',
          'transform',
          `translate3d(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${s.toFixed(4)})`,
        )
        write(e.card, e.cache, 'o', 'opacity', pose.o >= 0.999 ? '1' : pose.o.toFixed(3))

        // Focus: side cards sit a little darker and their figures recede.
        write(e.dim, e.cache, 'd', 'opacity', ((1 - centre) * 0.2 * open).toFixed(3))
        write(e.text, e.cache, 'tx', 'opacity', lerp(1, 0.55 + 0.45 * centre, open).toFixed(3))

        // Image drifts against the card's travel (≤ ~4.5%, inside a 110% cover).
        const drift = Math.max(-1.5, Math.min(1.5, offset)) * 3 * open
        write(
          e.media,
          e.cache,
          'm',
          'transform',
          `translate3d(${(-drift).toFixed(2)}%, 0, 0) scale(${lerp(1, 1.1, open).toFixed(4)})`,
        )
      }
    }

    // First pose synchronously, so cards never paint unplaced.
    render(performance.now())

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      if (fineMouse) {
        window.removeEventListener('pointermove', onPointer)
        document.documentElement.removeEventListener('mouseleave', resetPointer)
        window.removeEventListener('blur', resetPointer)
      }
    }
  }, [desktop, runwayRef, sectionRef])
}

function ResultsCoverflow({ desktop }: { desktop: boolean }) {
  const runwayRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  useCoverflow(desktop, runwayRef, sectionRef)

  return (
    // Runway: its height is the pinned scroll distance.
    <div ref={runwayRef} className={desktop ? 'relative h-[240vh] lg:h-[280vh]' : 'relative h-[200vh]'}>
      <section ref={sectionRef} className="sticky top-0 h-screen overflow-hidden bg-white">
        <div
          data-header
          className={`mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 text-center ${
            desktop ? 'pt-20' : 'pt-16'
          }`}
        >
          <Header />
        </div>

        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: 'var(--stage-top)', perspective: '1300px' }}
        >
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {RING.map((result, i) => (
              <div
                key={`${result.label}-${i}`}
                data-card
                aria-hidden={i >= COUNT ? true : undefined}
                className="absolute top-1/2 left-1/2 overflow-hidden rounded-[16px]"
                style={{
                  width: 'var(--cw)',
                  height: 'var(--ch)',
                  marginLeft: 'calc(var(--cw) / -2)',
                  marginTop: 'calc(var(--ch) / -2)',
                }}
              >
                <CardContent result={result} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reduced motion: the original section, unchanged.
// ---------------------------------------------------------------------------

function ResultsStatic() {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 py-20 text-center">
      <Header />

      <div className="mt-14 grid w-full grid-cols-1 gap-6 opacity-100 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <div
            key={result.label}
            style={{
              maxWidth: '413px',
              aspectRatio: '413 / 480',
              transform: 'rotate(0deg)',
              opacity: 1,
              borderRadius: '16px',
            }}
            className="relative mx-auto w-full overflow-hidden"
          >
            <CardContent result={result} />
          </div>
        ))}
      </div>
    </section>
  )
}

function Results() {
  const mode = useMode()
  if (mode === 'static') return <ResultsStatic />
  return <ResultsCoverflow key={mode} desktop={mode === 'coverflow'} />
}

export default Results
