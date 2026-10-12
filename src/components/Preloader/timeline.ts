import gsap from 'gsap'
import type { PreloaderImage } from '../../data/preloaderMedia'
import type { Edge, PreloaderLayout, ShotEntrance } from './layouts'

/**
 * The preloader's choreography: one paused master GSAP timeline per
 * opening, built against the markup Preloader.tsx renders (found through
 * data-pl hooks) and played once everything is decoded.
 *
 * Only transform and opacity are animated. Every reveal is a "curtain":
 * an overflow-hidden frame slides in while its content slides the
 * opposite way by the same amount, so the photograph stays still and only
 * its window grows — two compositor-only transforms, no clip-path and no
 * repaint. Image cuts swap the src of an already-decoded file while the
 * frame keeps gliding, so a cut never stalls the motion.
 *
 * Positions are absolute seconds. Easing stays in the power2/power3
 * family — no overshoot, bounce or elastic anywhere.
 */

type Beats = {
  white: number // pure white before the first frame
  shotStep: number // a new single frame every n seconds
  panelsIn: number
  panelSwap: number
  panelsOut: number
  wordIn: number
  stripsIn: number
  stripsOut: number
  cameraPeak: number
  cameraSettle: number
  swapSlow: number // photography inside the letters starts changing less often
  swapEnd: number // and stops changing
  solidIn: number // solid ink fades in underneath the photographs
  fadeOut: number // photographs fade off the letters, one after another
  fadeStagger: number
  fadeDur: number
  hold: number // the finished wordmark, perfectly still
  liftDur: number
}

const DESKTOP: Beats = {
  white: 0.3,
  shotStep: 0.13,
  panelsIn: 1.06,
  panelSwap: 0.14,
  panelsOut: 1.4,
  wordIn: 1.55,
  stripsIn: 1.65,
  stripsOut: 2.75,
  cameraPeak: 2.1,
  cameraSettle: 2.9,
  swapSlow: 2.25,
  swapEnd: 2.7,
  solidIn: 2.62,
  fadeOut: 2.75,
  fadeStagger: 0.03,
  fadeDur: 0.55,
  hold: 0.6,
  liftDur: 0.9,
}

const COMPACT: Beats = {
  white: 0.25,
  shotStep: 0.13,
  panelsIn: 0.72,
  panelSwap: 0.14,
  panelsOut: 1.04,
  wordIn: 1.12,
  stripsIn: 1.2,
  stripsOut: 1.85,
  cameraPeak: 1.45,
  cameraSettle: 2.0,
  swapSlow: 1.5,
  swapEnd: 1.85,
  solidIn: 1.8,
  fadeOut: 1.9,
  fadeStagger: 0.022,
  fadeDur: 0.42,
  hold: 0.55,
  liftDur: 0.75,
}

const AXIS = { top: 'yPercent', bottom: 'yPercent', left: 'xPercent', right: 'xPercent' } as const
/** Which side of its box a window sits on when it's off that edge. */
const SIDE = { top: -101, bottom: 101, left: -101, right: 101 } as const

/** Uncovers `outer`'s content starting from the `from` edge. */
function uncover(tl: gsap.core.Timeline, outer: Element, inner: Element, from: Edge, at: number, duration = 0.6) {
  const prop = AXIS[from]
  tl.fromTo(outer, { [prop]: SIDE[from] }, { [prop]: 0, duration }, at)
  tl.fromTo(inner, { [prop]: -SIDE[from] }, { [prop]: 0, duration }, at)
}

/** Covers `outer`'s content again, the window leaving towards the `to` edge. */
function cover(tl: gsap.core.Timeline, outer: Element, inner: Element, to: Edge, at: number, duration = 0.5) {
  const prop = AXIS[to]
  tl.to(outer, { [prop]: SIDE[to], duration, ease: 'power3.inOut' }, at)
  tl.to(inner, { [prop]: -SIDE[to], duration, ease: 'power3.inOut' }, at)
}

/** The photograph's own settle inside its window, matched to the direction it was uncovered from. */
const SETTLE: Record<Edge, gsap.TweenVars> = {
  bottom: { yPercent: 6, scale: 1.1 },
  top: { yPercent: -6, scale: 1.1 },
  left: { xPercent: -6, scale: 1.08 },
  right: { xPercent: 6, scale: 1.08 },
}

export type IntroHandlers = {
  /** The still hold has begun: a safe moment for one-off preparation. */
  onHold?: () => void
  /** The preloader starts leaving: hand the page back. */
  onReveal: () => void
  onComplete: () => void
}

export type FullIntroOptions = {
  layout: PreloaderLayout
  pool: readonly PreloaderImage[]
  compact: boolean
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

/** A stride through the pool that visits every image before repeating. */
function poolStride(n: number): number {
  return [7, 5, 11, 13, 3].find((step) => step < n && gcd(step, n) === 1) ?? 1
}

/** Shared by every motion opening: the loader lifts away with the page already in place beneath it. */
function addExit(tl: gsap.core.Timeline, root: HTMLElement, at: number, dur: number, on: IntroHandlers) {
  // Promote the overlay a beat early so its layer exists before it moves.
  tl.set(root, { willChange: 'transform' }, Math.max(0, at - 0.3))
  tl.call(on.onReveal, undefined, at)
  tl.to(root, { yPercent: -100, duration: dur, ease: 'power3.inOut' }, at)
  // The content trails its frame slightly, so the lift reads as depth
  // rather than a flat wipe.
  tl.to(root.querySelector('[data-pl="inner"]'), { yPercent: 20, duration: dur, ease: 'power3.inOut' }, at)
}

export function buildFullIntro(root: HTMLElement, options: FullIntroOptions, on: IntroHandlers) {
  const { layout, pool, compact } = options
  const T = compact ? COMPACT : DESKTOP
  const n = pool.length
  const q = gsap.utils.selector(root)
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: on.onComplete })

  // Camera: one slow, small push in and settle under the montage, so the
  // frames read as a single continuous move. The word is outside this
  // layer and is never scaled.
  const stage = q('[data-pl="stage"]')
  tl.to(stage, { scale: 1.04, duration: T.cameraPeak - T.white, ease: 'power2.inOut' }, T.white)
  tl.to(stage, { scale: 1, duration: T.cameraSettle - T.cameraPeak, ease: 'power2.inOut' }, T.cameraPeak)

  // Single frames: each is uncovered over the last; once two newer ones
  // are up it is covered again (never blinked off) and dropped from
  // rendering, so only two or three photo layers are ever live.
  const shots = q('[data-pl="shot"]')
  shots.forEach((frame, i) => {
    const curtain = frame.firstElementChild!
    const how = frame.dataset.enter as ShotEntrance
    const at = T.white + i * T.shotStep
    tl.set(frame, { autoAlpha: 1 }, at)
    if (how === 'slices') {
      tl.fromTo(frame.querySelectorAll('[data-pl="slice"]'), { yPercent: 101 }, { yPercent: 0, duration: 0.6, stagger: 0.05 }, at)
      tl.fromTo(frame.querySelectorAll('img'), { scale: 1.1 }, { scale: 1, duration: 0.9, ease: 'power2.out' }, at)
    } else {
      uncover(tl, frame, curtain, how, at)
      tl.fromTo(frame.querySelector('img'), { ...SETTLE[how] }, { xPercent: 0, yPercent: 0, scale: 1, duration: 0.9, ease: 'power2.out' }, at)
    }
    const out = i + 2 < shots.length ? T.white + (i + 2) * T.shotStep : T.panelsIn + 0.15
    // Never start closing before the opening has mostly landed.
    const closeAt = Math.max(out, at + 0.45)
    cover(tl, frame, curtain, i % 2 ? 'bottom' : 'top', closeAt, 0.45)
    tl.set(frame, { autoAlpha: 0 }, closeAt + 0.45)
  })

  // Editorial panels: uncovered from different edges, cut through their
  // own (pre-decoded) images in place, then covered as the word arrives.
  q('[data-pl="panel"]').forEach((panel, i) => {
    const curtain = panel.firstElementChild!
    const img = panel.querySelector('img')!
    const images = layout.panels[i].images
    const from = panel.dataset.from as Edge
    const at = T.panelsIn + i * 0.07
    tl.set(panel, { autoAlpha: 1 }, at)
    uncover(tl, panel, curtain, from, at)
    tl.fromTo(img, { scale: 1.1 }, { scale: 1, duration: 1, ease: 'power2.out' }, at)
    for (let k = 1; k < images.length; k++) {
      const t = at + k * T.panelSwap
      if (t >= T.panelsOut) break
      const src = pool[images[k] % n].md
      tl.call(() => void (img.src = src), undefined, t)
    }
    const out = T.panelsOut + i * 0.04
    cover(tl, panel, curtain, 'top', out)
    tl.set(panel, { autoAlpha: 0 }, out + 0.5)
  })

  // Two thin strips above and below the word, uncovered from opposite
  // sides, drifting at a constant pace, then covered upwards.
  q('[data-pl="strip"]').forEach((strip, i) => {
    const curtain = strip.firstElementChild!
    const track = strip.querySelector('[data-pl="track"]')!
    const travel = Number(strip.dataset.travel)
    const [from, to] = strip.dataset.reverse === 'true' ? [-5, -5 - travel] : [-5 - travel, -5]
    const at = T.stripsIn + i * 0.1
    const out = T.stripsOut + i * 0.06
    tl.set(strip, { autoAlpha: 1 }, at)
    uncover(tl, strip, curtain, i % 2 ? 'right' : 'left', at, 0.8)
    tl.fromTo(track, { xPercent: from }, { xPercent: to, duration: out + 0.5 - at, ease: 'none' }, at)
    cover(tl, strip, curtain, 'top', out)
    tl.set(strip, { autoAlpha: 0 }, out + 0.5)
  })

  // Montage done: take the whole layer out of rendering for the resolve.
  tl.set(stage, { autoAlpha: 0 }, Math.max(T.stripsOut + 0.7, T.panelsOut + 0.8))

  // The word. Photographs rise into the letters column by column.
  const cols = q('[data-pl="col"]')
  const rises = q('[data-pl="col-rise"]')
  const colImgs = q<HTMLImageElement>('[data-pl="col-img"]')
  const photos = q('[data-pl="photos"]')
  const solid = q('[data-pl="solid"]')
  gsap.set(solid, { opacity: 0 })
  // Each photo is 124% of its column (room for the drift) and pokes 12%
  // above its riser, plus up to ~4% more from its drift, so the riser
  // starts 130% down to be fully hidden.
  gsap.set(rises, { yPercent: 130 })
  tl.to(rises, { yPercent: 0, duration: 0.9, stagger: 0.03 }, T.wordIn)

  // Inside the letters each photograph drifts slowly (desktop only) and
  // changes on its own clock, the changes spacing out towards the end.
  // The drift eases to rest before the resolve begins, so nothing moves
  // while the layers cross-fade.
  const stride = poolStride(n)
  colImgs.forEach((img, i) => {
    if (!compact) {
      const sign = i % 2 ? 1 : -1
      tl.fromTo(
        img,
        { xPercent: -4 * sign, yPercent: 3 * sign },
        { xPercent: 4 * sign, yPercent: -3 * sign, duration: T.solidIn - T.wordIn, ease: 'power1.out' },
        T.wordIn,
      )
    }
    const base = 0.13 + (i % 3) * 0.035
    for (let t = T.wordIn + 0.1 + i * 0.02, k = 1; t < T.swapEnd; k++) {
      const src = pool[(i * 5 + k * stride) % n].sm
      tl.call(() => void (img.src = src), undefined, t)
      const thinning = Math.max(0, (t - T.swapSlow) / (T.swapEnd - T.swapSlow))
      t += base * (1 + thinning * 2)
    }
  })

  // The resolve. Both layers occupy exactly the same box and neither
  // moves: the solid wordmark fades up underneath while still covered,
  // then the photographs fade off it letter by letter. The photo layer
  // is then dropped from rendering — an invisible change.
  const settled = T.fadeOut + T.fadeDur + T.fadeStagger * Math.max(0, cols.length - 1)
  tl.to(solid, { opacity: 1, duration: 0.4, ease: 'power2.out' }, T.solidIn)
  tl.to(cols, { opacity: 0, duration: T.fadeDur, ease: 'power2.inOut', stagger: T.fadeStagger }, T.fadeOut)
  tl.set(photos, { autoAlpha: 0 }, settled)
  if (on.onHold) tl.call(on.onHold, undefined, settled)

  addExit(tl, root, settled + T.hold, T.liftDur, on)
  return tl
}

/** Repeat visits in a session: the wordmark is already up, the loader just lifts away (~0.5s). */
export function buildBrief(root: HTMLElement, on: IntroHandlers) {
  const tl = gsap.timeline({ paused: true, onComplete: on.onComplete })
  addExit(tl, root, 0.05, 0.5, on)
  return tl
}

/** prefers-reduced-motion: hold the static wordmark ~0.5s, then fade — no movement at all. */
export function buildReduced(root: HTMLElement, on: IntroHandlers) {
  return gsap
    .timeline({ paused: true, onComplete: on.onComplete })
    .call(on.onReveal, undefined, 0.5)
    .to(root, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' }, 0.5)
}
