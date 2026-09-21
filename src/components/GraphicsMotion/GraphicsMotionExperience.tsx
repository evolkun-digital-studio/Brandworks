import { useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

import { graphicsMotionMedia } from '../../data/graphicsMotionMedia'

gsap.registerPlugin(ScrollTrigger, useGSAP)

function GraphicsMotionExperience() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const labelRef = useRef<HTMLParagraphElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const supportRef = useRef<HTMLParagraphElement>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const staticImageRef = useRef<HTMLImageElement>(null)
  const motionLayerRef = useRef<HTMLDivElement>(null)

  const detailARef = useRef<HTMLDivElement>(null)
  const detailBRef = useRef<HTMLDivElement>(null)

  const motionMetaRef = useRef<HTMLDivElement>(null)

  const digitalRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLDivElement>(null)

  const systemDetailRef = useRef<HTMLDivElement>(null)
  const systemWordRef = useRef<HTMLDivElement>(null)

  const finalRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      const canvas = canvasRef.current

      if (!section || !canvas) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          mobile: '(max-width: 767px)',
          desktop: '(min-width: 768px)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const conditions = context.conditions as {
            mobile?: boolean
            desktop?: boolean
            reduced?: boolean
          }

          const mobile = Boolean(conditions.mobile)

          /**
           * ===========================================
           * REDUCED MOTION
           * ===========================================
           */

          if (conditions.reduced) {
            gsap.set(
              [
                labelRef.current,
                headlineRef.current,
                supportRef.current,
                heroRef.current,
              ].filter(Boolean),
              {
                autoAlpha: 1,
                clearProps: 'transform',
              },
            )

            gsap.set(
              [
                detailARef.current,
                detailBRef.current,
                motionMetaRef.current,
                digitalRef.current,
                codeRef.current,
                systemDetailRef.current,
                systemWordRef.current,
                finalRef.current,
              ].filter(Boolean),
              {
                autoAlpha: 0,
              },
            )

            return
          }

          /**
           * ===========================================
           * INITIAL STATES
           * ===========================================
           */

          gsap.set(labelRef.current, {
            autoAlpha: 0,
            y: 14,
          })

          gsap.set(headlineRef.current, {
            autoAlpha: 0,
            yPercent: 16,
          })

          gsap.set(supportRef.current, {
            autoAlpha: 0,
            y: 18,
          })

          gsap.set(heroRef.current, {
            autoAlpha: 0,
            xPercent: mobile ? 0 : 8,
            yPercent: mobile ? 8 : 3,
            scale: 0.94,
            force3D: true,
          })

          gsap.set(motionLayerRef.current, {
            autoAlpha: 1,
            clipPath: 'inset(100% 0% 0% 0%)',
          })

          gsap.set(detailARef.current, {
            autoAlpha: 0,
            xPercent: -12,
            yPercent: 10,
            scale: 0.9,
          })

          gsap.set(detailBRef.current, {
            autoAlpha: 0,
            xPercent: 12,
            yPercent: -8,
            scale: 0.9,
          })

          gsap.set(motionMetaRef.current, {
            autoAlpha: 0,
            y: 12,
          })

          gsap.set(digitalRef.current, {
            autoAlpha: 0,
            xPercent: mobile ? 0 : 12,
            yPercent: mobile ? 14 : 4,
            scale: 0.94,
          })

          gsap.set(codeRef.current, {
            autoAlpha: 0,
            xPercent: mobile ? 0 : 12,
            yPercent: mobile ? 12 : 0,
          })

          gsap.set(systemDetailRef.current, {
            autoAlpha: 0,
            scale: 0.9,
            yPercent: 8,
          })

          gsap.set(systemWordRef.current, {
            autoAlpha: 0,
            yPercent: 20,
          })

          gsap.set(finalRef.current, {
            autoAlpha: 0,
            yPercent: 10,
          })

          /**
           * ===========================================
           * MASTER TIMELINE
           * ===========================================
           */

          const tl = gsap.timeline({
            defaults: {
              ease: 'power3.inOut',
            },

            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.15,
              invalidateOnRefresh: true,
            },
          })

          /**
           * ===========================================
           * 01 — INTRO / STATIC
           * ===========================================
           */

          tl.addLabel('intro', 0)

          tl.to(
            labelRef.current,
            {
              autoAlpha: 1,
              y: 0,
              duration: 5,
              ease: 'power3.out',
            },
            'intro',
          )

          tl.to(
            headlineRef.current,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 8,
              ease: 'expo.out',
            },
            'intro+=1',
          )

          tl.to(
            supportRef.current,
            {
              autoAlpha: 1,
              y: 0,
              duration: 6,
              ease: 'power3.out',
            },
            'intro+=4',
          )

          tl.to(
            heroRef.current,
            {
              autoAlpha: 1,
              xPercent: 0,
              yPercent: 0,
              scale: 1,
              duration: 10,
              ease: 'expo.inOut',
            },
            'intro+=4',
          )

          /**
           * Quiet hold.
           */

          tl.to(
            heroRef.current,
            {
              scale: 1.008,
              duration: 8,
              ease: 'sine.inOut',
            },
            'intro+=13',
          )

          /**
           * ===========================================
           * 02 — LAYERS
           * ===========================================
           */

          tl.addLabel('layers', 23)

          /**
           * Main title becomes background information
           * rather than abruptly disappearing.
           */

          tl.to(
            headlineRef.current,
            {
              autoAlpha: 0.12,
              xPercent: mobile ? 0 : -4,
              yPercent: -4,
              scale: 0.96,
              duration: 11,
            },
            'layers',
          )

          tl.to(
            supportRef.current,
            {
              autoAlpha: 0,
              y: -10,
              duration: 7,
            },
            'layers',
          )

          /**
           * Main artwork repositions.
           */

          tl.to(
            heroRef.current,
            {
              xPercent: mobile ? 0 : -5,
              yPercent: mobile ? 2 : 1,
              scale: mobile ? 0.94 : 0.92,
              duration: 12,
              ease: 'power3.inOut',
            },
            'layers',
          )

          /**
           * Design fragments appear.
           */

          tl.to(
            detailARef.current,
            {
              autoAlpha: 1,
              xPercent: 0,
              yPercent: 0,
              scale: 1,
              duration: 9,
              ease: 'expo.out',
            },
            'layers+=3',
          )

          tl.to(
            detailBRef.current,
            {
              autoAlpha: 1,
              xPercent: 0,
              yPercent: 0,
              scale: 1,
              duration: 9,
              ease: 'expo.out',
            },
            'layers+=7',
          )

          /**
           * Hold the layered composition.
           */

          tl.to(
            detailARef.current,
            {
              yPercent: -1,
              duration: 7,
              ease: 'sine.inOut',
            },
            'layers+=13',
          )

          /**
           * ===========================================
           * 03 — STATIC BECOMES MOTION
           * ===========================================
           */

          tl.addLabel('motion', 44)

          /**
           * Supporting pieces move outward.
           */

          tl.to(
            detailARef.current,
            {
              xPercent: mobile ? -6 : -20,
              yPercent: mobile ? 8 : 4,
              scale: mobile ? 0.82 : 0.72,
              autoAlpha: 0.55,
              duration: 14,
            },
            'motion',
          )

          tl.to(
            detailBRef.current,
            {
              xPercent: mobile ? 8 : 24,
              yPercent: mobile ? -7 : -5,
              scale: mobile ? 0.8 : 0.7,
              autoAlpha: 0.48,
              duration: 14,
            },
            'motion',
          )

          /**
           * The SAME hero frame expands.
           */

          tl.to(
            heroRef.current,
            {
              xPercent: mobile ? 0 : -2,
              yPercent: mobile ? -4 : 0,
              scale: mobile ? 1 : 1.08,
              duration: 15,
              ease: 'expo.inOut',
            },
            'motion',
          )

          /**
           * Video reveals INSIDE that same frame.
           *
           * This is the main transition.
           */

          tl.to(
            motionLayerRef.current,
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 16,
              ease: 'expo.inOut',
            },
            'motion+=1',
          )

          /**
           * Static image remains underneath during reveal,
           * then becomes secondary.
           */

          tl.to(
            staticImageRef.current,
            {
              scale: 1.04,
              autoAlpha: 0.12,
              duration: 15,
            },
            'motion+=1',
          )

          tl.to(
            motionMetaRef.current,
            {
              autoAlpha: 1,
              y: 0,
              duration: 7,
              ease: 'power3.out',
            },
            'motion+=10',
          )

          /**
           * Let the motion work breathe.
           */

          tl.to(
            heroRef.current,
            {
              scale: mobile ? 1.01 : 1.09,
              duration: 9,
              ease: 'sine.inOut',
            },
            'motion+=16',
          )

          /**
           * ===========================================
           * 04 — DIGITAL
           * ===========================================
           */

          tl.addLabel('digital', 69)

          tl.to(
            motionMetaRef.current,
            {
              autoAlpha: 0.45,
              xPercent: mobile ? 0 : -8,
              duration: 8,
            },
            'digital',
          )

          /**
           * Motion remains visible but moves aside.
           */

          tl.to(
            heroRef.current,
            {
              xPercent: mobile ? 0 : -32,
              yPercent: mobile ? -18 : -3,
              scale: mobile ? 0.62 : 0.66,
              duration: 15,
              ease: 'expo.inOut',
            },
            'digital',
          )

          /**
           * Digital result enters as new focal point.
           */

          tl.to(
            digitalRef.current,
            {
              autoAlpha: 1,
              xPercent: 0,
              yPercent: 0,
              scale: 1,
              duration: 13,
              ease: 'expo.inOut',
            },
            'digital+=3',
          )

          /**
           * Code arrives second.
           */

          tl.to(
            codeRef.current,
            {
              autoAlpha: 1,
              xPercent: 0,
              yPercent: 0,
              duration: 10,
              ease: 'power3.out',
            },
            'digital+=9',
          )

          /**
           * Hold.
           */

          tl.to(
            digitalRef.current,
            {
              scale: 1.008,
              duration: 9,
              ease: 'sine.inOut',
            },
            'digital+=15',
          )

          /**
           * ===========================================
           * 05 — SYSTEM
           * ===========================================
           */

          tl.addLabel('system', 94)

          /**
           * Rather than introducing a new collage,
           * reuse all the elements already on screen.
           */

          tl.to(
            heroRef.current,
            {
              xPercent: mobile ? -14 : 27,
              yPercent: mobile ? -23 : -24,
              scale: mobile ? 0.42 : 0.4,
              autoAlpha: 0.82,
              duration: 15,
            },
            'system',
          )

          tl.to(
            digitalRef.current,
            {
              xPercent: mobile ? 10 : 25,
              yPercent: mobile ? 20 : 24,
              scale: mobile ? 0.62 : 0.58,
              duration: 15,
            },
            'system',
          )

          tl.to(
            codeRef.current,
            {
              xPercent: mobile ? -5 : -16,
              yPercent: mobile ? 25 : 20,
              scale: mobile ? 0.86 : 0.88,
              autoAlpha: mobile ? 0.55 : 0.7,
              duration: 15,
            },
            'system',
          )

          tl.to(
            detailARef.current,
            {
              xPercent: mobile ? -18 : -4,
              yPercent: mobile ? -25 : -22,
              scale: mobile ? 0.62 : 0.8,
              autoAlpha: 0.85,
              duration: 14,
            },
            'system',
          )

          tl.to(
            detailBRef.current,
            {
              xPercent: mobile ? 22 : 8,
              yPercent: mobile ? 30 : 23,
              scale: mobile ? 0.55 : 0.72,
              autoAlpha: 0.7,
              duration: 14,
            },
            'system',
          )

          tl.to(
            systemDetailRef.current,
            {
              autoAlpha: 1,
              scale: 1,
              yPercent: 0,
              duration: 12,
              ease: 'expo.out',
            },
            'system+=5',
          )

          /**
           * Large background type appears last.
           */

          tl.to(
            systemWordRef.current,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 12,
              ease: 'expo.out',
            },
            'system+=7',
          )

          /**
           * Give final system a proper hold.
           */

          tl.to(
            systemWordRef.current,
            {
              yPercent: -1,
              duration: 9,
              ease: 'sine.inOut',
            },
            'system+=16',
          )

          /**
           * ===========================================
           * 06 — FINAL
           * ===========================================
           */

          tl.addLabel('final', 119)

          /**
           * Existing system simply moves backward.
           *
           * No white-screen reset.
           */

          tl.to(
            [
              heroRef.current,
              detailARef.current,
              detailBRef.current,
              digitalRef.current,
              codeRef.current,
              systemDetailRef.current,
            ],
            {
              scale: '*=0.9',
              autoAlpha: 0.14,
              duration: 14,
              ease: 'power3.inOut',
            },
            'final',
          )

          tl.to(
            systemWordRef.current,
            {
              autoAlpha: 0.05,
              scale: 1.04,
              duration: 14,
            },
            'final',
          )

          tl.to(
            finalRef.current,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 13,
              ease: 'expo.inOut',
            },
            'final+=3',
          )

          /**
           * Final breathing room.
           */

          tl.to(
            finalRef.current,
            {
              scale: 1.006,
              duration: 10,
              ease: 'sine.inOut',
            },
            'final+=15',
          )

          tl.to(
            finalRef.current,
            {
              yPercent: -3,
              duration: 8,
              ease: 'power2.in',
            },
            'final+=25',
          )

          return () => {
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
    },
  )

  return (
    <section
      ref={sectionRef}
      aria-label="Graphics, motion and digital craft"
      className="
        relative
        h-[480vh]
        w-full

        md:h-[580vh]
        lg:h-[680vh]
      "
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <div
          ref={canvasRef}
          className="
            relative
            mx-auto
            h-full
            w-full
            max-w-[1760px]
            overflow-hidden
          "
        >
          {/* ==================================================
              INTRO TYPOGRAPHY
          ================================================== */}

          <div
            className="
              absolute
              left-[clamp(20px,5vw,86px)]
              top-[clamp(78px,14vh,150px)]
              z-10
              max-w-[650px]
            "
          >
            <p
              ref={labelRef}
              className="
                mb-6
                text-[10px]
                font-medium
                uppercase
                tracking-[0.22em]
                text-black/45
                opacity-0
              "
            >
              Graphics / Motion / Digital
            </p>

            <div
              ref={headlineRef}
              className="opacity-0"
            >
              <h2
                className="
                  text-[clamp(60px,8vw,146px)]
                  font-semibold
                  leading-[0.82]
                  tracking-[-0.06em]
                  text-[#111]
                "
              >
                Designed
                <br />
                <span className="ml-[0.7em] font-light">
                  to move.
                </span>
              </h2>
            </div>

            <p
              ref={supportRef}
              className="
                mt-7
                max-w-[390px]
                text-[13px]
                leading-[1.65]
                text-black/50
                opacity-0

                md:text-[14px]
              "
            >
              Ideas shaped through design, motion and
              digital craft.
            </p>
          </div>

          {/* ==================================================
              MAIN VISUAL

              IMPORTANT:
              Static image AND motion video live inside
              the same frame.
          ================================================== */}

          <div
            ref={heroRef}
            className="
              absolute

              left-5
              right-5
              top-[35%]

              z-30

              h-[46vh]

              overflow-hidden
              opacity-0

              md:left-auto
              md:right-[6%]
              md:top-[18%]

              md:h-[min(65vh,720px)]
              md:w-[min(53vw,960px)]
            "
          >
            {/* STATIC */}

            <img
              ref={staticImageRef}
              src={graphicsMotionMedia.staticGraphic.url}
              alt={graphicsMotionMedia.staticGraphic.alt}
              loading="eager"
              decoding="async"
              className="
                absolute
                inset-0
                h-full
                w-full
                object-cover
              "
            />

            {/* MOTION — SAME FRAME */}

            <div
              ref={motionLayerRef}
              className="absolute inset-0 z-10"
            >
              <video
                src={graphicsMotionMedia.motionVideo.url}
                poster={graphicsMotionMedia.motionVideo.poster}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>
          </div>

          {/* ==================================================
              DETAIL A
          ================================================== */}

          <div
            ref={detailARef}
            className="
              absolute
              bottom-[12%]
              left-[5%]
              z-40

              h-[23vh]
              w-[34vw]

              max-w-[280px]

              overflow-hidden
              opacity-0

              md:bottom-[9%]
              md:left-[8%]

              md:h-[30vh]
              md:w-[18vw]
            "
          >
            <img
              src={graphicsMotionMedia.graphicElements.detail}
              alt="Graphic detail"
              loading="lazy"
              decoding="async"
              className="
                h-full
                w-full
                object-cover
              "
            />
          </div>

          {/* ==================================================
              DETAIL B
          ================================================== */}

          <div
            ref={detailBRef}
            className="
              absolute
              bottom-[8%]
              right-[6%]
              z-40

              h-[16vh]
              w-[28vw]

              max-w-[230px]

              overflow-hidden
              opacity-0

              md:bottom-[7%]
              md:right-[9%]

              md:h-[20vh]
              md:w-[14vw]
            "
          >
            <img
              src={graphicsMotionMedia.graphicElements.texture}
              alt="Graphic texture"
              loading="lazy"
              decoding="async"
              className="
                h-full
                w-full
                object-cover
              "
            />
          </div>

          {/* ==================================================
              MOTION META
          ================================================== */}

          <div
            ref={motionMetaRef}
            className="
              absolute
              bottom-[7%]
              left-[5%]
              z-50

              opacity-0

              md:bottom-[8%]
              md:left-[10%]
            "
          >
            <div
              className="
                flex
                items-center
                gap-5

                font-mono
                text-[9px]
                uppercase
                tracking-[0.14em]
                text-black/45
              "
            >
              <span>Motion Study</span>

              <span className="h-px w-7 bg-black/25" />

              <span>Frame 036</span>

              <span>00:00:01:12</span>
            </div>
          </div>

          {/* ==================================================
              DIGITAL OUTPUT
          ================================================== */}

          <div
            ref={digitalRef}
            className="
              absolute

              left-5
              right-5
              top-[34%]

              z-45

              h-[43vh]

              overflow-hidden
              opacity-0

              md:left-auto
              md:right-[7%]
              md:top-[24%]

              md:h-[57vh]
              md:w-[min(55vw,960px)]
            "
          >
            <img
              src={graphicsMotionMedia.digitalOutput.visual}
              alt="Digital creative output"
              loading="lazy"
              decoding="async"
              className="
                h-full
                w-full
                object-cover
              "
            />
          </div>

          {/* ==================================================
              CODE DETAIL
          ================================================== */}

          <div
            ref={codeRef}
            className="
              absolute

              bottom-[8%]
              left-[6%]

              z-50

              w-[88%]
              max-w-[440px]

              border-l
              border-black/15

              pl-4

              opacity-0

              md:bottom-[12%]
              md:left-[8%]

              md:w-[30vw]
              md:pl-6
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                gap-3

                text-[9px]
                uppercase
                tracking-[0.18em]
                text-black/40
              "
            >
              <span>Digital Build</span>
              <span className="h-px w-6 bg-black/20" />
              <span>Output / 01</span>
            </div>

            <pre
              className="
                max-h-[150px]
                overflow-hidden

                whitespace-pre-wrap

                font-mono
                text-[9px]
                leading-[1.75]
                text-black/52

                md:text-[10px]
              "
            >
              {graphicsMotionMedia.digitalOutput.code}
            </pre>
          </div>

          {/* ==================================================
              SYSTEM DETAIL
          ================================================== */}

          <div
            ref={systemDetailRef}
            className="
              absolute

              left-[12%]
              top-[24%]

              z-50

              hidden

              h-[22vh]
              w-[16vw]

              max-w-[260px]

              overflow-hidden
              opacity-0

              md:block
            "
          >
            <img
              src={graphicsMotionMedia.creativeSystem.detail}
              alt="Creative system detail"
              loading="lazy"
              decoding="async"
              className="
                h-full
                w-full
                object-cover
              "
            />
          </div>

          {/* ==================================================
              SYSTEM BACKGROUND WORD
          ================================================== */}

          <div
            ref={systemWordRef}
            className="
              pointer-events-none

              absolute
              bottom-[6%]
              left-[4%]

              z-[5]

              opacity-0
            "
          >
            <div
              className="
                whitespace-nowrap

                text-[clamp(76px,13vw,225px)]
                font-semibold
                leading-none
                tracking-[-0.075em]

                text-black/[0.045]
              "
            >
              SYSTEM
            </div>
          </div>

          {/* ==================================================
              FINAL
          ================================================== */}

          <div
            ref={finalRef}
            className="
              pointer-events-none

              absolute
              inset-0
              z-[80]

              flex
              items-center

              px-[clamp(22px,6vw,110px)]

              opacity-0
            "
          >
            <div
              className="
                mx-auto
                w-full
                max-w-[1500px]
              "
            >
              <div
                className="
                  text-[clamp(58px,9vw,62px)]
                  font-semibold
                  uppercase
                  leading-[0.82]
                  tracking-[-0.065em]
                  text-[#111]
                "
              >
                People don't
                <br />
                trust logos.
                <br />
              They trust meaning.
              </div>

              <div
                className="
                  mt-8
                  flex
                  items-center
                  gap-5

                  md:justify-end
                "
              >
                <span className="hidden h-px w-20 bg-black/25 md:block" />

                <p
                  className="
                    text-[11px]
                    font-medium
                    uppercase
                    tracking-[0.2em]
                    text-black/55
                  "
                >
                  One creative system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GraphicsMotionExperience