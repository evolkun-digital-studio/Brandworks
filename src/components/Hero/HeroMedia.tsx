import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { HeroImage, HeroServiceId } from '../../data/heroServices'
import { heroServices, HERO_SERVICE_ORDER, DEFAULT_HERO_SERVICE } from '../../data/heroServices'
import HeroPhotographyGrid from './HeroPhotographyGrid'
import HeroSocialShowcase from './HeroSocialShowcase'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'

gsap.registerPlugin(useGSAP)

// easeOutQuint — the same curve as cubic-bezier(0.22, 1, 0.36, 1) used in Hero.css.
const EASE = 'power4.out'
const DURATION = 1.05

/**
 * The cinematic film. The poster sits underneath and the video fades in
 * over it once it is actually playing, so there is never a black frame.
 * Nothing is fetched until the service is first selected, and the film
 * only runs while it is the active service and the hero is on screen.
 */
function HeroVideo({
  src,
  poster,
  playing,
  reducedMotion,
}: {
  src: string
  poster: HeroImage
  playing: boolean
  reducedMotion: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)

  // Reduced motion keeps the still: no autoplaying footage at all.
  const wantsVideo = playing && !reducedMotion

  // Latches on the first selection; once attached the film is never re-fetched.
  if (wantsVideo && !requested) setRequested(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !requested) return
    if (wantsVideo) {
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [wantsVideo, requested])

  return (
    <>
      <HeroImg image={poster} sizes="100vw" priority="low" />
      {requested && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setReady(true)}
          className={`hero-img hero-video ${ready ? 'is-ready' : ''}`}
        />
      )}
    </>
  )
}

/**
 * Every service's media stacked in one place. Only layers that have been
 * asked for (the default, anything prefetched after load, or a capsule the
 * visitor points at) render their media, so inactive services cost
 * nothing until they're likely to be seen.
 *
 * Switching cross-fades: the incoming layer sits on top and resolves from
 * a slight zoom while the outgoing one drifts forward and fades beneath it.
 */
function HeroMedia({
  activeId,
  mounted,
  inView,
  reducedMotion,
}: {
  activeId: HeroServiceId
  mounted: ReadonlySet<HeroServiceId>
  inView: boolean
  reducedMotion: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef<HeroServiceId>(activeId)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const layerFor = (id: HeroServiceId) =>
        root.querySelector<HTMLElement>(`[data-hero-layer="${id}"]`)
      const next = layerFor(activeId)
      if (!next) return

      const previousId = previousRef.current
      previousRef.current = activeId

      // First paint: the default layer settles from the slightest zoom.
      if (previousId === activeId) {
        if (!reducedMotion) {
          gsap.fromTo(next, { scale: 1.03 }, { scale: 1, duration: 1.8, ease: EASE })
        }
        return
      }

      const previous = layerFor(previousId)
      const layers = gsap.utils.toArray<HTMLElement>('[data-hero-layer]', root)
      gsap.killTweensOf(layers)

      layers.forEach((layer) => {
        const z = layer === next ? 2 : layer === previous ? 1 : 0
        gsap.set(layer, { zIndex: z })
        // Anything left over from rapid switching quietly clears away.
        if (z === 0) gsap.to(layer, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' })
      })

      if (reducedMotion) {
        gsap.set(next, { scale: 1 })
        gsap.to(next, { autoAlpha: 1, duration: 0.35, ease: 'power1.out' })
        if (previous) gsap.to(previous, { autoAlpha: 0, duration: 0.35, delay: 0.1 })
        return
      }

      // Only restart the zoom if the layer is fully out; a layer caught
      // mid-fade continues from where it is rather than jumping.
      if (Number(gsap.getProperty(next, 'opacity')) < 0.02) gsap.set(next, { scale: 1.035 })
      gsap.to(next, { autoAlpha: 1, scale: 1, duration: DURATION, ease: EASE })

      if (previous) {
        gsap.to(previous, { scale: 1.025, duration: DURATION, ease: EASE })
        // Fading out a beat later keeps the frame from dipping through black.
        gsap.to(previous, { autoAlpha: 0, duration: 0.8, delay: 0.25, ease: 'power2.out' })
      }
    },
    { dependencies: [activeId], scope: rootRef },
  )

  return (
    <div ref={rootRef} className="hero-media">
      {HERO_SERVICE_ORDER.map((id) => {
        const { media } = heroServices[id]
        const isDefault = id === DEFAULT_HERO_SERVICE
        const priority: ImagePriority = isDefault ? 'high' : 'low'
        const isActive = id === activeId

        return (
          <div
            key={id}
            data-hero-layer={id}
            data-default={isDefault ? '' : undefined}
            className="hero-layer"
            aria-hidden={!isActive}
          >
            {mounted.has(id) &&
              (media.kind === 'grid' ? (
                <HeroPhotographyGrid
                  images={media.images}
                  priority={priority}
                  active={isActive && inView}
                  reducedMotion={reducedMotion}
                />
              ) : media.kind === 'video' ? (
                <HeroVideo
                  src={media.src}
                  poster={media.poster}
                  playing={isActive && inView}
                  reducedMotion={reducedMotion}
                />
              ) : media.kind === 'showcase' ? (
                <HeroSocialShowcase
                  image={media.image}
                  video={media.video}
                  active={isActive}
                  playing={isActive && inView}
                  priority={priority}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <HeroImg image={media.image} sizes="100vw" priority={priority} />
              ))}
          </div>
        )
      })}
    </div>
  )
}

export default HeroMedia
