import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { CodeXml, Lightbulb, PenTool, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './WebProcessCards.css'

/*
 * Web Design & Dev process cards: Strategy → Design → Build → Launch.
 *
 *   cluster  (≥1024px) a hand-placed zig-zag in the empty left of the slide,
 *            joined by a gradient connector. A glowing dot walks the line
 *            and lifts each card in turn (4 × 0.8s, inside the 4s autoplay).
 *            It scales itself down to stay clear of the Development panel.
 *   row      (<1024px) the same cards as a swipe row under the subtext.
 *
 * Each card opens to a few bullets; one at a time. While one is open the
 * hero autoplay holds (data-hero-lock, read by Hero.tsx); hovering holds it
 * through data-hero-hold like the rest of the slide.
 */

type Step = {
  id: string
  title: string
  text: string
  Icon: LucideIcon
  from: string
  to: string
  /** RGB of the darker stop, for tinted shadows. */
  rgb: string
  bullets: string[]
  tilt: number
  /** Cluster position, in the cluster's own 348 × 438 space. */
  x: number
  y: number
}

const STEPS: Step[] = [
  {
    id: 'strategy', title: 'Strategy', text: 'Ideas that create real impact.', Icon: Lightbulb,
    from: '#38BDF8', to: '#2563EB', rgb: '37, 99, 235',
    bullets: ['Discovery & goals', 'User research', 'Site map'], tilt: -3, x: 100, y: 0,
  },
  {
    id: 'design', title: 'Design', text: 'Clear, intentional and human.', Icon: PenTool,
    from: '#FF8A80', to: '#F43F5E', rgb: '244, 63, 94',
    bullets: ['Wireframes', 'UI design', 'Prototype'], tilt: 2, x: 0, y: 114,
  },
  {
    id: 'build', title: 'Build', text: 'Scalable digital experiences.', Icon: CodeXml,
    from: '#2DD4BF', to: '#0F766E', rgb: '15, 118, 110',
    bullets: ['Next.js / Shopify / Webflow', 'Responsive', 'SEO-ready'], tilt: -2, x: 104, y: 228,
  },
  {
    id: 'launch', title: 'Launch', text: 'Products people love to use.', Icon: Rocket,
    from: '#FBBF24', to: '#F97316', rgb: '249, 115, 22',
    bullets: ['Testing & QA', 'Go-live', 'Support & growth'], tilt: 3, x: 36, y: 342,
  },
]

const CLUSTER_W = 348
const CLUSTER_H = 438
// Below this the cluster's type gets too small; the row takes over.
const MIN_SCALE = 0.62

// Where the connector meets each card: outside edges, alternating sides.
const ANCHORS: [number, number][] = [[86, 40], [258, 158], [90, 268], [294, 382]]
// One cubic per gap, so the walking dot can find each card's point exactly.
const SEGMENTS = [
  'M86 40C42 92 286 96 258 158',
  'M258 158C314 208 44 214 90 268',
  'M90 268C34 330 316 322 294 382',
]
const LINE = `${SEGMENTS[0]}${SEGMENTS[1].replace(/^M[\d.]+ [\d.]+/, '')}${SEGMENTS[2].replace(/^M[\d.]+ [\d.]+/, '')}`

// Faint dot-grid patches beside the cards.
const PATCHES = [
  { left: 14, top: 18, width: 60, height: 52 },
  { left: 8, top: 300, width: 56, height: 44 },
  { left: 300, top: 392, width: 44, height: 44 },
]

// Walking-dot timing: each card holds 0.8s; the dot spends the last 0.45s
// of that walking to the next one.
const STEP_MS = 800
const WALK_MS = 450
const START_MS = 500
const REST_MS = 400

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)

type Props = {
  variant: 'cluster' | 'row'
  active: boolean
  playing: boolean
  reducedMotion: boolean
}

function WebProcessCards({ variant, active, playing, reducedMotion }: Props) {
  const cluster = variant === 'cluster'
  const rootRef = useRef<HTMLDivElement>(null)
  const segRefs = useRef<(SVGPathElement | null)[]>([])
  const walkerRef = useRef<SVGCircleElement>(null)
  const baseId = useId()
  const [shown, setShown] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [step, setStep] = useState<number | null>(null)

  // Enter each time the slide comes up (a frame late, so the transitions
  // run from the hidden state); leave, closed, when it goes.
  useEffect(() => {
    if (!active) {
      setShown(false)
      setOpen(null)
      setStep(null)
      return
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setShown(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [active])

  // Cluster only: scale down until it clears every panel beside it
  // (Development, Responsive, ...) and fits the hero's height. The CSS sets
  // the ceiling (1 / .9 / .85 by width).
  useEffect(() => {
    if (!cluster) return
    const root = rootRef.current
    const hero = root?.closest<HTMLElement>('.web-hero')
    if (!root || !hero) return
    const host = hero.closest<HTMLElement>('.hero')
    const fit = () => {
      // Measure in the cluster layout; the row fallback is decided below.
      host?.removeAttribute('data-web-steps')
      if (getComputedStyle(root).display === 'none') return
      const max = parseFloat(getComputedStyle(root).getPropertyValue('--wps-max')) || 1
      const left = root.offsetLeft
      const middle = root.offsetTop
      const box = hero.getBoundingClientRect()
      const height = Math.min(max, (hero.clientHeight - 200) / CLUSTER_H)
      let scale = height
      hero.querySelectorAll<HTMLElement>('.wd-card').forEach((panel) => {
        if (!panel.offsetParent) return
        // The panel's layout box, without its parallax / drag translate.
        const r = panel.getBoundingClientRect()
        const m = new DOMMatrixReadOnly(getComputedStyle(panel).transform)
        const top = r.top - m.m42 - box.top, bottom = r.bottom - m.m42 - box.top
        const half = (CLUSTER_H * height) / 2
        if (bottom < middle - half || top > middle + half) return
        scale = Math.min(scale, (r.left - m.m41 - box.left - 28 - left) / CLUSTER_W)
      })
      const fitted = Math.round(scale * 1000) / 1000
      root.style.setProperty('--wps-scale', String(Math.max(MIN_SCALE, fitted)))
      // Too small to read: use the row under the copy instead.
      if (fitted < MIN_SCALE) host?.setAttribute('data-web-steps', 'row')
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(hero)
    return () => {
      observer.disconnect()
      host?.removeAttribute('data-web-steps')
    }
  }, [cluster, active])

  // The walking dot (cluster, while the slide plays).
  useEffect(() => {
    const walker = walkerRef.current
    const segs = segRefs.current
    if (!cluster || !shown || !playing || reducedMotion || !walker || segs.some((s) => !s)) return
    const lengths = segs.map((s) => s!.getTotalLength())
    const cycle = STEPS.length * STEP_MS + REST_MS
    const t0 = performance.now() + START_MS
    let current: number | null = null
    let frame = 0
    const place = (x: number, y: number) => {
      walker.setAttribute('cx', String(x))
      walker.setAttribute('cy', String(y))
    }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const t = now - t0
      const k = t < 0 ? -1 : t % cycle
      const i = k < 0 || k >= STEPS.length * STEP_MS ? null : Math.floor(k / STEP_MS)
      if (i !== current) { current = i; setStep(i) }
      walker.style.opacity = i === null ? '0' : '1'
      if (i === null) return
      walker.style.setProperty('--wps-glow', STEPS[i].to)
      const into = k - i * STEP_MS - (STEP_MS - WALK_MS)
      if (into <= 0 || i === STEPS.length - 1) { place(...ANCHORS[i]); return }
      const p = segs[i]!.getPointAtLength(lengths[i] * easeInOut(into / WALK_MS))
      place(p.x, p.y)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); setStep(null); walker.style.opacity = '0' }
  }, [cluster, shown, playing, reducedMotion])

  // Hover: the card leans toward the pointer (±6°).
  const lean = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse') return
    const el = event.currentTarget, r = el.getBoundingClientRect()
    const x = (event.clientX - r.left) / r.width - 0.5, y = (event.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`)
  }
  const unlean = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.removeProperty('--rx')
    event.currentTarget.style.removeProperty('--ry')
  }

  const cards = STEPS.map((s, i) => {
    const isOpen = open === i
    const moreId = `${baseId}-${s.id}`
    const vars = {
      // The row sits straight; only the cluster is hand-placed.
      '--i': i, '--x': `${s.x}px`, '--y': `${s.y}px`, '--tilt': `${cluster ? s.tilt : 0}deg`,
      '--c1': s.from, '--c2': s.to, '--rgb': s.rgb, '--bob': `${4 + (i % 2) * 0.6 + i * 0.15}s`, '--bob-delay': `${-i * 1.1}s`,
    } as CSSProperties
    return (
      <li key={s.id} className={`wps-slot ${isOpen ? 'is-open' : ''} ${hovered === i ? 'is-hover' : ''}`} style={vars}>
        <div className="wps-float">
          <div
            className={`wps-card ${isOpen ? 'is-open' : ''} ${step === i ? 'is-step' : ''}`}
            onClick={() => setOpen(isOpen ? null : i)}
            onPointerEnter={() => setHovered(i)}
            onPointerMove={lean}
            onPointerLeave={(e) => { unlean(e); setHovered(null) }}
          >
            <button type="button" className="wps-card__head" aria-expanded={isOpen} aria-controls={moreId}>
              <span className="wps-badge" aria-hidden="true"><s.Icon size={20} strokeWidth={2} /></span>
              <span className="wps-copy">
                <span className="wps-title">{s.title}</span>
                <span className="wps-text">{s.text}</span>
              </span>
            </button>
            <div id={moreId} className="wps-more">
              <ul className="wps-more__list">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </li>
    )
  })

  const lock = active && open !== null ? '' : undefined

  if (!cluster) {
    return (
      <div ref={rootRef} className={`wps wps--row ${shown ? 'is-shown' : ''}`} data-hero-hold data-hero-steps data-hero-lock={lock}>
        <ul className="wps-list" aria-label="How we work">{cards}</ul>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={`wps wps--cluster ${shown ? 'is-shown' : ''}`} data-hero-hold data-hero-lock={lock}>
      {PATCHES.map((p, i) => <span key={i} className="wps-patch" style={p} aria-hidden="true" />)}
      <svg className="wps-line" viewBox={`0 0 ${CLUSTER_W} ${CLUSTER_H}`} width={CLUSTER_W} height={CLUSTER_H} aria-hidden="true">
        <defs>
          <linearGradient id={`${baseId}-g`} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="382">
            {STEPS.map((s, i) => <stop key={s.id} offset={i / (STEPS.length - 1)} stopColor={s.to} />)}
          </linearGradient>
        </defs>
        <path className="wps-line__path" d={LINE} pathLength={1} stroke={`url(#${baseId}-g)`} />
        {SEGMENTS.map((d, i) => (
          <path key={d} ref={(el) => { segRefs.current[i] = el }} d={d} fill="none" stroke="none" />
        ))}
        {ANCHORS.map(([x, y], i) => (
          <circle
            key={STEPS[i].id}
            className={`wps-node ${hovered === i ? 'is-pulse' : ''}`}
            cx={x}
            cy={y}
            r={4.5}
            style={{ '--i': i, fill: STEPS[i].to } as CSSProperties}
          />
        ))}
        <circle ref={walkerRef} className="wps-walker" r={5} cx={ANCHORS[0][0]} cy={ANCHORS[0][1]} />
      </svg>
      <ul className="wps-list" aria-label="How we work">{cards}</ul>
    </div>
  )
}

export default WebProcessCards
