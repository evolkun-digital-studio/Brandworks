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

// The line starts once the cards have begun to rise (HeroSocialShowcase
// holds them ~0.34s so the caption can swap first).
const DRAW_DELAY = 0.45
const DRAW_DURATION = 3.2
const DRAW_EASE = [0.65, 0, 0.35, 1] as const
// Matches the showcase's reset: wait until HeroMedia has faded the layer out.
const FADE_OUT = 0.4

type Box = { x: number; y: number; w: number; h: number }

type Geometry = {
  W: number
  H: number
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
  const image = showcase.querySelector<HTMLElement>('.social-image')
  const video = showcase.querySelector<HTMLElement>('.social-video')
  const title = hero.querySelector<HTMLElement>('.hero-title')
  const description = hero.querySelector<HTMLElement>('.hero-description')
  const caption = hero.querySelector<HTMLElement>('.hero-caption')
  const switcher = hero.querySelector<HTMLElement>('.hero-switcher')
  if (!image || !video || !title || !caption || !switcher) return null

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
 * Side-by-side layout. In almost level from the left edge, a steep fall into
 * one long, low, flat-bottomed sweep across the empty half, a slow rise that
 * vanishes behind the still, out over its top into a shallow arc that crests
 * early and runs long over the reel, a narrow drop down the far side with a
 * slight outward bow, in behind the reel, back out beneath the still, a small
 * tight bend beside the copy, under the capsules and away off the
 * bottom-right corner. No two curves share a size.
 */
function sideBySidePath(g: Geometry): string {
  const { W, H, image: I, video: V, pills: P, caption: C } = g
  // The crest keeps clear of the header's pills and stays just above the still.
  const crestY = Math.min(I.y - 16, Math.max(g.navBottom + 12, 36))
  const lowY = Math.min(H * 0.55, g.titleTop - 110)
  const lowX = Math.min(W * 0.32, I.x - 300)
  const xR = right(V) + Math.min(50, (W - right(V)) * 0.4)
  const turnY = Math.min(H * 0.63, bottom(V) - 28)
  const below = (gap: number) => Math.min(bottom(P) + gap, H - 10)

  const approach: Segment[] = [
    // Level for a long stretch, then a late, steep fall into the flat of the sweep.
    { c2: [lowX - W * 0.075, lowY], to: [lowX, lowY], k: 2.4 },
    // One long, gradual rise, vanishing behind the still.
    { c2: [I.x - W * 0.03, I.y + I.h * 0.56], to: [I.x + I.w * 0.28, I.y + I.h * 0.34], k: 0.9 },
    // Out over its top edge, cresting early, above the gap between the cards.
    { c2: [I.x + I.w * 0.72, crestY], to: [V.x + V.w * 0.1, crestY], k: 2.1 },
    // The long, shallow run over the reel, clear of its far corner.
    { c2: [xR, V.y - 6], to: [xR, V.y + V.h * 0.28] },
  ]

  // The return runs out beneath the still, between it and the caption, then
  // down beside the copy; without room for both, the line keeps to the far
  // margin instead.
  if (C.x - g.copyRight < 110 || C.y - bottom(I) < 40) {
    return smoothPath([-60, H * 0.2], [Math.min(W * 0.21, lowX * 0.68), H * 0.205], [
      ...approach,
      { c2: [xR + 8, H * 0.55], to: [xR + 2, bottom(P) - 40] },
      // Out through the bottom edge, drifting right.
      { c2: [xR - 2, H - 20], to: [xR + 26, H + 50] },
    ])
  }

  // Where the return clears the still's lower edge and the caption's first line.
  const gapY = Math.min(bottom(I) + 16, (bottom(I) + C.y) / 2)
  const passY = Math.max(gapY + 20, Math.min((bottom(I) + C.y) / 2 + 8, C.y - 20))

  return smoothPath([-60, H * 0.2], [Math.min(W * 0.21, lowX * 0.68), H * 0.205], [
    ...approach,
    // A narrow drop with a slight outward bow, turning in behind the reel.
    { c2: [xR + 6, turnY - 40], to: [right(V) - 18, turnY], k: 0.5 },
    // Across behind it and out beneath the still, toward the copy.
    { c2: [V.x - 10, gapY], to: [C.x - 34, passY], k: 0.5 },
    // A small, tight bend beside the copy...
    { c2: [C.x - 66, C.y + 40], to: [C.x - 62, C.y + (bottom(P) - C.y) * 0.55], k: 1.3 },
    // ...under the capsules, well clear of the first...
    { c2: [P.x + P.w * 0.05, below(30)], to: [P.x + P.w * 0.32, below(30)], k: 1.4 },
    // ...and on, long and open, out of the bottom-right corner.
    { c2: [W - 70, H - 4], to: [W + 60, H + 26] },
  ])
}

/**
 * Stacked layout (tablet and phone): in from the left behind the still,
 * out beneath the pair, down the free strip beside the copy and away off
 * the bottom-right corner.
 */
function stackedPath(g: Geometry): string {
  const { W, H, image: I, video: V, pills: P } = g
  const pairBottom = Math.max(bottom(I), bottom(V))
  // Tucked close under the pair: the heading follows only a little lower.
  const underY = pairBottom + Math.min(12, (g.titleTop - pairBottom) * 0.35)
  const yIn = I.y + I.h * 0.42
  const xs = g.textRight + (W - g.textRight) / 2

  const entry: Segment[] = [
    { c2: [I.x * 0.85, yIn - 2], to: [I.x + 22, yIn + 6], k: 1.6 },
    // Behind the still, out beneath the pair.
    { c2: [I.x + I.w * 0.4, underY], to: [Math.max(I.x + I.w * 0.72, g.titleRight + 16), underY] },
  ]

  // Phones leave no strip beside the copy: the line runs on beneath the pair
  // and out of the right edge.
  if (W - g.textRight < 48) {
    return smoothPath([-40, yIn - 12], [Math.max(I.x, 1) * 0.5, yIn - 10], [
      ...entry,
      { c2: [W - 30, underY + 2], to: [W + 60, underY + 26] },
    ])
  }

  return smoothPath([-40, yIn - 12], [Math.max(I.x, 1) * 0.5, yIn - 10], [
    ...entry,
    { c2: [xs - 30, underY], to: [xs, underY + 50], k: 1.4 },
    { c2: [xs + 2, bottom(P) - 30], to: [xs + 10, bottom(P) + 6] },
    { c2: [W + 10, H - 2], to: [W + 60, H + 40] },
  ])
}

function HeroSocialLine({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [d, setD] = useState<string | null>(null)
  const [drawn, setDrawn] = useState(false)

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
      className={`social-line ${drawn && active && !reducedMotion ? 'is-drawn' : ''}`}
      viewBox={`0 0 ${Math.max(size.w, 1)} ${Math.max(size.h, 1)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <motion.path
        className="social-line__path"
        d={d ?? 'M 0 0'}
        variants={variants}
        onAnimationComplete={(definition) => setDrawn(definition === 'shown')}
        onAnimationStart={() => setDrawn(false)}
      />
    </svg>
  )
}

export default HeroSocialLine
