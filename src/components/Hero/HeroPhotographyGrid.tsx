import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import type { HeroGalleryImage } from '../../data/heroServices'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'

gsap.registerPlugin(Flip)

const FEATURED_SIZE = '(max-width: 639px) 78vw, 34vw'
const THUMBNAIL_SIZE = '(max-width: 639px) 25vw, (max-width: 1023px) 17vw, 13vw'

/**
 * Two-level editorial gallery. Promoting a thumbnail rotates it into the
 * leading slot and returns the displaced third feature to the contact sheet.
 * Stable ids let GSAP Flip carry each photograph between the two grids.
 */
function HeroPhotographyGrid({
  images,
  priority,
  reducedMotion,
}: {
  images: readonly HeroGalleryImage[]
  priority: ImagePriority
  reducedMotion: boolean
}) {
  const rootRef = useRef<HTMLElement>(null)
  const pendingFlip = useRef<Flip.FlipState | null>(null)
  const animating = useRef(false)
  const [featuredIds, setFeaturedIds] = useState(() => images.slice(0, 3).map(({ id }) => id))

  const imageById = useMemo(() => new Map(images.map((image) => [image.id, image])), [images])
  const featuredImages = useMemo(
    () => featuredIds.map((id) => imageById.get(id)).filter((image): image is HeroGalleryImage => Boolean(image)),
    [featuredIds, imageById],
  )
  const featuredSet = useMemo(() => new Set(featuredIds), [featuredIds])
  const thumbnailImages = useMemo(
    () => images.filter(({ id }) => !featuredSet.has(id)),
    [featuredSet, images],
  )

  useLayoutEffect(() => {
    const state = pendingFlip.current
    const root = rootRef.current
    if (!state || !root) return
    pendingFlip.current = null

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-gallery-image]'))
    if (reducedMotion) {
      gsap.set(targets, { clearProps: 'transform,opacity,zIndex' })
      animating.current = false
      return
    }

    const finish = () => {
      gsap.set(targets, { clearProps: 'transform,opacity,zIndex' })
      animating.current = false
    }

    const flip = Flip.from(state, {
      targets,
      absolute: true,
      scale: true,
      fade: true,
      nested: true,
      prune: true,
      duration: 0.78,
      ease: 'power3.inOut',
      onComplete: finish,
      onInterrupt: finish,
    })

    return () => {
      flip.kill()
    }
  }, [featuredIds, reducedMotion])

  const promote = (id: string, thumbnail: HTMLButtonElement) => {
    if (animating.current || featuredSet.has(id)) return

    const root = rootRef.current
    if (!root) return
    animating.current = true

    const commit = () => {
      pendingFlip.current = Flip.getState(root.querySelectorAll<HTMLElement>('[data-gallery-image]'))
      setFeaturedIds((current) => [id, current[0], current[1]])
    }

    if (reducedMotion) {
      commit()
      return
    }

    gsap.to(thumbnail, {
      scale: 0.975,
      opacity: 0.62,
      duration: 0.14,
      ease: 'power2.in',
      onComplete: commit,
    })
  }

  return (
    <section ref={rootRef} className="photography-gallery" aria-label="Interactive photography gallery">
      <div className="featured-gallery">
        {featuredImages.map((image) => (
          <div
            key={image.id}
            className="featured-image"
            data-gallery-image
            data-flip-id={image.id}
          >
            <HeroImg image={image} sizes={FEATURED_SIZE} priority={priority} />
          </div>
        ))}
      </div>

      <div className="thumbnail-gallery">
        {thumbnailImages.map((image) => (
          <button
            key={image.id}
            type="button"
            className="thumbnail"
            data-gallery-image
            data-flip-id={image.id}
            aria-label={`Feature: ${image.alt}`}
            onClick={(event) => promote(image.id, event.currentTarget)}
          >
            <HeroImg image={image} sizes={THUMBNAIL_SIZE} priority="low" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  )
}

export default HeroPhotographyGrid
