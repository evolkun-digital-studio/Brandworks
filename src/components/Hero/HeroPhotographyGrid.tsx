import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { HeroGalleryImage } from '../../data/heroServices'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'

const FEATURED_SIZE = '(max-width: 639px) 100vw, 34vw'
const THUMBNAIL_SIZE = '(max-width: 639px) 25vw, (max-width: 1023px) 17vw, 13vw'
const FEATURED_COUNT = 3

// Auto-rotation: after a rest the three feature frames move on to the next
// three photographs, one frame at a time, left to right.
const ROTATE_REST = 3000
const ROTATE_STAGGER = 420
// A click answers at once; the frames beside it follow a beat behind.
const CLICK_STAGGER = 90

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

type Selection = {
  /** Index into `images` of the photograph in the leading feature frame. */
  index: number
  /** Delay between frames for this change, in ms. */
  stagger: number
}

/** Resolves once the image is decoded (or has failed), never rejects. */
function preload(image: HeroGalleryImage, sizes: string): Promise<void> {
  const img = new Image()
  if (image.srcSet) {
    img.sizes = sizes
    img.srcset = image.srcSet
  }
  img.src = image.src
  return img.decode().catch(() => undefined)
}

/** Flags the frame ready once `img` is decoded, if it is still the frame's image. */
function markReady(
  img: HTMLImageElement,
  id: string,
  currentId: { readonly current: string },
  setReady: (ready: boolean) => void,
) {
  void img
    .decode()
    .catch(() => undefined)
    .then(() => {
      if (currentId.current === id) setReady(true)
    })
}

/**
 * One feature frame. It always holds a visible photograph: a new image is
 * layered over the old one, stays transparent until it has loaded and
 * decoded, then resolves in from a slight zoom. Only after that fade has
 * finished is the old image removed. If the new image never loads, the old
 * one simply stays on screen.
 */
function FeaturedFrame({
  image,
  delay,
  priority,
}: {
  image: HeroGalleryImage
  delay: number
  priority: ImagePriority
}) {
  const layerRef = useRef<HTMLDivElement>(null)
  const currentId = useRef(image.id)
  const [current, setCurrent] = useState(image)
  const [previous, setPrevious] = useState<HeroGalleryImage | null>(null)
  const [ready, setReady] = useState(true)

  if (image.id !== current.id) {
    // Whichever photograph is actually on screen stays underneath: the old
    // one if the incoming image never got as far as showing, else this one.
    const underneath = previous && !ready ? previous : current
    if (underneath.id === image.id) {
      // Switched straight back to the photograph already showing.
      setPrevious(null)
      setReady(true)
    } else {
      setPrevious(underneath)
      setReady(false)
    }
    setCurrent(image)
  }

  useLayoutEffect(() => {
    currentId.current = current.id
    // A cached image can be complete before onLoad is attached.
    const img = layerRef.current?.querySelector('img')
    if (img?.complete && img.naturalWidth > 0) markReady(img, current.id, currentId, setReady)
  }, [current.id])

  const entering = previous !== null
  const state = entering ? (ready ? 'is-entering' : 'is-waiting') : ''

  return (
    <>
      {previous && (
        <div key={previous.id} className="gallery-frame">
          <HeroImg image={previous} sizes={FEATURED_SIZE} priority="low" />
        </div>
      )}
      <div
        key={current.id}
        ref={layerRef}
        className={`gallery-frame ${state}`}
        style={entering ? { animationDelay: `${delay}ms` } : undefined}
        onAnimationEnd={() => setPrevious(null)}
      >
        <HeroImg
          image={current}
          sizes={FEATURED_SIZE}
          priority={priority}
          onLoad={(event) => markReady(event.currentTarget, current.id, currentId, setReady)}
        />
      </div>
    </>
  )
}

/**
 * Two-level editorial gallery: three feature frames above a fixed contact
 * sheet. One piece of state — the selected photograph — drives both a click
 * on the contact sheet and the automatic rotation: the feature frames show
 * the selected photograph and the two that follow it.
 */
function HeroPhotographyGrid({
  images,
  priority,
  active,
  reducedMotion,
}: {
  images: readonly HeroGalleryImage[]
  priority: ImagePriority
  active: boolean
  reducedMotion: boolean
}) {
  const [selection, setSelection] = useState<Selection>({ index: 0, stagger: 0 })
  const hovering = useRef(false)
  const count = images.length

  const photoAt = (offset: number) => images[(selection.index + offset) % count] ?? images[0]
  const featuredImages = Array.from({ length: Math.min(FEATURED_COUNT, count) }, (_, slot) => photoAt(slot))
  const thumbnailImages = images.slice(FEATURED_COUNT)
  const selectedId = photoAt(0)?.id

  // Once the page is idle, warm every photograph at feature size so a click
  // never waits on the network. The contact sheet has already fetched most.
  useEffect(() => {
    const win = window as IdleWindow
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) return

    let idleHandle: number | undefined
    let timer: number | undefined
    const warm = () => images.forEach((image) => void preload(image, FEATURED_SIZE))
    const schedule = () => {
      if (win.requestIdleCallback) idleHandle = win.requestIdleCallback(warm, { timeout: 4000 })
      else timer = window.setTimeout(warm, 2000)
    }

    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })

    return () => {
      window.removeEventListener('load', schedule)
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [images])

  // Auto-rotation, only while Photography is the active, on-screen service.
  // Any change of selection — a click included — restarts the rest period.
  const rotating = active && !reducedMotion && count > FEATURED_COUNT

  useEffect(() => {
    if (!rotating) return

    let cancelled = false
    let timer: number | undefined
    const from = selection.index

    const advance = async () => {
      if (hovering.current || document.hidden) {
        timer = window.setTimeout(advance, ROTATE_REST)
        return
      }
      const next = (from + FEATURED_COUNT) % count
      await Promise.all(
        Array.from({ length: FEATURED_COUNT }, (_, slot) => preload(images[(next + slot) % count], FEATURED_SIZE)),
      )
      if (cancelled) return
      setSelection((current) => (current.index === from ? { index: next, stagger: ROTATE_STAGGER } : current))
    }

    timer = window.setTimeout(advance, ROTATE_REST)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [rotating, selection.index, count, images])

  const select = (index: number) => {
    if (index === selection.index) return
    setSelection({ index, stagger: CLICK_STAGGER })
  }

  if (count === 0) return null

  return (
    <section className="photography-gallery" aria-label="Interactive photography gallery">
      <div
        className="featured-gallery"
        onPointerEnter={() => {
          hovering.current = true
        }}
        onPointerLeave={() => {
          hovering.current = false
        }}
      >
        {featuredImages.map((image, slot) => (
          <div key={slot} className="featured-image">
            <FeaturedFrame image={image} delay={slot * selection.stagger} priority={priority} />
          </div>
        ))}
      </div>

      <div className="thumbnail-gallery">
        {thumbnailImages.map((image, i) => {
          const index = FEATURED_COUNT + i
          const selected = image.id === selectedId
          return (
            <button
              key={image.id}
              type="button"
              className={`thumbnail ${selected ? 'is-selected' : ''}`}
              aria-label={`Feature: ${image.alt}`}
              aria-current={selected ? 'true' : undefined}
              onClick={() => select(index)}
            >
              <HeroImg image={image} sizes={THUMBNAIL_SIZE} priority="low" loading="lazy" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default HeroPhotographyGrid
