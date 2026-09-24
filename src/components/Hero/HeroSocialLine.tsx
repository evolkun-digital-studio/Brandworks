import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

/*
 * The Social Media line: one lime stroke that draws itself through the hero,
 * in from the left edge, behind and over the two cards, back beneath them
 * past the copy, under the service capsules and out of the bottom-right
 * corner. It lives in the media layer, so the cards and every line of text
 * sit above it, and it is routed through the gaps between them rather than
 * across any text. Every curve is deliberately a different size: it should
 * read as one hand-directed gesture, never a wave or a frame.
 *
 * The path is built from the real, measured positions of the cards and the
 * copy — never a fixed drawing stretched to fit — so it holds its shape at
 * every size and is rebuilt whenever any of them move.
 */

// The contact sheet starts first; the line follows just behind it.
const DRAW_DELAY = 0.24
const DRAW_DURATION = 3.6
const DRAW_EASE = [0.65, 0, 0.35, 1] as const
// Matches the showcase's reset: wait until HeroMedia has faded the layer out.
const FADE_OUT = 0.4

type Box = { x: number; y: number; w: number; h: number }

type Geometry = {
  W: number
  H: number
  grid: Box
  image: Box
  video: Box
  /** Top of the "Brandworks" heading, and the right edge of its ink. */
  titleTop: number
  titleRight: number
  /** Right edge of the heading and description ink (the left copy column). */
  copyRight: number
  /** Right edge of the rightmost ink in the copy, captions and capsules. */
  textRight: number
  caption: Box
  pills: Box
  /** Bottom of the header's pills: the crest over the cards stays beneath them. */
  navBottom: number
  stacked: boolean
}

type Point = [number, number]

/** One cubic segment: its arrival control point and end point. `k` scales
 *  the next segment's departure control, which is mirrored through the end
 *  point so every joint is tangent-continuous — no kinks, however uneven
 *  the curves on either side. */
type Segment = { c2: Point; to: Point; k?: number }

const right = (b: Box) => b.x + b.w
const bottom = (b: Box) => b.y + b.h
const n = (value: number) => Math.round(value * 10) / 10
const pt = (x: number, y: number) => `${n(x)} ${n(y)}`

function smoothPath(start: Point, firstControl: Point, segments: Segment[]): string {
  let c1 = firstControl
  const parts = [`M ${pt(...start)}`]
  segments.forEach(({ c2, to, k = 1 }) => {
    parts.push(`C ${pt(...c1)}, ${pt(...c2)}, ${pt(...to)}`)
    c1 = [to[0] + (to[0] - c2[0]) * k, to[1] + (to[1] - c2[1]) * k]
  })
  return parts.join(' ')
}

/**
 * An element's untransformed box relative to `root`. Offsets ignore the
 * entrance transforms and the layer's cross-fade scale, so the path is
 * built for where things settle, not where they are mid-animation.
 */
function layoutBox(el: HTMLElement, root: HTMLElement): Box {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null
    if (parent && parent !== root) {
      x -= parent.scrollLeft
      y -= parent.scrollTop
    }
    node = parent
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

/** Horizontal extent of the text actually set inside `el`, not its box. */
function inkX(el: Element, originX: number) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const rect = range.getBoundingClientRect()
  range.detach()
  return { left: rect.left - originX, right: rect.right - originX }
}

function measure(hero: HTMLElement, showcase: HTMLElement): Geometry | null {
  const grid = showcase.querySelector<HTMLElement>('.social-contact-sheet')
  const image = showcase.querySelector<HTMLElement>('.social-image')
  const video = showcase.querySelector<HTMLElement>('.social-video')
  const title = hero.querySelector<HTMLElement>('.hero-title')
  const description = hero.querySelector<HTMLElement>('.hero-description')
  const caption = hero.querySelector<HTMLElement>('.hero-caption')
  const switcher = hero.querySelector<HTMLElement>('.hero-switcher')
  if (!grid || !image || !video || !title || !caption || !switcher) return null

  const heroRect = hero.getBoundingClientRect()
  const originX = heroRect.left
  const navBottoms = Array.from(document.querySelectorAll<HTMLElement>('.site-header .nav-pill'))
    .map((pill) => pill.getBoundingClientRect())
    .filter((r) => r.width > 0)
    .map((r) => r.bottom - heroRect.top)
  const titleInk = inkX(title, originX)
  const descriptionInk = description ? inkX(description, originX) : titleInk
  const captionInk = inkX(caption, originX)
  const captionBox = layoutBox(caption, hero)
  const pills = Array.from(switcher.children) as HTMLElement[]
  const pillBoxes = pills.map((pill) => layoutBox(pill, hero))
  const pillsLeft = Math.min(...pillBoxes.map((b) => b.x))
  const pillsRight = Math.max(...pillBoxes.map(right))
  const pillsTop = Math.min(...pillBoxes.map((b) => b.y))
  const pillsBottom = Math.max(...pillBoxes.map(bottom))
  const copyRight = Math.max(titleInk.right, descriptionInk.right)

  return {
    W: hero.clientWidth,
    H: hero.clientHeight,
    grid: layoutBox(grid, hero),
    image: layoutBox(image, hero),
    video: layoutBox(video, hero),
    titleTop: layoutBox(title, hero).y,
    titleRight: titleInk.right,
    copyRight,
    textRight: Math.max(copyRight, captionInk.right, pillsRight),
    caption: { x: captionInk.left, y: captionBox.y, w: captionInk.right - captionInk.left, h: captionBox.h },
    pills: { x: pillsLeft, y: pillsTop, w: pillsRight - pillsLeft, h: pillsBottom - pillsTop },
    navBottom: Math.max(0, ...navBottoms),
    stacked: getComputedStyle(showcase.querySelector('.social-showcase__stage') ?? showcase).flexDirection === 'column',
  }
}

/**
 * Desktop layout. Long cubic segments travel behind the contact sheet, make
 * one broad centre sweep, rise behind the still, arc over both primary cards,
 * then fall around the right edge and return below the service capsules.
 */
function sideBySidePath(g: Geometry): string {
  const { W, H, grid: G, image: I, video: V, pills: P } = g
  const crestY = Math.min(I.y - 18, Math.max(g.navBottom + 14, 42))
  const xR = right(V) + Math.min(52, Math.max(24, (W - right(V)) * 0.42))
  const underPills = Math.min(bottom(P) + 28, H - 10)

  return smoothPath([-70, G.y - 34], [W * 0.08, G.y - 38], [
    // Drift into the upper-left of the grid, fully behind its clipped cells.
    { c2: [G.x - 64, G.y + G.h * 0.08], to: [G.x + G.w * 0.16, G.y + G.h * 0.28], k: 0.82 },
    // One broad, liquid sweep through the grid and the open centre.
    { c2: [G.x + G.w * 0.48, G.y + G.h * 0.96], to: [I.x - 86, I.y + I.h * 0.72], k: 0.76 },
    // Rise gradually behind the primary Social Media still.
    { c2: [I.x - 18, I.y + I.h * 0.52], to: [I.x + I.w * 0.26, I.y + I.h * 0.34], k: 0.9 },
    // Clear its top edge and begin one shallow arc across the pair.
    { c2: [I.x + I.w * 0.72, crestY], to: [V.x + V.w * 0.14, crestY], k: 1.35 },
    // Let that arc run long before falling around the reel's far side.
    { c2: [xR, V.y - 2], to: [xR, V.y + V.h * 0.34], k: 0.86 },
    { c2: [xR + 4, bottom(V) - 24], to: [right(V) - 18, bottom(V) - 12], k: 0.72 },
    // Continue down the free right margin before turning under the copy.
    { c2: [xR - 4, underPills - 44], to: [xR - 8, underPills], k: 0.8 },
    // Sweep back beneath the capsules without cutting through their text.
    { c2: [P.x + P.w * 0.58, underPills], to: [P.x + P.w * 0.12, underPills], k: 0.22 },
    // Leave in one long open gesture toward the bottom-right edge.
    { c2: [W - 36, H + 84], to: [W + 80, H + 150] },
  ])
}

/**
 * Stacked layout (tablet and phone): in from the left behind the still,
 * out beneath the pair, down the free strip beside the copy and away off
 * the bottom-right corner.
 */
function stackedPath(g: Geometry): string {
  const { W, H, grid: G, image: I, video: V, pills: P } = g
  const pairBottom = Math.max(bottom(I), bottom(V))
  const yIn = I.y + I.h * 0.42
  const between = pairBottom + Math.max(12, (G.y - pairBottom) * 0.42)
  const underGrid = bottom(G) + 14

  return smoothPath([-48, yIn - 18], [Math.max(I.x, 1) * 0.54, yIn - 16], [
    { c2: [I.x + I.w * 0.16, yIn], to: [I.x + I.w * 0.38, yIn + 8], k: 1.05 },
    { c2: [V.x + V.w * 0.72, between], to: [G.x + G.w * 0.12, G.y + G.h * 0.18], k: 0.82 },
    // The mobile-specific gesture runs behind the 2 × 3 sheet.
    { c2: [G.x + G.w * 0.42, G.y + G.h * 0.88], to: [G.x + G.w * 0.76, underGrid], k: 0.9 },
    { c2: [W * 0.78, bottom(P) + 8], to: [W * 0.82, Math.min(bottom(P) + 18, H - 8)], k: 1.15 },
    { c2: [W + 12, H - 4], to: [W + 64, H + 34] },
  ])
}

function HeroSocialLine({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [d, setD] = useState<string | null>(null)

  useLayoutEffect(() => {
    const svg = svgRef.current
    const showcase = svg?.parentElement
    const hero = svg?.closest<HTMLElement>('.hero')
    if (!svg || !showcase || !hero) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const geometry = measure(hero, showcase)
        if (!geometry) return
        setSize({ w: geometry.W, h: geometry.H })
        setD(geometry.stacked ? stackedPath(geometry) : sideBySidePath(geometry))
      })
    }

    update()
    const watched = [
      hero,
      hero.querySelector('.hero-content'),
      hero.querySelector('.hero-aside'),
      showcase.querySelector('.social-showcase__stage'),
      showcase.querySelector('.social-contact-sheet'),
      showcase.querySelector('.media-showcase'),
    ].filter((el): el is Element => Boolean(el))
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    watched.forEach((el) => observer?.observe(el))
    // Phones scroll the pair sideways; keep the line tied to the still.
    const row = showcase.querySelector('.media-showcase')
    row?.addEventListener('scroll', update, { passive: true })
    void document.fonts?.ready.then(update)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      row?.removeEventListener('scroll', update)
    }
  }, [])

  const variants: Variants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
      transition: { opacity: { duration: FADE_OUT }, pathLength: { duration: 0, delay: FADE_OUT } },
    },
    shown: {
      pathLength: 1,
      opacity: 1,
      transition: reducedMotion
        ? { pathLength: { duration: 0 }, opacity: { duration: 0.4, delay: DRAW_DELAY } }
        : {
            pathLength: { duration: DRAW_DURATION, ease: DRAW_EASE, delay: DRAW_DELAY },
            opacity: { duration: 0.2, delay: DRAW_DELAY },
          },
    },
  }

  return (
    <svg
      ref={svgRef}
      className="social-line"
      viewBox={`0 0 ${Math.max(size.w, 1)} ${Math.max(size.h, 1)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      data-active={active ? '' : undefined}
    >
      <motion.path
        className="social-line__path"
        d={d ?? 'M 0 0'}
        variants={variants}
      />
    </svg>
  )
}

export default HeroSocialLine
