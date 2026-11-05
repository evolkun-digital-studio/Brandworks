import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ServicePreview from '../components/Service/ServicePreview'
import ServiceRow from '../components/Service/ServiceRow'
import '../components/Service/service-index.css'
import { Link } from '../routing'
import { useNativeMetadata } from '../routing/context'

type Service = {
  slug: string
  title: string
  shortTitle?: string
  description: string
  imageAlt: string
}

const services: Service[] = [
  {
    slug: 'brand-positioning-strategy',
    title: 'Strategy',
    description:
      'Brand strategy, positioning and creative direction built around where the business is going and how the brand needs to be understood.',
    imageAlt:
      'Brand strategy and creative direction work by BrandWorks',
  },
  {
    slug: 'graphic-design',
    title: 'Graphic Design',
    description:
      'Visual identities, campaign systems and graphic communication designed to make brands clearer, more consistent and easier to recognise.',
    imageAlt:
      'Graphic design and visual identity work by BrandWorks',
  },
  {
    slug: 'concept-creation',
    title: 'Concept Creation',
    description:
      'Concept-led brand content developed for campaigns, platforms and audiences instead of simply filling a content calendar.',
    imageAlt:
      'Brand content creation and campaign production by BrandWorks',
  },
  {
    slug: 'photography',
    title: 'Photography',
    description:
      'Commercial, campaign and editorial photography created to shape how a brand, product, place or person is perceived.',
    imageAlt:
      'Commercial and campaign photography by BrandWorks',
  },
  {
    slug: 'videography',
    title: 'Videography & Cinematography',
    shortTitle: 'Videography',
    description:
      'Brand films, commercial video and cinematic content developed from concept through production and post-production.',
    imageAlt:
      'Videography, film production and cinematography by BrandWorks',
  },
  {
    slug: 'social-media',
    title: 'Social Media',
    description:
      'Social media strategy, content systems and platform management that keep brands consistent while building meaningful visibility.',
    imageAlt:
      'Social media marketing and content strategy by BrandWorks',
  },
  {
    slug: 'pr-founder-reputation',
    title: 'PR & Founder Reputation',
    description:
      'PR, founder positioning and reputation management designed around what audiences discover, understand and remember about a brand and its leadership.',
    imageAlt:
      'PR and founder reputation management services by BrandWorks',
  },
  {
    slug: 'performance-marketing',
    title: 'Performance Marketing',
    description:
      'Paid media and performance campaigns connecting strong creative with targeting, testing, optimisation and measurable business objectives.',
    imageAlt:
      'Performance marketing and paid media campaigns by BrandWorks',
  },
  {
    slug: 'seo',
    title: 'SEO',
    description:
      'Search strategy, technical SEO and content systems built to improve discoverability, authority and sustainable organic visibility.',
    imageAlt:
      'SEO strategy and search engine optimisation services by BrandWorks',
  },
  {
    slug: 'technology',
    title: 'Technology',
    description:
      'AI agents, business automation, dashboards, ERP and custom systems designed around the way a business actually operates.',
    imageAlt:
      'Technology, AI and business automation services by BrandWorks',
  },
]

const serviceTitles = services.map(service => service.title)

function usePageSeo() {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    if (!nativeMetadata) document.title = 'Creative, Digital & Marketing Services | BrandWorks'
  }, [nativeMetadata])
}

function SectionLabel({
  children,
}: {
  children: ReactNode
}) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 sm:text-xs">
      {children}
    </p>
  )
}

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
    >
      ↗
    </span>
  )
}

export default function ServicesPage() {
  usePageSeo()

  const [activeIndex, setActiveIndex] = useState(0)
  const decodedImages = useRef(new Set<number>())
  const requestedIndex = useRef(0)
  const intent = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelIntent = useCallback(() => {
    if (intent.current !== null) clearTimeout(intent.current)
    intent.current = null
  }, [])
  const activate = useCallback((index: number) => {
    cancelIntent()
    requestedIndex.current = index
    // Keep the current photograph until the requested one has decoded, even
    // on a slow connection. Loading never exposes a blank or blurred layer.
    if (decodedImages.current.has(index)) setActiveIndex(index)
  }, [cancelIntent])
  const imageReady = useCallback((index: number) => {
    decodedImages.current.add(index)
    if (requestedIndex.current === index) setActiveIndex(index)
  }, [])
  const scheduleIntent = useCallback((index: number) => {
    cancelIntent()
    intent.current = setTimeout(() => activate(index), 60)
  }, [activate, cancelIntent])
  useEffect(() => cancelIntent, [cancelIntent])

  return (
    <main className="bg-white text-neutral-950">
      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-7 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-[880px] text-center"> 

          <h1 className="mx-auto mt-5 max-w-[820px] text-[clamp(2.25rem,4.4vw,3rem)] font-medium leading-[0.98] tracking-[-0.045em]">
            <span className="block">From how a brand thinks to how</span>
            <span className="block">the world sees it.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-[670px] text-[16px] leading-[1.65] text-neutral-600 sm:text-[17px]">
            BrandWorks is a multidisciplinary creative and
            digital agency bringing strategy, design,
            photography, film, social media, reputation,
            search, performance and technology together under
            one direction.
          </p>
        </div>
      </section>

      {/* =====================================================
          SERVICE INDEX
      ====================================================== */}

      <section
        aria-labelledby="services-index-title"
        className="border-t border-neutral-200"
      >
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-16 lg:px-10 lg:py-24"
        >
          <div>
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-neutral-200 pb-5 sm:mb-10">
              <div>
                {/* <SectionLabel>What we do</SectionLabel> */}

                <h1
                  id="services-index-title"
                  className="section-heading mt-3"
                >
                  Capabilities
                </h1>
              </div>

              {/* <p className="hidden max-w-[320px] text-right text-sm leading-6 text-neutral-500 md:block">
                Specialist capabilities designed to work
                independently or together.
              </p> */}
            </div>

            <nav aria-label="BrandWorks services">
              <ul>
                {services.map((service, index) => (
                  <ServiceRow key={service.slug} service={service} index={index}
                    onIntent={scheduleIntent} onCancel={cancelIntent} onActivate={activate} />
                ))}
              </ul>
            </nav>
          </div>

          <ServicePreview activeIndex={activeIndex} titles={serviceTitles} onImageReady={imageReady} />
        </div>
      </section>

      {/* 
          INTEGRATED AGENCY MESSAGE */}

      <section data-nav-theme="dark" className="border-t border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-16 sm:px-7 sm:py-20 md:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24">
          <SectionLabel>
           <span className='text-white/80'>One creative direction</span> 
          </SectionLabel>

          <div className="max-w-[720px]">
            <h1 className="text-[2rem] text-white">
              The work rarely belongs to one discipline.
            </h1>

            <p className="mt-6 max-w-[610px] text-[15px] leading-7 text-neutral-400 sm:text-base">
              A campaign may begin with strategy, move through
              graphic design, photography and film, continue
              across social media and PR, and grow through SEO,
              performance marketing and technology. BrandWorks
              connects those parts under one direction.
            </p>

            <Link
              to="/contact"
              className="group mt-8 inline-flex min-h-11 items-center gap-3 border-b border-white pb-1 text-sm font-medium"
            >
              Start a conversation
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/*  CLOSING / INTERNAL LINKING */}

      {/* <section className="border-t border-neutral-800 bg-neutral-950 text-white">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-7 sm:py-16 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[650px]">
            

              <p className="mt-4 text-[24px] font-medium leading-tight tracking-[-0.03em] sm:text-[28px]">
                Explore the discipline that matters most to
                your next project.
              </p>
            </div>

            <nav
              aria-label="Explore BrandWorks services"
              className="max-w-[620px]"
            >
              <ul className="flex flex-wrap gap-x-5 gap-y-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="text-sm text-neutral-400 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none"
                    >
                      {service.shortTitle ??
                        service.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section> */}
    </main>
  )
}
