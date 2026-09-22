import { useRef, useState } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

type Scene = {
  id: string
  label: string
  title: string
  description: string
}

const SCENES: Scene[] = [
  {
    id: '01',
    label: 'Typography',
    title: 'Give the idea a voice.',
    description:
      'Type, hierarchy and composition built to make the brand immediately recognisable.',
  },
  {
    id: '02',
    label: 'Identity',
    title: 'Build one visual language.',
    description:
      'Marks, grids, colour and layout rules designed to stay coherent across every touchpoint.',
  },
  {
    id: '03',
    label: 'Motion',
    title: 'Make the system move.',
    description:
      'Motion principles that add rhythm and energy without losing the identity underneath.',
  },
  {
    id: '04',
    label: 'Campaign',
    title: 'Stretch the idea further.',
    description:
      'Campaign graphics and flexible visual assets created to work across digital, social and launch moments.',
  },
]

function TypographyArtwork() {
  return (
    <div className="relative h-full w-full overflow-hidden text-[#111]">
      <div className="absolute inset-x-[6%] top-[8%] flex items-center justify-between border-b border-black/10 pb-3">
        <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/35">
          BrandWorks / Type
        </span>
        <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/35">
          01
        </span>
      </div>

      <div className="absolute inset-x-[7%] top-1/2 -translate-y-1/2">
        <p className="font-primary text-[clamp(4.4rem,9.4vw,10.5rem)] font-medium uppercase leading-[0.72] tracking-[-0.09em] text-white">
          Form
        </p>

        <div className="-mt-[0.015em] flex justify-end pr-[3%]">
          <p className="font-primary text-[clamp(4.4rem,9.4vw,10.5rem)] font-medium uppercase leading-[0.72] tracking-[-0.09em] text-white">
            Voice
          </p>
        </div>
      </div>

      <div className="absolute bottom-[8%] left-[7%] max-w-[240px] font-primary text-[10px] leading-[1.45] text-black/38">
        Editorial hierarchy / expressive type / visual rhythm
      </div>
    </div>
  )
}

function IdentityArtwork() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#101010] text-white">
      <div className="absolute inset-0 grid grid-cols-6 opacity-25">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border-r border-white/20" />
        ))}
      </div>

      <div className="absolute inset-0 grid grid-rows-4 opacity-15">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-white/20" />
        ))}
      </div>

      <div className="absolute left-[8%] top-[12%] flex size-14 items-center justify-center rounded-full border border-white/30 md:size-[72px]">
        <span className="font-primary text-[11px] font-medium">
          BW
        </span>
      </div>

      <div className="absolute right-[9%] top-1/2 size-[100px] -translate-y-1/2 rounded-full bg-[#baff42] md:size-[150px]" />

      <div className="absolute bottom-[10%] left-[8%]">
        <p className="font-primary text-[8px] uppercase tracking-[0.2em] text-white/45">
          Identity System
        </p>

        <p className="mt-3 max-w-[7ch] font-primary text-[clamp(2.8rem,5.7vw,6.1rem)] font-medium leading-[0.84] tracking-[-0.067em]">
          Built to stay together.
        </p>
      </div>
    </div>
  )
}

function MotionArtwork({
  reduceMotion,
}: {
  reduceMotion: boolean
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#d8ff8d] text-[#111]">
      <div className="absolute inset-x-[6%] top-[8%] flex items-center justify-between">
        <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/40">
          Motion Language
        </span>
        <span className="font-primary text-[8px] uppercase tracking-[0.2em] text-black/40">
          03
        </span>
      </div>

      <motion.div
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 18,
                repeat: Infinity,
                ease: 'linear',
              }
        }
        className="absolute left-1/2 top-1/2 size-[64%] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute left-1/2 top-1/2 h-[13%] w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111]" />
        <div className="absolute left-1/2 top-1/2 h-full w-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111]" />
        <div className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-white md:border-[28px]" />
      </motion.div>

      <div className="absolute bottom-[9%] left-[7%] flex items-end gap-3">
        <span className="size-2 rounded-full bg-[#111]" />
        <p className="font-primary text-[clamp(2rem,4vw,4.4rem)] font-medium leading-[0.88] tracking-[-0.058em]">
          Still.
          <span className="ml-2 text-black/30">
            Then alive.
          </span>
        </p>
      </div>
    </div>
  )
}

function CampaignArtwork() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      <div className="absolute left-[6%] top-[8%] h-[84%] w-[34%] overflow-hidden bg-[#111] text-white">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between md:inset-x-5 md:top-5">
          <span className="font-primary text-[8px] uppercase tracking-[0.18em] text-white/50">
            Campaign
          </span>
          <span className="font-primary text-[8px] uppercase tracking-[0.18em] text-white/50">
            04
          </span>
        </div>

        <p className="absolute bottom-5 left-4 max-w-[5ch] font-primary text-[clamp(2.1rem,4.3vw,3.8rem)] font-medium uppercase leading-[0.82] tracking-[-0.065em] md:left-5">
          Make it clear.
        </p>
      </div>

      <div className="absolute right-[6%] top-[16%] h-[68%] w-[50%] overflow-hidden bg-[#c5b9ff]">
        <div className="absolute left-[8%] top-[10%] size-10 rounded-full bg-[#111]" />

        <p className="absolute bottom-[10%] right-[8%] max-w-[8ch] text-right font-primary text-[clamp(2.2rem,4.7vw,5rem)] font-medium leading-[0.84] tracking-[-0.065em]">
          Then make it memorable.
        </p>
      </div>

      <div className="absolute bottom-[8%] right-[6%] font-primary text-[8px] uppercase tracking-[0.2em] text-black/35">
        Graphic system / Digital / Social
      </div>
    </div>
  )
}

export default function GraphicsMotionStage() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([])
  const sceneInnerRefs = useRef<(HTMLDivElement | null)[]>([])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const progressRef = useRef<HTMLDivElement>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      if (
        !sectionRef.current ||
        !stageRef.current ||
        !canvasRef.current ||
        !progressRef.current
      ) {
        return
      }

      const scenes = sceneRefs.current.filter(
        Boolean,
      ) as HTMLDivElement[]

      const inners = sceneInnerRefs.current.filter(
        Boolean,
      ) as HTMLDivElement[]

      const tabs = tabRefs.current.filter(
        Boolean,
      ) as HTMLButtonElement[]

      if (
        scenes.length !== SCENES.length ||
        inners.length !== SCENES.length
      ) {
        return
      }

      if (reduceMotion) {
        gsap.set(scenes, {
          autoAlpha: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
        })

        gsap.set(scenes[0], {
          autoAlpha: 1,
        })

        gsap.set(inners, {
          scale: 1,
          xPercent: 0,
          yPercent: 0,
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
          const desktop = Boolean(
            context.conditions?.desktop,
          )

          gsap.set(progressRef.current, {
            scaleX: 0,
            transformOrigin: 'left center',
          })

          gsap.set(scenes, {
            autoAlpha: 1,
            force3D: true,
          })

          gsap.set(scenes[0], {
            clipPath:
              'inset(0% 0% 0% 0% round 0px)',
          })

          gsap.set(scenes[1], {
            clipPath:
              'inset(0% 100% 0% 0% round 0px)',
          })

          gsap.set(scenes[2], {
            clipPath:
              'inset(100% 0% 0% 0% round 0px)',
          })

          gsap.set(scenes[3], {
            clipPath:
              'inset(0% 0% 100% 0% round 0px)',
          })

          gsap.set(inners, {
            scale: desktop ? 1.035 : 1.02,
            xPercent: 0,
            yPercent: 0,
            force3D: true,
          })

          gsap.set(inners[0], {
            scale: 1,
          })

          gsap.set(tabs, {
            opacity: 0.35,
          })

          gsap.set(tabs[0], {
            opacity: 1,
          })

          const tl = gsap.timeline({
            defaults: {
              ease: 'none',
            },

            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: () =>
                `+=${window.innerHeight * (desktop ? 3.2 : 2.75)}`,
              pin: stageRef.current,
              scrub: desktop ? 1.05 : 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,

              onUpdate: (self) => {
                gsap.set(progressRef.current, {
                  scaleX: self.progress,
                })

                const p = self.progress

                const nextIndex =
                  p < 0.25
                    ? 0
                    : p < 0.5
                      ? 1
                      : p < 0.75
                        ? 2
                        : 3

                setActiveIndex((current) =>
                  current === nextIndex
                    ? current
                    : nextIndex,
                )
              },
            },
          })

          const revealScene = (
            incoming: number,
            outgoing: number,
            at: number,
            direction:
              | 'left'
              | 'bottom'
              | 'top',
          ) => {
            const hiddenClip =
              direction === 'left'
                ? 'inset(0% 100% 0% 0% round 0px)'
                : direction === 'bottom'
                  ? 'inset(100% 0% 0% 0% round 0px)'
                  : 'inset(0% 0% 100% 0% round 0px)'

            gsap.set(scenes[incoming], {
              clipPath: hiddenClip,
            })

            tl.to(
              scenes[incoming],
              {
                clipPath:
                  'inset(0% 0% 0% 0% round 0px)',
                duration: 0.9,
                ease: 'power3.inOut',
              },
              at,
            )

            tl.fromTo(
              inners[incoming],
              {
                scale: desktop ? 1.045 : 1.025,
              },
              {
                scale: 1,
                duration: 1.0,
                ease: 'none',
              },
              at,
            )

            tl.to(
              inners[outgoing],
              {
                scale: desktop ? 1.018 : 1.01,
                duration: 0.88,
                ease: 'none',
              },
              at,
            )

            tl.to(
              tabs[outgoing],
              {
                opacity: 0.35,
                duration: 0.28,
              },
              at,
            )

            tl.to(
              tabs[incoming],
              {
                opacity: 1,
                duration: 0.28,
              },
              at + 0.42,
            )
          }

          revealScene(1, 0, 0.8, 'left')
          revealScene(2, 1, 1.75, 'bottom')
          revealScene(3, 2, 2.7, 'top')

          return () => {
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

  const active = SCENES[activeIndex]

  return (
    <section
      ref={sectionRef}
      id="graphics-motion"
      aria-labelledby="graphics-motion-heading"
      className="relative text-[#111]"
    >
      <div
        ref={stageRef}
        className="relative h-svh w-full overflow-hidden"
      >
        {/* TOP BAR */}
        <div className="absolute left-[4vw] right-[4vw] top-[4vh] z-[80] flex items-center justify-between md:left-[5vw] md:right-[5vw]">
          <span className="font-primary text-[9px] uppercase tracking-[0.2em] text-black/40">
            BrandWorks / Graphic & Motion
          </span>

          <span className="font-primary text-[9px] uppercase tracking-[0.2em] text-black/30">
            Visual Systems / 01—04
          </span>
        </div>

        {/* MAIN GRID */}
        <div className="absolute left-[4vw] right-[4vw] top-[12vh] bottom-[13vh] grid grid-cols-1 gap-5 md:left-[5vw] md:right-[5vw] md:grid-cols-[18%_64%_18%] md:gap-0">
          {/* LEFT INDEX */}
          <div className="hidden border-r border-black/10 pr-[2vw] md:flex md:flex-col md:justify-between">
            <div>
              <h2
                id="graphics-motion-heading"
                className="mt-6 max-w-[7ch] font-primary text-[clamp(2.4rem,3.5vw,3.1rem)] font-medium leading-[0.9] tracking-[-0.06em]"
              >
                One visual language.
              </h2>
            </div>

            <div>
              <p className="font-primary text-[9px] uppercase tracking-[0.18em] text-black/30">
                Scroll through
              </p>

              <p className="mt-2 font-primary text-[11px] leading-[1.5] text-black/45">
                Type / Identity
                <br />
                Motion / Campaign
              </p>
            </div>
          </div>

          {/* CENTRAL ARTBOARD */}
          <div
            ref={canvasRef}
            className="relative overflow-hidden bg-[#111] md:mx-[2.2vw]"
          >
            <div
              ref={(node) => {
                sceneRefs.current[0] = node
              }}
              className="absolute inset-0 z-10 will-change-[clip-path,transform]"
            >
              <div
                ref={(node) => {
                  sceneInnerRefs.current[0] = node
                }}
                className="absolute inset-0 will-change-transform"
              >
                <TypographyArtwork />
              </div>
            </div>

            <div
              ref={(node) => {
                sceneRefs.current[1] = node
              }}
              className="absolute inset-0 z-20 will-change-[clip-path,transform]"
            >
              <div
                ref={(node) => {
                  sceneInnerRefs.current[1] = node
                }}
                className="absolute inset-0 will-change-transform"
              >
                <IdentityArtwork />
              </div>
            </div>

            <div
              ref={(node) => {
                sceneRefs.current[2] = node
              }}
              className="absolute inset-0 z-30 will-change-[clip-path,transform]"
            >
              <div
                ref={(node) => {
                  sceneInnerRefs.current[2] = node
                }}
                className="absolute inset-0 will-change-transform"
              >
                <MotionArtwork
                  reduceMotion={Boolean(reduceMotion)}
                />
              </div>
            </div>

            <div
              ref={(node) => {
                sceneRefs.current[3] = node
              }}
              className="absolute inset-0 z-40 will-change-[clip-path,transform]"
            >
              <div
                ref={(node) => {
                  sceneInnerRefs.current[3] = node
                }}
                className="absolute inset-0 will-change-transform"
              >
                <CampaignArtwork />
              </div>
            </div>
          </div>

          {/* RIGHT COPY */}
          <div className="hidden border-l border-black/10 pl-[2vw] md:flex md:flex-col md:justify-between">
            <AnimatePresence
              mode="wait"
              initial={false}
            >
              <motion.div
                key={active.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-primary text-[9px] uppercase tracking-[0.18em] text-black/35">
                    {active.id}
                  </span>

                  <span className="font-primary text-[9px] uppercase tracking-[0.18em] text-black/35">
                    {active.label}
                  </span>
                </div>

                <h3 className="mt-7 max-w-[9ch] font-primary text-[clamp(1.7rem,2.4vw,2.9rem)] font-medium leading-[0.94] tracking-[-0.05em]">
                  {active.title}
                </h3>

                <p className="mt-4 max-w-[260px] font-primary text-[12px] leading-[1.55] text-black/48">
                  {active.description}
                </p>
              </motion.div>
            </AnimatePresence>

          </div>
        </div>

        {/* MOBILE COPY */}
        <div className="absolute inset-x-[4vw] bottom-[5vh] z-[70] md:hidden">
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-end justify-between gap-6"
            >
              <div>
                <p className="font-primary text-[8px] uppercase tracking-[0.18em] text-black/35">
                  {active.id} / {active.label}
                </p>

                <p className="mt-2 max-w-[12ch] font-primary text-[1.45rem] font-medium leading-[0.95] tracking-[-0.045em]">
                  {active.title}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* BOTTOM NAV */}
        <div className="absolute bottom-[4vh] left-[5vw] right-[5vw] z-[80] hidden items-center gap-6 md:flex">
          {SCENES.map((scene, index) => (
            <button
              key={scene.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="flex flex-1 items-center gap-3 border-t border-black/15 pt-3 text-left"
            >
              <span className="font-primary text-[8px] uppercase tracking-[0.18em] text-black/45">
                {scene.id}
              </span>

              <span className="font-primary text-[9px] uppercase tracking-[0.18em] text-black">
                {scene.label}
              </span>
            </button>
          ))}
        </div>

        {/* PROGRESS */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[90] h-px bg-black/10">
          <div
            ref={progressRef}
            className="h-full w-full origin-left scale-x-0 bg-black/45"
          />
        </div>
      </div>
    </section>
  )
}
