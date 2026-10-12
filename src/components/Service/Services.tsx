import { useRef, useSyncExternalStore } from 'react'
import Image from 'next/image'
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
  activeScale: number
  step: number
}

const ACTIVE_CARD_GROWTH_PX = 15
const RESTING_CARD_SCALE = 0.82
const MAX_IMAGE_BLUR_PX = 0.6
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const subscribeToReducedMotion = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

const getReducedMotionSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches
const getReducedMotionServerSnapshot = () => false

const getTrackGeometry = (card: HTMLElement): TrackGeometry => {
  const gap = Number.parseFloat(getComputedStyle(card).getPropertyValue('--card-gap')) || 48
  const cardWidth = card.offsetWidth
  const activeScale = (cardWidth + ACTIVE_CARD_GROWTH_PX) / cardWidth
  const scaledCardWidth = cardWidth * ((activeScale + RESTING_CARD_SCALE) / 2)
  const step = scaledCardWidth + gap
  return { activeScale, step }
}

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  )

  useGSAP(() => {
    if (prefersReducedMotion || !sectionRef.current) return

    const section = sectionRef.current
    const track = section.querySelector<HTMLElement>('.services-showcase__ring')
    const cards = cardRefs.current.slice(0, services.length).filter((card): card is HTMLElement => !!card)
    if (!track || cards.length !== services.length) return

    section.classList.add('services-showcase--ready')

    const shades = cards.map(card => card.querySelector<HTMLElement>('.services-showcase__shade'))
    const images = cards.map(card => card.querySelector<HTMLElement>('.services-showcase__image'))
    const labels = cards.map(card => card.querySelector<HTMLElement>('.services-showcase__label'))
    const state = { phase: 0 }
    const halfTrack = services.length / 2
    let activeIndex = -1
    let geometry = getTrackGeometry(cards[0])

    // Cards wrap outside the viewport, creating a continuous sequence. Focus
    // is derived from each card's distance from the exact centre of the track.
    const placeCards = () => {
      const { activeScale, step } = geometry

      cards.forEach((card, i) => {
        const relativePosition = gsap.utils.wrap(-halfTrack, halfTrack, i - state.phase)
        const distanceFromCenter = Math.abs(relativePosition)
        const linearFocus = 1 - gsap.utils.clamp(0, 1, distanceFromCenter / 1.15)
        const focus = linearFocus * linearFocus * (3 - 2 * linearFocus)
        const edge = 1 - focus

        gsap.set(card, {
          x: relativePosition * step,
          y: edge * 18,
          scale: RESTING_CARD_SCALE + focus * (activeScale - RESTING_CARD_SCALE),
          opacity: 0.32 + focus * 0.68,
          zIndex: Math.round(1 + focus * 10),
          force3D: true,
        })

        const shade = shades[i]
        if (shade) gsap.set(shade, { opacity: 0.1 + edge * 0.2 })

        const image = images[i]
        if (image) {
          gsap.set(image, {
            filter: `blur(${edge * MAX_IMAGE_BLUR_PX}px) brightness(${0.72 + focus * 0.28}) saturate(${0.78 + focus * 0.22})`,
            scale: 1.02 + edge * 0.06,
            force3D: true,
          })
        }

        const label = labels[i]
        if (label) {
          gsap.set(label, {
            y: edge * 12,
            scale: 0.94 + focus * 0.06,
            opacity: 0.38 + focus * 0.62,
          })
        }
      })

      const nextActiveIndex = Math.round(gsap.utils.wrap(0, services.length, state.phase)) % services.length
      if (activeIndex !== nextActiveIndex) {
        activeIndex = nextActiveIndex
        if (counterRef.current) counterRef.current.textContent = String(activeIndex + 1).padStart(2, '0')
      }
    }

    const getScrollLength = () => {
      const viewportFactor = window.innerWidth <= 700 ? 2.6 : 3.2
      return window.innerHeight * viewportFactor
    }

    placeCards()

    gsap.to(state, {
      // Ending on the item count completes one full seamless revolution.
      phase: services.length,
      ease: 'none',
      onUpdate: placeCards,
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${getScrollLength()}`,
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => {
          geometry = getTrackGeometry(cards[0])
          placeCards()
        },
      },
    })

    return () => {
      section.classList.remove('services-showcase--ready')
    }
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] })

  return (
    <section
      ref={sectionRef}
      className={`services-showcase relative w-full bg-white text-[#111]${prefersReducedMotion ? ' services-showcase--static' : ''}`}
      aria-labelledby="services-heading"
    >
      <header className="services-showcase__header">
        <h2 id="services-heading" className="services-showcase__title">
          BrandWorks gives you
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
              <Image
                src={service.image}
                alt=""
                fill
                sizes="(max-width: 700px) 78vw, (max-width: 1023px) 58vw, 45vw"
                className="services-showcase__image"
                loading="lazy"
                draggable={false}
              />
              <div className="services-showcase__shade" aria-hidden="true" />
              <div className="services-showcase__overlay">
                <h3 className="services-showcase__label">{service.label}</h3>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  )
}
