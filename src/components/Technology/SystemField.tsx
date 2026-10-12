import { useEffect, useRef, type MutableRefObject } from 'react'

/**
 * The Technology hero's system visual, drawn on one canvas.
 *
 * Scroll progress (0–1, written into `progress` by the page — no React
 * renders during scroll) is eased toward on every frame and read as five
 * stages: scattered nodes → lines connecting → information moving →
 * workflows linking → one organised system. The only thing that moves on
 * its own is the travel of signals along paths that scroll has already
 * built. The loop runs only while the canvas is on screen and the tab is
 * visible; reduced motion gets a single static frame of the finished system.
 */

type SystemFieldProps = {
  progress: MutableRefObject<number>
  reducedMotion: boolean
  className?: string
}

type Node = {
  sx: number
  sy: number
  ox: number
  oy: number
  layer: number
  phase: number
  size: number
  core: boolean
}

type Edge = {
  a: number
  b: number
  layer: number
  start: number
  rnd: number
  speed: number
}

/** Nodes per column of the organised system, inputs → outputs. */
const LAYERS = [5, 7, 9, 7, 5]
const SMOOTHING = 0.12
const LIME = '206, 253, 16'
/** Drawn on the white page: structure in ink, lime only as filled signal discs. */
const INK = '17, 17, 17'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function buildSystem() {
  const rand = seeded(17)
  const nodes: Node[] = []
  const layerStart: number[] = []
  LAYERS.forEach((count, layer) => {
    layerStart.push(nodes.length)
    const x = 0.06 + (layer / (LAYERS.length - 1)) * 0.88
    for (let i = 0; i < count; i++) {
      const y = 0.12 + (count === 1 ? 0.5 : i / (count - 1)) * 0.76
      nodes.push({
        sx: 0.04 + rand() * 0.92,
        sy: 0.06 + rand() * 0.88,
        ox: x,
        oy: y,
        layer,
        phase: rand() * Math.PI * 2,
        size: 1.5 + rand() * 1.2,
        core: layer === 2 && i === Math.floor(count / 2),
      })
    }
  })

  const edges: Edge[] = []
  for (let layer = 0; layer < LAYERS.length - 1; layer++) {
    const from = LAYERS[layer]
    const to = LAYERS[layer + 1]
    for (let i = 0; i < from; i++) {
      const j = Math.round((i * (to - 1)) / Math.max(from - 1, 1))
      const other = Math.min(to - 1, Math.max(0, j + (rand() < 0.5 ? -1 : 1)))
      for (const target of new Set([j, other])) {
        edges.push({
          a: layerStart[layer] + i,
          b: layerStart[layer + 1] + target,
          layer,
          // Earlier columns connect first; each line takes ~0.1 of progress.
          start: 0.2 + layer * 0.1 + rand() * 0.08,
          rnd: rand(),
          speed: 0.18 + rand() * 0.14,
        })
      }
    }
  }
  return { nodes, edges }
}

/** Point on the horizontal-flow cubic between two nodes. */
function pointOn(ax: number, ay: number, bx: number, by: number, t: number) {
  const dx = (bx - ax) * 0.5
  const u = 1 - t
  const x = u * u * u * ax + 3 * u * u * t * (ax + dx) + 3 * u * t * t * (bx - dx) + t * t * t * bx
  const y = u * u * u * ay + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * by
  return [x, y] as const
}

export default function SystemField({ progress, reducedMotion, className }: SystemFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { nodes, edges } = buildSystem()
    let width = 0
    let height = 0
    let smoothed = reducedMotion ? 1 : progress.current
    let time = 0
    let last = 0
    let frame = 0
    let visible = false

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 1.5 : 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (p: number) => {
      ctx.clearRect(0, 0, width, height)
      const organise = easeInOut(clamp01((p - 0.22) / 0.62))
      const drift = (1 - organise * 0.75) * 0.012
      const pad = Math.min(width, height) * 0.04
      const w = width - pad * 2
      const h = height - pad * 2

      const pos = nodes.map((n) => {
        const x = n.sx + (n.ox - n.sx) * organise + Math.sin(time * 0.35 + n.phase) * drift
        const y = n.sy + (n.oy - n.sy) * organise + Math.cos(time * 0.3 + n.phase) * drift
        return [pad + x * w, pad + y * h] as const
      })

      // Connections, drawn out as their stage arrives.
      const signalDensity = clamp01((p - 0.4) / 0.42) * 0.5
      ctx.lineWidth = 1
      for (const e of edges) {
        const drawn = clamp01((p - e.start) / 0.1)
        if (drawn <= 0) continue
        const [ax, ay] = pos[e.a]
        const [bx, by] = pos[e.b]
        const live = e.rnd < signalDensity && drawn >= 1
        ctx.strokeStyle = live
          ? `rgba(${INK}, ${0.24 + organise * 0.2})`
          : `rgba(${INK}, ${0.09 + organise * 0.1})`
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        const steps = 14
        for (let s = 1; s <= steps; s++) {
          const t = (s / steps) * drawn
          const [x, y] = pointOn(ax, ay, bx, by, t)
          ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Information travelling along finished paths.
        if (live) {
          const t = reducedMotion ? 0.5 + e.rnd * 0.4 : (time * e.speed + e.rnd * 7) % 1
          const [x, y] = pointOn(ax, ay, bx, by, t)
          ctx.fillStyle = `rgb(${LIME})`
          ctx.beginPath()
          ctx.arc(x, y, 4.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgb(${INK})`
          ctx.beginPath()
          ctx.arc(x, y, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Nodes; the core and the outputs light up as the system completes.
      const complete = clamp01((p - 0.8) / 0.2)
      nodes.forEach((n, i) => {
        const [x, y] = pos[i]
        if (n.core && p > 0.5) {
          const ring = clamp01((p - 0.5) / 0.2)
          ctx.strokeStyle = `rgba(${INK}, ${0.55 * ring})`
          ctx.beginPath()
          ctx.arc(x, y, 8 + ring * 6, 0, Math.PI * 2)
          ctx.stroke()
        }
        const output = n.layer === LAYERS.length - 1 && complete > 0
        if (output) {
          // Finished outputs: a lime disc with an ink core.
          ctx.fillStyle = `rgba(${LIME}, ${complete})`
          ctx.beginPath()
          ctx.arc(x, y, n.size + 3.5 * complete, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = n.core || output
          ? `rgb(${INK})`
          : `rgba(${INK}, ${0.3 + organise * 0.45})`
        ctx.beginPath()
        ctx.arc(x, y, n.core ? 3.4 : n.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const tick = (now: number) => {
      frame = 0
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0
      last = now
      time += dt
      smoothed += (progress.current - smoothed) * SMOOTHING
      draw(smoothed)
      if (visible && !document.hidden) frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (reducedMotion || frame || !visible || document.hidden) return
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    resize()
    if (reducedMotion) draw(1)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      draw(reducedMotion ? 1 : smoothed)
    })
    resizeObserver.observe(canvas)

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    intersection.observe(canvas)

    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [progress, reducedMotion])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
