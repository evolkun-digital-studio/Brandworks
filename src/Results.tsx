import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import photo9 from './Photo/Photo9.png'
import photo10 from './Photo/Photo10.png'
import photo11 from './Photo/Photo11.png'
import { clamp01, lerp, matches, sample, smoothstep, write } from './lib/scrollMotion'
const results = [
  {
    image: photo9,
    stat: 'Visibility',
    label: 'How often and where the brand is being discovered.',
  },
  {
    image: photo10,
    stat: 'Engagement',
    label: 'How audiences respond to content and campaigns.',
  },
  {
    image: photo11,
    stat: 'Search',
    label: 'Rankings, demand, traffic and search presence.',
  },
  {
    image: photo9,
    stat: 'Reputation',
    label: 'What appears around the brand and the people behind it.',
  },
  {
    image: photo10,
    stat: 'Performance',
    label: 'Leads, conversions and campaign efficiency.',
  },
]
type Result = (typeof results)[number]
const COUNT = results.length
// Duplicate the cards so the coverflow can wrap without a visible gap.
const RING = [...results, ...results]
const RING_SIZE = RING.length
type Mode = 'coverflow' | 'mobile' | 'static'
const COVERFLOW_QUERY = '(min-width: 900px) and (min-height: 620px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
function currentMode(): Mode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'static'
  }
  if (matches(REDUCED_MOTION)) return 'static'
  return matches(COVERFLOW_QUERY) ? 'coverflow' : 'mobile'
}
function useMode() {
  const [mode, setMode] = useState<Mode>(currentMode)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const queries = [COVERFLOW_QUERY, REDUCED_MOTION].map((query) =>
      window.matchMedia(query),
    )
    const onChange = () => setMode(currentMode())
    queries.forEach((query) => query.addEventListener('change', onChange))
    return () => {
      queries.forEach((query) => query.removeEventListener('change', onChange))
    }
  }, [])
  return mode
}
type Profile = {
  x: readonly number[]
  z: readonly number[]
  ry: readonly number[]
  s: readonly number[]
  o: readonly number[]
}
// Profiles are intentionally tuned per device width. This prevents the
// desktop cylinder from feeling cramped on tablets or oversized on laptops.
const WIDE_PROFILE: Profile = {
  x: [0, 1.02, 1.82],
  z: [280, 0, -220],
  ry: [0, 24, 40],
  s: [0.93, 0.84, 0.7],
  o: [1, 1, 0.62],
}
const DESKTOP_PROFILE: Profile = {
  x: [0, 0.96, 1.7],
  z: [240, 0, -180],
  ry: [0, 22, 38],
  s: [0.94, 0.84, 0.72],
  o: [1, 1, 0.6],
}
const LAPTOP_PROFILE: Profile = {
  x: [0, 0.9, 1.58],
  z: [190, -10, -155],
  ry: [0, 19, 32],
  s: [0.96, 0.85, 0.74],
  o: [1, 0.98, 0.52],
}
const TABLET_PROFILE: Profile = {
  x: [0, 0.84, 1.47],
  z: [130, -20, -125],
  ry: [0, 15, 26],
  s: [0.98, 0.87, 0.76],
  o: [1, 0.94, 0.35],
}
const MOBILE_PROFILE: Profile = {
  x: [0, 0.8, 1.42],
  z: [0, -45, -100],
  ry: [0, 8, 12],
  s: [1, 0.9, 0.8],
  o: [1, 0.84, 0],
}
const START = 1
type Pose = {
  x: number
  y: number
  z: number
  ry: number
  s: number
  o: number
}
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
function ringOffset(index: number, active: number) {
  const raw = index - active
  return (
    ((((raw + RING_SIZE / 2) % RING_SIZE) + RING_SIZE) % RING_SIZE) -
    RING_SIZE / 2
  )
}
function Header() {
  return (
    <>
      <h2 className="site-display mt-2 w-full max-w-[900px] text-balance text-center text-[clamp(2.25rem,10vw,4.75rem)] font-normal leading-[0.94] tracking-[-0.045em] text-neutral-950 sm:mt-3 sm:text-[clamp(2.75rem,7.5vw,4.75rem)] md:text-[clamp(3rem,5.5vw,4.75rem)] lg:text-[clamp(3.25rem,4.5vw,4.75rem)]">
        What we measure.
      </h2>
      <p className="site-copy mt-3 w-full max-w-[620px] px-2 text-center text-[13px] leading-[1.55] text-neutral-600 sm:mt-4 sm:max-w-[680px] sm:px-0 sm:text-[14px] md:text-[15px] lg:text-[16px]">
        Depending on the engagement:
      </p>
      <p className="mt-2 w-full max-w-[620px] px-2 text-center text-[11px] font-normal leading-[1.45] tracking-[-0.01em] text-neutral-500 sm:max-w-[680px] sm:px-0 sm:text-[12px] md:mt-2.5 md:text-[13px]">
        Different work requires different measures.
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
        className="absolute inset-0 h-full w-full object-cover [backface-visibility:hidden] will-change-transform"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
      <div
        data-dim
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black opacity-0 will-change-opacity"
      />
      <div
        data-text
        className="absolute bottom-[clamp(16px,4vw,28px)] left-[clamp(16px,4vw,28px)] right-[clamp(16px,4vw,28px)] text-left will-change-opacity"
      >
        <div className="text-[clamp(20px,5.2vw,24px)] font-medium leading-[1.12] tracking-[-0.03em] text-white sm:text-[clamp(21px,3vw,25px)]">
          {result.stat}
        </div>
        <div className="mt-1.5 max-w-[30ch] text-[clamp(12px,3.5vw,15px)] font-normal leading-[1.45] text-white/90 sm:mt-2 sm:text-[clamp(13px,1.6vw,15px)]">
          {result.label}
        </div>
      </div>
    </>
  )
}
type Els = {
  card: HTMLElement
  media: HTMLElement
  dim: HTMLElement
  text: HTMLElement
  cache: Record<string, string>
}
function useCoverflow(
  mobileMode: boolean,
  runwayRef: RefObject<HTMLDivElement | null>,
  sectionRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const runway = runwayRef.current
    const section = sectionRef.current
    if (!runway || !section) return
    const header = section.querySelector<HTMLElement>('[data-header]')
    const els: Els[] = Array.from(
      section.querySelectorAll<HTMLElement>('[data-card]'),
    ).map((card) => ({
      card,
      media: card.querySelector<HTMLElement>('[data-media]')!,
      dim: card.querySelector<HTMLElement>('[data-dim]')!,
      text: card.querySelector<HTMLElement>('[data-text]')!,
      cache: {},
    }))
    const m = {
      vw: 0,
      vh: 0,
      w: 0,
      h: 0,
      stageH: 0,
      stageTop: 0,
      tier: 'mobile' as 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide',
    }
    const profileForWidth = (): Profile => {
      if (mobileMode || m.vw < 768) return MOBILE_PROFILE
      if (m.vw < 1024) return TABLET_PROFILE
      if (m.vw < 1280) return LAPTOP_PROFILE
      if (m.vw < 1600) return DESKTOP_PROFILE
      return WIDE_PROFILE
    }
    const measure = () => {
      m.vw = section.clientWidth
      m.vh = section.clientHeight
      if (mobileMode || m.vw < 768) m.tier = 'mobile'
      else if (m.vw < 1024) m.tier = 'tablet'
      else if (m.vw < 1280) m.tier = 'laptop'
      else if (m.vw < 1600) m.tier = 'desktop'
      else m.tier = 'wide'
      const headerBottom = header ? header.offsetTop + header.offsetHeight : 0
      const stageGap =
        m.tier === 'mobile'
          ? 16
          : m.tier === 'tablet'
            ? 24
            : m.tier === 'laptop'
              ? 32
              : 40
      m.stageTop = headerBottom + stageGap
      m.stageH = Math.max(220, m.vh - m.stageTop)
      const ratio = 413 / 480
      if (m.tier === 'mobile') {
        const gutter = m.vw < 390 ? 24 : 32
        const width = Math.min(Math.max(250, m.vw - gutter), 380)
        const heightFromWidth = width / ratio
        m.h = Math.min(heightFromWidth, m.stageH * 0.86)
      } else if (m.tier === 'tablet') {
        const width = Math.min(m.vw * 0.44, 390)
        const heightFromWidth = width / ratio
        m.h = Math.min(heightFromWidth, m.stageH * 0.8, 455)
      } else if (m.tier === 'laptop') {
        m.h = Math.min(470, m.stageH * 0.79, m.vw * 0.43)
      } else if (m.tier === 'desktop') {
        m.h = Math.min(505, m.stageH * 0.81)
      } else {
        m.h = Math.min(540, m.stageH * 0.83)
      }
      const minHeight = m.tier === 'mobile' ? 250 : 320
      const stageCap = Math.max(220, m.stageH * (m.tier === 'mobile' ? 0.9 : 0.86))
      m.h = Math.min(Math.max(minHeight, m.h), stageCap)
      m.w = m.h * ratio
      section.style.setProperty('--stage-top', `${m.stageTop}px`)
      section.style.setProperty('--cw', `${m.w}px`)
      section.style.setProperty('--ch', `${m.h}px`)
      for (const e of els) e.cache = {}
    }
    const rowY = () => {
      const lift =
        m.tier === 'mobile'
          ? 4
          : m.tier === 'tablet'
            ? 2
            : 0
      return -m.stageH / 2 + m.h / 2 + lift
    }
    const gridGap = () => {
      if (m.tier === 'tablet') return 18
      if (m.tier === 'laptop') return 22
      return 24
    }
    const gridPose = (index: number): Pose => ({
      x: (index - START) * (m.w + gridGap()),
      y: rowY(),
      z: 0,
      ry: 0,
      s: 1,
      o: index < COUNT ? 1 : 0,
    })
    const cylinderPose = (offset: number): Pose => {
      const profile = profileForWidth()
      const distance = Math.abs(offset)
      const sign = offset < 0 ? -1 : 1
      const opacity =
        distance <= 2
          ? sample(profile.o, distance)
          : lerp(
              profile.o[2],
              0,
              smoothstep(clamp01((distance - 2) / 0.6)),
            )
      return {
        x: sign * sample(profile.x, distance) * m.w,
        y: rowY(),
        z: sample(profile.z, distance),
        ry: -sign * sample(profile.ry, distance),
        s: sample(profile.s, distance),
        o: opacity,
      }
    }
    const fineMouse =
      !mobileMode && matches('(hover: hover) and (pointer: fine)')
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 }
    const shared: Record<string, string> = {}
    const onPointer = (event: PointerEvent) => {
      mouse.tx = (event.clientX / window.innerWidth) * 2 - 1
      mouse.ty = (event.clientY / window.innerHeight) * 2 - 1
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
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null
    ro?.observe(section)
    if (header) ro?.observe(header)
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) measure()
    })
    let target = 0
    let current = 0
    let initialised = false
    let raf = 0
    let last = performance.now()
    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min(48, now - last)
      last = now
      const rect = runway.getBoundingClientRect()
      const travel = Math.max(1, rect.height - m.vh)
      target = clamp01(-rect.top / travel)
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
        for (const e of els) e.card.style.willChange = 'transform, opacity'
      }
      // Faster than the old 0.075 damping, but still eased enough to hide
      // wheel/trackpad steps. This is frame-rate independent.
      const followRate = mobileMode ? 13.5 : m.tier === 'tablet' ? 11.5 : 10.5
      const follow = 1 - Math.exp((-followRate * dt) / 1000)
      current += (target - current) * follow
      if (Math.abs(target - current) < 0.00004) current = target
      const mouseFollow = 1 - Math.exp((-10 * dt) / 1000)
      mouse.x += (mouse.tx - mouse.x) * mouseFollow
      mouse.y += (mouse.ty - mouse.y) * mouseFollow
      const p = current
      const establishStart = mobileMode ? 0 : 0.1
      const establishEnd = mobileMode ? 0 : 0.2
      const travelStart = mobileMode ? 0.04 : 0.2
      const travelEnd = mobileMode ? 0.92 : 0.88
      const exitStart = mobileMode ? 0.97 : 0.94
      const open = mobileMode
        ? 1
        : smoothstep(
            clamp01(
              (p - establishStart) /
                Math.max(0.0001, establishEnd - establishStart),
            ),
          )
      const travelT = smoothstep(
        clamp01(
          (p - travelStart) /
            Math.max(0.0001, travelEnd - travelStart),
        ),
      )
      const active = START + travelT * COUNT
      const exit = mobileMode
        ? 0
        : smoothstep(
            clamp01((p - exitStart) / Math.max(0.0001, 1 - exitStart)),
          )
      for (let i = 0; i < els.length; i++) {
        const e = els[i]
        const offset = ringOffset(i, active)
        let pose = cylinderPose(offset)
        if (open < 1) pose = mix(gridPose(i), pose, open)
        let { z, ry } = pose
        // Gentle flatten at the end so the section releases without a snap.
        z *= 1 - exit
        ry *= 1 - exit
        const exitScale = lerp(1, 0.975, exit)
        const scale = pose.s * exitScale
        const centre = Math.max(0, 1 - Math.abs(offset)) * open
        let rx = 0
        if (fineMouse) {
          const tilt = centre * (1 - exit)
          const pointerStrength = m.tier === 'tablet' ? 0 : m.tier === 'laptop' ? 0.7 : 1
          ry += mouse.x * 3.5 * tilt * pointerStrength
          rx = -mouse.y * 2.6 * tilt * pointerStrength
        }
        const hidden = pose.o <= 0.01
        write(
          e.card,
          e.cache,
          'v',
          'visibility',
          hidden ? 'hidden' : 'visible',
        )
        if (hidden) continue
        write(
          e.card,
          e.cache,
          't',
          'transform',
          `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${scale.toFixed(5)})`,
        )
        write(
          e.card,
          e.cache,
          'o',
          'opacity',
          pose.o >= 0.999 ? '1' : pose.o.toFixed(3),
        )
        const dimStrength = m.tier === 'mobile' ? 0.12 : 0.18
        write(
          e.dim,
          e.cache,
          'd',
          'opacity',
          ((1 - centre) * dimStrength * open).toFixed(3),
        )
        write(
          e.text,
          e.cache,
          'tx',
          'opacity',
          lerp(1, 0.62 + 0.38 * centre, open).toFixed(3),
        )
        const driftStrength =
          m.tier === 'mobile' ? 1.4 : m.tier === 'tablet' ? 2 : 2.6
        const drift =
          Math.max(-1.5, Math.min(1.5, offset)) * driftStrength * open
        write(
          e.media,
          e.cache,
          'm',
          'transform',
          `translate3d(${(-drift).toFixed(3)}%, 0, 0) scale(${lerp(1, 1.075, open).toFixed(4)})`,
        )
      }
    }
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
  }, [mobileMode, runwayRef, sectionRef])
}
function ResultsCoverflow({ mobileMode }: { mobileMode: boolean }) {
  const runwayRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  useCoverflow(mobileMode, runwayRef, sectionRef)
  return (
    <div
      ref={runwayRef}
      className={
        mobileMode
          ? 'relative h-[280svh] sm:h-[300svh]'
          : 'relative h-[310vh] lg:h-[340vh] xl:h-[360vh] 2xl:h-[380vh]'
      }
    >
      <section
        ref={sectionRef}
        aria-label="BrandWorks results"
        className="sticky top-0 h-svh min-h-[520px] overflow-hidden bg-white sm:min-h-[580px] md:min-h-[620px] lg:min-h-[640px]"
      >
        <div
          data-header
          className="mx-auto flex w-full max-w-[1320px] flex-col items-center px-4 pt-[clamp(28px,5svh,72px)] text-center sm:px-6 sm:pt-[clamp(34px,6svh,78px)] md:px-8 lg:pt-[clamp(42px,7svh,86px)]"
        >
          <Header />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 overflow-visible"
          style={{
            top: 'var(--stage-top)',
            perspective: mobileMode ? '900px' : '1300px',
          }}
        >
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {RING.map((result, index) => (
              <div
                key={`${result.label}-${index}`}
                data-card
                aria-hidden={index >= COUNT ? true : undefined}
                className="absolute left-1/2 top-1/2 overflow-hidden rounded-[12px] [backface-visibility:hidden] [transform-style:preserve-3d] sm:rounded-[14px] lg:rounded-[16px]"
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
function ResultsStatic() {
  return (
    <section className="mx-auto flex w-full max-w-[1320px] flex-col items-center bg-white px-4 py-14 text-center sm:px-6 sm:py-20 md:py-20 lg:px-8 lg:py-24">
      <Header />
      <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 md:mt-12 lg:mt-14 lg:grid-cols-3 lg:gap-6">
        {results.map((result) => (
          <div
            key={result.label}
            className="relative mx-auto aspect-[413/480] w-full max-w-[380px] overflow-hidden rounded-[12px] sm:max-w-[413px] sm:rounded-[14px] lg:rounded-[16px]"
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
  return (
    <ResultsCoverflow
      key={mode}
      mobileMode={mode === 'mobile'}
    />
  )
}
export default Results
