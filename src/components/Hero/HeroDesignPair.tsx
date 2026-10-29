import { useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import type { HeroImage } from '../../data/heroServices'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Design & Motion: two stills composed as one editorial pair in the empty
 * left of the hero — the larger behind, the smaller lower and to the right,
 * overlapping it. Sizes and offsets live in Hero.css (.design-pair*).
 *
 * As the hero scrolls away the two drift up at slightly different speeds
 * (about 16px and 28px over the hero's height). On activation they also
 * settle into place in sequence, which gives the service a distinct motion
 * cue without adding a loop or delaying the content. Desktop and tablet
 * only for scroll drift, never with reduced motion, and no pinning.
 */
function HeroDesignPair({
  back,
  front,
  priority,
  active,
  reducedMotion,
}: {
  back: HeroImage
  front: HeroImage
  priority: ImagePriority
  active: boolean
  reducedMotion: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      const hero = root?.closest('.hero')
      if (!root || !hero || reducedMotion || !active) return
      const mm = gsap.matchMedia()

      const backFrame = root.querySelector<HTMLElement>('.design-pair__back')
      const frontFrame = root.querySelector<HTMLElement>('.design-pair__front')
      if (!backFrame || !frontFrame) return

      const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
      entrance
        .set([backFrame, frontFrame], { autoAlpha: 0 })
        .fromTo(backFrame, { y: 28, rotate: -1.5, scale: 0.98 }, { autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 0.7 })
        .fromTo(frontFrame, { y: 38, rotate: 2, scale: 0.96 }, { autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 0.72 }, '-=0.42')

      mm.add('(min-width: 768px)', () => {
        const scrollTrigger = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
        gsap.to('.design-pair__back', { y: -16, ease: 'none', scrollTrigger })
        gsap.to('.design-pair__front', { y: -28, ease: 'none', scrollTrigger: { ...scrollTrigger } })
      })

      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [active, reducedMotion] },
  )

  return (
    <div ref={rootRef} className="design-pair">
      <div className="design-pair__frame design-pair__back">
        <HeroImg image={back} sizes="(min-width: 768px) 380px, 46vw" priority={priority} />
      </div>
      <div className="design-pair__frame design-pair__front">
        <HeroImg image={front} sizes="(min-width: 768px) 270px, 32vw" priority={priority} />
      </div>
    </div>
  )
}

export default HeroDesignPair
