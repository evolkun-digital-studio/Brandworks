'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

/**
 * A soft lime ribbon that draws itself down its container as the visitor
 * scrolls. Scroll-linked stroke drawing adapted from Skiper UI's skiper19
 * (https://skiper-ui.com), rebuilt on the `motion` package the site already
 * ships.
 *
 * The container establishes an isolated stacking context and clips the
 * ribbon beneath its content. It enters and leaves past the edges of its layer, so no
 * end is ever visible.
 */

type Point = { x: number; y: number }
type Segment = [Point, Point, Point, Point]
type Layout = {
  width: number
  height: number
  viewport: number
}

const COLOR = '#daff33'
const OPACITY = 0.18
// Both ends sit this far outside the clipped layer.
const OVERHANG = 120
const TABLE_STEPS = 200
// The drawing tip runs this far above the bottom of the viewport.
const TIP_LEAD_RATIO = 0.25

function strokeFor(width: number) {
  if (width < 768) return 24
  if (width < 1024) return 38
  return 54
}

function measureLayout(container: HTMLElement): Layout {
  return {
    width: container.clientWidth,
    height: container.offsetHeight,
    viewport: window.innerHeight,
  }
}

const sameLayout = (a: Layout, b: Layout) => JSON.stringify(a) === JSON.stringify(b)
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

// Three generous sweeps replace the tight loops. Shared vertical handles
// keep the tangent continuous at each join, including on narrow screens.
function ribbonSegments({ width, height }: Layout): Segment[] {
  const point = (x: number, y: number): Point => ({ x: x * width, y: y * height })
  const start = { x: -OVERHANG, y: height * 0.04 }
  const first = point(0.78, 0.22)
  const middle = point(0.22, 0.52)
  const last = point(0.78, 0.82)
  const end = { x: width + OVERHANG, y: height * 0.96 }

  return [
    [start, point(0.3, 0.04), point(0.78, 0.10), first],
    [first, point(0.78, 0.34), point(0.22, 0.40), middle],
    [middle, point(0.22, 0.64), point(0.78, 0.70), last],
    [last, point(0.78, 0.94), point(0.9, 0.96), end],
  ]
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
  const segments = ribbonSegments(layout)
  const f = (n: number) => n.toFixed(1)
  const d =
    `M${f(segments[0][0].x)} ${f(segments[0][0].y)}` +
    segments.map(([, c1, c2, p]) => `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p.x)} ${f(p.y)}`).join('')

  // Progress 0 → 1 runs from the layer's top reaching the bottom of the
  // viewport to its bottom reaching it. Map that to drawn length so the
  // tip stays a little above the viewport's bottom (it keeps drawing while
  // hidden under a photo), and is exactly 1 when the end of the page
  // arrives. Track the furthest point
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
  const { scrollYProgress: visibilityProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })
  const fadeTarget = useTransform(visibilityProgress, [0, 0.18, 0.78, 1], [0, 1, 1, 0])
  const opacity = useSpring(fadeTarget, { stiffness: 65, damping: 28, restDelta: 0.001 })

  useEffect(() => {
    const container = containerRef.current
    const layer = layerRef.current
    if (!container || !layer) return

    const measure = () => {
      const next = measureLayout(container)
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
  const pathLength = useSpring(drawTarget, { stiffness: 65, damping: 28, restDelta: 0.001 })

  return (
    <motion.div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{
        top: 0,
        zIndex: -1,
        opacity: reduceMotion ? 1 : opacity,
        maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
      }}
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
    </motion.div>
  )
}
