'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

/**
 * A soft lime ribbon that draws itself down the homepage as the visitor
 * scrolls. Scroll-linked stroke drawing adapted from Skiper UI's skiper19
 * (https://skiper-ui.com), rebuilt on the `motion` package the site already
 * ships.
 *
 * The ribbon sits underneath every section (see `.home-page` in Home.css),
 * so it threads behind photos, cards and text and re-appears on the far
 * side. It enters and leaves past the edges of its clipped layer, so no
 * end is ever visible.
 */

type Point = { x: number; y: number }
type Segment = [Point, Point, Point, Point]
type Band = { top: number; bottom: number }

type Layout = {
  width: number
  height: number
  // Where the ribbon's layer starts: the bottom of the full-screen hero.
  top: number
  viewport: number
  // Empty space between consecutive sections.
  gaps: Band[]
}

// A hand-drawn route. x/y are fractions of the layer; x may run past the
// edges for a swing off-screen. `loop` makes the ribbon circle once and
// cross itself there (1 = clockwise, -1 = anticlockwise), with a radius of
// `loop.size` stroke widths; the loop moves to the nearest section break.
// The uneven spacing between points is what gives every curve different
// handle lengths, so no two turns repeat or mirror each other.
type Anchor = { x: number; y: number; loop?: { turn: 1 | -1; size: number } }

const WIDE_ROUTE: Anchor[] = [
  { x: 0.2, y: 0.035 },
  { x: 0.5, y: 0.075 },
  { x: 0.8, y: 0.13 },
  { x: 0.76, y: 0.2, loop: { turn: -1, size: 2.6 } },
  { x: 0.42, y: 0.27 },
  { x: 0.15, y: 0.31 },
  { x: 0.3, y: 0.4 },
  { x: 0.66, y: 0.46 },
  { x: 0.92, y: 0.52 },
  { x: 0.74, y: 0.6 },
  { x: 0.3, y: 0.645 },
  { x: -0.06, y: 0.7 },
  { x: 0.24, y: 0.77 },
  { x: 0.7, y: 0.81, loop: { turn: 1, size: 3.1 } },
  { x: 0.88, y: 0.88 },
  { x: 0.56, y: 0.95 },
]

// Phones: one loop and shorter swings. The page is very tall at this
// width, so the ribbon still changes direction often enough to drift
// across each screen rather than fall straight down it.
const NARROW_ROUTE: Anchor[] = [
  { x: 0.3, y: 0.03 },
  { x: 0.8, y: 0.085 },
  { x: 0.55, y: 0.15 },
  { x: 0.16, y: 0.21 },
  { x: 0.42, y: 0.3 },
  { x: 0.68, y: 0.37, loop: { turn: -1, size: 2.6 } },
  { x: 0.24, y: 0.47 },
  { x: 0.12, y: 0.55 },
  { x: 0.6, y: 0.63 },
  { x: 0.86, y: 0.7 },
  { x: 0.5, y: 0.79 },
  { x: 0.18, y: 0.86 },
  { x: 0.46, y: 0.93 },
]

const COLOR = '#CEFD10'
const OPACITY = 0.18
// Both ends sit this far outside the clipped layer.
const OVERHANG = 120
const LOOP_STEPS = 8
const TABLE_STEPS = 200
// The drawing tip runs this far above the bottom of the viewport.
const TIP_LEAD_RATIO = 0.25
const CONTENT = 'h1,h2,h3,h4,h5,h6,p,li,img,video,picture,canvas,iframe,button,a,figure,blockquote'

function strokeFor(width: number) {
  if (width < 768) return 24
  if (width < 1024) return 38
  return 54
}

function measureLayout(container: HTMLElement, layer: HTMLElement): Layout {
  const hero = container.querySelector<HTMLElement>(':scope > .hero')
  const top = hero ? hero.offsetTop + hero.offsetHeight : 0
  const width = container.clientWidth
  const height = Math.max(0, container.offsetHeight - top)
  const origin = container.getBoundingClientRect()
  const sections = [...container.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== hero && el !== layer,
  )

  const extents = sections.map((section) => {
    let first = Infinity
    let last = -Infinity
    for (const el of section.querySelectorAll<HTMLElement>(CONTENT)) {
      // Pinned stages move while scrolling; their whole runway counts.
      const sticky = el.closest<HTMLElement>('.sticky')
      const rect = (sticky?.parentElement ?? el).getBoundingClientRect()
      if (rect.width <= 2 || rect.height <= 2) continue
      const y = rect.top - origin.top - top
      first = Math.min(first, y)
      last = Math.max(last, y + rect.height)
    }
    const sectionTop = section.offsetTop - top
    const sectionBottom = sectionTop + section.offsetHeight
    if (first === Infinity) {
      first = sectionTop
      last = sectionBottom
    }
    // Collapsed panels (closed FAQ answers) still report a height; nothing
    // is visible inside a section's bottom padding.
    const padding = parseFloat(getComputedStyle(section).paddingBottom) || 0
    if (padding > 0) last = Math.min(last, sectionBottom - padding)
    return { top: first, bottom: last }
  })

  const gaps: Band[] = []
  for (let i = 1; i < extents.length; i++) {
    gaps.push({ top: extents[i - 1].bottom, bottom: Math.max(extents[i - 1].bottom, extents[i].top) })
  }

  return { width, height, top, viewport: window.innerHeight, gaps }
}

const sameLayout = (a: Layout, b: Layout) => JSON.stringify(a) === JSON.stringify(b)
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

function routePoints({ width, height, gaps }: Layout, stroke: number): Point[] {
  const route = width < 768 ? NARROW_ROUTE : WIDE_ROUTE
  const px = route.map((a) => ({ x: a.x * width, y: a.y * height }))
  const breaks = gaps.map((gap) => (gap.top + gap.bottom) / 2)
  // Enter from off-screen left just below the hero; leave off-screen right
  // just above the bottom of the page.
  const points: Point[] = [{ x: -OVERHANG, y: stroke }]

  route.forEach((anchor, i) => {
    if (!anchor.loop) {
      points.push(px[i])
      return
    }

    const prev = px[i - 1] ?? px[i]
    const next = px[i + 1] ?? px[i]
    // Circle at the section break closest to where the route wants it.
    const nearest = breaks
      .filter((y) => y > prev.y && y < next.y)
      .sort((a, b) => Math.abs(a - px[i].y) - Math.abs(b - px[i].y))[0]
    const center = { x: px[i].x, y: nearest ?? px[i].y }
    const radius = stroke * anchor.loop.size
    const len = dist(prev, next) || 1
    const dir = { x: (next.x - prev.x) / len, y: (next.y - prev.y) / len }
    // Enter where the circle already runs in the travel direction, so the
    // turn into it is a continuation; the centre drifts forward while
    // circling, so the ribbon crosses its own stroke and carries on.
    const start = anchor.loop.turn === 1 ? Math.atan2(-dir.x, dir.y) : Math.atan2(dir.x, -dir.y)
    const drift = radius * 0.8
    for (let k = 0; k <= LOOP_STEPS; k++) {
      const angle = start + anchor.loop.turn * (k / LOOP_STEPS) * Math.PI * 2
      const shift = (k / LOOP_STEPS - 0.5) * drift
      points.push({
        x: center.x + dir.x * shift + Math.cos(angle) * radius,
        y: center.y + dir.y * shift + Math.sin(angle) * radius,
      })
    }
  })

  points.push({ x: width + OVERHANG, y: height - stroke })
  return points
}

// Centripetal Catmull-Rom through every point, expressed as cubic Béziers.
// Each point's incoming and outgoing handles are collinear (smooth joints)
// but their lengths follow the uneven spacing, so turns are asymmetric.
// The centripetal form never cusps or overshoots into a hard corner.
function toBeziers(points: Point[]): Segment[] {
  const first = points[0]
  const last = points[points.length - 1]
  const padded = [
    { x: 2 * first.x - points[1].x, y: 2 * first.y - points[1].y },
    ...points,
    { x: 2 * last.x - points[points.length - 2].x, y: 2 * last.y - points[points.length - 2].y },
  ]
  const segments: Segment[] = []

  for (let i = 1; i < padded.length - 2; i++) {
    const [p0, p1, p2, p3] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]]
    const d1 = Math.sqrt(dist(p0, p1)) || 1e-4
    const d2 = Math.sqrt(dist(p1, p2)) || 1e-4
    const d3 = Math.sqrt(dist(p2, p3)) || 1e-4
    const handle = (a: Point, b: Point, c: Point, da: number, db: number) => ({
      x: (da * da * c.x - db * db * a.x + (2 * da * da + 3 * da * db + db * db) * b.x) / (3 * da * (da + db)),
      y: (da * da * c.y - db * db * a.y + (2 * da * da + 3 * da * db + db * db) * b.y) / (3 * da * (da + db)),
    })
    segments.push([p1, handle(p0, p1, p2, d1, d2), handle(p3, p2, p1, d3, d2), p2])
  }

  return segments
}

function sampleBezier([p0, c1, c2, p1]: Segment, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  }
}

function buildRibbon(layout: Layout) {
  const stroke = strokeFor(layout.width)
  const segments = toBeziers(routePoints(layout, stroke))
  const f = (n: number) => n.toFixed(1)
  const d =
    `M${f(segments[0][0].x)} ${f(segments[0][0].y)}` +
    segments.map(([, c1, c2, p]) => `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p.x)} ${f(p.y)}`).join('')

  // Progress 0 → 1 runs from the layer's top reaching the bottom of the
  // viewport to its bottom reaching it. Map that to drawn length so the
  // tip stays a little above the viewport's bottom (it keeps drawing while
  // hidden under a photo), and is exactly 1 when the end of the page
  // arrives. Loops reach back up the page, so track the furthest point
  // drawn so far, then ease the steps with a moving average.
  const lengths = [0]
  const reach = [segments[0][0].y]
  let prev = segments[0][0]
  for (const segment of segments) {
    for (let s = 1; s <= 24; s++) {
      const point = sampleBezier(segment, s / 24)
      lengths.push(lengths[lengths.length - 1] + dist(prev, point))
      reach.push(Math.max(reach[reach.length - 1], point.y))
      prev = point
    }
  }
  const total = lengths[lengths.length - 1] || 1
  const lead = layout.viewport * TIP_LEAD_RATIO
  const raw: number[] = []
  let cursor = 0
  for (let i = 0; i <= TABLE_STEPS; i++) {
    const p = i / TABLE_STEPS
    const target = p * layout.height - lead * (1 - p)
    while (cursor < reach.length - 1 && reach[cursor] < target) cursor++
    raw.push(lengths[cursor] / total)
  }
  const smoothing = 5
  const progress: number[] = []
  const drawn: number[] = []
  for (let i = 0; i <= TABLE_STEPS; i++) {
    let sum = 0
    for (let k = -smoothing; k <= smoothing; k++) sum += raw[Math.min(TABLE_STEPS, Math.max(0, i + k))]
    progress.push(i / TABLE_STEPS)
    drawn.push(sum / (smoothing * 2 + 1))
  }
  drawn[0] = 0
  drawn[TABLE_STEPS] = 1

  return { d, stroke, progress, drawn }
}

export function HomeScrollRibbon({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout | null>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: layerRef, offset: ['start end', 'end end'] })

  useEffect(() => {
    const container = containerRef.current
    const layer = layerRef.current
    if (!container || !layer) return

    const measure = () => {
      const next = measureLayout(container, layer)
      setLayout((prev) => (prev && sameLayout(prev, next) ? prev : next))
    }

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [containerRef])

  const ribbon = useMemo(() => (layout && layout.width > 0 && layout.height > 0 ? buildRibbon(layout) : null), [layout])
  // Clamped, so the ribbon stays complete once the end is reached; the
  // spring settles on exactly 1.
  const drawTarget = useTransform(scrollYProgress, ribbon?.progress ?? [0, 1], ribbon?.drawn ?? [0, 1], {
    clamp: true,
  })
  const pathLength = useSpring(drawTarget, { stiffness: 100, damping: 30, restDelta: 0.001 })

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ top: layout?.top ?? 0, zIndex: -1 }}
    >
      {layout && ribbon ? (
        <svg
          className="absolute inset-0 block h-full w-full"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="none"
          fill="none"
          focusable="false"
        >
          <motion.path
            d={ribbon.d}
            stroke={COLOR}
            strokeOpacity={OPACITY}
            strokeWidth={ribbon.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={reduceMotion ? undefined : { pathLength }}
          />
        </svg>
      ) : null}
    </div>
  )
}
