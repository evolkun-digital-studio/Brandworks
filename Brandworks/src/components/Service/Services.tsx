import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { mediaUrl } from '../../lib/media'
import './Services.css'

gsap.registerPlugin(ScrollTrigger)

const services = [
  { image: mediaUrl('kyle-loftus-DqmXihYx5UE-unsplash.jpg'), label: 'Better Experience' },
  { image: mediaUrl('moisturizer mock up.png'), label: 'More Efficiency' },
  { image: mediaUrl('ChatGPT Image Sep 30, 2026, 02_31_57 PM.png'), label: 'Higher Conversions' },
  { image: mediaUrl('vcvcvcvcv.jpg'), label: 'Greater Scalability' },
  { image: mediaUrl('seo.jpg'), label: 'Strong Digital Presence' },
  { image: mediaUrl('creative.jpg'), label: 'Better Business Outcomes' },
]

type TrackGeometry = {
  cardWidth: number
  gap: number
}

const ACTIVE_LABEL_INCREASE_PX = 4

const getTrackGeometry = (card: HTMLElement): TrackGeometry => {
  const gap = Number.parseFloat(getComputedStyle(card).getPropertyValue('--card-gap')) || 48
  return { cardWidth: card.offsetWidth, gap }
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
    const labels = cards.map(card => card.querySelector<HTMLElement>('.services-showcase__label'))
    const lastIndex = services.length - 1
    const state = { phase: 0 }
    let geometry = getTrackGeometry(cards[0])
    let activeLabelScales = labels.map(label => {
      if (!label) return 1

      const baseFontSize = Number.parseFloat(getComputedStyle(label).fontSize)
      return baseFontSize > 0 ? (baseFontSize + ACTIVE_LABEL_INCREASE_PX) / baseFontSize : 1
    })

    // Keep every card on one flat horizontal track. The active card stays
    // centred while scrolling moves the row from the first card to the last.
    const placeCards = () => {
      const { cardWidth, gap } = geometry

      cards.forEach((card, i) => {
        const distanceFromCenter = Math.abs(i - state.phase)
        const linearFocus = 1 - gsap.utils.clamp(0, 1, distanceFromCenter)
        const focus = linearFocus * linearFocus * (3 - 2 * linearFocus)

        gsap.set(card, {
          x: (i - state.phase) * (cardWidth + gap),
          y: -10 * focus,
          z: 0,
          rotationY: 0,
          scale: 0.975 + focus * 0.065,
          autoAlpha: 0.84 + focus * 0.16,
          zIndex: Math.round(1 + focus * 10),
          boxShadow: gsap.utils.interpolate(
            '0 10px 30px rgba(0, 0, 0, 0.04)',
            '0 26px 55px rgba(0, 0, 0, 0.16)',
            focus,
          ),
        })

        const shade = shades[i]
        if (shade) gsap.set(shade, { opacity: (1 - focus) * 0.1 })

        const label = labels[i]
        if (label) {
          gsap.set(label, {
            y: 0,
            scale: 1 + focus * (activeLabelScales[i] - 1),
            opacity: 0.72 + focus * 0.28,
          })
        }
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
          geometry = getTrackGeometry(cards[0])
          activeLabelScales = labels.map(label => {
            if (!label) return 1

            const baseFontSize = Number.parseFloat(getComputedStyle(label).fontSize)
            return baseFontSize > 0 ? (baseFontSize + ACTIVE_LABEL_INCREASE_PX) / baseFontSize : 1
          })
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
         Brandworks Gives you
        </h2>
        <p className="services-showcase__description">
          {/* Bringing strategy, creativity and execution together to build brands that grow. */}
          We work with a limited number of businesses so every project receives the strategic attention and execution it deserves.
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
