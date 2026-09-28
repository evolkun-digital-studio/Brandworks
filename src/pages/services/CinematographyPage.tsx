import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* -------------------------------------------------------------------------- */
/*                                   DATA                                     */
/* -------------------------------------------------------------------------- */
const filmVideos = [
  '/video/Idea%20-%20Cinematic%20Video%20_%20Shot%20on%20Canon%20EOS250D.mp4',
  '/video/Central%20Cee%20-%20Obsessed%20With%20You%20(Official%20Video).mp4',
  '/video/CENTRAL%20CEE%20-%20BOOGA%20(MUSIC%20VIDEO).mp4',
  '/video/footer-showreel-1080.mp4',
] 

const COLORS = {
  lime: '#ccff00',
  ink: '#231f20',
  silver: '#c8c8c8',
  graphite: '#49494a',
}

const films = [
  {
    id: '01',
    title: 'Brand Film',
    category: 'Direction · Cinematography · Production',
    image: '/images/cinematography/film-01.webp',
    href: filmVideos[0],
    aspect: 'aspect-[16/9]',
  },
  {
    id: '02',
    title: 'Campaign Film',
    category: 'Campaign · Film · Post',
    image: '/images/cinematography/film-02.webp',
    href: filmVideos[1],
    aspect: 'aspect-[4/5]',
  },
  {
    id: '03',
    title: 'Product Film',
    category: 'Product · Motion · Art Direction',
    image: '/images/cinematography/film-03.webp',
    href: filmVideos[2],
    aspect: 'aspect-[4/5]',
  },
  {
    id: '04',
    title: 'Founder Story',
    category: 'Portrait · Story · Film',
    image: '/images/cinematography/film-04.webp',
    href: filmVideos[3],
    aspect: 'aspect-[16/9]',
  },
]

const capabilities = [
  'Brand Films',
  'Commercial Films',
  'Campaign Films',
  'Cinematography',
  'Product Videos',
  'Founder Films',
  'Corporate Films',
  'Social Video',
  'Creative Direction',
  'Post-Production',
]

const process = [
  {
    number: '01',
    title: 'Concept',
    text: 'We define what the film needs to say, who it needs to move and the visual language that will carry the idea.',
  },
  {
    number: '02',
    title: 'Pre-production',
    text: 'Treatment, script, shot planning, locations, casting, styling and production decisions are resolved before the shoot.',
  },
  {
    number: '03',
    title: 'Production',
    text: 'Direction, cinematography, lighting, sound and performance are brought together around one clear point of view.',
  },
  {
    number: '04',
    title: 'Post',
    text: 'Editing, colour, sound design, motion and platform-specific delivery shape the final piece.',
  },
]

/* -------------------------------------------------------------------------- */
/*                                   SEO                                      */
/* -------------------------------------------------------------------------- */

function useCinematographySEO() {
  useEffect(() => {
    // Replace with your actual production domain.
    const domain = 'https://brandworks.com'
    const canonicalUrl = `${domain}/services/videography`

    const title =
      'Videography, Cinematography & Video Production | BrandWorks'

    const description =
      'BrandWorks provides videography, cinematography and video production for brand films, commercials, campaign films, product videos, founder films, corporate videos and digital content.'

    document.title = title

    const setMeta = (
      name: string,
      content: string,
      property = false,
    ) => {
      const selector = property
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`

      let meta =
        document.head.querySelector<HTMLMetaElement>(selector)

      if (!meta) {
        meta = document.createElement('meta')

        if (property) {
          meta.setAttribute('property', name)
        } else {
          meta.setAttribute('name', name)
        }

        document.head.appendChild(meta)
      }

      meta.setAttribute('content', content)
    }

    setMeta('description', description)

    setMeta(
      'robots',
      'index,follow,max-image-preview:large,max-snippet:-1',
    )

    setMeta('og:title', title, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    setMeta('og:url', canonicalUrl, true)

    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)

    let canonical =
      document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      )

    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }

    canonical.href = canonicalUrl

    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: domain,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Services',
              item: `${domain}/services`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: 'Videography & Cinematography',
              item: canonicalUrl,
            },
          ],
        },

        {
          '@type': 'Service',
          name: 'Videography & Cinematography',
          serviceType: [
            'Video Production',
            'Videography',
            'Cinematography',
            'Brand Film Production',
            'Commercial Video Production',
          ],
          provider: {
            '@type': 'Organization',
            name: 'BrandWorks',
            url: domain,
          },
          url: canonicalUrl,
          description,
        },
      ],
    }

    let schema =
      document.head.querySelector<HTMLScriptElement>(
        '#cinematography-service-schema',
      )

    if (!schema) {
      schema = document.createElement('script')
      schema.id = 'cinematography-service-schema'
      schema.type = 'application/ld+json'
      document.head.appendChild(schema)
    }

    schema.textContent = JSON.stringify(structuredData)
  }, [])
}

/* -------------------------------------------------------------------------- */
/*                                UTILITIES                                   */
/* -------------------------------------------------------------------------- */

function Label({
  children,
  dark = true,
}: {
  children: ReactNode
  dark?: boolean
}) {
  return (
    <p
      className={[
        'text-[10px] font-medium uppercase tracking-[0.14em] sm:text-[11px]',
        dark
          ? 'text-white/45'
          : 'text-[#49494a]',
      ].join(' ')}
    >
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

/* -------------------------------------------------------------------------- */
/*                                 HERO VIDEO                                 */
/* -------------------------------------------------------------------------- */

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const video = videoRef.current

    if (!video) return

    if (reduceMotion) {
      video.pause()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      {
        threshold: 0.25,
      },
    )

    observer.observe(video)

    return () => observer.disconnect()
  }, [reduceMotion])

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      loop
      preload="metadata"
      poster="/images/cinematography/showreel-poster.webp"
      className="h-full w-full object-cover"
    >
      <source
        src="/video/cinematography/showreel.webm"
        type="video/webm"
      />

      <source
        src="/video/cinematography/showreel.mp4"
        type="video/mp4"
      />
    </video>
  )
}

/* -------------------------------------------------------------------------- */
/*                              LOADING IMAGE                                 */
/* -------------------------------------------------------------------------- */

function EditorialImage({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`relative overflow-hidden bg-[#49494a] ${className}`}
    >
      <div
        className={[
          'absolute inset-0 bg-[#49494a] transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      />

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={[
          'h-full w-full object-cover',
          'transition-[opacity,transform] duration-700',
          'ease-[cubic-bezier(0.22,1,0.36,1)]',
          loaded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              PROJECT FRAME                                 */
/* -------------------------------------------------------------------------- */

function FilmProject({
  film,
  className = '',
}: {
  film: (typeof films)[number]
  className?: string
}) {
  return (
    <article
      data-film
      className={className}
    >
      <Link
        to={film.href}
        className="group block"
      >
        <EditorialImage
          src={film.image}
          alt={`${film.title} cinematography and video production by BrandWorks`}
          className={film.aspect}
        />

        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] tabular-nums text-white/30">
              {film.id}
            </p>

            <h3 className="mt-2 text-[20px] font-medium leading-tight tracking-[-0.025em] sm:text-[23px]">
              {film.title}
            </h3>

            <p className="mt-2 text-[12px] text-white/40">
              {film.category}
            </p>
          </div>

          <span className="pt-1 text-sm text-white/40 transition-colors duration-300 group-hover:text-[#ccff00]">
            <Arrow />
          </span>
        </div>
      </Link>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function CinematographyPage() {
  useCinematographySEO()

  const pageRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      if (reduceMotion) return

      const root = pageRef.current

      if (!root) return

      /* -------------------------------- Intro -------------------------------- */

      const intro = root.querySelectorAll(
        '[data-intro]',
      )

      gsap.fromTo(
        intro,
        {
          opacity: 0,
          y: 18,
        },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.85,
          ease: 'power3.out',
        },
      )

      /* ----------------------------- Hero media ------------------------------- */

      const hero =
        root.querySelector<HTMLElement>(
          '[data-hero-video]',
        )

      if (hero) {
        gsap.fromTo(
          hero,
          {
            clipPath:
              'inset(3.5% 3.5% 3.5% 3.5%)',
            scale: 0.99,
          },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            duration: 1.25,
            ease: 'power3.out',
            delay: 0.15,
          },
        )

        const media = hero.querySelector(
          'video',
        )

        if (media) {
          gsap.to(media, {
            scale: 1.035,
            ease: 'none',

            scrollTrigger: {
              trigger: hero,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          })
        }
      }

      /* --------------------------- Generic reveals --------------------------- */

      gsap.utils
        .toArray<HTMLElement>(
          '[data-reveal]',
          root,
        )
        .forEach((element) => {
          gsap.fromTo(
            element,
            {
              opacity: 0,
              y: 20,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power3.out',

              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                once: true,
              },
            },
          )
        })

      /* ----------------------------- Film work ------------------------------- */

      gsap.utils
        .toArray<HTMLElement>(
          '[data-film]',
          root,
        )
        .forEach((project) => {
          const image =
            project.querySelector('img')

          gsap.fromTo(
            project,
            {
              opacity: 0,
              y: 24,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',

              scrollTrigger: {
                trigger: project,
                start: 'top 87%',
                once: true,
              },
            },
          )

          if (image) {
            gsap.fromTo(
              image,
              {
                scale: 1.04,
              },
              {
                scale: 1,
                duration: 1.15,
                ease: 'power3.out',

                scrollTrigger: {
                  trigger: project,
                  start: 'top 88%',
                  once: true,
                },
              },
            )
          }
        })

      /* ------------------------------ Lines ---------------------------------- */

      gsap.utils
        .toArray<HTMLElement>(
          '[data-line]',
          root,
        )
        .forEach((line) => {
          gsap.fromTo(
            line,
            {
              scaleX: 0,
              transformOrigin: 'left center',
            },
            {
              scaleX: 1,
              duration: 0.9,
              ease: 'power3.out',

              scrollTrigger: {
                trigger: line,
                start: 'top 94%',
                once: true,
              },
            },
          )
        })
    },
    {
      scope: pageRef,
      dependencies: [reduceMotion],
      revertOnUpdate: true,
    },
  )

  return (
    <main
      ref={pageRef}
      style={
        {
          '--bw-lime': COLORS.lime,
          '--bw-ink': COLORS.ink,
          '--bw-silver': COLORS.silver,
          '--bw-graphite': COLORS.graphite,
        } as React.CSSProperties
      }
      className="overflow-hidden bg-[#231f20] text-white"
    >
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="mx-auto w-full max-w-[1280px] px-5 pb-12 pt-24 sm:px-7 sm:pb-14 sm:pt-28 lg:px-10 lg:pb-16 lg:pt-32">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:gap-16">
          <div>
            <div data-intro>
              <p className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/50 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />

                05 / Videography & Cinematography
              </p>
            </div>

            <h1
              data-intro
              className="mt-5 max-w-[820px] text-[clamp(2.35rem,4.6vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.05em]"
            >
              Motion with a point of view.
            </h1>
          </div>

          <div
            data-intro
            className="max-w-[520px] lg:justify-self-end"
          >
            <p className="text-[15px] leading-7 text-white/55 sm:text-[16px]">
              Brand films, commercials and cinematic content
              developed from the idea through production,
              cinematography and post.
            </p>

            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
              <a
                href="#selected-films"
                className="group inline-flex items-center gap-2 border-b border-[#ccff00] pb-1 text-sm"
              >
                Selected films

                <span className="text-[#ccff00] transition-transform duration-300 group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>

              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white"
              >
                Start a project
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SHOWREEL
      ====================================================== */}

      <section className="px-3 sm:px-5 lg:px-7">
        <div
          data-hero-video
          className="relative mx-auto aspect-[16/9] w-full max-w-[1500px] overflow-hidden bg-[#49494a]"
        >
          <HeroVideo />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#231f20]/60 via-transparent to-transparent" />

          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-8 sm:inset-x-7 sm:bottom-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                BrandWorks Film
              </p>

              <p className="mt-2 text-sm">
                Direction · Production · Post
              </p>
            </div>

            <div className="hidden items-center gap-2 text-[11px] text-white/45 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ccff00]" />

              Showreel / 2026
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          POINT OF VIEW
      ====================================================== */}

      <section className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
        <div
          data-line
          className="h-px bg-[#49494a]"
        />

        <div className="grid gap-8 pt-9 md:grid-cols-[.6fr_1.4fr] md:gap-14">
          <div data-reveal>
            <Label>Point of view</Label>
          </div>

          <div
            data-reveal
            className="max-w-[790px]"
          >
            <h2 className="text-[clamp(1.85rem,3.15vw,2.65rem)] font-medium leading-[1.06] tracking-[-0.04em]">
              Cinematic is not a filter.
              <br />
              It starts before the camera rolls.
            </h2>

            <p className="mt-6 max-w-[640px] text-[15px] leading-7 text-white/50 sm:text-[16px]">
              The frame, pacing, lighting, movement and sound
              should all come from the same idea. We build film
              around what the brand needs the audience to feel,
              not around an effect that happens to look good.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          SELECTED FILMS
      ====================================================== */}

      <section
        id="selected-films"
        className="mx-auto w-full max-w-[1280px] scroll-mt-24 px-5 pb-20 sm:px-7 sm:pb-24 lg:px-10 lg:pb-28"
      >
        <div className="mb-10 flex items-end justify-between gap-8 border-b border-[#49494a] pb-5">
          <div data-reveal>
            <Label>Selected motion</Label>

            <h2 className="mt-3 text-[clamp(1.8rem,2.9vw,2.45rem)] font-medium tracking-[-0.04em]">
              Recent frames.
            </h2>
          </div>

          <Link
            to="/work"
            className="group hidden items-center gap-2 text-sm text-white/40 transition-colors hover:text-[#ccff00] sm:inline-flex"
          >
            All work
            <Arrow />
          </Link>
        </div>

        {/* Large lead project */}
        <FilmProject film={films[0]} />

        {/* Two offset films */}
        <div className="mt-14 grid items-start gap-8 md:mt-20 md:grid-cols-2 md:gap-10">
          <FilmProject
            film={films[1]}
            className="md:max-w-[82%]"
          />

          <FilmProject
            film={films[2]}
            className="md:mt-24 md:ml-auto md:max-w-[82%]"
          />
        </div>

        <div className="mt-14 md:mt-20">
          <FilmProject film={films[3]} />
        </div>
      </section>

      {/* =====================================================
          CAPABILITIES — SILVER
      ====================================================== */}

      <section className="bg-white text-[#231f20]">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
            <div data-reveal>
              <Label dark={false}>
                Film practice
              </Label>

              <h2 className="mt-4 max-w-[430px] text-[clamp(1.85rem,3vw,2.5rem)] font-medium leading-[1.06] tracking-[-0.04em]">
                From the first thought to the final frame.
              </h2>

              <p className="mt-5 max-w-[410px] text-[15px] leading-7 text-[#49494a]">
                Our video production capability can work
                independently or as part of a wider BrandWorks
                campaign across strategy, photography, content,
                social and performance.
              </p>
            </div>

            <div className="border-t border-[#49494a]/30">
              {capabilities.map(
                (capability, index) => (
                  <div
                    key={capability}
                    data-reveal
                    className="group grid grid-cols-[42px_1fr_auto] items-center border-b border-[#49494a]/30 py-5 sm:grid-cols-[54px_1fr_auto] sm:py-6"
                  >
                    <span className="text-[10px] tabular-nums text-[#49494a]/60">
                      {String(index + 1).padStart(
                        2,
                        '0',
                      )}
                    </span>

                    <span className="text-[18px] font-medium tracking-[-0.025em] sm:text-[21px]">
                      {capability}
                    </span>

                    <span className="h-1.5 w-1.5 rounded-full bg-[#231f20] transition-colors duration-300 group-hover:bg-[#ccff00]" />
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MID STATEMENT
      ====================================================== */}

      <section className="bg-[#49494a] text-white">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
          <div className="grid gap-8 md:grid-cols-[.55fr_1.45fr]">
            <Label>Creative direction</Label>

            <div
              data-reveal
              className="max-w-[820px]"
            >
              <p className="text-[clamp(1.8rem,3.5vw,3rem)] font-medium leading-[1.05] tracking-[-0.045em]">
                A good frame can look beautiful.
                <br />
                A considered frame can make the brand mean
                something.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PROCESS
      ====================================================== */}

      <section className="bg-[#231f20]">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-7 sm:py-20 lg:px-10 lg:py-24">
          <div className="mb-9">
            <Label>Production process</Label>

            <h2
              data-reveal
              className="mt-3 text-[clamp(1.8rem,2.9vw,2.4rem)] font-medium tracking-[-0.04em]"
            >
              Built with intention.
            </h2>
          </div>

          <div className="border-y border-[#49494a]">
            {process.map((item) => (
              <article
                key={item.number}
                data-reveal
                className="grid gap-5 border-b border-[#49494a] py-7 last:border-b-0 sm:grid-cols-[60px_.6fr_1.4fr] sm:gap-8 sm:py-9"
              >
                <p className="text-[10px] tabular-nums text-[#ccff00]">
                  {item.number}
                </p>

                <h3 className="text-[20px] font-medium tracking-[-0.025em] sm:text-[22px]">
                  {item.title}
                </h3>

                <p className="max-w-[560px] text-sm leading-6 text-white/45 sm:text-[15px] sm:leading-7">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          SEO / SERVICE CONTEXT
      ====================================================== */}

      <section className="border-t border-[#49494a] bg-[#231f20]">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[.65fr_1.35fr] lg:gap-16 lg:px-10 lg:py-24">
          <div data-reveal>
            <Label>Video production</Label>
          </div>

          <div
            data-reveal
            className="max-w-[730px]"
          >
            <h2 className="text-[clamp(1.8rem,2.9vw,2.45rem)] font-medium leading-[1.06] tracking-[-0.04em]">
              Film production built around the brand, not a
              template.
            </h2>

            <div className="mt-6 space-y-5 text-[15px] leading-7 text-white/48 sm:text-[16px]">
              <p>
                BrandWorks provides videography,
                cinematography and video production for
                commercial films, brand films, campaign
                videos, product films, founder stories,
                corporate films and social content.
              </p>

              <p>
                Depending on the brief, our production can
                cover concept development, creative direction,
                scripting, pre-production, cinematography,
                filming, editing, colour grading, sound design
                and motion.
              </p>

              <p>
                Film can also connect directly with our
                photography, content creation, social media and
                performance marketing capabilities, allowing a
                campaign to maintain one visual direction
                across formats and platforms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          RELATED SERVICES
      ====================================================== */}

      <section className="border-t border-[#49494a] bg-[#231f20]">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-7 sm:py-16 lg:px-10">
          <div className="grid gap-8 md:grid-cols-[.55fr_1.45fr]">
            <Label>Related capabilities</Label>

            <nav
              aria-label="Related BrandWorks services"
              className="border-t border-[#49494a]"
            >
              {[
                {
                  number: '03',
                  title: 'Content Creation',
                  path: '/services/content-creation',
                },
                {
                  number: '04',
                  title: 'Photography',
                  path: '/services/photography',
                },
                {
                  number: '06',
                  title: 'Social Media',
                  path: '/services/social-media',
                },
              ].map((service) => (
                <Link
                  key={service.path}
                  to={service.path}
                  className="group grid grid-cols-[44px_1fr_auto] items-center border-b border-[#49494a] py-5 sm:grid-cols-[60px_1fr_auto]"
                >
                  <span className="text-[10px] text-white/25">
                    {service.number}
                  </span>

                  <span className="text-[18px] tracking-[-0.02em] sm:text-[20px]">
                    {service.title}
                  </span>

                  <span className="text-white/35 transition-colors duration-300 group-hover:text-[#ccff00]">
                    <Arrow />
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA — LIME
      ====================================================== */}

      <section className="bg-[#ccff00] text-[#231f20]">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-7 sm:py-16 lg:px-10 lg:py-20">
          <div className="grid gap-8 md:grid-cols-[.55fr_1.45fr]">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#231f20]/55">
              Start a project
            </p>

            <div className="max-w-[760px]">
              <h2 className="text-[clamp(1.95rem,3.8vw,3.1rem)] font-medium leading-[1.02] tracking-[-0.045em]">
                Have something worth putting on screen?
              </h2>

              <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-[#231f20]/65">
                Bring us the brief, the idea or simply the
                starting point. We can take it from creative
                direction through production.
              </p>

              <Link
                to="/contact"
                className="group mt-7 inline-flex min-h-11 items-center gap-3 border-b border-[#231f20] pb-1 text-sm font-medium"
              >
                Start a conversation
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}