import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

export default function PerceptionReality() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const perceptionRef = useRef<HTMLDivElement>(null)
  const becomesRef = useRef<HTMLDivElement>(null)
  const realityRef = useRef<HTMLDivElement>(null)
  const lineLeftRef = useRef<HTMLDivElement>(null)
  const lineRightRef = useRef<HTMLDivElement>(null)

  const reduceMotion = useReducedMotion()

  useGSAP(() => {
    if (!sectionRef.current || !stageRef.current || reduceMotion) return

    const ctx = gsap.context(() => {
      gsap.set(perceptionRef.current, { xPercent: -10, autoAlpha: 0.28 })
      gsap.set(realityRef.current, { xPercent: 10, autoAlpha: 0.28 })
      gsap.set(becomesRef.current, { y: 12, autoAlpha: 0 })
      gsap.set(lineLeftRef.current, { scaleX: 0, transformOrigin: 'right center' })
      gsap.set(lineRightRef.current, { scaleX: 0, transformOrigin: 'left center' })

      const tl = gsap.timeline({
        defaults: {
          ease: 'power2.out',
        },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.4,
          pin: stageRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      tl.to(perceptionRef.current, { xPercent: 0, autoAlpha: 1, duration: 1 }, 0)

      tl.to(realityRef.current, { xPercent: 0, autoAlpha: 1, duration: 1 }, 0.05)

      tl.to(lineLeftRef.current, { scaleX: 1, duration: 0.7, ease: 'power3.out' }, 0.16)

      tl.to(lineRightRef.current, { scaleX: 1, duration: 0.7, ease: 'power3.out' }, 0.16)

      tl.to(becomesRef.current, { y: 0, autoAlpha: 1, duration: 0.65, ease: 'power3.out' }, 0.22)

      tl.to(perceptionRef.current, { xPercent: 1.5, duration: 1.1, ease: 'sine.inOut' }, 0.72)

      tl.to(realityRef.current, { xPercent: -1.5, duration: 1.1, ease: 'sine.inOut' }, 0.72)

      tl.to(lineLeftRef.current, { scaleX: 0.7, duration: 1, ease: 'sine.inOut' }, 0.72)

      tl.to(lineRightRef.current, { scaleX: 0.7, duration: 1, ease: 'sine.inOut' }, 0.72)
    }, sectionRef)

    return () => ctx.revert()
  }, { scope: sectionRef, dependencies: [reduceMotion] })

  return (
    <section ref={sectionRef} className="relative h-[210vh] bg-white text-[#111]">
      <div ref={stageRef} className="relative flex h-screen items-center overflow-hidden bg-white px-5 sm:px-7 md:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-6 lg:gap-10">
            <div ref={perceptionRef} className="font-primary text-[clamp(3.2rem,7.8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.07em]">
              PERCEPTION
            </div>

            <div className="flex items-center justify-center gap-3 md:min-w-[140px] lg:min-w-[190px] lg:gap-4">
              <div ref={lineLeftRef} className="h-px flex-1 bg-black/15" />

              <div ref={becomesRef} className="shrink-0 font-primary text-[9px] font-medium uppercase tracking-[0.3em] text-black/40 md:text-[10px]">
                BECOMES
              </div>

              <div ref={lineRightRef} className="h-px flex-1 bg-black/15" />
            </div>

            <div ref={realityRef} className="text-right font-primary text-[clamp(3.4rem,8.3vw,9.4rem)] font-medium leading-[0.82] tracking-[-0.07em]">
              REALITY
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}