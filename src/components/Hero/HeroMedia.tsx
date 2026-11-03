import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { HeroImage, HeroServiceId } from '../../data/heroServices'
import { heroServices, HERO_SERVICE_ORDER, DEFAULT_HERO_SERVICE } from '../../data/heroServices'
import HeroPhotographyGrid from './HeroPhotographyGrid'
import HeroSocialShowcase from './HeroSocialShowcase'
import WebDesignHero from './WebDesignHero'
import HeroDesignPair from './HeroDesignPair'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'
import SiteMediaImage from '../SiteMediaImage'
import type { PublicSiteImage } from '../../config/siteMediaSections'
import { findSiteMediaSlot } from '../../config/siteMediaSections'
import { toHeroGalleryImage } from '../SiteMedia/convert'

gsap.registerPlugin(useGSAP)

// easeOutQuint — the same curve as cubic-bezier(0.22, 1, 0.36, 1) used in Hero.css.
const EASE = 'power4.out'
// Matches the caption's cross-fade in Hero.css.
const DURATION = 0.5
// Media Manager › Hero › Photography grid replaces the built-in set once it holds this many.
const GRID_MIN_ITEMS = findSiteMediaSlot('hero', 'photography')?.slot.minItems ?? 3

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
  managedPoster,
}: {
  src: string
  poster: HeroImage
  playing: boolean
  reducedMotion: boolean
  /** The Media Manager hero image, when an admin has set one. */
  managedPoster?: PublicSiteImage | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)
  const isHlsStream = src.includes('.m3u8')

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

  // Safari plays HLS natively. Other browsers receive the same stream through
  // hls.js, while the poster remains visible until playback begins.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !requested || !isHlsStream) return
    let disposed = false
    let player: { destroy: () => void } | undefined

    void import('hls.js').then(({ default: Hls }) => {
      if (disposed) return
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true })
        player = hls
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!disposed && wantsVideo) void video.play().catch(() => undefined)
        })
      } else {
        video.src = src
        if (wantsVideo) void video.play().catch(() => undefined)
      }
    })

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [isHlsStream, requested, src, wantsVideo])

  return (
    <>
      {managedPoster
        ? <SiteMediaImage image={managedPoster} sizes="100vw" preload className="hero-img" />
        : <HeroImg image={poster} sizes="100vw" priority="low" />}
      {requested && (
        <video
          ref={videoRef}
          src={isHlsStream ? undefined : src}
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
  heroImage = null,
  gridImages = [],
}: {
  activeId: HeroServiceId
  mounted: ReadonlySet<HeroServiceId>
  inView: boolean
  reducedMotion: boolean
  /** Replaces the opening service's poster (Media Manager › Hero). */
  heroImage?: PublicSiteImage | null
  /** Media Manager › Hero › Photography grid, in gallery order. */
  gridImages?: PublicSiteImage[]
}) {
  const managedGrid = useMemo(
    () => gridImages.length >= GRID_MIN_ITEMS ? gridImages.map(toHeroGalleryImage) : null,
    [gridImages],
  )
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
      if (Number(gsap.getProperty(next, 'opacity')) < 0.02) gsap.set(next, { scale: 1.02 })
      gsap.to(next, { autoAlpha: 1, scale: 1, duration: DURATION, ease: EASE })

      // The outgoing layer stays fully lit beneath the incoming one until it
      // has nearly arrived, so the cross-fade never dips through to nothing.
      if (previous) gsap.to(previous, { autoAlpha: 0, duration: 0.25, delay: DURATION - 0.1, ease: 'power1.out' })
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
                  images={managedGrid ?? media.images}
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
                  managedPoster={isDefault ? heroImage : null}
                />
              ) : media.kind === 'showcase' ? (
                <HeroSocialShowcase
                  grid={media.grid}
                  image={media.image}
                  video={media.video}
                  active={isActive}
                  playing={isActive && inView}
                  priority={priority}
                  reducedMotion={reducedMotion}
                />
              ) : media.kind === 'web' ? (
                <WebDesignHero active={isActive} playing={isActive && inView} reducedMotion={reducedMotion} />
              ) : media.kind === 'pair' ? (
                <HeroDesignPair back={media.back} front={media.front} priority={priority} active={isActive && inView} reducedMotion={reducedMotion} />
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
