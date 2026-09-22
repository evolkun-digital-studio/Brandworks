import { useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=2400&q=90',

  portraitOne:
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=90',

  portraitTwo:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=90',

  final:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2400&q=90',
}

export default function Photography() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  /*
   * INTRO
   */
  const introRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const introCopyRef = useRef<HTMLParagraphElement>(null)

  /*
   * CONTACT SHEET
   */
  const collageRef = useRef<HTMLDivElement>(null)
  const mainCardRef = useRef<HTMLDivElement>(null)
  const leftCardRef = useRef<HTMLDivElement>(null)
  const rightCardRef = useRef<HTMLDivElement>(null)
  const bottomCardRef = useRef<HTMLDivElement>(null)

  /*
   * HERO EXPANSION
   */
  const heroRef = useRef<HTMLDivElement>(null)
  const heroImageRef = useRef<HTMLImageElement>(null)
  const heroCaptionRef = useRef<HTMLDivElement>(null)

  /*
   * PORTRAIT SPLIT
   */
  const splitRef = useRef<HTMLDivElement>(null)

  const splitLeftRef = useRef<HTMLDivElement>(null)
  const splitRightRef = useRef<HTMLDivElement>(null)

  const splitLeftImageRef = useRef<HTMLImageElement>(null)
  const splitRightImageRef = useRef<HTMLImageElement>(null)

  const splitCaptionRef = useRef<HTMLDivElement>(null)

  /*
   * FINAL FRAME
   */
  const finalRef = useRef<HTMLDivElement>(null)
  const finalImageRef = useRef<HTMLImageElement>(null)
  const finalCaptionRef = useRef<HTMLDivElement>(null)

  /*
   * UI CHROME
   */
  const chromeRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<HTMLSpanElement>(null)

  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      if (
        !sectionRef.current ||
        !stageRef.current ||
        !introRef.current ||
        !titleRef.current ||
        !introCopyRef.current ||
        !collageRef.current ||
        !mainCardRef.current ||
        !leftCardRef.current ||
        !rightCardRef.current ||
        !bottomCardRef.current ||
        !heroRef.current ||
        !heroImageRef.current ||
        !heroCaptionRef.current ||
        !splitRef.current ||
        !splitLeftRef.current ||
        !splitRightRef.current ||
        !splitLeftImageRef.current ||
        !splitRightImageRef.current ||
        !splitCaptionRef.current ||
        !finalRef.current ||
        !finalImageRef.current ||
        !finalCaptionRef.current ||
        !chromeRef.current ||
        !progressRef.current ||
        !stepRef.current ||
        !phaseRef.current
      ) {
        return
      }

      const section = sectionRef.current
      const stage = stageRef.current

      const intro = introRef.current
      const title = titleRef.current
      const introCopy = introCopyRef.current

      const collage = collageRef.current

      const mainCard = mainCardRef.current
      const leftCard = leftCardRef.current
      const rightCard = rightCardRef.current
      const bottomCard = bottomCardRef.current

      const hero = heroRef.current
      const heroImage = heroImageRef.current
      const heroCaption = heroCaptionRef.current

      const split = splitRef.current
      const splitLeft = splitLeftRef.current
      const splitRight = splitRightRef.current

      const splitLeftImage = splitLeftImageRef.current
      const splitRightImage = splitRightImageRef.current

      const splitCaption = splitCaptionRef.current

      const finalFrame = finalRef.current
      const finalImage = finalImageRef.current
      const finalCaption = finalCaptionRef.current

      const chrome = chromeRef.current
      const progress = progressRef.current
      const step = stepRef.current
      const phase = phaseRef.current

      /*
       * REDUCED MOTION
       */

      if (reduceMotion) {
        gsap.set(intro, {
          autoAlpha: 0,
          display: 'none',
        })

        gsap.set(collage, {
          display: 'none',
        })

        gsap.set(hero, {
          autoAlpha: 1,
          clipPath: 'inset(6vh 5vw)',
        })

        gsap.set(heroImage, {
          scale: 1,
        })

        gsap.set(heroCaption, {
          autoAlpha: 1,
        })

        gsap.set(split, {
          display: 'none',
        })

        gsap.set(finalFrame, {
          display: 'none',
        })

        gsap.set(chrome, {
          autoAlpha: 1,
        })

        return
      }

      let disposed = false

      const mm = gsap.matchMedia()

      mm.add(
        {
          desktop: '(min-width: 768px)',
          mobile: '(max-width: 767px)',
        },
        (context) => {
          const conditions = context.conditions as {
            desktop: boolean
            mobile: boolean
          }

          const desktop = conditions.desktop

          const cards = [
            mainCard,
            leftCard,
            rightCard,
            bottomCard,
          ]

          /*
           * INITIAL STATE
           */

          gsap.set(stage, {
            force3D: true,
          })

          gsap.set(cards, {
            autoAlpha: 0,
            force3D: true,
          })

          gsap.set(chrome, {
            autoAlpha: 0,
          })

          gsap.set(progress, {
            scaleX: 0,
            transformOrigin: 'left center',
          })

          /*
           * HERO
           */

          gsap.set(hero, {
            autoAlpha: 0,
            force3D: true,
          })

          gsap.set(heroImage, {
            scale: 1.085,
            force3D: true,
          })

          gsap.set(heroCaption, {
            autoAlpha: 0,
            y: 20,
          })

          /*
           * SPLIT
           */

          gsap.set(split, {
            autoAlpha: 0,
          })

          gsap.set([splitLeft, splitRight], {
            force3D: true,
          })

          gsap.set(splitLeftImage, {
            scale: 1.1,
            yPercent: 4,
            force3D: true,
          })

          gsap.set(splitRightImage, {
            scale: 1.1,
            yPercent: -4,
            force3D: true,
          })

          gsap.set(splitCaption, {
            autoAlpha: 0,
            y: 20,
          })

          /*
           * FINAL
           */

          gsap.set(finalFrame, {
            autoAlpha: 0,
          })

          gsap.set(finalImage, {
            scale: 1.1,
            force3D: true,
          })

          gsap.set(finalCaption, {
            autoAlpha: 0,
            y: 24,
          })

          /*
           * RESPONSIVE HERO MASKS
           */

          const heroStart = desktop
            ? 'inset(23vh 29vw 23vh 29vw)'
            : 'inset(25vh 12vw 25vh 12vw)'

          const heroFrame = desktop
            ? 'inset(6vh 5vw 6vh 5vw)'
            : 'inset(8vh 4vw 8vh 4vw)'

          /*
           * MASTER TIMELINE
           */

          const timeline = gsap.timeline({
            defaults: {
              ease: 'power3.inOut',
            },

            scrollTrigger: {
              trigger: section,
              start: 'top top',

              end: () =>
                `+=${window.innerHeight * (desktop ? 5.5 : 4.8)}`,

              pin: stage,

              scrub: desktop ? 1.15 : 0.85,

              anticipatePin: 1,

              invalidateOnRefresh: true,
            },
          })

          /*
           * ───────────────────────────────────────
           * 01 — INTRO → CONTACT SHEET
           * ───────────────────────────────────────
           */

          timeline
            .to(
              chrome,
              {
                autoAlpha: 1,
                duration: 0.5,
              },
              0,
            )

            .to(
              title,
              {
                yPercent: -10,
                scale: 0.965,
                opacity: 0.08,
                duration: 1.4,
              },
              0,
            )

            .to(
              introCopy,
              {
                y: -20,
                autoAlpha: 0,
                duration: 0.7,
              },
              0.05,
            )

          /*
           * CENTER IMAGE
           */

          timeline.fromTo(
            mainCard,
            {
              yPercent: 22,
              scale: 0.88,
              clipPath: 'inset(16% 0% 0% 0%)',
              autoAlpha: 0,
            },
            {
              yPercent: 0,
              scale: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              autoAlpha: 1,

              duration: 1.05,
              ease: 'expo.out',
            },
            0.18,
          )

          /*
           * LEFT IMAGE
           */

          timeline.fromTo(
            leftCard,
            {
              xPercent: desktop ? -45 : -25,
              yPercent: 16,
              rotation: -5,
              scale: 0.9,
              autoAlpha: 0,
            },
            {
              xPercent: 0,
              yPercent: 0,
              rotation: desktop ? -1.7 : -1,
              scale: 1,
              autoAlpha: 1,

              duration: 0.95,
              ease: 'expo.out',
            },
            0.32,
          )

          /*
           * RIGHT IMAGE
           */

          timeline.fromTo(
            rightCard,
            {
              xPercent: desktop ? 45 : 24,
              yPercent: -14,
              rotation: 5,
              scale: 0.9,
              autoAlpha: 0,
            },
            {
              xPercent: 0,
              yPercent: 0,
              rotation: desktop ? 1.5 : 1,
              scale: 1,
              autoAlpha: 1,

              duration: 0.95,
              ease: 'expo.out',
            },
            0.42,
          )

          /*
           * BOTTOM IMAGE
           */

          timeline.fromTo(
            bottomCard,
            {
              yPercent: 35,
              xPercent: 14,
              rotation: 3,
              scale: 0.9,
              autoAlpha: 0,
            },
            {
              yPercent: 0,
              xPercent: 0,
              rotation: desktop ? 1 : 0.5,
              scale: 1,
              autoAlpha: 1,

              duration: 0.9,
              ease: 'expo.out',
            },
            0.52,
          )

          timeline.to(
            intro,
            {
              autoAlpha: 0,
              duration: 0.4,
            },
            0.72,
          )

          /*
           * SLOW CONTACT-SHEET DRIFT
           */

          timeline
            .to(
              leftCard,
              {
                xPercent: desktop ? -14 : -7,
                yPercent: -10,
                rotation: desktop ? -2.5 : -1.5,

                duration: 1.2,
                ease: 'none',
              },
              1.02,
            )

            .to(
              rightCard,
              {
                xPercent: desktop ? 12 : 6,
                yPercent: 8,
                rotation: desktop ? 2.4 : 1.3,

                duration: 1.2,
                ease: 'none',
              },
              1.02,
            )

            .to(
              bottomCard,
              {
                xPercent: desktop ? 8 : 4,
                yPercent: -10,

                duration: 1.2,
                ease: 'none',
              },
              1.02,
            )

            .to(
              mainCard,
              {
                scale: 1.025,

                duration: 1.2,
                ease: 'none',
              },
              1.02,
            )

          /*
           * ───────────────────────────────────────
           * 02 — CONTACT SHEET → HERO FRAME
           * ───────────────────────────────────────
           */

          timeline.set(
            hero,
            {
              autoAlpha: 1,
              clipPath: heroStart,
            },
            1.28,
          )

          timeline
            .to(
              hero,
              {
                clipPath: heroFrame,

                duration: 1.35,
                ease: 'power4.inOut',
              },
              1.28,
            )

            .to(
              heroImage,
              {
                scale: 1.02,

                duration: 1.35,
                ease: 'power3.out',
              },
              1.28,
            )

          /*
           * Original center card disappears into
           * the matching fullscreen image.
           */

          timeline.to(
            mainCard,
            {
              autoAlpha: 0,
              scale: 1.04,

              duration: 0.35,
            },
            1.3,
          )

          /*
           * Peripheral images float away instead
           * of simply fading.
           */

          timeline
            .to(
              leftCard,
              {
                xPercent: desktop ? -40 : -18,
                yPercent: -14,
                autoAlpha: 0,

                duration: 0.85,
              },
              1.38,
            )

            .to(
              rightCard,
              {
                xPercent: desktop ? 40 : 18,
                yPercent: 14,
                autoAlpha: 0,

                duration: 0.85,
              },
              1.38,
            )

            .to(
              bottomCard,
              {
                yPercent: 30,
                scale: 0.94,
                autoAlpha: 0,

                duration: 0.8,
              },
              1.42,
            )

          /*
           * HERO FRAME → FULL BLEED
           */

          timeline
            .to(
              hero,
              {
                clipPath: 'inset(0% 0% 0% 0%)',

                duration: 0.95,
                ease: 'power4.inOut',
              },
              2.28,
            )

            .to(
              heroImage,
              {
                scale: 1.055,
                xPercent: -1,

                duration: 1.05,
                ease: 'none',
              },
              2.28,
            )

            .to(
              heroCaption,
              {
                autoAlpha: 1,
                y: 0,

                duration: 0.55,
                ease: 'power3.out',
              },
              2.65,
            )

          /*
           * ───────────────────────────────────────
           * 03 — FULL BLEED → PORTRAIT SPLIT
           * ───────────────────────────────────────
           */

          timeline.set(
            split,
            {
              autoAlpha: 1,
            },
            3.22,
          )

          timeline
            .fromTo(
              splitLeft,
              {
                clipPath: 'inset(0% 100% 0% 0%)',
                xPercent: -4,
              },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                xPercent: 0,

                duration: 1.1,
                ease: 'power4.inOut',
              },
              3.22,
            )

            .fromTo(
              splitRight,
              {
                clipPath: 'inset(0% 0% 0% 100%)',
                xPercent: 4,
              },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                xPercent: 0,

                duration: 1.1,
                ease: 'power4.inOut',
              },
              3.3,
            )

          /*
           * INTERNAL IMAGE PARALLAX
           */

          timeline
            .to(
              splitLeftImage,
              {
                scale: 1.02,
                yPercent: -2,

                duration: 1.1,
                ease: 'power2.out',
              },
              3.22,
            )

            .to(
              splitRightImage,
              {
                scale: 1.02,
                yPercent: 2,

                duration: 1.1,
                ease: 'power2.out',
              },
              3.3,
            )

          timeline.to(
            heroCaption,
            {
              autoAlpha: 0,
              y: -16,

              duration: 0.35,
            },
            3.1,
          )

          timeline.to(
            splitCaption,
            {
              autoAlpha: 1,
              y: 0,

              duration: 0.5,
              ease: 'power3.out',
            },
            3.92,
          )

          /*
           * ───────────────────────────────────────
           * 04 — PORTRAIT SPLIT → FINAL CAMPAIGN
           * ───────────────────────────────────────
           */

          timeline.set(
            finalFrame,
            {
              autoAlpha: 1,
              clipPath: 'inset(44% 0% 44% 0%)',
            },
            4.5,
          )

          timeline
            .to(
              finalFrame,
              {
                clipPath: 'inset(0% 0% 0% 0%)',

                duration: 1.2,
                ease: 'power4.inOut',
              },
              4.5,
            )

            .to(
              finalImage,
              {
                scale: 1.015,

                duration: 1.2,
                ease: 'power3.out',
              },
              4.5,
            )

          /*
           * Portraits move apart while the final
           * image grows through the middle.
           */

          timeline
            .to(
              splitLeft,
              {
                xPercent: -105,
                scale: 0.965,
                opacity: 0.3,

                duration: 0.9,
                ease: 'power3.inOut',
              },
              4.62,
            )

            .to(
              splitRight,
              {
                xPercent: 105,
                scale: 0.965,
                opacity: 0.3,

                duration: 0.9,
                ease: 'power3.inOut',
              },
              4.62,
            )

            .to(
              splitCaption,
              {
                autoAlpha: 0,
                y: -14,

                duration: 0.25,
              },
              4.5,
            )

          /*
           * FINAL COPY
           */

          timeline.to(
            finalCaption,
            {
              autoAlpha: 1,
              y: 0,

              duration: 0.55,
              ease: 'power3.out',
            },
            5.18,
          )

          /*
           * FINAL BREATH
           */

          timeline.to(
            finalImage,
            {
              scale: 1,
              xPercent: 1.2,

              duration: 1.1,
              ease: 'none',
            },
            5.16,
          )

          /*
           * PROGRESS UI
           *
           * Using timeline progress means the indicator
           * follows the smoothed scrub animation, not the
           * raw browser scroll position.
           */

          const setProgress = gsap.quickSetter(
            progress,
            'scaleX',
          )

          let previousPhase = -1

          const updateChrome = () => {
            const p = timeline.progress()

            setProgress(p)

            let index = 0

            if (p >= 0.25) index = 1
            if (p >= 0.53) index = 2
            if (p >= 0.78) index = 3

            if (index === previousPhase) return

            previousPhase = index

            const phases = [
              'Direction',
              'Frame',
              'Portrait',
              'Campaign',
            ]

            step.textContent = String(index + 1).padStart(
              2,
              '0',
            )

            phase.textContent = phases[index]
          }

          timeline.eventCallback(
            'onUpdate',
            updateChrome,
          )

          updateChrome()

          return () => {
            timeline.eventCallback('onUpdate', null)

            timeline.scrollTrigger?.kill()
            timeline.kill()
          }
        },
      )

      /*
       * Refresh after fonts settle.
       * Helps prevent pin calculations changing
       * after typography loads.
       */

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (!disposed) {
            ScrollTrigger.refresh()
          }
        })
      }

      return () => {
        disposed = true
        mm.revert()
      }
    },
    {
      scope: sectionRef,
      dependencies: [reduceMotion],
    },
  )

  return (
    <section
      ref={sectionRef}
      id="photography"
      aria-labelledby="photography-title"
      className="relative isolate text-[#111]"
    >
      <div
        ref={stageRef}
        className="relative h-svh w-full overflow-hidden"
      >
        {/* ───────────────── INTRO ───────────────── */}

        <div
          ref={introRef}
          className="pointer-events-none absolute inset-0 z-10"
        >
          <div className="absolute inset-x-[5vw] top-[6vh] flex items-center justify-between">
            <span className="font-primary text-[9px] uppercase tracking-[0.22em] text-black/40">
              BrandWorks
            </span>

            <span className="font-primary text-[9px] uppercase tracking-[0.22em] text-black/40">
              Visual Direction / 01
            </span>
          </div>

          <div className="absolute inset-x-[4vw] top-1/2 -translate-y-1/2 md:inset-x-[5vw]">
            <h2
              ref={titleRef}
              id="photography-title"
              className="font-primary text-[clamp(4.2rem,12vw,6.5rem)] font-medium uppercase leading-[0.78] tracking-[-0.085em] text-[#111] will-change-[transform,opacity]"
            >
              Photography
            </h2>
          </div>

          <div className="absolute bottom-[7vh] left-[5vw] right-[5vw] flex justify-end">
            <p
              ref={introCopyRef}
              className="max-w-[470px] font-primary text-[13px] leading-[1.45] tracking-[-0.015em] text-black/55 md:text-[15px]"
            >
              Campaign photography, editorial portraits
              and culture-led visual direction for brands
              building a recognisable image language.
            </p>
          </div>
        </div>

        {/* ─────────────── CONTACT SHEET ─────────────── */}

        <div
          ref={collageRef}
          className="pointer-events-none absolute inset-0 z-20"
        >
          {/* LEFT */}

          <div
            ref={leftCardRef}
            className="absolute left-[4vw] top-[17vh] h-[24vh] w-[31vw] overflow-hidden bg-[#ddd] opacity-0 will-change-[transform,opacity] md:left-[6vw] md:top-[18vh] md:h-[32vh] md:w-[18vw]"
          >
            <img
              src={PHOTOS.portraitOne}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="eager"
              decoding="async"
              className="h-full w-full select-none object-cover"
              style={{
                objectPosition: '50% 38%',
              }}
            />
          </div>

          {/* CENTER */}

          <div
            ref={mainCardRef}
            className="absolute left-1/2 top-1/2 z-20 h-[50vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#ddd] opacity-0 will-change-[transform,opacity,clip-path] md:h-[54vh] md:w-[42vw]"
          >
            <img
              src={PHOTOS.hero}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-full w-full select-none object-cover"
            />
          </div>

          {/* RIGHT */}

          <div
            ref={rightCardRef}
            className="absolute right-[4vw] top-[17vh] h-[27vh] w-[29vw] overflow-hidden bg-[#ddd] opacity-0 will-change-[transform,opacity] md:right-[7vw] md:top-[15vh] md:h-[34vh] md:w-[17vw]"
          >
            <img
              src={PHOTOS.portraitTwo}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="eager"
              decoding="async"
              className="h-full w-full select-none object-cover"
              style={{
                objectPosition: '50% 38%',
              }}
            />
          </div>

          {/* BOTTOM */}

          <div
            ref={bottomCardRef}
            className="absolute bottom-[9vh] right-[8vw] h-[19vh] w-[37vw] overflow-hidden bg-[#ddd] opacity-0 will-change-[transform,opacity] md:bottom-[8vh] md:right-[12vw] md:h-[23vh] md:w-[25vw]"
          >
            <img
              src={PHOTOS.final}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="lazy"
              decoding="async"
              className="h-full w-full select-none object-cover"
            />
          </div>
        </div>

        {/* ────────────── HERO EXPANSION ────────────── */}

        <div
          ref={heroRef}
          className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-[#111] opacity-0 will-change-[clip-path,opacity]"
        >
          <img
            ref={heroImageRef}
            src={PHOTOS.hero}
            alt="BrandWorks campaign and culture photography"
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-full w-full select-none object-cover will-change-transform [backface-visibility:hidden]"
          />

          <div
            ref={heroCaptionRef}
            className="absolute bottom-[5vh] left-[5vw] right-[5vw] flex items-end justify-between text-white opacity-0"
          >
            <p className="font-primary text-[10px] uppercase tracking-[0.2em] text-white/70">
              Campaign / Editorial / Culture
            </p>

            <p className="hidden max-w-[280px] text-right font-primary text-[12px] leading-[1.4] text-white/70 md:block">
              Images designed to feel lived in,
              deliberate and distinctly yours.
            </p>
          </div>
        </div>

        {/* ────────────── PORTRAIT SPLIT ────────────── */}

        <div
          ref={splitRef}
          className="pointer-events-none absolute inset-0 z-40 opacity-0"
        >
          <div
            ref={splitLeftRef}
            className="absolute bottom-0 left-0 top-0 w-1/2 overflow-hidden bg-[#111] will-change-[transform,clip-path]"
          >
            <img
              ref={splitLeftImageRef}
              src={PHOTOS.portraitOne}
              alt="Editorial portrait photography by BrandWorks"
              draggable={false}
              loading="eager"
              decoding="async"
              className="h-full w-full select-none object-cover will-change-transform [backface-visibility:hidden]"
              style={{
                objectPosition: '50% 38%',
              }}
            />
          </div>

          <div
            ref={splitRightRef}
            className="absolute bottom-0 right-0 top-0 w-1/2 overflow-hidden bg-[#111] will-change-[transform,clip-path]"
          >
            <img
              ref={splitRightImageRef}
              src={PHOTOS.portraitTwo}
              alt="Creative portrait photography by BrandWorks"
              draggable={false}
              loading="eager"
              decoding="async"
              className="h-full w-full select-none object-cover will-change-transform [backface-visibility:hidden]"
              style={{
                objectPosition: '50% 38%',
              }}
            />
          </div>

          <div className="absolute bottom-0 left-1/2 top-0 z-20 w-px bg-white/30" />

          <div
            ref={splitCaptionRef}
            className="absolute bottom-[5vh] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap opacity-0"
          >
            <span className="font-primary text-[9px] uppercase tracking-[0.25em] text-white/80">
              Portrait / Direction
            </span>
          </div>
        </div>

        {/* ─────────────── FINAL FRAME ─────────────── */}

        <div
          ref={finalRef}
          className="pointer-events-none absolute inset-0 z-50 overflow-hidden bg-[#111] opacity-0 will-change-[clip-path,opacity]"
        >
          <img
            ref={finalImageRef}
            src={PHOTOS.final}
            alt="BrandWorks campaign photography"
            draggable={false}
            loading="lazy"
            decoding="async"
            className="h-full w-full select-none object-cover will-change-transform [backface-visibility:hidden]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          <div
            ref={finalCaptionRef}
            className="absolute bottom-[5vh] left-[5vw] right-[5vw] flex items-end justify-between opacity-0"
          >
            <div>
              <span className="mb-3 block font-primary text-[9px] uppercase tracking-[0.22em] text-white/55">
                Photography
              </span>

              <p className="max-w-[600px] font-primary text-[clamp(1.7rem,4vw,4rem)] font-medium leading-[0.95] tracking-[-0.045em] text-white">
                Built to hold
                <br />
                attention.
              </p>
            </div>

            <span className="hidden font-primary text-[9px] uppercase tracking-[0.2em] text-white/55 md:block">
              BrandWorks / Visual Direction
            </span>
          </div>
        </div>

        {/* ─────────────── UI CHROME ─────────────── */}

        <div
          ref={chromeRef}
          className="pointer-events-none absolute inset-0 z-[90] opacity-0"
        >
          {/* TOP */}

          <div className="absolute left-[4vw] right-[4vw] top-[3vh] flex items-center gap-4 md:left-[5vw] md:right-[5vw]">
            <span
              ref={stepRef}
              className="min-w-[20px] font-primary text-[9px] font-medium uppercase tracking-[0.18em] text-black/45 mix-blend-difference invert"
            >
              01
            </span>

            <div className="h-px flex-1 bg-current opacity-20 mix-blend-difference invert" />

            <span
              ref={phaseRef}
              className="font-primary text-[9px] uppercase tracking-[0.18em] text-black/45 mix-blend-difference invert"
            >
              Direction
            </span>
          </div>

          {/* BOTTOM */}

          <div className="absolute bottom-[3vh] left-[4vw] right-[4vw] md:left-[5vw] md:right-[5vw]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/40 mix-blend-difference invert md:text-[9px]">
                Campaign / Editorial / Culture
              </span>

              <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/40 mix-blend-difference invert md:text-[9px]">
                BW / 01
              </span>
            </div>

            <div className="h-px w-full overflow-hidden bg-current opacity-20 mix-blend-difference invert">
              <div
                ref={progressRef}
                className="h-full w-full origin-left scale-x-0 bg-current"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}