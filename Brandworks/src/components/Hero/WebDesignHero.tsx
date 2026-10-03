import { mediaUrl } from '../../lib/media'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
const backdropPoster = mediaUrl("footer-showreel-poster.webp")
import './WebDesignHero.css'

/*
 * Web Design & Development: "the website builds itself".
 *
 * A small studio site, coded in HTML/CSS so every piece can move, sits in a
 * minimal browser on a near-black technical grid, with three design-system
 * fragments around it. A lime cursor directs the film:
 *
 *   hover the artwork → select the headline → the site strips back to its
 *   wireframe → a scan line renders it back into the finished design →
 *   press the CTA → the fragments separate and return → rest, and again.
 *
 * The site is rendered twice from the same markup — once finished, once as
 * wireframe — so the two states line up exactly at every size. Everything is
 * decorative: the whole visual is aria-hidden and holds nothing focusable.
 *
 * The timeline only exists while Web is the active service. It pauses when
 * the hero leaves the viewport, and is reverted once HeroMedia has faded the
 * layer out. Reduced motion never builds it: the CSS alone is the finished,
 * static composition.
 */

// Matches HeroMedia's outgoing fade (0.25s delay + 0.8s): only reset once
// the layer can no longer be seen.
const RESET_DELAY = 1100
// A resize rebuilds the loop against the new layout, once it has settled.
const RESIZE_DEBOUNCE = 220
// Matches the browser's reshape transition in the CSS, plus a beat.
const DEVICE_SETTLE = 800
const SCAN_DURATION = 2.8
// Seen only through frosted glass, so the light encode is plenty.
const BACKDROP_VIDEO = mediaUrl("footer-showreel-540.mp4")

type Box = { x: number; y: number; w: number; h: number }
type Point = { x: number; y: number }

/** Layout box of `el` relative to `ancestor`, ignoring transforms — so the
 *  cursor is aimed at where things settle, never at a mid-animation frame
 *  or the layer's cross-fade zoom. */
function boxIn(el: HTMLElement, ancestor: HTMLElement): Box {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== ancestor) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const pointIn = (b: Box, fx: number, fy: number): Point => ({ x: b.x + b.w * fx, y: b.y + b.h * fy })

/** Normalised time at which a sine.inOut sweep from 1 → 0 reaches `pos`. */
const sweepTime = (pos: number) => Math.acos(Math.min(1, Math.max(-1, 2 * pos - 1))) / Math.PI

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  )
}

/** The studio site inside the browser. `wire` renders the same layout as
 *  its structure: blocks for type, outlines for boxes, a column grid. */
function Site({ variant }: { variant: 'final' | 'wire' }) {
  const wire = variant === 'wire'
  return (
    <div className={`wd-site wd-site--${variant}`} data-wd-site={variant}>
      {wire && (
        <div className="wd-cols">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}

      <div className="wd-nav" data-wd-in data-wd-lift>
        <span className="wd-logo">
          <span className="wd-t">Brand Work</span>
        </span>
        <span className="wd-links">
          <span className="wd-t">Work</span>
          <span className="wd-t">Studio</span>
          <span className="wd-t">Journal</span>
        </span>
        <span className="wd-contact">
          <span className="wd-t">Contact</span>
        </span>
        <span className="wd-burger">
          <i />
          <i />
        </span>
        {wire && <span className="wd-tag wd-tag--in">nav</span>}
      </div>

      <div className="wd-main">
        <div className="wd-text">
          <span className="wd-eyebrow" data-wd-in>
            <span className="wd-t">Digital studio / 2026</span>
          </span>

          <span className="wd-h1">
            <span className="wd-mask">
              <span className="wd-line" data-wd-in>
                <span className="wd-t">Ideas made</span>
              </span>
            </span>
            <span className="wd-mask">
              <span className="wd-line" data-wd-in data-wd="headline">
                <span className="wd-t">interactive.</span>
              </span>
            </span>
            {wire ? (
              <span className="wd-tag">h1 · 48 / 0.92</span>
            ) : (
              <span className="wd-select" data-wd="select">
                <i />
                <i />
                <i />
                <i />
                <span className="wd-select__tag">H1 · 48 / −4%</span>
              </span>
            )}
          </span>

          <span className="wd-copy" data-wd-in>
            <span className="wd-t">Digital experiences built around clarity, interaction and performance.</span>
          </span>

          <span className="wd-cta" data-wd-in data-wd-lift data-wd="cta">
            {!wire && <span className="wd-cta__fill" data-wd="cta-fill" />}
            <span className="wd-cta__label" data-wd="cta-label">
              <span className="wd-t">Explore work</span>
            </span>
            <span className="wd-cta__arrow" data-wd="cta-arrow">
              <ArrowGlyph />
            </span>
            {wire && <span className="wd-tag">button</span>}
          </span>
        </div>

        <div className="wd-art" data-wd-in>
          <span className="wd-art__frame" data-wd-lift data-wd="art">
            {wire ? (
              <svg className="wd-art__x" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
                <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <>
                <span className="wd-art__img" data-wd="art-img">
                  <span className="wd-art__orb" />
                  <span className="wd-art__orbit" />
                  <span className="wd-art__rule" />
                </span>
                <span className="wd-view" data-wd="view">
                  View case <ArrowGlyph />
                </span>
              </>
            )}
            {wire && <span className="wd-tag wd-tag--in">image · 6:5</span>}
          </span>
          <span className="wd-art__cap">
            <span className="wd-t">Fig. 01 — Motion study</span>
            <span className="wd-t">(2026)</span>
          </span>
        </div>
      </div>

      <div className="wd-foot" data-wd-in>
        <span className="wd-t">Selected work</span>
        <span className="wd-t">01 Aerolink</span>
        <span className="wd-t">02 Riaaj</span>
        <span className="wd-t">03 Nexa</span>
      </div>
    </div>
  )
}

function DevelopmentCard() {
  return (
    <div className="wd-card wd-card--code" data-wd-card="code">
      <div className="wd-card__head">
        <span>Development</span>
        <span className="wd-mono">section.tsx</span>
      </div>
      <div className="wd-code wd-mono">
        <span><i>1</i><b>&lt;section&gt;</b></span>
        <span><i>2</i>  <b>&lt;Experience</b></span>
        <span className="is-accent"><i>3</i>    motion=<em>"considered"</em></span>
        <span><i>4</i>  <b>/&gt;</b></span>
        <span><i>5</i><b>&lt;/section&gt;</b></span>
      </div>
    </div>
  )
}

function TypeCard() {
  return (
    <div className="wd-card wd-card--type" data-wd-card="type">
      <div className="wd-card__head">
        <span>Interface</span>
        <span className="wd-mono">H1</span>
      </div>
      <div className="wd-type__specimen">
        Aa
        <span className="wd-type__hl" data-wd="type-hl" />
      </div>
      <dl className="wd-type__specs wd-mono">
        <div><dt>Size</dt><dd>48</dd></div>
        <div><dt>Track</dt><dd>−4%</dd></div>
        <div><dt>Lead</dt><dd>0.92</dd></div>
      </dl>
    </div>
  )
}

type Device = 'desktop' | 'tablet' | 'phone'

const DEVICES: { id: Device; width: number }[] = [
  { id: 'desktop', width: 1440 },
  { id: 'tablet', width: 834 },
  { id: 'phone', width: 390 },
]

/** The one control in the visual: pick a screen and the browser becomes
 *  it. Pointer-only, like the rest of this decorative layer. */
function ResponsiveCard({ device, onDevice }: { device: Device; onDevice: (device: Device) => void }) {
  return (
    <div className="wd-card wd-card--resp" data-wd-card="resp">
      <div className="wd-card__head">
        <span>Responsive</span>
      </div>
      <div className="wd-devices">
        {DEVICES.map(({ id, width }) => (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            className={`wd-device-btn ${device === id ? 'is-on' : ''}`}
            onClick={() => onDevice(id)}
          >
            <span className="wd-device-btn__icon">
              <span className={`wd-device wd-device--${id} ${device === id ? 'is-on' : ''}`} />
            </span>
            <span className="wd-device-btn__size wd-mono">{width}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Once, each time Web becomes the active service. */
function buildIntro(root: HTMLElement) {
  const final = root.querySelector<HTMLElement>('[data-wd-site="final"]')!
  const q = gsap.utils.selector(root)
  const settle = gsap.utils.toArray<HTMLElement>('[data-wd-in]:not(.wd-line)', final)
  const lines = gsap.utils.toArray<HTMLElement>('.wd-line', final)

  return gsap
    .timeline({ delay: 0.15, defaults: { ease: 'expo.out' } })
    .from(q('.wd-grid'), { opacity: 0, duration: 1.8, ease: 'power2.out' }, 0)
    .from(q('.wd-browser'), { opacity: 0, y: 34, scale: 0.975, duration: 1.6 }, 0.1)
    .from(settle, { opacity: 0, y: 12, duration: 1.2, stagger: 0.07, ease: 'power3.out' }, 0.55)
    .from(lines, { yPercent: 112, duration: 1.2, stagger: 0.09, ease: 'power4.out' }, 0.65)
    .from(q('[data-wd="art-img"]'), { scale: 1.14, duration: 2 }, 0.5)
    .from(q('[data-wd-card]'), { opacity: 0, y: 18, duration: 1.3, stagger: 0.15, ease: 'power3.out' }, 1.05)
}

/**
 * The repeating film. It starts and ends on the same frame — cursor parked
 * and hidden, finished site, fragments home — so the repeat is invisible.
 */
function buildLoop(root: HTMLElement, stage: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!
  const final = $('[data-wd-site="final"]')
  const inFinal = <T extends HTMLElement = HTMLElement>(selector: string) => final.querySelector<T>(selector)!
  const wire = $('.wd-wire')
  const viewport = $('.wd-viewport')
  const cursor = $('[data-wd="cursor"]')
  const scan = $('[data-wd="scan"]')
  const art = inFinal('[data-wd="art"]')
  const cta = inFinal('[data-wd="cta"]')
  const headline = inFinal('[data-wd="headline"]')
  const settleTargets = gsap.utils.toArray<HTMLElement>('[data-wd-in]', final)
  const tags = gsap.utils.toArray<HTMLElement>('.wd-tag', wire)
  const card = (name: string) => $(`[data-wd-card="${name}"]`)

  const compact = stage.clientWidth < 600
  const vp = boxIn(viewport, stage)
  const rig = boxIn($('.wd-rig'), stage)
  const stageH = stage.clientHeight

  const rest: Point = {
    x: Math.max(16, rig.x + rig.w * (compact ? 0.12 : 0.04)),
    y: Math.min(stageH - 8, rig.y + rig.h + (compact ? 18 : 30)),
  }
  const onArt = pointIn(boxIn(art, stage), 0.6, 0.62)
  const onHeadline = pointIn(boxIn(headline, stage), 0.74, 0.6)
  const onEdge: Point = { x: vp.x + vp.w - (compact ? 22 : 34), y: vp.y + vp.h * 0.2 }
  const onCta = pointIn(boxIn(cta, stage), 0.64, 0.62)

  // The wireframe opens as a lens from the point the cursor selects.
  const lensX = onHeadline.x - vp.x
  const lensY = onHeadline.y - vp.y
  const lensR = Math.ceil(Math.hypot(Math.max(lensX, vp.w - lensX), Math.max(lensY, vp.h - lensY))) + 4
  const lens = (r: number) => `circle(${r}px at ${Math.round(lensX)}px ${Math.round(lensY)}px)`

  const spread = compact ? 0.55 : 1
  const drift: Record<string, Point> = {
    code: { x: -16 * spread, y: 12 * spread },
    type: { x: 18 * spread, y: 5 * spread },
    resp: { x: 12 * spread, y: -12 * spread },
  }

  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power3.inOut' } })

  /** Cursor travel with slightly different x/y curves, so it arcs. */
  const travel = (to: Point, duration: number, at: number) => {
    tl.to(cursor, { x: to.x, duration, ease: 'power3.inOut' }, at)
    tl.to(cursor, { y: to.y, duration, ease: 'power2.inOut' }, at)
  }
  const press = (at: number) => {
    tl.to(cursor, { scale: 0.86, duration: 0.12, ease: 'power2.out' }, at)
    tl.to(cursor, { scale: 1, duration: 0.4, ease: 'power3.out' }, at + 0.12)
  }

  // 0 — home frame.
  tl.set(cursor, { x: rest.x, y: rest.y, scale: 1, opacity: 0 }, 0)
  tl.set(wire, { clipPath: lens(0) }, 0)
  // x is pinned to 0: GSAP reads the CSS translateX(100%) as pixels.
  tl.set(scan, { x: 0, xPercent: 100, opacity: 0 }, 0)

  // 1 — the cursor enters and finds the artwork.
  tl.to(cursor, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.4)
  travel(onArt, 1.5, 0.4)
  tl.to(inFinal('[data-wd="art-img"]'), { scale: 1.05, duration: 1.5, ease: 'power2.out' }, 1.8)
  tl.fromTo(
    inFinal('[data-wd="view"]'),
    { opacity: 0, scale: 0.92 },
    { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out', immediateRender: false },
    1.95,
  )
  tl.to(inFinal('[data-wd="view"]'), { opacity: 0, duration: 0.3, ease: 'power1.out' }, 3.15)
  tl.to(inFinal('[data-wd="art-img"]'), { scale: 1, duration: 1.3, ease: 'power2.inOut' }, 3.2)

  // 2 — it moves to the type and selects the headline.
  travel(onHeadline, 1.3, 3.15)
  press(4.5)
  tl.fromTo(
    inFinal('[data-wd="select"]'),
    { opacity: 0, scale: 1.02 },
    { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', immediateRender: false },
    4.58,
  )
  tl.fromTo(
    $('[data-wd="type-hl"]'),
    { scaleX: 0 },
    { scaleX: 1, duration: 0.6, ease: 'power3.out', immediateRender: false },
    4.62,
  )

  // 3 — the site strips back to its structure, opening from that point.
  tl.to(inFinal('[data-wd="select"]'), { opacity: 0, duration: 0.3, ease: 'power1.out' }, 5.4)
  tl.to(wire, { clipPath: lens(lensR), duration: 1.3, ease: 'power3.inOut' }, 5.45)
  tl.fromTo(
    tags,
    { opacity: 0, y: 3 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out', immediateRender: false },
    6.05,
  )
  tl.to($('[data-wd="type-hl"]'), { scaleX: 0, transformOrigin: '100% 50%', duration: 0.5, ease: 'power2.inOut' }, 6.2)
  tl.set($('[data-wd="type-hl"]'), { transformOrigin: '0% 50%' }, 6.75)
  travel(onEdge, 1.1, 6.45)

  // 4 — a lime scan renders structure back into the finished design. Each
  // element resolves as the line reaches it, so the pass reads as building,
  // not as a before/after wipe.
  const scanAt = 7.7
  tl.set(wire, { clipPath: 'inset(0% 0% 0% 0%)' }, scanAt - 0.05)
  tl.set(settleTargets, { opacity: 0.3, y: 8 }, scanAt - 0.05)
  tl.to(scan, { opacity: 1, duration: 0.35, ease: 'power1.out' }, scanAt - 0.1)
  tl.to(scan, { xPercent: 0, duration: SCAN_DURATION, ease: 'sine.inOut' }, scanAt)
  tl.to(wire, { clipPath: 'inset(0% 100% 0% 0%)', duration: SCAN_DURATION, ease: 'sine.inOut' }, scanAt)
  settleTargets.forEach((el) => {
    const b = boxIn(el, viewport)
    const reach = sweepTime(Math.min(1, (b.x + b.w * 0.85) / vp.w))
    tl.to(el, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, scanAt + reach * SCAN_DURATION)
  })
  tl.to(scan, { opacity: 0, duration: 0.45, ease: 'power1.in' }, scanAt + SCAN_DURATION - 0.2)
  // The cursor follows the light back across the page to the CTA.
  travel(onCta, 2.1, scanAt + 0.9)

  // 5 — the CTA answers the cursor.
  const ctaAt = scanAt + 3.15
  tl.fromTo(
    inFinal('[data-wd="cta-fill"]'),
    { scaleX: 0, transformOrigin: '0% 50%' },
    { scaleX: 1, duration: 0.6, ease: 'power3.out', immediateRender: false },
    ctaAt,
  )
  tl.to(inFinal('[data-wd="cta-label"]'), { color: '#0b0b0b', duration: 0.4, ease: 'power2.out' }, ctaAt + 0.05)
  tl.to(inFinal('[data-wd="cta-arrow"]'), { x: 2, y: -2, color: '#0b0b0b', duration: 0.5, ease: 'power3.out' }, ctaAt + 0.05)
  press(ctaAt + 0.65)
  tl.to(cta, { scale: 0.965, duration: 0.12, ease: 'power2.out' }, ctaAt + 0.65)
  tl.to(cta, { scale: 1, duration: 0.45, ease: 'power3.out' }, ctaAt + 0.77)

  // 6 — the pieces of the system separate slightly, then return.
  const splitAt = ctaAt + 1.35
  tl.to(inFinal('[data-wd="cta-fill"]'), { scaleX: 0, transformOrigin: '100% 50%', duration: 0.6, ease: 'power2.inOut' }, splitAt)
  tl.to(inFinal('[data-wd="cta-label"]'), { color: '#fff', duration: 0.45, ease: 'power2.inOut' }, splitAt + 0.1)
  tl.to(inFinal('[data-wd="cta-arrow"]'), { x: 0, y: 0, color: '#fff', duration: 0.5, ease: 'power2.inOut' }, splitAt + 0.1)
  travel({ x: onCta.x + 22 * spread, y: onCta.y + 30 * spread }, 1.3, splitAt)
  Object.entries(drift).forEach(([name, d]) => {
    tl.to(card(name), { x: d.x, y: d.y, duration: 1.4 }, splitAt)
    tl.to(card(name), { x: 0, y: 0, duration: 1.4 }, splitAt + 2.1)
  })
  tl.to(inFinal('.wd-nav'), { y: -4 * spread, duration: 1.4 }, splitAt + 0.05)
  tl.to(art, { y: -8 * spread, scale: 1.015, boxShadow: '0 22px 44px -18px rgba(0, 0, 0, 0.5)', duration: 1.4 }, splitAt + 0.1)
  tl.to(cta, { y: -4 * spread, boxShadow: '0 12px 22px -12px rgba(0, 0, 0, 0.55)', duration: 1.4 }, splitAt + 0.15)
  tl.to(inFinal('.wd-nav'), { y: 0, duration: 1.4 }, splitAt + 2.1)
  tl.to(art, { y: 0, scale: 1, boxShadow: '0 0px 0px 0px rgba(0, 0, 0, 0)', duration: 1.4 }, splitAt + 2.1)
  tl.to(cta, { y: 0, boxShadow: '0 0px 0px 0px rgba(0, 0, 0, 0)', duration: 1.4 }, splitAt + 2.1)

  // 7 — the cursor leaves, the finished site holds, and it begins again.
  const exitAt = splitAt + 2.9
  travel(rest, 1.6, exitAt)
  tl.to(cursor, { opacity: 0, duration: 0.6, ease: 'power2.in' }, exitAt + 1.0)
  tl.set({}, {}, exitAt + 3.4)

  return tl
}

type Run = { intro: gsap.core.Timeline; loop: gsap.core.Timeline | null }

function WebDesignHero({
  active,
  playing,
  reducedMotion,
}: {
  active: boolean
  playing: boolean
  reducedMotion: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const playingRef = useRef(playing)
  const runRef = useRef<Run | null>(null)
  const pendingRef = useRef<{ ctx: gsap.Context; timer: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rebuildRef = useRef<((delay: number) => void) | null>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [videoRequested, setVideoRequested] = useState(false)

  // The backdrop film is fetched on the first visit and only runs while
  // Web is on screen. Reduced motion keeps the still.
  const wantsVideo = playing && !reducedMotion
  if (wantsVideo && !videoRequested) setVideoRequested(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (wantsVideo) void video.play().catch(() => undefined)
    else video.pause()
  }, [wantsVideo, videoRequested])

  const flushPending = () => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    window.clearTimeout(pending.timer)
    pending.ctx.revert()
  }

  // Off screen (or on its way out) the film simply holds its frame.
  useEffect(() => {
    playingRef.current = playing
    const run = runRef.current
    if (!run) return
    const current = run.loop ?? run.intro
    if (playing) current.resume()
    else current.pause()
  }, [playing])

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage || !active || reducedMotion) return

    // Returning before the last visit was cleared: clear it now, so the
    // new run starts from the clean, finished composition.
    flushPending()

    const run: Run = { intro: gsap.timeline(), loop: null }
    const ctx = gsap.context(() => {}, root)

    const startLoop = () => {
      ctx.add(() => {
        run.loop = buildLoop(root, stage)
        if (!playingRef.current) run.loop.pause()
      })
    }

    ctx.add(() => {
      run.intro = buildIntro(root)
      run.intro.eventCallback('onComplete', startLoop)
      if (!playingRef.current) run.intro.pause()
    })
    runRef.current = run

    // The cursor's route is measured, so a new layout means a new route.
    // A new layout — the stage resized, or a different screen picked in
    // the Responsive card — means a new route: reset to the clean frame,
    // then rebuild once the layout has settled.
    let width = stage.clientWidth
    let height = stage.clientHeight
    let resizeTimer: number | undefined
    const rebuild = (delay: number) => {
      window.clearTimeout(resizeTimer)
      if (run.loop) {
        run.loop.totalProgress(0).kill()
        run.loop = null
      }
      resizeTimer = window.setTimeout(() => {
        if (!run.loop && run.intro.progress() === 1) startLoop()
      }, delay)
    }
    rebuildRef.current = rebuild
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (stage.clientWidth === width && stage.clientHeight === height) return
            width = stage.clientWidth
            height = stage.clientHeight
            if (run.loop) rebuild(RESIZE_DEBOUNCE)
          })
    observer?.observe(stage)

    return () => {
      rebuildRef.current = null
      observer?.disconnect()
      window.clearTimeout(resizeTimer)
      run.intro.pause()
      run.loop?.pause()
      runRef.current = null
      pendingRef.current = { ctx, timer: window.setTimeout(flushPending, RESET_DELAY) }
    }
    // flushPending only touches refs.
  }, [active, reducedMotion])

  // Picking a screen: the browser reshapes (CSS), the site blinks through
  // the change, and the film re-measures its route for the new layout.
  const pickDevice = (next: Device) => {
    if (next === device) return
    setDevice(next)
    const viewport = rootRef.current?.querySelector<HTMLElement>('.wd-viewport')
    if (viewport && !reducedMotion) {
      gsap.fromTo(viewport, { opacity: 0.15 }, { opacity: 1, duration: 0.6, delay: 0.3, ease: 'power2.out' })
    }
    rebuildRef.current?.(DEVICE_SETTLE)
  }

  // Pointer parallax: the composition tilts toward the pointer, the cards
  // drift further than the browser, and the film and a soft light move
  // behind it. Mouse and trackpad only; reduced motion keeps it still.
  // Only the stage, the card layer and the backdrop move — none of them are
  // touched by the timelines, and the cursor's route is measured without
  // transforms, so the film stays on its marks.
  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const hero = root?.closest<HTMLElement>('.hero')
    if (!root || !stage || !hero || !active || reducedMotion) return
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return

    const depth = root.querySelector<HTMLElement>('[data-wd-depth]')
    const backdrop = root.querySelector<HTMLElement>('.wd-backdrop')
    const spot = root.querySelector<HTMLElement>('[data-wd-spot]')
    const targets = [stage, depth, backdrop, spot].filter((el): el is HTMLElement => Boolean(el))

    gsap.set(stage, { transformPerspective: 1400, transformOrigin: '60% 50%' })
    const ease = { duration: 0.9, ease: 'power3.out' }
    const tiltX = gsap.quickTo(stage, 'rotationX', ease)
    const tiltY = gsap.quickTo(stage, 'rotationY', ease)
    const shiftX = gsap.quickTo(stage, 'x', ease)
    const shiftY = gsap.quickTo(stage, 'y', ease)
    const depthX = depth && gsap.quickTo(depth, 'x', ease)
    const depthY = depth && gsap.quickTo(depth, 'y', ease)
    const backX = backdrop && gsap.quickTo(backdrop, 'x', { duration: 1.6, ease: 'power3.out' })
    const backY = backdrop && gsap.quickTo(backdrop, 'y', { duration: 1.6, ease: 'power3.out' })
    const spotX = spot && gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power3.out' })
    const spotY = spot && gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power3.out' })
    if (spot) gsap.to(spot, { opacity: 1, duration: 0.8 })

    /** -1…1 from the centre of the hero. */
    const aim = (nx: number, ny: number) => {
      tiltY(nx * 5)
      tiltX(ny * -4)
      shiftX(nx * 10)
      shiftY(ny * 8)
      depthX?.(nx * 18)
      depthY?.(ny * 14)
      backX?.(nx * -26)
      backY?.(ny * -20)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = hero.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      aim((px / rect.width) * 2 - 1, (py / rect.height) * 2 - 1)
      spotX?.(px)
      spotY?.(py)
    }
    const onLeave = () => aim(0, 0)

    hero.addEventListener('pointermove', onMove, { passive: true })
    hero.addEventListener('pointerleave', onLeave)

    return () => {
      hero.removeEventListener('pointermove', onMove)
      hero.removeEventListener('pointerleave', onLeave)
      gsap.killTweensOf(targets)
      // Ease home while HeroMedia fades the layer out.
      gsap.to(targets, { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: 0.8, ease: 'power3.out' })
      if (spot) gsap.to(spot, { opacity: 0, duration: 0.4 })
    }
  }, [active, reducedMotion])

  // Leaving the page: nothing waits on a timer.
  useEffect(() => () => flushPending(), [])

  return (
    <div ref={rootRef} className="web-hero" aria-hidden="true">
      <div className="wd-backdrop">
        <img className="wd-backdrop__media" src={backdropPoster} alt="" decoding="async" />
        {videoRequested && (
          <video
            ref={videoRef}
            className="wd-backdrop__media"
            src={BACKDROP_VIDEO}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
          />
        )}
      </div>
      <div className="wd-spot" data-wd-spot />
      <div className="wd-grid" />

      <div ref={stageRef} className="web-hero__stage">
        <div className="wd-rig">
          <div className="wd-halo" />

          <div className="wd-browser" data-device={device}>
            <div className="wd-chrome">
              <span className="wd-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="wd-url">
                <span className="wd-url__lock" />
                brandworks.studio
              </span>
              <span className="wd-chrome__end" />
            </div>

            <div className="wd-viewport">
              <Site variant="final" />
              <div className="wd-wire">
                <Site variant="wire" />
              </div>
              <div className="wd-scan" data-wd="scan">
                <span className="wd-scan__glow" />
                <span className="wd-scan__line" />
                <span className="wd-scan__label wd-scan__label--before wd-mono">Structure</span>
                <span className="wd-scan__label wd-scan__label--after wd-mono">Design</span>
              </div>
            </div>
          </div>

          {/* The cards float nearer than the browser: they travel further
              with the pointer. */}
          <div className="wd-depth" data-wd-depth>
            <DevelopmentCard />
            <TypeCard />
            <ResponsiveCard device={device} onDevice={pickDevice} />
          </div>
        </div>

        <div className="wd-cursor" data-wd="cursor">
          <svg className="wd-cursor__arrow" viewBox="0 0 24 28">
            <path d="M2 2 2 21.6 6.9 17.1 10.1 24.7 13.5 23.3 10.4 15.9 17.2 15.9Z" />
          </svg>
          <span className="wd-cursor__tag">BrandWorks</span>
        </div>
      </div>
    </div>
  )
}

export default WebDesignHero
