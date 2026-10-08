import { useRef, useSyncExternalStore, type SyntheticEvent } from 'react'
import { Link } from '../../routing'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'
import { matches } from '../../lib/scrollMotion'
import { SOCIAL_REELS } from '../../data/socialMedia'
import './CinematographyPage.css'

gsap.registerPlugin(ScrollTrigger)

type Film = {
  kind: 'film'
  id: string
  /** Accessible name only; nothing is shown on screen. */
  title: string
  /** One source fills the project; two split it into equal side-by-side panels. */
  sources: string[]
}

type PortraitFilm = {
  id: string
  /** Pexels' 720x1280 rendition: sharper than any panel gets, and light
   *  enough to decode three at once (the originals run up to 4K/60fps). */
  src: string
  /** Opening frame, shown until the clip can play. */
  poster?: string
  /** Crop anchor (object-position), for a source whose subject sits off-centre. */
  position?: string
}

type PortraitSet = {
  kind: 'portrait'
  id: string
  title: string
  films: PortraitFilm[]
}

type Section = Film | PortraitSet

const FALLBACK_VIDEO = 'https://www.pexels.com/download/video/7062390/'

/** Every section of the showcase, in page order. */
const SECTIONS: Section[] = [
  {
    kind: 'film',
    id: 'brand-film',
    title: 'Brand Film',
    sources: ['https://www.pexels.com/download/video/6571651/'],
  },
  {
    kind: 'film',
    id: 'campaign',
    title: 'Campaign',
    sources: [
      'https://www.pexels.com/download/video/10397827/',
      'https://www.pexels.com/download/video/3804693/',
    ],
  },
  {
    kind: 'portrait',
    id: 'vertical-stories',
    title: 'Vertical Stories',
    films: SOCIAL_REELS.slice(0, 3).map((reel) => ({
      id: `reel-${reel.id}`,
      src: reel.src,
      poster: reel.poster,
    })),
  },
  {
    kind: 'film',
    id: 'social-film',
    title: 'Social Film',
    sources: ['https://www.pexels.com/download/video/3804693/'],
  },
  {
    kind: 'film',
    id: 'product-story',
    title: 'Product Story',
    sources: ['https://www.pexels.com/download/video/7984186/'],
  },
  {
    kind: 'film',
    id: 'motion-lifestyle',
    title: 'Motion / Lifestyle',
    sources: ['https://www.pexels.com/download/video/35233227/'],
  },
]

function swapToFallback(event: SyntheticEvent<HTMLVideoElement>) {
  const video = event.currentTarget
  if (video.dataset.usingFallback === 'true') return
  video.dataset.usingFallback = 'true'
  video.src = FALLBACK_VIDEO
  video.load()
}

type FilmMediaProps = {
  film: Film
  eager: boolean
  reducedMotion: boolean
}

/** Static <video>(s); the showcase timeline decides when they play. */
function FilmMedia({ film, eager, reducedMotion }: FilmMediaProps) {
  const clip = (src: string, className?: string) => (
    <video
      key={src}
      className={className}
      src={src}
      autoPlay={eager && !reducedMotion}
      loop
      muted
      playsInline
      preload={eager ? 'auto' : 'metadata'}
      disablePictureInPicture
      onError={swapToFallback}
    />
  )

  return (
    <div className="film-project__media" aria-hidden="true">
      {film.sources.length > 1 ? (
        <div className="dual-video-grid">
          {film.sources.map((src) => (
            <div key={src} className="dual-video-item">
              {clip(src)}
            </div>
          ))}
        </div>
      ) : (
        clip(film.sources[0], 'film-project__video')
      )}
    </div>
  )
}

type PortraitFilmsProps = {
  set: PortraitSet
}

/** Three portrait films side by side, moved and played as one showcase slide. */
function PortraitFilms({ set }: PortraitFilmsProps) {
  return (
    <article className="film-project film-project--portrait" aria-label={set.title}>
      <div className="portrait-films">
        <div className="portrait-film-grid">
          {set.films.map((film) => (
            <div key={film.id} className="portrait-video-item" aria-hidden="true">
              <video
                src={film.src}
                poster={film.poster}
                style={film.position ? { objectPosition: film.position } : undefined}
                loop
                muted
                playsInline
                preload="metadata"
                disablePictureInPicture
                onError={swapToFallback}
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

/** Scroll distance of one project handoff, as a fraction of the viewport. */
const STEP_DESKTOP = 1
const STEP_MOBILE = 0.7
/** Short pause (in handoffs) on each fully-arrived project. */
const HOLD = 0.25
/** Very subtle drift of the footage inside its moving project. */
const MEDIA_DRIFT = 6
/** Split project: its two clips drift in opposite directions (yPercent). */
const SPLIT_DRIFT = 3
/** Portrait slide: each frame trails the slide in a little further (yPercent). */
const PORTRAIT_RISE = [8, 12, 16]
/** Must match the stylesheet's phone breakpoint. */
const MOBILE_QUERY = '(max-width: 640px)'

function subscribeMobile(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const getMobile = () => matches(MOBILE_QUERY)
const getServerMobile = () => false

export default function CinematographyPage() {
  const pageRef = useRef<HTMLElement>(null)
  const showcaseRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion() ?? false
  // The timeline is rebuilt when this flips: on phones the portrait slide is a
  // single column taller than the stage and needs scroll to travel through.
  const isMobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile)

  useGSAP(
    () => {
      const showcase = showcaseRef.current
      if (!showcase || reducedMotion) return

      const projects = gsap.utils.toArray<HTMLElement>('.film-project', showcase)
      if (projects.length < 2) return
      const media = projects.map((project) =>
        project.querySelector<HTMLElement>('.film-project__media'),
      )
      const videos = projects.map((project) =>
        Array.from(project.querySelectorAll<HTMLVideoElement>('video')),
      )

      const stepPx = () => window.innerHeight * (isMobile ? STEP_MOBILE : STEP_DESKTOP)

      // Every project shares the one stage; all but the first wait below it.
      gsap.set(projects.slice(1), { yPercent: 100 })
      gsap.set(media.slice(1).filter(Boolean), { yPercent: -MEDIA_DRIFT })

      // Playback follows the *rendered* positions (driven from the scrubbed
      // timeline's own updates), so it never lags behind the scroll.
      const playing = new Set<number>()
      let inView = true
      const syncPlayback = () => {
        projects.forEach((project, index) => {
          const clips = videos[index]
          if (!clips.length) return
          const y = Number(gsap.getProperty(project, 'yPercent'))
          const visible = inView && y > -100 && y < 100
          if (visible && !playing.has(index)) {
            playing.add(index)
            clips.forEach((video) => void video.play().catch(() => undefined))
            // Keep the following film(s) buffered before they start to rise.
            videos[index + 1]?.forEach((next) => {
              if (next.preload !== 'auto') next.preload = 'auto'
            })
          } else if (!visible && playing.has(index)) {
            playing.delete(index)
            clips.forEach((video) => video.pause())
          }
        })
      }

      // How far a slide's content runs past the bottom of the stage (only
      // the phone portrait column does); it scrolls up by this much first.
      const overflowOf = (project: HTMLElement) => {
        const content = project.querySelector<HTMLElement>('.portrait-films')
        if (!isMobile || !content) return 0
        const style = getComputedStyle(project)
        const height =
          content.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        return Math.max(0, height - project.clientHeight)
      }

      // One master timeline: each handoff moves the outgoing and incoming
      // projects together at exactly the same rate. Position only — the
      // projects stay fully opaque throughout.
      const timeline = gsap.timeline({
        defaults: { ease: 'none', duration: 1 },
        onUpdate: syncPlayback,
      })

      // Timeline positions where each project starts arriving / finishes leaving.
      const arrives: number[] = [0]
      const leaves: number[] = []
      let at = 0
      projects.forEach((project, index) => {
        const incoming = projects[index + 1]
        if (!incoming) return
        arrives[index + 1] = at
        leaves[index] = at + 1

        timeline
          .to(project, { yPercent: -100 }, at)
          .fromTo(incoming, { yPercent: 100 }, { yPercent: 0 }, at)
        // The portrait slide has no full-bleed media; its frames move instead,
        // each trailing the slide in a little further and settling as it lands.
        const outgoingMedia = media[index]
        const incomingMedia = media[index + 1]
        if (outgoingMedia) timeline.to(outgoingMedia, { yPercent: MEDIA_DRIFT }, at)
        if (incomingMedia) {
          timeline.fromTo(incomingMedia, { yPercent: -MEDIA_DRIFT }, { yPercent: 0 }, at)
        }
        gsap.utils.toArray<HTMLElement>('.portrait-video-item', incoming).forEach((item, i) => {
          const rise = PORTRAIT_RISE[i % PORTRAIT_RISE.length]
          timeline.fromTo(item, { yPercent: rise }, { yPercent: 0 }, at)
        })
        at += 1

        // Arrived: scroll through any overflow at the page's own pace, then hold.
        const overflow = overflowOf(incoming)
        const content = incoming.querySelector('.portrait-films')
        if (overflow > 0 && content) {
          const duration = overflow / stepPx()
          timeline.fromTo(content, { y: 0 }, { y: () => -overflowOf(incoming), duration }, at)
          at += duration
        }
        at += HOLD
      })

      // Split projects: the two clips drift in opposite directions for as
      // long as the project is on stage, inside the project's own movement.
      projects.forEach((project, index) => {
        const start = arrives[index]
        const duration = (leaves[index] ?? at) - start
        gsap.utils.toArray<HTMLElement>('.dual-video-item video', project).forEach((clip, i) => {
          const direction = i % 2 === 0 ? 1 : -1
          timeline.fromTo(
            clip,
            { yPercent: -SPLIT_DRIFT * direction },
            { yPercent: SPLIT_DRIFT * direction, duration },
            start,
          )
        })
      })

      // Let the final project settle before the stage releases.
      timeline.set({}, {}, at)

      const pin = ScrollTrigger.create({
        animation: timeline,
        trigger: showcase,
        start: 'top top',
        end: () => `+=${stepPx() * timeline.duration()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        // Lenis (SmoothScroll) already eases the scroll itself; scrubbing
        // straight to it avoids a second layer of lag on top of that glide.
        scrub: true,
        invalidateOnRefresh: true,
      })

      // Pause everything once the released showcase has scrolled away
      // (one viewport after the pin ends).
      ScrollTrigger.create({
        trigger: showcase,
        start: 'top bottom',
        end: () => pin.end + window.innerHeight,
        onToggle: ({ isActive }) => {
          inView = isActive
          syncPlayback()
        },
      })

      syncPlayback()

      const refresh = () => ScrollTrigger.refresh()
      const firstVideo = videos[0][0]
      firstVideo?.addEventListener('loadedmetadata', refresh, { once: true })
      void document.fonts?.ready.then(refresh)

      return () => {
        firstVideo?.removeEventListener('loadedmetadata', refresh)
        videos.flat().forEach((video) => video.pause())
      }
    },
    {
      scope: pageRef,
      dependencies: [reducedMotion, isMobile],
      revertOnUpdate: true,
    },
  )

  return (
    <main ref={pageRef} className="videography-page">
      <h1 className="videography-page__title">Videography</h1>

      <section ref={showcaseRef} className="film-showcase" aria-label="Selected videography projects">
        <div className="film-stage">
          {SECTIONS.map((section, index) =>
            section.kind === 'portrait' ? (
              <PortraitFilms key={section.id} set={section} />
            ) : (
              <article
                key={section.id}
                className="film-project"
                aria-label={section.title}
              >
                <FilmMedia film={section} eager={index === 0} reducedMotion={reducedMotion} />
              </article>
            ),
          )}
        </div>
      </section>

    </main>
  )
}
