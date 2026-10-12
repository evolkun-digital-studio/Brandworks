import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { PRELOADER_IMAGES, PRELOADER_IMAGES_COMPACT } from '../../data/preloaderMedia'
import type { PreloaderImage } from '../../data/preloaderMedia'
import { armIntro, finishIntro, settleIntro } from '../../lib/introGate'
import { markIntroPlayed, resolveIntroMode } from './introMode'
import type { IntroMode } from './introMode'
import { COMPACT_LAYOUT, DESKTOP_LAYOUT, WORDMARK } from './layouts'
import type { Box, PreloaderLayout } from './layouts'
import { buildBrief, buildFullIntro, buildReduced } from './timeline'
import { measureWord, renderWordMask, WORD_FALLBACK_STACK, WORD_FONT_SIZE, WORD_FONT_STACK } from './wordGeometry'
import type { WordGeometry } from './wordGeometry'
import './Preloader.css'

// Armed at import, before anything renders, so the page underneath
// (hero copy, hero film, per-frame scroll loops) already knows to wait.
if (typeof window !== 'undefined') armIntro()

/** Past this, skip the montage (brief opening) rather than hold a blank screen. */
const IMAGE_TIMEOUT_MS = 6000
const FONT_TIMEOUT_MS = 2500
/** Covers the tail of the hero copy's rise (HeroCaption) after the loader has gone. */
const SETTLE_DELAY_MS = 500

type PlayMode = Exclude<IntroMode, 'none'>
type Ready = { mode: PlayMode; geometry: WordGeometry; pool: readonly PreloaderImage[] }

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** The single-frame file for a pool image: lg where the layout uses it and it exists, md otherwise. */
const shotSrc = (layout: PreloaderLayout, image: PreloaderImage) => (layout.shotSize === 'lg' && image.lg) || image.md

/** Exactly the files the timeline will show, each at the size it is shown at. */
function requiredSources(layout: PreloaderLayout, pool: readonly PreloaderImage[]): string[] {
  const n = pool.length
  const sources = new Set<string>()
  layout.shots.forEach((shot) => sources.add(shotSrc(layout, pool[shot.image % n])))
  layout.panels.forEach((panel) => panel.images.forEach((i) => sources.add(pool[i % n].md)))
  pool.forEach((image) => sources.add(image.sm))
  return [...sources]
}

/** Decoded images are held here for the intro's lifetime so the browser keeps them hot. */
let decoded: HTMLImageElement[] = []

/** Downloads and decodes every source. Resolves true only if all of them made it in time. */
async function preloadImages(sources: readonly string[]): Promise<boolean> {
  const jobs = sources.map((src) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    decoded.push(img)
    return img.decode().then(
      () => true,
      () => false,
    )
  })
  const results = await Promise.race([Promise.all(jobs), wait(IMAGE_TIMEOUT_MS).then(() => null)])
  return !!results && results.every(Boolean)
}

/**
 * Settles the wordmark's font before anything is measured or animated
 * (document.fonts.ready included). If Grimblade isn't ready in time the
 * word is set in the fallback stack on purpose — a face arriving later
 * could otherwise re-flow the text mid-sequence.
 */
async function resolveWordFamily(): Promise<string> {
  const fonts = document.fonts
  if (!fonts?.load) return WORD_FONT_STACK
  const spec = `400 ${WORD_FONT_SIZE}px Grimblade`
  await Promise.race([
    fonts
      .load(spec)
      .then(() => fonts.ready)
      .catch(() => undefined),
    wait(FONT_TIMEOUT_MS),
  ])
  return fonts.check(spec) ? WORD_FONT_STACK : WORD_FALLBACK_STACK
}

/**
 * Holds the page still underneath, set once and cleared once: body
 * overflow hidden (with the scrollbar's gutter kept, so nothing shifts
 * sideways), touch scrolling swallowed on the overlay (which also opts
 * out of Lenis via data-lenis-prevent), and the app root inert so focus
 * can't wander into the covered page.
 *
 * Everything is released together, only once the loader has fully left:
 * un-inerting the root restyles the whole page, which would otherwise
 * land on the first frame of the exit.
 *
 * While held, the GSAP ticker also gets lag smoothing (the site runs
 * with it off for Lenis): if the browser ever stalls, the intro resumes
 * where it was instead of skipping ahead — motion glides, never jumps.
 * And ScrollTrigger's refresh-on-window-load is postponed, so a page
 * image finishing mid-intro can't trigger a full-page re-measure under
 * the animation; if that happened, one refresh runs once we're done.
 */
function holdPage(overlay: HTMLElement): () => void {
  const html = document.documentElement
  const body = document.body
  const app = document.getElementById('root')
  const previous = { overflow: body.style.overflow, gutter: html.style.scrollbarGutter }
  const hasScrollbar = window.innerWidth > html.clientWidth
  const stopTouch = (event: Event) => event.preventDefault()

  let loadedMeanwhile = false
  const onLoad = () => {
    loadedMeanwhile = true
  }

  body.style.overflow = 'hidden'
  if (hasScrollbar) html.style.scrollbarGutter = 'stable'
  overlay.addEventListener('touchmove', stopTouch, { passive: false })
  app?.setAttribute('inert', '')
  gsap.ticker.lagSmoothing(80, 33)
  ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,resize' })
  if (document.readyState !== 'complete') window.addEventListener('load', onLoad, { once: true })

  let held = true
  return () => {
    if (!held) return
    held = false
    overlay.removeEventListener('touchmove', stopTouch)
    app?.removeAttribute('inert')
    body.style.overflow = previous.overflow
    html.style.scrollbarGutter = previous.gutter
    gsap.ticker.lagSmoothing(0)
    window.removeEventListener('load', onLoad)
    ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize' })
    if (loadedMeanwhile) {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback
      if (idle) idle(() => ScrollTrigger.refresh(), { timeout: 1500 })
      else window.setTimeout(() => ScrollTrigger.refresh(), 600)
    }
  }
}

/**
 * During the still hold, decode the images the reveal is about to
 * uncover (the page's first viewport). The page has been fully covered,
 * so the browser hasn't needed them yet; decoding them now keeps that
 * work off the first frames of the lift. Measured once, while nothing
 * is moving.
 */
function prewarmPage() {
  const viewport = window.innerHeight
  document.querySelectorAll<HTMLImageElement>('#root img').forEach((img) => {
    if (!img.complete || !img.naturalWidth) return
    const { top, bottom } = img.getBoundingClientRect()
    if (bottom > 0 && top < viewport) void img.decode().catch(() => undefined)
  })
}

const boxStyle = ({ x, y, w, h }: Box): CSSProperties => ({ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` })

/** The finished wordmark: one SVG <text>, every glyph at a fixed pen position, ".me" in the site lime. */
function SolidWordmark({ geometry }: { geometry: WordGeometry }) {
  const { text, family, width, height, xs, baseline } = geometry
  const accentAt = text.lastIndexOf('.')
  return (
    <svg className="bw-pl__solid" data-pl="solid" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <text className="bw-pl__ink" x={xs.join(' ')} y={baseline} fontFamily={family} fontSize={WORD_FONT_SIZE}>
        {accentAt > 0 ? (
          <>
            {text.slice(0, accentAt)}
            <tspan className="bw-pl__accent">{text.slice(accentAt)}</tspan>
          </>
        ) : (
          text
        )}
      </text>
    </svg>
  )
}

/**
 * The photography inside the letters: one container, masked once by the
 * rasterised word shape (see renderWordMask), holding one column per
 * letter. Columns are laid out once in % of the word box and only ever
 * transformed or faded.
 */
function PhotoColumns({ geometry, pool }: { geometry: WordGeometry; pool: readonly PreloaderImage[] }) {
  const { width, glyphs } = geometry
  // A hair of overlap so neighbouring columns never leave a seam inside a glyph.
  const bleed = width * 0.003
  return (
    <div className="bw-pl__photos" data-pl="photos">
      {glyphs.map((glyph, i) => (
        <div
          key={i}
          className="bw-pl__col"
          data-pl="col"
          style={{
            left: `${(glyph.x / width) * 100}%`,
            width: `${((glyph.width + (i < glyphs.length - 1 ? bleed : 0)) / width) * 100}%`,
          }}
        >
          <div className="bw-pl__col-rise" data-pl="col-rise">
            <img className="bw-pl__col-img" data-pl="col-img" src={pool[(i * 5) % pool.length].sm} alt="" draggable={false} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Opening sequence for the public site: an editorial montage of
 * BrandWorks work that resolves into the Brandworks.me wordmark,
 * photography inside its letters, then a still, solid wordmark that
 * lifts away to reveal the page — already mounted — underneath.
 *
 * Nothing animates until every image is decoded and the font settled.
 * The timeline is built once (guarded by a ref, inside one
 * gsap.context reverted on unmount) and React never re-renders during
 * it: GSAP drives the DOM directly, and the only state change after
 * start is removing the loader once it has fully left the screen.
 *
 * See introMode.ts for who sees which version (full / brief / reduced),
 * layouts.ts for the cut list, timeline.ts for the choreography.
 */
function Preloader() {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<IntroMode>('none')
  const [compact, setCompact] = useState(false)
  const layout: PreloaderLayout = compact ? COMPACT_LAYOUT : DESKTOP_LAYOUT
  const [ready, setReady] = useState<Ready | null>(null)
  const [done, setDone] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const releaseRef = useRef<(() => void) | null>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const nextMode = resolveIntroMode()
    setCompact(window.matchMedia?.('(max-width: 767px)').matches ?? false)
    setMode(nextMode)
    setDone(nextMode === 'none')
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && mode === 'none') settleIntro()
  }, [mode, mounted])

  // Load: hold the page, then fetch + decode every image and settle the font.
  useEffect(() => {
    const overlay = rootRef.current
    if (mode === 'none' || !overlay) return
    let cancelled = false
    const release = holdPage(overlay)
    releaseRef.current = release

    const pool = compact ? PRELOADER_IMAGES_COMPACT : PRELOADER_IMAGES
    const sources = mode === 'full' ? requiredSources(layout, pool) : []
    Promise.all([preloadImages(sources), resolveWordFamily()]).then(([allDecoded, family]) => {
      if (cancelled) return
      const playMode: PlayMode = mode === 'full' && !allDecoded ? 'brief' : mode
      setReady({ mode: playMode, geometry: measureWord(WORDMARK, family), pool })
    })

    return () => {
      cancelled = true
      release()
    }
  }, [mode, compact, layout])

  // Play: measure once, build the paused timeline before the first frame
  // with the full markup is painted, then start it.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!ready || !root || timelineRef.current) return
    markIntroPlayed()

    // The word's mask: rasterised once from a single measurement, and
    // decoded before the first frame plays so it never costs a frame.
    let maskReady: Promise<unknown> = Promise.resolve()
    if (ready.mode === 'full') {
      const photos = root.querySelector<HTMLElement>('[data-pl="photos"]')
      const mask = photos && renderWordMask(ready.geometry, photos.getBoundingClientRect().width)
      if (photos && mask) {
        photos.style.setProperty('-webkit-mask-image', `url(${mask})`)
        photos.style.setProperty('mask-image', `url(${mask})`)
        const probe = new Image()
        probe.src = mask
        maskReady = probe.decode().catch(() => undefined)
      } else if (photos) {
        photos.style.display = 'none'
      }
    }

    const handlers = {
      onHold: prewarmPage,
      onReveal: finishIntro,
      // Only now, with the loader fully off screen, is it removed. The
      // hero copy is still finishing its rise, so releasing the page
      // (un-inerting it restyles everything) and the deferred page work
      // (hero film, scroll loops) wait a moment longer for it to land.
      onComplete: () => {
        decoded = []
        setDone(true)
        window.setTimeout(() => {
          releaseRef.current?.()
          settleIntro()
        }, SETTLE_DELAY_MS)
      },
    }
    let timeline: gsap.core.Timeline | undefined
    const ctx = gsap.context(() => {
      timeline =
        ready.mode === 'full'
          ? buildFullIntro(root, { layout, pool: ready.pool, compact }, handlers)
          : ready.mode === 'brief'
            ? buildBrief(root, handlers)
            : buildReduced(root, handlers)
    }, root)
    timelineRef.current = timeline ?? null
    let cancelled = false
    void maskReady.then(() => {
      if (!cancelled) timeline?.play()
    })

    return () => {
      cancelled = true
      ctx.revert()
      timelineRef.current = null
    }
  }, [ready, layout, compact])

  if (!mounted || done) return null

  const full = ready?.mode === 'full'
  const pool = ready?.pool ?? []
  const n = pool.length
  // Before measurement nothing is visible, so the estimate never shows.
  const aspect = ready ? ready.geometry.width / ready.geometry.height : 7

  return createPortal(
    <div ref={rootRef} className={`bw-pl${compact ? ' is-compact' : ''}`} data-lenis-prevent role="status">
      <span className="bw-pl__sr">{WORDMARK}</span>

      <div className="bw-pl__inner" data-pl="inner" aria-hidden="true">
        {full && (
          <div className="bw-pl__stage" data-pl="stage">
            {layout.strips.map((strip, i) => (
              <div
                key={i}
                className="bw-pl__strip"
                data-pl="strip"
                data-reverse={strip.reverse}
                data-travel={strip.travel}
                style={{ top: `${strip.at}%`, height: `${strip.size}%` }}
              >
                <div className="bw-pl__curtain">
                  <div className="bw-pl__track" data-pl="track">
                    {Array.from({ length: layout.stripTiles }, (_, k) => (
                      <img key={k} className="bw-pl__tile" src={pool[(i * 7 + k * 3) % n].sm} alt="" draggable={false} />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {layout.shots.map((shot, i) => {
              const src = shotSrc(layout, pool[shot.image % n])
              return (
                <div key={i} className="bw-pl__frame" data-pl="shot" data-enter={shot.enter} style={boxStyle(shot.box)}>
                  <div className="bw-pl__curtain">
                    {shot.enter === 'slices' ? (
                      Array.from({ length: layout.slices }, (_, k) => (
                        <div
                          key={k}
                          className="bw-pl__slice"
                          data-pl="slice"
                          style={{ '--i': k, '--n': layout.slices } as CSSProperties}
                        >
                          <img className="bw-pl__img" src={src} alt="" draggable={false} />
                        </div>
                      ))
                    ) : (
                      <img className="bw-pl__img" src={src} alt="" draggable={false} />
                    )}
                  </div>
                </div>
              )
            })}

            {layout.panels.map((panel, i) => (
              <div key={i} className="bw-pl__frame" data-pl="panel" data-from={panel.from} style={boxStyle(panel.box)}>
                <div className="bw-pl__curtain">
                  <img className="bw-pl__img" src={pool[panel.images[0] % n].md} alt="" draggable={false} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bw-pl__center">
          <div className="bw-pl__word" style={{ '--aspect': aspect } as CSSProperties}>
            {ready && <SolidWordmark geometry={ready.geometry} />}
            {ready && full && <PhotoColumns geometry={ready.geometry} pool={pool} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default Preloader
