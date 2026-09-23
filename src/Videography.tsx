import { forwardRef, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'
import { Icon } from '@iconify/react'

gsap.registerPlugin(ScrollTrigger)

type VideoProject = {
  id: string
  title: string
  line: string
  src: string
}

const VIDEO_PROJECTS: VideoProject[] = [
  {
    id: '01',
    title: 'Brand Film',
    line: 'Ideas, given movement.',
    src: '/video/CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4',
  },
  {
    id: '02',
    title: 'Campaign Film',
    line: 'Rhythm becomes direction.',
    src: '/video/Central Cee - Obsessed With You (Official Video).mp4',
  },
  {
    id: '03',
    title: 'Visual Story',
    line: 'Every frame carries intent.',
    src: '/video/Idea - Cinematic Video _ Shot on Canon EOS250D.mp4',
  },
  {
    id: '04',
    title: 'Creative Film',
    line: 'The story keeps moving.',
    src: '/video/CENTRAL CEE - BOOGA (MUSIC VIDEO).mp4',
  },
]

const SCENE_SCROLL_PROGRESS = [0.2, 0.39, 0.56, 0.72] as const
const VIDEO_FPS = 30

const formatTimecode = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  const frames = Math.floor((safe % 1) * VIDEO_FPS)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}


function Film({
  project,
  live,
  muted = true,
  paused = false,
  videoRef,
  className = '',
}: {
  project: VideoProject
  live: boolean
  muted?: boolean
  paused?: boolean
  videoRef?: (node: HTMLVideoElement | null) => void
  className?: string
}) {
  const localRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = localRef.current
    if (!video) return

    video.muted = muted

    if (live && !paused) {
      video.play().catch(() => {
        // Autoplay can still wait for the first explicit user interaction.
      })
    } else {
      video.pause()
    }
  }, [live, muted, paused])

  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#0d0d0d] ${className}`}>
      <video
        ref={(node) => {
          localRef.current = node
          videoRef?.(node)
        }}
        src={project.src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}

const SceneCaption = forwardRef<
  HTMLDivElement,
  { project: VideoProject }
>(({ project }, ref) => {
  return (
    <div
      ref={ref}
      className="absolute bottom-[clamp(96px,13vh,132px)] left-[4vw] right-[4vw] flex items-end justify-between gap-6 text-white opacity-0 md:left-[5vw] md:right-[5vw]"
    >
      <p
        className="
          max-w-[13ch]
          font-primary
          text-[clamp(1.35rem,2.1vw,2.5rem)]
          font-medium
          leading-[0.98]
          tracking-[-0.035em]
        "
      >
        {project.line}
      </p>

      <span className="shrink-0 font-primary text-[8px] uppercase tracking-[0.18em] text-white/60 md:text-[9px]">
        {project.id} / {project.title}
      </span>
    </div>
  )
})

SceneCaption.displayName = 'SceneCaption'

function GalleryFilm({
  project,
  live,
}: {
  project: VideoProject
  live: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (live) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [live])

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#111] md:aspect-[3/4]">
      <video
        ref={videoRef}
        src={project.src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/[0.06]" />

      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-white md:inset-x-4 md:bottom-4">
        <span className="font-primary text-[10px] font-medium tracking-[-0.01em]">
          {project.title}
        </span>

        <span className="font-primary text-[8px] uppercase tracking-[0.16em] text-white/65">
          {project.id}
        </span>
      </div>
    </div>
  )
}

export default function Videography() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const introRef = useRef<HTMLDivElement>(null)
  const wordTopRef = useRef<HTMLDivElement>(null)
  const wordBottomRef = useRef<HTMLDivElement>(null)
  const introMetaRef = useRef<HTMLDivElement>(null)

  const scene0Ref = useRef<HTMLDivElement>(null)
  const scene1Ref = useRef<HTMLDivElement>(null)
  const scene2Ref = useRef<HTMLDivElement>(null)
  const scene3Ref = useRef<HTMLDivElement>(null)

  const media0Ref = useRef<HTMLDivElement>(null)
  const media1Ref = useRef<HTMLDivElement>(null)
  const media2Ref = useRef<HTMLDivElement>(null)
  const media3Ref = useRef<HTMLDivElement>(null)

  const line0Ref = useRef<HTMLDivElement>(null)
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)
  const line3Ref = useRef<HTMLDivElement>(null)

  const circlePortalRef = useRef<HTMLDivElement>(null)
  const circleMediaRef = useRef<HTMLDivElement>(null)

  const sweepRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const galleryCardRefs = useRef<(HTMLDivElement | null)[]>([])

  const progressRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<HTMLDivElement>(null)
  const timecodeRef = useRef<HTMLSpanElement>(null)
  const masterTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const [activeIndex, setActiveIndex] = useState(0)
  const [galleryLive, setGalleryLive] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [isCurrentVideoPlaying, setIsCurrentVideoPlaying] = useState(true)
  const [muted, setMuted] = useState(true)

  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      if (
        !sectionRef.current ||
        !stageRef.current ||
        !introRef.current ||
        !wordTopRef.current ||
        !wordBottomRef.current ||
        !introMetaRef.current ||
        !scene0Ref.current ||
        !scene1Ref.current ||
        !scene2Ref.current ||
        !scene3Ref.current ||
        !media0Ref.current ||
        !media1Ref.current ||
        !media2Ref.current ||
        !media3Ref.current ||
        !line0Ref.current ||
        !line1Ref.current ||
        !line2Ref.current ||
        !line3Ref.current ||
        !circlePortalRef.current ||
        !circleMediaRef.current ||
        !sweepRef.current ||
        !galleryRef.current ||
        !progressRef.current ||
        !controllerRef.current
      ) {
        return
      }

      const section = sectionRef.current
      const stage = stageRef.current

      const intro = introRef.current
      const wordTop = wordTopRef.current
      const wordBottom = wordBottomRef.current
      const introMeta = introMetaRef.current

      const scene0 = scene0Ref.current
      const scene1 = scene1Ref.current
      const scene2 = scene2Ref.current
      const scene3 = scene3Ref.current

      const media0 = media0Ref.current
      const media1 = media1Ref.current
      const media2 = media2Ref.current
      const media3 = media3Ref.current

      const line0 = line0Ref.current
      const line1 = line1Ref.current
      const line2 = line2Ref.current
      const line3 = line3Ref.current

      const circlePortal = circlePortalRef.current
      const circleMedia = circleMediaRef.current

      const sweep = sweepRef.current
      const gallery = galleryRef.current
      const galleryCards = galleryCardRefs.current.filter(
        Boolean,
      ) as HTMLDivElement[]

      const progress = progressRef.current
      const controller = controllerRef.current

      if (reduceMotion) {
        gsap.set(intro, { display: 'none' })

        gsap.set(scene0, {
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
        })

        gsap.set(media0, {
          scale: 1,
          yPercent: 0,
        })

        gsap.set([scene1, scene2, scene3], {
          display: 'none',
        })

        gsap.set(line0, {
          autoAlpha: 1,
          y: 0,
        })

        gsap.set(circlePortal, {
          display: 'none',
        })

        gsap.set(sweep, {
          clipPath: 'inset(0% 0% 0% 100%)',
        })

        gsap.set(controller, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
        })

        return
      }

      const mm = gsap.matchMedia()

      mm.add(
        {
          desktop: '(min-width: 768px)',
          mobile: '(max-width: 767px)',
        },
        (context) => {
          const desktop = Boolean(context.conditions?.desktop)

          // The first BOOGA frame opens from a centered 400px square.
          // max() keeps it usable on short or narrow screens.
          const firstFrame =
            'inset(max(12px, calc(50% - 200px)) max(12px, calc(50% - 200px)) max(12px, calc(50% - 200px)) max(12px, calc(50% - 200px)) round 26px)'

          const firstFullFrame =
            'inset(0% 0% 0% 0% round 0px)'

          /* --------------------------------------------------------
             INITIAL STATES
          -------------------------------------------------------- */

          gsap.set([scene0, scene1, scene2, scene3], {
            force3D: true,
          })

          gsap.set(scene0, {
            autoAlpha: 0,
            clipPath: firstFrame,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
          })

          /*
           * Scene 2 is mounted from the beginning.
           * It stays in its final position and only its mask changes.
           * This removes the feeling of the whole scene shifting.
           */
          gsap.set(scene1, {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            clipPath: 'inset(0% 100% 0% 0% round 0px)',
          })

          /*
           * Scene 3 also stays anchored and only reveals bottom -> top.
           */
          gsap.set(scene2, {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            clipPath: 'inset(100% 0% 0% 0% round 0px)',
          })

          /*
           * Scene 4 starts closed at the centre without a rectangle.
           */
          gsap.set(scene3, {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            scale: 1,
            clipPath: 'circle(0% at 50% 50%)',
          })

          gsap.set(circlePortal, {
            autoAlpha: 1,
            clipPath: 'circle(0% at 50% 50%)',
          })

          gsap.set(circleMedia, {
            scale: desktop ? 1.08 : 1.05,
            yPercent: 0,
            force3D: true,
          })

          gsap.set(
            [media0, media1, media2, media3],
            {
              scale: desktop ? 1.055 : 1.035,
              yPercent: 1.5,
              force3D: true,
            },
          )

          gsap.set(
            [line0, line1, line2, line3],
            {
              autoAlpha: 0,
              y: 14,
            },
          )

          gsap.set(wordTop, {
            yPercent: 108,
          })

          gsap.set(wordBottom, {
            yPercent: 108,
          })

          gsap.set(introMeta, {
            autoAlpha: 0,
            y: 10,
          })

          gsap.set(sweep, {
            clipPath: 'inset(0% 100% 0% 0%)',
          })

          gsap.set(gallery, {
            autoAlpha: 0,
          })

          gsap.set(galleryCards, {
            autoAlpha: 0,
            xPercent: desktop ? 55 : 32,
          })

          gsap.set(progress, {
            scaleX: 0,
            transformOrigin: 'left center',
          })

          gsap.set(controller, {
            autoAlpha: 0,
            y: 14,
            scale: 0.96,
            transformOrigin: 'center bottom',
          })

          /* --------------------------------------------------------
             MASTER TIMELINE
          -------------------------------------------------------- */

          const tl = gsap.timeline({
            defaults: {
              ease: 'none',
            },

            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () =>
                `+=${window.innerHeight * (desktop ? 5.45 : 4.65)}`,
              pin: stage,
              scrub: desktop ? 1.08 : 0.82,
              anticipatePin: 1,
              invalidateOnRefresh: true,

              onUpdate: (self) => {
                gsap.set(progress, {
                  scaleX: self.progress,
                })

                const p = self.progress

                const nextIndex =
                  p < 0.3
                    ? 0
                    : p < 0.48
                      ? 1
                      : p < 0.66
                        ? 2
                        : 3

                setActiveIndex((current) =>
                  current === nextIndex
                    ? current
                    : nextIndex,
                )

                const shouldPlayGallery = p > 0.79

                setGalleryLive((current) =>
                  current === shouldPlayGallery
                    ? current
                    : shouldPlayGallery,
                )
              },
            },
          })

          masterTimelineRef.current = tl

          /* 
             01 — INTRO + FIRST REVEAL
           */

          tl.to(
            wordTop,
            {
              yPercent: 0,
              duration: 0.55,
              ease: 'power3.out',
            },
            0,
          )

          tl.to(
            wordBottom,
            {
              yPercent: 0,
              duration: 0.55,
              ease: 'power3.out',
            },
            0.05,
          )

          tl.to(
            introMeta,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              ease: 'power2.out',
            },
            0.14,
          )

          tl.to(
            scene0,
            {
              autoAlpha: 1,
              duration: 0.92,
              ease: 'power2.out',
            },
            0.3,
          )

          tl.to(
            media0,
            {
              scale: 1.02,
              yPercent: 0,
              duration: 1.42,
              ease: 'sine.out',
            },
            0.32,
          )

          tl.to(
            wordTop,
            {
              yPercent: -108,
              duration: 0.65,
              ease: 'power3.inOut',
            },
            0.95,
          )

          tl.to(
            wordBottom,
            {
              yPercent: 108,
              duration: 0.65,
              ease: 'power3.inOut',
            },
            0.95,
          )

          tl.to(
            introMeta,
            {
              autoAlpha: 0,
              y: -7,
              duration: 0.25,
            },
            0.98,
          )

          /*
           * First scene progression:
           * restore the centred BOOGA reveal, but use one continuous
           * mask interpolation so scrolling cannot jump in width.
           */
          tl.to(
            scene0,
            {
              autoAlpha: 1,
              clipPath: firstFullFrame,
              duration: 1.9,
              ease: 'sine.inOut',
            },
            0.3,
          )

          tl.to(
            media0,
            {
              scale: 1.025,
              yPercent: -0.6,
              duration: 1.55,
              ease: 'sine.inOut',
            },
            1.0,
          )

          tl.to(
            line0,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              ease: 'power2.out',
            },
            1.82,
          )

          tl.to(
            controller,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.36,
              ease: 'power3.out',
            },
            2.02,
          )

          // Give Scene 01 a real breathing moment after the square has fully opened.
          // The frame stays completely stable while the user keeps scrolling, so the
          // first film reads as a scene instead of immediately becoming a transition.
          tl.to(
            scene0,
            {
              scale: 1,
              opacity: 1,
              duration: 0.46,
              ease: 'none',
            },
            2.1,
          )

          /* 
             02 — SCENE 1 -> SCENE 2
             REVEAL ONLY. NO POSITION JUMP.

             Scene 2 starts revealing before Scene 1 changes at all.
             Scene 1 stays anchored; it only fades/scales subtly
             underneath the incoming wipe.
           */

          const secondStart = 2.62
          const secondRevealStart = secondStart - 0.24

          /*
           * Incoming scene starts first.
           */
          tl.to(
            scene1,
            {
              clipPath:
                'inset(0% 0% 0% 0% round 0px)',
              duration: 1.28,
              ease: 'power3.inOut',
            },
            secondRevealStart,
          )

          tl.fromTo(
            media1,
            {
              scale: desktop ? 1.055 : 1.035,
              yPercent: 1.8,
            },
            {
              scale: 1.015,
              yPercent: -0.6,
              duration: 1.26,
              ease: 'none',
            },
            secondRevealStart,
          )

          /*
           * Outgoing scene does not shift left/right/up/down.
           * It remains locked in place while the reveal crosses it.
           */
          tl.to(
            line0,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.26,
            },
            secondStart - 0.05,
          )

          tl.to(
            scene0,
            {
              scale: 1.01,
              opacity: 0.26,
              duration: 1.06,
              ease: 'sine.inOut',
            },
            secondStart,
          )

          tl.to(
            line1,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.32,
              ease: 'power2.out',
            },
            secondRevealStart + 0.72,
          )

          /* 
             03 — SCENE 2 -> SCENE 3
             BOTTOM -> TOP REVEAL.
             Again, outgoing scene stays anchored.
           */

          const thirdStart = 3.68
          const thirdRevealStart = thirdStart - 0.12

          /*
           * Start the incoming reveal before fading the outgoing film.
           */
          tl.to(
            scene2,
            {
              clipPath:
                'inset(0% 0% 0% 0% round 0px)',
              duration: 1.08,
              ease: 'power3.inOut',
            },
            thirdRevealStart,
          )

          tl.fromTo(
            media2,
            {
              scale: desktop ? 1.06 : 1.04,
              yPercent: 2.5,
            },
            {
              scale: 1.015,
              yPercent: -0.8,
              duration: 1.12,
              ease: 'none',
            },
            thirdRevealStart,
          )

          tl.to(
            line1,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.24,
            },
            thirdStart,
          )

          tl.to(
            scene1,
            {
              scale: 1.008,
              opacity: 0.24,
              duration: 0.96,
              ease: 'sine.inOut',
            },
            thirdStart,
          )

          tl.to(
            line2,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              ease: 'power2.out',
            },
            thirdRevealStart + 0.68,
          )

          /* 
             04 — SCENE 3 -> SCENE 4
             SOFT CIRCLE FROM CENTRE.
             No rectangle. No reposition jump.
           */

          const rectStart = 4.84

          tl.to(
            line2,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.22,
            },
            rectStart,
          )

          tl.to(
            scene3,
            {
              clipPath: 'circle(110% at 50% 50%)',
              duration: 1.1,
              ease: 'power3.inOut',
            },
            rectStart + 0.02,
          )

          tl.fromTo(
            media3,
            {
              scale: desktop ? 1.065 : 1.045,
              yPercent: 1.2,
            },
            {
              scale: 1.01,
              yPercent: -0.6,
              duration: 1.2,
              ease: 'none',
            },
            rectStart + 0.04,
          )

          /*
           * Outgoing scene remains centred in the same position.
           */
          tl.to(
            scene2,
            {
              scale: 1.008,
              opacity: 0.26,
              duration: 1.02,
              ease: 'sine.inOut',
            },
            rectStart,
          )

          tl.to(
            line3,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              ease: 'power2.out',
            },
            rectStart + 0.9,
          )

          /* 
             05 — CENTRE CIRCLE 0 -> 100 -> 0
             UNCHANGED
           */

          const circleStart = 6.0

          tl.to(
            line3,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.22,
            },
            circleStart,
          )

          tl.to(
            circlePortal,
            {
              clipPath: 'circle(110% at 50% 50%)',
              duration: 0.94,
              ease: 'power3.inOut',
            },
            circleStart + 0.02,
          )

          tl.to(
            circleMedia,
            {
              scale: 1.015,
              duration: 1.0,
              ease: 'none',
            },
            circleStart + 0.02,
          )

          tl.to(
            circleMedia,
            {
              scale: 1.01,
              duration: 0.22,
              ease: 'none',
            },
            circleStart + 0.96,
          )

          tl.to(
            circlePortal,
            {
              clipPath: 'circle(0% at 50% 50%)',
              duration: 0.94,
              ease: 'power3.inOut',
            },
            circleStart + 1.12,
          )

          /* 
             06 — LEFT -> RIGHT SWEEP
             UNCHANGED
           */

          const sweepStart = 8.16

          tl.to(
            controller,
            {
              autoAlpha: 0,
              y: 12,
              scale: 0.97,
              duration: 0.28,
              ease: 'power2.inOut',
            },
            sweepStart - 0.34,
          )

          tl.to(
            line3,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.22,
            },
            sweepStart,
          )

          tl.to(
            sweep,
            {
              clipPath:
                'inset(0% 0% 0% 0%)',
              duration: 1.0,
              ease: 'power3.inOut',
            },
            sweepStart,
          )

          /*
           * This position change is intentionally animated underneath
           * the visible sweep, so there is no unexplained jump.
           */
          tl.to(
            scene3,
            {
              xPercent: desktop ? -3 : -1.5,
              scale: 1.018,
              duration: 1.0,
              ease: 'none',
            },
            sweepStart,
          )

          /* 
             07 — ALL FILMS ENTER RIGHT -> LEFT
             UNCHANGED
           */

          tl.to(
            gallery,
            {
              autoAlpha: 1,
              duration: 0.28,
            },
            sweepStart + 0.48,
          )

          tl.to(
            galleryCards,
            {
              autoAlpha: 1,
              xPercent: 0,
              duration: 0.78,
              stagger: {
                each: 0.075,
                from: 'start',
              },
              ease: 'power3.out',
            },
            sweepStart + 0.5,
          )

          tl.fromTo(
            gallery,
            {
              xPercent: desktop ? 4 : 2,
            },
            {
              xPercent: 0,
              duration: 0.9,
              ease: 'power2.out',
            },
            sweepStart + 0.42,
          )

          return () => {
            if (masterTimelineRef.current === tl) masterTimelineRef.current = null
            tl.scrollTrigger?.kill()
            tl.kill()
          }
        },
      )

      return () => {
        mm.revert()
      }
    },
    {
      scope: sectionRef,
      dependencies: [reduceMotion],
    },
  )

  const isLive = (index: number) =>
    Math.abs(index - activeIndex) <= 1

  const registerVideo = (index: number) => (node: HTMLVideoElement | null) => {
    videoRefs.current[index] = node
  }

  const togglePlayback = () => {
    const video = videoRefs.current[activeIndex]
    if (!video) return

    // Control the video that is actually active on screen.
    // Do not infer playback from the button state because ScrollTrigger can
    // change the active film independently while the section is moving.
    if (video.paused || video.ended) {
      setUserPaused(false)

      video
        .play()
        .then(() => {
          setIsCurrentVideoPlaying(true)
        })
        .catch(() => {
          setIsCurrentVideoPlaying(false)
        })
    } else {
      video.pause()
      setUserPaused(true)
      setIsCurrentVideoPlaying(false)
    }
  }

  const toggleMuted = () => {
    const nextMuted = !muted
    setMuted(nextMuted)

    const video = videoRefs.current[activeIndex]
    if (video) video.muted = nextMuted
  }

  const jumpToScene = (index: number) => {
    const scrollTrigger = masterTimelineRef.current?.scrollTrigger
    if (!scrollTrigger) return

    const progress = SCENE_SCROLL_PROGRESS[index] ?? SCENE_SCROLL_PROGRESS[0]
    const target = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * progress

    setUserPaused(false)
    setIsCurrentVideoPlaying(true)
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  // Keep the controller icon synchronized with the REAL playback state of
  // whichever scene is currently active. A new scene starts playing by
  // default; pausing only applies to the current scene.
  useEffect(() => {
    setUserPaused(false)

    const video = videoRefs.current[activeIndex]
    if (!video) {
      setIsCurrentVideoPlaying(false)
      return
    }

    const syncPlaybackState = () => {
      setIsCurrentVideoPlaying(!video.paused && !video.ended)
    }

    video.addEventListener('play', syncPlaybackState)
    video.addEventListener('playing', syncPlaybackState)
    video.addEventListener('pause', syncPlaybackState)
    video.addEventListener('ended', syncPlaybackState)

    if (video.paused) {
      video.play().catch(() => {
        syncPlaybackState()
      })
    } else {
      syncPlaybackState()
    }

    return () => {
      video.removeEventListener('play', syncPlaybackState)
      video.removeEventListener('playing', syncPlaybackState)
      video.removeEventListener('pause', syncPlaybackState)
      video.removeEventListener('ended', syncPlaybackState)
    }
  }, [activeIndex])

  useEffect(() => {
    let raf = 0
    let previous = ''

    const update = () => {
      const video = videoRefs.current[activeIndex]
      const timecode = timecodeRef.current

      if (video && timecode) {
        const next = formatTimecode(video.currentTime)
        if (next !== previous) {
          previous = next
          timecode.textContent = next
        }
      }

      raf = window.requestAnimationFrame(update)
    }

    raf = window.requestAnimationFrame(update)

    return () => window.cancelAnimationFrame(raf)
  }, [activeIndex])

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return
      video.muted = muted || index !== activeIndex
    })
  }, [activeIndex, muted])

  return (
    <section
      ref={sectionRef}
      id="videography"
      aria-labelledby="videography-heading"
      className="relative bg-white text-[#111]"
    >
      <div
        ref={stageRef}
        className="relative h-svh w-full overflow-hidden"
      >
        {/*  */}
        {/* INTRO                                                  */}
        {/*  */}

        <div
          ref={introRef}
          className="pointer-events-none absolute inset-0 z-10"
        >
          <div className="absolute left-[4vw] right-[4vw] top-[4vh] flex items-center justify-between md:left-[5vw] md:right-[5vw]">
            <span className="font-primary text-[9px] uppercase tracking-[0.2em] text-black/45">
              BrandWorks / Motion
            </span>

            <span className="font-primary text-[9px] uppercase tracking-[0.2em] text-black/35">
              01 — 04
            </span>
          </div>

          <div className="absolute inset-x-[4vw] top-1/2 -translate-y-1/2 md:inset-x-[5vw]">
            <h2
              id="videography-heading"
              className="sr-only"
            >
              Cinematic graphy
            </h2>

            <div className="overflow-hidden">
              <div
                ref={wordTopRef}
                className="
                  font-primary
                  text-[clamp(3.8rem,10.4vw,10.4rem)]
                  font-medium
                  uppercase
                  leading-[0.8]
                  tracking-[-0.075em]
                "
              >
                Cinematic
              </div>
            </div>

            <div className="flex justify-end overflow-hidden">
              <div
                ref={wordBottomRef}
                className="
                  font-primary
                  text-[clamp(3.8rem,10.4vw,10.4rem)]
                  font-medium
                  uppercase
                  leading-[0.8]
                  tracking-[-0.075em]
                "
              >
                graphy
              </div>
            </div>
          </div>

          <div
            ref={introMetaRef}
            className="absolute bottom-[5vh] left-[4vw] right-[4vw] flex items-end justify-between md:left-[5vw] md:right-[5vw]"
          >
            <p className="max-w-[390px] font-primary text-[11px] leading-[1.5] tracking-[-0.01em] text-black/55 md:text-[13px]">
              Campaign films, branded stories and moving images
              built around one clear idea.
            </p>

            <span className="hidden font-primary text-[9px] uppercase tracking-[0.18em] text-black/35 md:block">
              Scroll to reveal
            </span>
          </div>
        </div>

        {/*  */}
        {/* SCENE 01                                               */}
        {/*  */}

        <div
          ref={scene0Ref}
          className="absolute inset-0 z-20 overflow-hidden bg-[#111] will-change-[transform,clip-path,opacity]"
        >
          <div
            ref={media0Ref}
            className="absolute inset-0 will-change-transform"
          >
            <Film
              project={VIDEO_PROJECTS[0]}
              live={isLive(0)}
              muted={muted || activeIndex !== 0}
              paused={userPaused && activeIndex === 0}
              videoRef={registerVideo(0)}
            />
          </div>

          <div className="absolute inset-0 bg-black/[0.08]" />

          <SceneCaption
            ref={line0Ref}
            project={VIDEO_PROJECTS[0]}
          />
        </div>

        {/*  */}
        {/* SCENE 02                                               */}
        {/*  */}

        <div
          ref={scene1Ref}
          className="absolute inset-0 z-30 overflow-hidden bg-[#111] will-change-[transform,clip-path,opacity]"
        >
          <div
            ref={media1Ref}
            className="absolute inset-0 will-change-transform"
          >
            <Film
              project={VIDEO_PROJECTS[1]}
              live={isLive(1)}
              muted={muted || activeIndex !== 1}
              paused={userPaused && activeIndex === 1}
              videoRef={registerVideo(1)}
            />
          </div>

          <div className="absolute inset-0 bg-black/[0.08]" />

          <SceneCaption
            ref={line1Ref}
            project={VIDEO_PROJECTS[1]}
          />
        </div>

        {/*  */}
        {/* SCENE 03                                               */}
        {/*  */}

        <div
          ref={scene2Ref}
          className="absolute inset-0 z-40 overflow-hidden bg-[#111] will-change-[transform,clip-path,opacity]"
        >
          <div
            ref={media2Ref}
            className="absolute inset-0 will-change-transform"
          >
            <Film
              project={VIDEO_PROJECTS[2]}
              live={isLive(2)}
              muted={muted || activeIndex !== 2}
              paused={userPaused && activeIndex === 2}
              videoRef={registerVideo(2)}
            />
          </div>

          <div className="absolute inset-0 bg-black/[0.06]" />

          <SceneCaption
            ref={line2Ref}
            project={VIDEO_PROJECTS[2]}
          />
        </div>

        {/*  */}
        {/* SCENE 04 / CENTRE RECTANGLE -> FULL                   */}
        {/*  */}

        <div
          ref={scene3Ref}
          className="absolute inset-0 z-50 overflow-hidden bg-[#111] will-change-[transform,clip-path,opacity]"
        >
          <div
            ref={media3Ref}
            className="absolute inset-0 will-change-transform"
          >
            <Film
              project={VIDEO_PROJECTS[3]}
              live={isLive(3)}
              muted={muted || activeIndex !== 3}
              paused={userPaused && activeIndex === 3}
              videoRef={registerVideo(3)}
            />
          </div>

          <div className="absolute inset-0 bg-black/[0.06]" />

          <SceneCaption
            ref={line3Ref}
            project={VIDEO_PROJECTS[3]}
          />
        </div>

        {/*  */}
        {/* CENTRE CIRCLE PORTAL                                   */}
        {/*  */}

        <div
          ref={circlePortalRef}
          className="
            pointer-events-none
            absolute
            inset-0
            z-[55]
            overflow-hidden
            bg-[#111]
            will-change-[clip-path]
          "
        >
          <div
            ref={circleMediaRef}
            className="absolute inset-0 will-change-transform"
          >
            <Film
              project={VIDEO_PROJECTS[0]}
              live={activeIndex === 3}
            />
          </div>

          <div className="absolute inset-0 bg-black/[0.05]" />
        </div>

        {/*  */}
        {/* EDITORIAL VIDEO CONTROLLER                              */}
        {/*  */}

        <div
          ref={controllerRef}
          className="absolute bottom-[clamp(20px,4vh,42px)] left-1/2 z-[58] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 opacity-0"
        >
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isCurrentVideoPlaying ? 'Pause current video' : 'Play current video'}
            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-14 sm:w-14 max-[430px]:h-10 max-[430px]:w-10"
          >
            <Icon icon={isCurrentVideoPlaying ? 'lucide:pause' : 'lucide:play'} className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
          </button>

          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-14 sm:w-14 max-[430px]:h-10 max-[430px]:w-10"
          >
            <Icon icon={muted ? 'lucide:volume-x' : 'lucide:volume-2'} className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
          </button>

          <div className="flex h-12 shrink-0 items-center gap-1 rounded-[16px] border border-white/10 bg-black/55 p-1 backdrop-blur-xl sm:h-14 sm:gap-1.5 sm:rounded-[18px] max-[430px]:h-10 max-[430px]:gap-0.5 max-[430px]:rounded-[13px]">
            {VIDEO_PROJECTS.map((project, index) => (
              <button
                key={`${project.id}-controller`}
                type="button"
                onClick={() => jumpToScene(index)}
                aria-label={`View ${project.title}`}
                aria-current={activeIndex === index ? 'true' : undefined}
                className={`relative h-full w-12 overflow-hidden rounded-[12px] border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-14 md:w-16 max-[430px]:w-9 max-[430px]:rounded-[10px] ${activeIndex === index ? 'border-white/80 opacity-100' : 'border-white/0 opacity-60'}`}
              >
                <video
                  src={project.src}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  tabIndex={-1}
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget
                    if (Number.isFinite(video.duration) && video.duration > 0.4) {
                      video.currentTime = Math.min(0.35, video.duration * 0.04)
                    }
                  }}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <span className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${activeIndex === index ? 'bg-black/0' : 'bg-black/25'}`} />
              </button>
            ))}
          </div>

          <div className="flex h-12 shrink-0 items-center gap-2.5 rounded-[16px] border border-white/10 bg-[rgba(42,28,23,0.72)] px-4 text-white shadow-[0_10px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:h-14 sm:gap-3 sm:rounded-[18px] sm:px-5 max-[430px]:h-10 max-[430px]:gap-1.5 max-[430px]:rounded-[13px] max-[430px]:px-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#8f8a16] shadow-[0_0_10px_rgba(143,138,22,0.32)] max-[430px]:h-1.5 max-[430px]:w-1.5" aria-hidden="true" />
            <span className="font-primary text-[11px] font-medium tracking-[-0.01em] sm:text-[13px] max-[430px]:text-[9px]">30FPS</span>
            <span ref={timecodeRef} className="min-w-[68px] font-primary text-[11px] font-medium tabular-nums tracking-[0.02em] text-white/90 sm:min-w-[78px] sm:text-[13px] max-[430px]:min-w-[56px] max-[430px]:text-[9px]">00:00:00</span>
          </div>
        </div>

        {/*  */}
        {/* LEFT -> RIGHT SWEEP + FINAL VIDEO GRID                 */}
        {/*  */}

        <div
          ref={sweepRef}
          className="
            absolute
            inset-0
            z-[60]

            bg-white

            will-change-[clip-path]
          "
        >
          <div
            ref={galleryRef}
            className="
              flex
              h-full
              flex-col
              justify-center

              px-5
              py-12

              opacity-0

              sm:px-7
              md:px-[5vw]
            "
          >
            <div className="mb-7 flex items-end justify-between gap-8 pb-4 md:mb-9">
              <div>
                <p className="font-primary text-[9px] uppercase tracking-[0.2em] text-black/40">
                  Selected Motion
                </p>

                <p className="mt-2 font-primary text-[clamp(1.6rem,2.7vw,3rem)] font-medium leading-[0.98] tracking-[-0.04em]">
                  One idea.
                  <span className="text-black/38">
                    {' '}Different frames.
                  </span>
                </p>
              </div>

              <span className="hidden font-primary text-[9px] uppercase tracking-[0.18em] text-black/30 md:block">
                01 — 04
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
              {VIDEO_PROJECTS.map((project, index) => (
                <div
                  key={`${project.id}-gallery`}
                  ref={(node) => {
                    galleryCardRefs.current[index] = node
                  }}
                  className="opacity-0 will-change-transform"
                >
                  <GalleryFilm
                    project={project}
                    live={galleryLive}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*  */}
        {/* PROGRESS                                               */}
        {/*  */}

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[90] h-px bg-black/10">
          <div
            ref={progressRef}
            className="h-full w-full origin-left scale-x-0 bg-black/50"
          />
        </div>
      </div>
    </section>
  )
}
