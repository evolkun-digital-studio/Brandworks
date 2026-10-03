import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { mediaUrl } from '../../lib/media'
import './Services.css'

gsap.registerPlugin(ScrollTrigger)

const services = [
  { image: mediaUrl('kyle-loftus-DqmXihYx5UE-unsplash.jpg'), label: 'Videography' },
  { image: mediaUrl('moisturizer mock up.png'), label: 'Photography' },
  { image: mediaUrl('ChatGPT Image Sep 30, 2026, 02_31_57 PM.png'), label: 'Social Media & Content Creation' },
  { image: mediaUrl('vcvcvcvcv.jpg'), label: 'PR & Founder Reputation' },
  { image: mediaUrl('seo.jpg'), label: 'Performance & SEO Marketing' },
  { image: mediaUrl('creative.jpg'), label: 'Graphics & Animation' },
]

type RingGeometry = {
  radius: number // cylinder radius in px
  step: number // degrees between neighbouring cards
  maxAngle: number // cards beyond this angle are culled
  fade: number // degrees before maxAngle over which cards fade out
  rotateFactor: number // softens rotateY on small screens
}

// Per-breakpoint ring tuning; radius is derived from the rendered card width
// so neighbouring cards keep a consistent gap along the arc.
const getGeometry = (cardWidth: number): RingGeometry => {
  const vw = window.innerWidth
  let step = 24
  let maxAngle = 58
  let fade = 12
  let rotateFactor = 1
  let spacing = 1.16

  if (vw <= 700) {
    step = 30
    maxAngle = 42
    fade = 10
    rotateFactor = 0.65
    spacing = 1.06
  } else if (vw <= 1023) {
    step = 28
    maxAngle = 44
    fade = 12
    rotateFactor = 0.85
    spacing = 1.12
  }

  const radius = (cardWidth * spacing) / (step * (Math.PI / 180))
  return { radius, step, maxAngle, fade, rotateFactor }
}

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useGSAP(() => {
    if (prefersReducedMotion || !sectionRef.current) return

    const section = sectionRef.current
    const cards = cardRefs.current.slice(0, services.length).filter((card): card is HTMLElement => !!card)
    if (cards.length !== services.length) return

    const shades = cards.map(card => card.querySelector<HTMLElement>('.services-showcase__shade'))
    const lastIndex = services.length - 1
    const state = { phase: 0 }
    let geometry = getGeometry(cards[0].offsetWidth)

    // Position every card on the cylinder for the current phase.
    // Card i sits at angle (i - phase) * step; phase 0 centres Videography,
    // phase = lastIndex centres Graphics & Animation.
    const placeCards = () => {
      const { radius, step, maxAngle, fade, rotateFactor } = geometry

      cards.forEach((card, i) => {
        const angle = (i - state.phase) * step
        const absAngle = Math.abs(angle)

        if (absAngle >= maxAngle) {
          gsap.set(card, { autoAlpha: 0 })
          return
        }

        const rad = angle * (Math.PI / 180)
        const depth = absAngle / maxAngle
        const edgeFade = gsap.utils.clamp(0, 1, (maxAngle - absAngle) / fade)

        gsap.set(card, {
          x: radius * Math.sin(rad),
          z: -radius * (1 - Math.cos(rad)),
          rotationY: angle * rotateFactor,
          scale: 1 - depth * 0.08,
          autoAlpha: (1 - depth * 0.2) * edgeFade,
          zIndex: Math.round(100 - absAngle),
        })

        const shade = shades[i]
        if (shade) gsap.set(shade, { opacity: depth * 0.18 })
      })
    }

    const getScrollLength = () => {
      const factor = window.innerWidth <= 700 ? 0.7 : 0.9
      return window.innerHeight * lastIndex * factor
    }

    placeCards()

    gsap.to(state, {
      phase: lastIndex,
      ease: 'none',
      onUpdate: placeCards,
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${getScrollLength()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        snap: {
          snapTo: 1 / lastIndex,
          duration: { min: 0.2, max: 0.5 },
          delay: 0.08,
          ease: 'power2.out',
        },
        onRefresh: () => {
          geometry = getGeometry(cards[0].offsetWidth)
          placeCards()
        },
      },
    })
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] })

  return (
    <section
      ref={sectionRef}
      className={`services-showcase relative w-full bg-white text-[#111]${prefersReducedMotion ? ' services-showcase--static' : ''}`}
      aria-labelledby="services-heading"
    >
      <header className="services-showcase__header">
        <h2 id="services-heading" className="services-showcase__title">
          What we do
        </h2>
        <p className="services-showcase__description">
          Bringing strategy, creativity and execution together to build brands that grow.
        </p>
      </header>

      <div className="services-showcase__container">
        <div className="services-showcase__ring">
          {services.map((service, index) => (
            <article
              key={service.label}
              ref={el => {
                cardRefs.current[index] = el
              }}
              className="services-showcase__card"
            >
              <img
                src={service.image}
                alt={service.label}
                className="services-showcase__image"
                loading="eager"
                decoding="async"
                draggable={false}
              />
              <div className="services-showcase__shade" aria-hidden="true" />
              <div className="services-showcase__overlay">
                <span className="services-showcase__label">{service.label}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
