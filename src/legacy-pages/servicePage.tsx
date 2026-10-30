import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { mediaUrl } from '../lib/media'
import { Link } from '../routing'
import { useNativeMetadata } from '../routing/context'
const photo1 = mediaUrl("our_stra.jpg")
const photo2 = mediaUrl("graphic_design.jpg")
const photo3 = mediaUrl("content_creation.avif")
const photo4 = mediaUrl("photography.jpg")
const photo5 = mediaUrl("videography.jpg")
const photo6 = mediaUrl("socialmedia.jpg")
const photo7 = mediaUrl("vcvcvcvcv.jpg")
const photo8 = mediaUrl("Artboard 14@3x.png")
const photo9 = mediaUrl("seo.jpg")
const photo10 = mediaUrl("website_dev.jpg")

type Service = {
  number: string
  slug: string
  title: string
  shortTitle?: string
  group: string
  description: string
  capabilities: string[]
  image: string
  imageAlt: string
}

type Project = {
  slug: string
  client: string
  title: string
  services: string[]
  image: string
  imageAlt: string
  year?: string
}

const services: Service[] = [
  {
    number: '01',
    slug: 'brand-positioning-strategy',
    title: 'Strategy',
    group: 'Direction',
    description:
      'Brand strategy, positioning and creative direction built around where the business is going and how the brand needs to be understood.',
    capabilities: [
      'Brand Strategy',
      'Positioning',
      'Creative Direction',
      'Campaign Strategy',
    ],
    image: photo1,
    imageAlt:
      'Brand strategy and creative direction work by BrandWorks',
  },
  {
    number: '02',
    slug: 'graphic-design',
    title: 'Graphic Design',
    group: 'Direction',
    description:
      'Visual identities, campaign systems and graphic communication designed to make brands clearer, more consistent and easier to recognise.',
    capabilities: [
      'Visual Identity',
      'Campaign Design',
      'Digital Graphics',
      'Motion Graphics',
    ],
    image: photo2,
    imageAlt:
      'Graphic design and visual identity work by BrandWorks',
  },
  {
    number: '03',
    slug: 'concept-creation',
    title: 'Concept Creation',
    group: 'Direction',
    description:
      'Concept-led brand content developed for campaigns, platforms and audiences instead of simply filling a content calendar.',
    capabilities: [
      'Content Strategy',
      'Campaign Content',
      'Short-form Content',
      'Creative Production',
    ],
    image: photo3,
    imageAlt:
      'Brand content creation and campaign production by BrandWorks',
  },
  {
    number: '04',
    slug: 'photography',
    title: 'Photography',
    group: 'Production',
    description:
      'Commercial, campaign and editorial photography created to shape how a brand, product, place or person is perceived.',
    capabilities: [
      'Commercial Photography',
      'Product Photography',
      'Campaign Photography',
      'Founder Portraits',
    ],
    image: photo4,
    imageAlt:
      'Commercial and campaign photography by BrandWorks',
  },
  {
    number: '05',
    slug: 'videography',
    title: 'Videography & Cinematography',
    shortTitle: 'Videography',
    group: 'Production',
    description:
      'Brand films, commercial video and cinematic content developed from concept through production and post-production.',
    capabilities: [
      'Brand Films',
      'Commercial Video',
      'Cinematography',
      'Post-production',
    ],
    image: photo5,
    imageAlt:
      'Videography, film production and cinematography by BrandWorks',
  },
  {
    number: '06',
    slug: 'social-media',
    title: 'Social Media',
    group: 'Communication',
    description:
      'Social media strategy, content systems and platform management that keep brands consistent while building meaningful visibility.',
    capabilities: [
      'Social Strategy',
      'Content Planning',
      'Platform Management',
      'Campaigns',
    ],
    image: photo6,
    imageAlt:
      'Social media marketing and content strategy by BrandWorks',
  },
  {
    number: '07',
    slug: 'pr-founder-reputation',
    title: 'PR & Founder Reputation',
    group: 'Communication',
    description:
      'PR, founder positioning and reputation management designed around what audiences discover, understand and remember about a brand and its leadership.',
    capabilities: [
      'PR Strategy',
      'Founder Positioning',
      'Thought Leadership',
      'Reputation Management',
    ],
    image: photo7,
    imageAlt:
      'PR and founder reputation management services by BrandWorks',
  },
  {
    number: '08',
    slug: 'performance-marketing',
    title: 'Performance Marketing',
    group: 'Growth',
    description:
      'Paid media and performance campaigns connecting strong creative with targeting, testing, optimisation and measurable business objectives.',
    capabilities: [
      'Paid Social',
      'Paid Search',
      'Media Strategy',
      'Conversion Optimisation',
    ],
    image: photo8,
    imageAlt:
      'Performance marketing and paid media campaigns by BrandWorks',
  },
  {
    number: '09',
    slug: 'seo',
    title: 'SEO',
    group: 'Growth',
    description:
      'Search strategy, technical SEO and content systems built to improve discoverability, authority and sustainable organic visibility.',
    capabilities: [
      'SEO Strategy',
      'Technical SEO',
      'Content SEO',
      'International SEO',
    ],
    image: photo9,
    imageAlt:
      'SEO strategy and search engine optimisation services by BrandWorks',
  },
  {
    number: '10',
    slug: 'technology',
    title: 'Technology',
    group: 'Technology',
    description:
      'AI agents, business automation, dashboards, ERP and custom systems designed around the way a business actually operates.',
    capabilities: [
      'AI Agents & Automation',
      'Workflow Automation',
      'Data & Dashboards',
      'ERP & Custom Systems',
    ],
    image: photo10,
    imageAlt:
      'Technology, AI and business automation services by BrandWorks',
  },
]

/**
 * IMPORTANT:
 * Populate this with REAL BrandWorks projects only.
 * Do not publish fabricated clients, results or campaign metrics.
 */
const featuredProjects: Project[] = []

const serviceGroups = [
  {
    name: 'Direction',
    description:
      'The thinking and visual systems that define how a brand should communicate.',
  },
  {
    name: 'Production',
    description:
      'Photography and film built around a clear creative point of view.',
  },
  {
    name: 'Communication',
    description:
      'Content, social presence and reputation working under one direction.',
  },
  {
    name: 'Growth',
    description:
      'Search and performance systems designed to improve discoverability and demand.',
  },
  {
    name: 'Technology',
    description:
      'AI, automation and custom systems built around the way the business works.',
  },
]

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

  const [activeService, setActiveService] = useState(
    services[0],
  )

  const groupedServices = useMemo(
    () =>
      serviceGroups.map((group) => ({
        ...group,
        services: services.filter(
          (service) => service.group === group.name,
        ),
      })),
    [],
  )

  return (
    <main className="bg-white text-neutral-950">
      {/* =====================================================
          INTRO
      ====================================================== */}

      <section className="mx-auto w-full max-w-[1280px] px-5 pb-16 pt-24 sm:px-7 sm:pb-20 sm:pt-28 lg:px-10 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-[880px] text-center"> 

          <h1 className="mx-auto mt-5 max-w-[820pUNx] text-[clamp(2.25rem,4.4vw,3rem)] font-medium leading-[0.98] tracking-[-0.045em]">
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
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-16 lg:px-10 lg:py-24"
        >
          <div>
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-neutral-200 pb-5 sm:mb-10">
              <div>
                <SectionLabel>What we do</SectionLabel>

                <h2
                  id="services-index-title"
                  className="section-heading mt-3"
                >
                  Capabilities
                </h2>
              </div>

              {/* <p className="hidden max-w-[320px] text-right text-sm leading-6 text-neutral-500 md:block">
                Specialist capabilities designed to work
                independently or together.
              </p> */}
            </div>

            <nav aria-label="BrandWorks services">
              <ul>
                {services.map((service) => (
                  <li
                    key={service.slug}
                    onMouseEnter={() =>
                      setActiveService(service)
                    }
                    onFocus={() =>
                      setActiveService(service)
                    }
                    className="border-b border-neutral-200"
                  >
                    <Link
                      to={`/services/${service.slug}`}
                      className="group grid min-h-[84px] grid-cols-[1fr_auto] items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-4 sm:min-h-[94px] sm:grid-cols-[minmax(190px,0.72fr)_minmax(240px,1fr)_auto] sm:gap-5"
                    >
                      <span className="text-[20px] font-medium leading-tight tracking-[-0.025em] sm:text-[22px]">
                        {service.shortTitle ??
                          service.title}
                      </span>

                      <span className="hidden max-w-[410px] text-sm leading-6 text-neutral-500 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 sm:block pointer-coarse:opacity-100 motion-reduce:transition-none">
                        {service.description}
                      </span>

                      <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Desktop hover preview */}
          <aside
            aria-hidden="true"
            className="hidden lg:block"
          >
            <div className="sticky top-24">
              <div className="relative h-[clamp(620px,72vh,780px)] overflow-hidden rounded-[40px] bg-neutral-100 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-[38%] after:bg-gradient-to-t after:from-black/55 after:via-black/15 after:to-transparent after:content-['']">
                {services.map((service, index) => {
                  const isActive = service.slug === activeService.slug
                  return (
                    <img
                      key={service.slug}
                      src={service.image}
                      alt=""
                      width={760}
                      height={950}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className={`absolute inset-0 h-full w-full transform-gpu object-cover object-center transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                  )
                })}
                {services.map((service) => {
                  const isActive = service.slug === activeService.slug
                  return (
                    <p
                      key={service.slug}
                      className={`pointer-events-none absolute bottom-6 left-6 z-20 max-w-[90%] text-[clamp(1.5rem,2vw,1.875rem)] font-medium leading-[1.05] tracking-[-0.03em] text-white transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {service.title}
                    </p>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* =====================================================
          SELECTED WORK
          Only appears once REAL projects are added.
      ====================================================== */}

      {featuredProjects.length > 0 && (
        <section
          aria-labelledby="selected-work-title"
          className="border-t border-neutral-200"
        >
          <div className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
            <div className="mb-10 flex items-end justify-between gap-8 sm:mb-12">
              <div>
                <SectionLabel>
                  Selected work
                </SectionLabel>

                <h2
                  id="selected-work-title"
                  className="section-heading mt-3"
                >
                  Work across the studio.
                </h2>
              </div>
            </div>

            <div className="grid gap-x-7 gap-y-12 md:grid-cols-2">
              {featuredProjects.map(
                (project, index) => (
                  <article
                    key={project.slug}
                    className={
                      index === 0
                        ? 'md:col-span-2'
                        : ''
                    }
                  >
                    <Link
                      to={`/work/${project.slug}`}
                      className="group block"
                    >
                      <div
                        className={
                          index === 0
                            ? 'aspect-[16/9] overflow-hidden bg-neutral-100'
                            : 'aspect-[4/3] overflow-hidden bg-neutral-100'
                        }
                      >
                        <img
                          src={project.image}
                          alt={project.imageAlt}
                          width={
                            index === 0 ? 1600 : 900
                          }
                          height={
                            index === 0 ? 900 : 675
                          }
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
                        />
                      </div>

                      <div className="mt-5 flex items-start justify-between gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">
                            {project.client}
                          </p>

                          <h3 className="mt-2 text-[22px] font-medium tracking-[-0.025em] sm:text-[25px]">
                            {project.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-neutral-500">
                            {project.services.join(
                              ' · ',
                            )}
                          </p>
                        </div>

                        <Arrow />
                      </div>
                    </Link>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/*  GROUPED CAPABILITIES */}

      {/* <section
        aria-labelledby="capability-groups-title"
        className="border-t border-neutral-200"
      >
        <div className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
          <div className="max-w-[900px]"> 
            <h2
              id="capability-groups-title"
              className="section-heading mt-3"
            >
              Different disciplines. One clear direction.
            </h2>

            <p className="mt-5 max-w-[570px] text-[15px] leading-7 text-neutral-600 sm:text-base">
              The strongest work rarely belongs to a single
              discipline. Strategy can lead into design,
              photography and film; content can continue
              through social, search and performance; and
              technology can bring the entire brand experience
              together.
            </p>
          </div>

          <div className="mt-14 divide-y divide-neutral-200 border-y border-neutral-200 sm:mt-16">
            {groupedServices.map((group) => (
              <section
                key={group.name}
                className="grid gap-8 py-10 md:grid-cols-[0.65fr_1.35fr] md:py-12"
              >
                <div>
                  <p className="text-[14px] uppercase tracking-[0.12em] text-neutral-900">
                    {group.name}
                  </p>

                  <p className="mt-3 max-w-[320px] text-sm leading-6 text-neutral-500">
                    {group.description}
                  </p>
                </div>

                <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
                  {group.services.map(
                    (service) => (
                      <article key={service.slug}>
                        <Link
                          to={`/services/${service.slug}`}
                          className="group block"
                        >
                          <div className="flex items-start justify-between gap-5">
                            <div>
                              <h3 className="text-[21px] font-medium tracking-[-0.025em]">
                                {service.title}
                              </h3>

                              <p className="mt-3 max-w-[430px] text-sm leading-6 text-neutral-500">
                                {service.description}
                              </p>
                            </div>

                            <Arrow />
                          </div>

                          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                            {service.capabilities.map(
                              (capability) => (
                                <li
                                  key={capability}
                                  className="text-xs text-neutral-500"
                                >
                                  {capability}
                                </li>
                              ),
                            )}
                          </ul>
                        </Link>
                      </article>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section> */}

      {/* 
          INTEGRATED AGENCY MESSAGE */}

      <section className="border-t border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-16 sm:px-7 sm:py-20 md:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24">
          <SectionLabel>
           <span className='text-white/80'>One creative direction</span> 
          </SectionLabel>

          <div className="max-w-[720px]">
            <h2 className="text-[2rem] text-white">
              The work rarely belongs to one discipline.
            </h2>

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

      <section className="border-t border-neutral-800 bg-neutral-950 text-white">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-7 sm:py-16 lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[650px]">
              {/* <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                Explore BrandWorks
              </p> */}

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
      </section>
    </main>
  )
}
