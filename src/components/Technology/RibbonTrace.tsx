import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * The Technology page's visual spine: one flat lime ribbon, a single cubic
 * Bézier path drawn through the whole page and scrubbed to scroll.
 *
 * The route is art-directed as waypoints anchored to the page's real
 * sections (so it follows the layout at any size), each with its own
 * tangent handle — outgoing handle = +h, incoming = −h — which keeps every
 * joint smooth while the bends stay hand-placed rather than procedural.
 * Desktop and mobile get separate routes.
 *
 * Two copies of the same path share one dash offset:
 *   back  (z 0)  — under the sections; passes behind type and slips behind
 *                  the solid panels (capability visual, dashboard).
 *   front (z 2)  — clipped to a few zones over *visuals only*, so the
 *                  ribbon crosses over them there and never over text.
 */

type Waypoint = {
  /** Section the point is anchored to. */
  at: string
  /** Horizontal position, as a fraction of the page width (may be off-canvas). */
  x: number
  /** Vertical position, as a fraction of the section's height. */
  y: number
  /** Tangent handle: x in page widths, y in viewport heights. */
  hx: number
  hy: number
  /**
   * Only for the tall scroll-driven layout. With reduced motion the pinned
   * stages collapse to one screen, where these bends would fold into a
   * hairpin, so they are skipped.
   */
  motionOnly?: boolean
}

type Zone = { at: string; x0: number; x1: number; y0: number; y1: number }

type Route = { points: Waypoint[]; front: Zone[] }

const DESKTOP: Route = {
  points: [
    // Hero: drawn in from just outside the left edge above the headline,
    // a long bend down the right across the system visual, then back
    // across the stage.
    { at: '.bwt-hero', x: -0.06, y: 0.08, hx: 0.3, hy: 0 },
    { at: '.bwt-hero', x: 0.5, y: 0.2, hx: 0.26, hy: 0.12, motionOnly: true },
    { at: '.bwt-hero', x: 0.84, y: 0.46, hx: 0.02, hy: 0.32, motionOnly: true },
    { at: '.bwt-hero', x: 0.46, y: 0.72, hx: -0.3, hy: 0.1, motionOnly: true },
    { at: '.bwt-hero', x: 0.1, y: 0.96, hx: -0.04, hy: 0.32 },
    // Intro: rises out along the left, sweeps under the statement.
    { at: '.bwt-intro', x: 0.34, y: 0.62, hx: 0.3, hy: 0.12 },
    // Capabilities: into the right column, behind the visual panel, and out
    // through the right edge.
    { at: '.bwt-caps', x: 0.8, y: 0.16, hx: 0.12, hy: 0.32 },
    { at: '.bwt-caps', x: 0.7, y: 0.6, hx: -0.02, hy: 0.36 },
    { at: '.bwt-caps', x: 1.12, y: 0.98, hx: 0.22, hy: 0.06 },
    // Automation (a pinned stage): mostly off-canvas, dipping back in at the
    // right edge as the stage scrolls through.
    { at: '.bwt-story', x: 1.12, y: 0.32, hx: -0.06, hy: 0.36 },
    { at: '.bwt-story', x: 0.88, y: 0.62, hx: 0, hy: 0.42, motionOnly: true },
    { at: '.bwt-story', x: 1.14, y: 0.92, hx: 0.1, hy: 0.24 },
    // Workflow: one long sweep right → left above the steps.
    { at: '.bwt-flow', x: 0.6, y: 0.2, hx: -0.34, hy: 0.06 },
    { at: '.bwt-flow', x: 0.04, y: 0.66, hx: -0.02, hy: 0.34 },
    // Data: between the copy and the dashboard, then behind it.
    { at: '.bwt-data', x: 0.36, y: 0.3, hx: 0.24, hy: 0.16 },
    { at: '.bwt-data', x: 0.78, y: 0.62, hx: 0.06, hy: 0.3 },
    // ERP: one broad sweep through the whitespace between the dashboard and
    // the diagram — right to left, over the diagram and the heading — then
    // out through the left edge, re-entering only below the copy. The
    // diagram and its labels keep ≥ ~100px of clear space; nothing crosses.
    { at: '.bwt-erp', x: 0.4, y: 0.06, hx: -0.3, hy: 0 },
    { at: '.bwt-erp', x: -0.14, y: 0.3, hx: -0.12, hy: 0.2 },
    // Partner: down the left behind the title, then under the copy, past
    // the call to action and out through the right edge — the ribbon never
    // ends on screen.
    { at: '.bwt-partner', x: 0.12, y: 0.4, hx: -0.02, hy: 0.32 },
    { at: '.bwt-partner', x: 0.72, y: 0.94, hx: 0.22, hy: 0 },
    { at: '.bwt-partner', x: 1.16, y: 0.84, hx: 0.16, hy: -0.04 },
  ],
  front: [
    // Over the hero's system visual (right of the copy column).
    { at: '.bwt-hero', x0: 0.6, x1: 1, y0: 0.32, y1: 0.62 },
  ],
}

/**
 * Both routes begin and end off-canvas, so the round caps are only ever
 * seen on the drawing head, never as a dead end.
 *
 * Phones and tablets (the stacked, one-column layout): the ribbon hugs one edge at a time (dipping off-canvas) and only
 * changes sides in the whitespace between sections — or hidden behind the
 * dashboard panel — so it never sweeps diagonally across the copy.
 */
const MOBILE: Route = {
  points: [
    // Hero: down the right edge.
    { at: '.bwt-hero', x: 1.16, y: 0.16, hx: -0.12, hy: 0.16 },
    { at: '.bwt-hero', x: 0.96, y: 0.6, hx: 0, hy: 0.3 },
    // Across in the gap under the hero, then down the left edge.
    { at: '.bwt-hero', x: 0.5, y: 0.985, hx: -0.4, hy: 0.01 },
    { at: '.bwt-intro', x: 0.02, y: 0.5, hx: -0.02, hy: 0.3 },
    { at: '.bwt-caps', x: -0.14, y: 0.42, hx: 0, hy: 0.5 },
    { at: '.bwt-caps', x: 0.02, y: 0.8, hx: 0.02, hy: 0.2 },
    // Across in the gap before the automation stage, then the right edge.
    { at: '.bwt-caps', x: 0.5, y: 0.985, hx: 0.4, hy: 0.01 },
    { at: '.bwt-story', x: 1.14, y: 0.36, hx: 0.04, hy: 0.5 },
    { at: '.bwt-story', x: 0.98, y: 0.74, hx: 0, hy: 0.36 },
    { at: '.bwt-flow', x: 1.0, y: 0.5, hx: 0, hy: 0.3 },
    // Across behind the dashboard panel, then the left edge to the close.
    { at: '.bwt-data', x: 0.9, y: 0.4, hx: -0.06, hy: 0.22 },
    { at: '.bwt-data', x: 0.06, y: 0.85, hx: -0.06, hy: 0.22 },
    { at: '.bwt-erp', x: -0.12, y: 0.5, hx: 0, hy: 0.4 },
    { at: '.bwt-partner', x: 0.02, y: 0.36, hx: 0.02, hy: 0.24 },
    // Out through the right edge — never ending on screen.
    { at: '.bwt-partner', x: 1.2, y: 0.9, hx: 0.34, hy: -0.02 },
  ],
  front: [],
}

type Sample = { length: number[]; progress: number[]; total: number }

function buildRoute(container: HTMLElement, route: Route, reducedMotion: boolean) {
  const box = container.getBoundingClientRect()
  const width = container.clientWidth
  const height = container.offsetHeight
  const vh = window.innerHeight
  const sections = new Map<string, { top: number; height: number }>()
  const section = (selector: string) => {
    let rect = sections.get(selector)
    if (!rect) {
      const el = container.querySelector<HTMLElement>(selector)
      const r = el?.getBoundingClientRect()
      rect = r ? { top: r.top - box.top, height: r.height } : { top: 0, height: 0 }
      sections.set(selector, rect)
    }
    return rect
  }

  const pts = route.points
    .filter((p) => !(reducedMotion && p.motionOnly))
    .map((p) => {
      const s = section(p.at)
      return { x: p.x * width, y: s.top + p.y * s.height, hx: p.hx * width, hy: p.hy * vh }
    })
  const n = (v: number) => Math.round(v * 10) / 10
  let d = `M${n(pts[0].x)} ${n(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    d += ` C${n(a.x + a.hx)} ${n(a.y + a.hy)} ${n(b.x - b.hx)} ${n(b.y - b.hy)} ${n(b.x)} ${n(b.y)}`
  }

  const zones = route.front.map((z) => {
    const s = section(z.at)
    return {
      x: z.x0 * width,
      y: s.top + z.y0 * s.height,
      width: (z.x1 - z.x0) * width,
      height: (z.y1 - z.y0) * s.height,
    }
  })

  return { d, width, height, zones }
}

/**
 * Scroll progress → drawn length. Weighting each step mostly by how far it
 * travels *down* keeps the drawn head near the viewport even where the
 * route doubles back or runs sideways.
 */
function sample(path: SVGPathElement): Sample {
  const total = path.getTotalLength()
  const steps = Math.min(1600, Math.max(200, Math.round(total / 10)))
  const length: number[] = []
  const progress: number[] = []
  let prev = path.getPointAtLength(0)
  let acc = 0
  for (let i = 0; i <= steps; i++) {
    const l = (i / steps) * total
    const pt = path.getPointAtLength(l)
    const dy = pt.y - prev.y
    acc += Math.max(dy, 0) + 0.3 * Math.abs(pt.x - prev.x) + 0.3 * Math.max(-dy, 0)
    length.push(l)
    progress.push(acc)
    prev = pt
  }
  return { length, progress, total }
}

function lengthAt(s: Sample, p: number) {
  const { length, progress } = s
  const target = p * progress[progress.length - 1]
  let lo = 0
  let hi = progress.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (progress[mid] < target) lo = mid + 1
    else hi = mid
  }
  if (lo === 0) return 0
  const span = progress[lo] - progress[lo - 1]
  const t = span > 0 ? (target - progress[lo - 1]) / span : 1
  return length[lo - 1] + t * (length[lo] - length[lo - 1])
}

type RibbonTraceProps = {
  reducedMotion: boolean
}

/**
 * Render as a direct child of the page container: the ribbon spans and
 * routes through its parent element. (Read from the DOM, not a parent ref —
 * a child's layout effects run before the parent's ref is attached.)
 */
export default function RibbonTrace({ reducedMotion }: RibbonTraceProps) {
  const backRef = useRef<SVGSVGElement>(null)
  const frontRef = useRef<SVGSVGElement>(null)
  const clipId = `bwt-ribbon-front-${useId().replace(/:/g, '')}`

  useGSAP(
    () => {
      const back = backRef.current
      const front = frontRef.current
      const container = back?.parentElement
      if (!container || !back || !front) return

      const paths = [
        back.querySelector<SVGPathElement>('.bwt-ribbon__path'),
        front.querySelector<SVGPathElement>('.bwt-ribbon__path'),
      ].filter((p): p is SVGPathElement => Boolean(p))
      const clip = front.querySelector('clipPath')
      if (paths.length < 2 || !clip) return

      const state = { p: 0 }
      let sampled: Sample | null = null

      const render = () => {
        if (!sampled) return
        const drawn = reducedMotion ? sampled.total : lengthAt(sampled, state.p)
        const offset = sampled.total - drawn
        // At the top of the page nothing is drawn — hidden outright, so not
        // even the round start cap shows.
        const visibility = drawn > 0.5 ? 'visible' : 'hidden'
        for (const path of paths) {
          path.style.strokeDashoffset = `${offset}`
          path.style.visibility = visibility
        }
      }

      let lastKey = ''
      const rebuild = () => {
        // The desktop route is composed around the two-column layout; below
        // 1024px the page stacks into one column, so tablets take the
        // simpler edge-following route too.
        const stacked = window.matchMedia('(max-width: 1023px)').matches
        const { d, width, height, zones } = buildRoute(
          container,
          stacked ? MOBILE : DESKTOP,
          reducedMotion,
        )
        const key = `${d}|${zones.length}`
        if (key === lastKey) return
        lastKey = key

        for (const svg of [back, front]) svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        for (const path of paths) path.setAttribute('d', d)
        clip.replaceChildren(
          ...zones.map((z) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            rect.setAttribute('x', `${z.x}`)
            rect.setAttribute('y', `${z.y}`)
            rect.setAttribute('width', `${z.width}`)
            rect.setAttribute('height', `${z.height}`)
            return rect
          }),
        )
        front.style.display = zones.length ? '' : 'none'

        sampled = sample(paths[0])
        // One dash as long as the path; the gap is longer still so the
        // round cap never shows at the far end.
        for (const path of paths) {
          path.style.strokeDasharray = reducedMotion ? 'none' : `${sampled.total} ${sampled.total + 400}`
        }
        render()
      }

      rebuild()

      if (!reducedMotion) {
        gsap.to(state, {
          p: 1,
          ease: 'none',
          onUpdate: render,
          // Fully hidden until the visitor actually starts scrolling; then
          // drawn from its start, reversing all the way back to nothing.
          scrollTrigger: {
            trigger: container,
            start: 'top top-=20',
            end: 'bottom bottom',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        })
      }

      // Layout changes (fonts, images, breakpoints) re-route the ribbon.
      let frame = 0
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(rebuild)
      })
      observer.observe(container)

      return () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
      }
    },
    { dependencies: [reducedMotion], revertOnUpdate: true },
  )

  return (
    <>
      <svg ref={backRef} className="bwt-ribbon bwt-ribbon--back" aria-hidden="true" focusable="false">
        <path className="bwt-ribbon__path" />
      </svg>
      <svg ref={frontRef} className="bwt-ribbon bwt-ribbon--front" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse" />
        </defs>
        <path className="bwt-ribbon__path" clipPath={`url(#${clipId})`} />
      </svg>
    </>
  )
}
