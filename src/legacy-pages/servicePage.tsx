import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { mediaUrl } from '../lib/media'
import { Link } from '../routing'
import { useNativeMetadata } from '../routing/context'
import './servicePage.css'

type Service = {
  number: string
  slug: string
  title: string
  shortTitle?: string
  group: string
  description: string
  image: string
  imageAlt: string
}

const services: Service[] = [
  {
    number: '01', slug: 'strategy', title: 'Strategy', group: 'Direction',
    description: 'Brand strategy, positioning and creative direction built around where the business is going and how the brand needs to be understood.',
    image: mediaUrl('our_stra.jpg'), imageAlt: 'Brand strategy and creative direction work by BrandWorks',
  },
  {
    number: '02', slug: 'graphic-design', title: 'Graphic Design', group: 'Direction',
    description: 'Visual identities, campaign systems and graphic communication designed to make brands clearer, more consistent and easier to recognise.',
    image: mediaUrl('graphic_design.jpg'), imageAlt: 'Graphic design and visual identity work by BrandWorks',
  },
  {
    number: '03', slug: 'content-creation', title: 'Content Creation', group: 'Direction',
    description: 'Concept-led brand content developed for campaigns, platforms and audiences instead of simply filling a content calendar.',
    image: mediaUrl('content_creation.avif'), imageAlt: 'Brand content creation and campaign production by BrandWorks',
  },
  {
    number: '04', slug: 'photography', title: 'Photography', group: 'Production',
    description: 'Commercial, campaign and editorial photography created to shape how a brand, product, place or person is perceived.',
    image: mediaUrl('photography.jpg'), imageAlt: 'Commercial and campaign photography by BrandWorks',
  },
  {
    number: '05', slug: 'videography', title: 'Videography & Cinematography', shortTitle: 'Videography', group: 'Production',
    description: 'Brand films, commercial video and cinematic content developed from concept through production and post-production.',
    image: mediaUrl('videography.jpg'), imageAlt: 'Videography, film production and cinematography by BrandWorks',
  },
  {
    number: '06', slug: 'social-media', title: 'Social Media', group: 'Communication',
    description: 'Social media strategy, content systems and platform management that keep brands consistent while building meaningful visibility.',
    image: mediaUrl('socialmedia.jpg'), imageAlt: 'Social media marketing and content strategy by BrandWorks',
  },
  {
    number: '07', slug: 'pr-founder-reputation', title: 'PR & Founder Reputation', group: 'Communication',
    description: 'PR, founder positioning and reputation management designed around what audiences discover, understand and remember about a brand and its leadership.',
    image: mediaUrl('vcvcvcvcv.jpg'), imageAlt: 'PR and founder reputation management services by BrandWorks',
  },
  {
    number: '08', slug: 'performance-marketing', title: 'Performance Marketing', group: 'Growth',
    description: 'Paid media and performance campaigns connecting strong creative with targeting, testing, optimisation and measurable business objectives.',
    image: mediaUrl('Artboard 14@3x.png'), imageAlt: 'Performance marketing and paid media campaigns by BrandWorks',
  },
  {
    number: '09', slug: 'seo', title: 'SEO', group: 'Growth',
    description: 'Search strategy, technical SEO and content systems built to improve discoverability, authority and sustainable organic visibility.',
    image: mediaUrl('seo.jpg'), imageAlt: 'SEO strategy and search engine optimisation services by BrandWorks',
  },
  {
    number: '10', slug: 'technology', title: 'Technology', group: 'Technology',
    description: 'AI agents, business automation, dashboards, ERP and custom systems designed around the way a business actually operates.',
    image: mediaUrl('website_dev.jpg'), imageAlt: 'Technology, AI and business automation services by BrandWorks',
  },
]

const entranceEase = [0.22, 1, 0.36, 1] as const
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  )
}

function usePageSeo() {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    if (!nativeMetadata) document.title = 'Creative, Digital & Marketing Services | BrandWorks'
  }, [nativeMetadata])
}

function NorthEastArrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="bw-services__arrow">
      <path d="M5 15 15 5M7 5h8v8" />
    </svg>
  )
}

function ServicePreview({ service, reduceMotion }: { service: Service; reduceMotion: boolean }) {
  return (
    <div className="bw-services__preview">
      <div className="bw-services__media">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={service.slug}
            className="bw-services__media-layer"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: entranceEase }}
          >
            <Image
              src={service.image}
              alt={service.imageAlt}
              fill
              sizes="(max-width: 767px) calc(100vw - 58px), (max-width: 1199px) 40vw, 520px"
              className="bw-services__image"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="bw-services__caption" aria-live="polite" aria-atomic="true">
        <span>{service.title}</span>
        <span>{service.number} / {String(services.length).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

export default function ServicesPage() {
  usePageSeo()
  const reduceMotion = useReducedMotionPreference()
  const [scrollIndex, setScrollIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const activeIndex = hoverIndex ?? scrollIndex
  const activeService = services[activeIndex]

  const entrance = useMemo(() => ({
    initial: reduceMotion ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.01 },
    transition: { duration: reduceMotion ? 0 : 0.65, ease: entranceEase },
  }), [reduceMotion])

  useEffect(() => {
    services.forEach(({ image }) => {
      const preload = new window.Image()
      preload.src = image
    })
  }, [])

  useEffect(() => {
    const rows = rowRefs.current.filter((row): row is HTMLLIElement => row !== null)
    if (!rows.length) return
    const visibleRows = new Map<Element, number>()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleRows.set(entry.target, entry.intersectionRatio)
        else visibleRows.delete(entry.target)
      })
      let bestIndex = -1
      let bestScore = -1
      visibleRows.forEach((ratio, row) => {
        const index = Number((row as HTMLElement).dataset.serviceIndex)
        const rect = row.getBoundingClientRect()
        const rowCenter = rect.top + rect.height / 2
        const distanceScore = 1 - Math.min(1, Math.abs(rowCenter - window.innerHeight * 0.53) / window.innerHeight)
        const score = ratio + distanceScore
        if (score > bestScore) {
          bestScore = score
          bestIndex = index
        }
      })
      if (bestIndex >= 0) setScrollIndex(bestIndex)
    }, { rootMargin: '-34% 0px -38% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] })

    rows.forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [])

  const leaveRow = useCallback(() => setHoverIndex(null), [])

  return (
    <main className="bw-services">
      <section className="bw-services__hero" aria-labelledby="services-page-title">
        <motion.div {...entrance} className="bw-services__hero-inner">
          <h1 id="services-page-title">From how a brand thinks to how the world sees it.</h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 0.12, ease: entranceEase }}
          >
            BrandWorks is a multidisciplinary creative and digital agency bringing strategy, design,
            photography, film, social media, reputation, search, performance and technology together
            under one direction.
          </motion.p>
        </motion.div>
      </section>

      <section className="bw-services__capabilities" aria-labelledby="services-index-title">
        <div className="bw-services__layout">
          <div className="bw-services__list-column">
            <motion.header {...entrance} className="bw-services__section-heading">
              <p>What we do</p>
              <h2 id="services-index-title">Capabilities</h2>
            </motion.header>

            <motion.nav
              aria-label="BrandWorks services"
              {...entrance}
              transition={{ ...entrance.transition, delay: reduceMotion ? 0 : 0.08 }}
            >
              <ul className="bw-services__list">
                {services.map((service, index) => {
                  const isActive = index === activeIndex
                  return (
                    <li
                      key={service.slug}
                      ref={(element) => { rowRefs.current[index] = element }}
                      data-service-index={index}
                      data-active={isActive}
                      className="bw-services__row"
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') setHoverIndex(index)
                      }}
                      onMouseMove={() => setHoverIndex(index)}
                      onPointerLeave={(event) => {
                        if (event.pointerType === 'mouse') leaveRow()
                      }}
                      onFocusCapture={() => setHoverIndex(index)}
                      onBlurCapture={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) leaveRow()
                      }}
                      onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse') setScrollIndex(index)
                      }}
                    >
                      <Link
                        to={`/services/${service.slug}`}
                        aria-label={`Explore ${service.title} services`}
                        aria-describedby={`service-description-${service.slug}`}
                        className="bw-services__link"
                      >
                        <span className="bw-services__number">{service.number}</span>
                        <span className="bw-services__name">{service.shortTitle ?? service.title}</span>
                        <span id={`service-description-${service.slug}`} className="bw-services__description">
                          <AnimatePresence initial={false}>
                            {isActive && (
                              <motion.span
                                key={service.slug}
                                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, x: 8 }}
                                transition={{ duration: reduceMotion ? 0 : 0.3, ease: entranceEase }}
                              >
                                {service.description}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          <span className="bw-services__description-mobile">{service.description}</span>
                        </span>
                        <NorthEastArrow />
                      </Link>
                      {isActive && (
                        <div className="bw-services__mobile-preview">
                          <ServicePreview service={service} reduceMotion={reduceMotion} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </motion.nav>
          </div>

          <motion.aside
            {...entrance}
            transition={{ ...entrance.transition, delay: reduceMotion ? 0 : 0.12 }}
            className="bw-services__image-column"
            aria-label={`Featured service: ${activeService.title}`}
          >
            <ServicePreview service={activeService} reduceMotion={reduceMotion} />
          </motion.aside>
        </div>
      </section>
    </main>
  )
}
