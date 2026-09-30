import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

type Project = {
  image: string
  type: string
  title: string
  kind: 'Client' | 'Studio'
  year: string
  ratio: string
}

const projects: Project[] = [
  {
    image:
      'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1800&q=88',
    type: 'Identity / Packaging',
    title: 'A clear identity, made tangible.',
    kind: 'Client',
    year: '2026',
    ratio: 'aspect-[4/5]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1800&q=88',
    type: 'Campaign / Key visual',
    title: 'A world built from one idea.',
    kind: 'Studio',
    year: '2026',
    ratio: 'aspect-[5/4]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1600&q=88',
    type: 'Motion / Title sequence',
    title: 'Static thinking, set in motion.',
    kind: 'Client',
    year: '2026',
    ratio: 'aspect-[4/5]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1553484771-047a44eee27b?auto=format&fit=crop&w=1800&q=88',
    type: 'Social / Content system',
    title: 'One system. Every touchpoint.',
    kind: 'Client',
    year: '2026',
    ratio: 'aspect-[16/11]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=88',
    type: 'Illustration / Visual language',
    title: 'Built to be recognised.',
    kind: 'Studio',
    year: '2026',
    ratio: 'aspect-[4/5]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1800&q=88',
    type: 'Art direction / Brand world',
    title: 'A visual language people remember.',
    kind: 'Client',
    year: '2026',
    ratio: 'aspect-[3/2]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=1700&q=86',
    type: 'Print / Publication',
    title: 'Details that reward attention.',
    kind: 'Studio',
    year: '2025',
    ratio: 'aspect-[4/5]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1700&q=86',
    type: 'Digital / Interface',
    title: 'A useful visual rhythm.',
    kind: 'Client',
    year: '2025',
    ratio: 'aspect-[5/4]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1700&q=86',
    type: 'Campaign / Photography',
    title: 'A frame with a little tension.',
    kind: 'Client',
    year: '2025',
    ratio: 'aspect-[4/5]',
  },
  {
    image:
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1700&q=86',
    type: 'Spatial / Experience',
    title: 'A brand you can walk into.',
    kind: 'Studio',
    year: '2025',
    ratio: 'aspect-[3/2]',
  },
]

const projectLayouts = [
  'md:col-span-7',
  'md:col-span-4 md:col-start-9 md:mt-[150px]',
  'md:col-span-4 md:mt-[20px]',
  'md:col-span-7 md:col-start-6 md:mt-[90px]',
  'md:col-span-5 md:mt-[30px]',
  'md:col-span-6 md:col-start-7 md:mt-[160px]',
  'md:col-span-4',
  'md:col-span-7 md:col-start-6 md:mt-[80px]',
  'md:col-span-5 md:mt-[50px]',
  'md:col-span-6 md:col-start-7 md:mt-[140px]',
]

const capabilities = [
  ['01', 'Brand identity systems', 'Identity'],
  ['02', 'Campaign concepts & key visuals', 'Campaign'],
  ['03', 'Digital & social design', 'Digital'],
  ['04', 'Motion graphics & animation', 'Motion'],
  ['05', 'Packaging & print collateral', 'Physical'],
  ['06', 'Art direction & visual worlds', 'Direction'],
]

const process = [
  {
    number: '01',
    title: 'Find the signal',
    text: 'We find the audience, tension and idea worth building the visual system around.',
  },
  {
    number: '02',
    title: 'Build the language',
    text: 'Typography, colour, imagery, composition and behaviour become one recognisable system.',
  },
  {
    number: '03',
    title: 'Give it movement',
    text: 'Motion is added where rhythm, pacing and interaction can strengthen the idea.',
  },
  {
    number: '04',
    title: 'Make it usable',
    text: 'The system is translated into useful formats, assets and guidelines for the real world.',
  },
]

const heroVideo =
  'https://videos.pexels.com/video-files/3571937/3571937-sd_1280_720_30fps.mp4'

const motionVideo =
  'https://videos.pexels.com/video-files/3129595/3129595-hd_1920_1080_25fps.mp4'

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
        down
          ? 'group-hover:translate-y-1'
          : 'group-hover:translate-x-1 group-hover:-translate-y-1'
      }`}
    >
      {down ? '↓' : '↗'}
    </span>
  )
}

export default function GraphicDesignPage() {
  const pageRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    document.title = 'Graphic Design & Motion | BrandWorks'

    const description =
      'Brand identity, campaign design, graphic design, motion and visual systems by BrandWorks.'

    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )

    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }

    meta.content = description

    return () => {
      document.title = 'BRANDWORKS'
    }
  }, [])

  useGSAP(
    () => {
      if (reducedMotion) return

      const lenis = new Lenis({
        lerp: 0.08,
        smoothWheel: true,
        syncTouch: false,
      })

      const raf = (time: number) => {
        lenis.raf(time * 1000)
      }

      const onScroll = () => {
        ScrollTrigger.update()
      }

      gsap.ticker.add(raf)
      lenis.on('scroll', onScroll)

      const ctx = gsap.context(() => {
        /*
        --------------------------------------------------
        HERO
        --------------------------------------------------
        */

        const intro = gsap.timeline({
          defaults: {
            ease: 'power4.out',
          },
        })

        intro
          .from('[data-hero-kicker]', {
            y: 10,
            opacity: 0,
            duration: 0.65,
          })
          .from(
            '[data-hero-line]',
            {
              yPercent: 115,
              duration: 1.1,
              stagger: 0.09,
            },
            '-=0.42',
          )
          .from(
            '[data-hero-copy]',
            {
              y: 22,
              opacity: 0,
              duration: 0.85,
            },
            '-=0.7',
          )
          .fromTo(
            '[data-hero-main]',
            {
              clipPath: 'inset(0 0 100% 0)',
            },
            {
              clipPath: 'inset(0 0 0% 0)',
              duration: 1.35,
              ease: 'power4.inOut',
            },
            '-=0.55',
          )
          .from(
            '[data-hero-secondary]',
            {
              y: 50,
              opacity: 0,
              duration: 1,
            },
            '-=0.8',
          )
          .from(
            '[data-hero-detail]',
            {
              scale: 0.92,
              opacity: 0,
              duration: 0.75,
              stagger: 0.06,
            },
            '-=0.7',
          )

        /*
        --------------------------------------------------
        HERO PARALLAX
        --------------------------------------------------
        */

        gsap.to('[data-hero-main-image]', {
          yPercent: 8,
          scale: 1.03,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-hero-canvas]',
            start: 'top 75%',
            end: 'bottom top',
            scrub: 1,
          },
        })

        gsap.to('[data-hero-secondary]', {
          yPercent: -13,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-hero-canvas]',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        })

        gsap.to('[data-hero-float]', {
          yPercent: 22,
          rotate: 5,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-hero-canvas]',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.15,
          },
        })

        /*
        --------------------------------------------------
        SECTION INTRODUCTIONS
        --------------------------------------------------
        */

        gsap.utils
          .toArray<HTMLElement>('[data-section-intro]')
          .forEach((section) => {
            const children =
              section.querySelectorAll<HTMLElement>('[data-intro-child]')

            gsap.from(children, {
              y: 28,
              opacity: 0,
              duration: 0.9,
              stagger: 0.08,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 78%',
                once: true,
              },
            })
          })

        /*
        --------------------------------------------------
        PROJECTS
        --------------------------------------------------
        */

        gsap.utils.toArray<HTMLElement>('[data-project]').forEach((card) => {
          const imageMask =
            card.querySelector<HTMLElement>('[data-project-mask]')
          const image =
            card.querySelector<HTMLImageElement>('[data-project-image]')
          const meta = card.querySelector<HTMLElement>('[data-project-meta]')

          if (imageMask) {
            gsap.fromTo(
              imageMask,
              {
                clipPath: 'inset(0 0 15% 0)',
                opacity: 0,
              },
              {
                clipPath: 'inset(0 0 0% 0)',
                opacity: 1,
                duration: 1.15,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: card,
                  start: 'top 84%',
                  once: true,
                },
              },
            )
          }

          if (meta) {
            gsap.from(meta, {
              y: 18,
              opacity: 0,
              duration: 0.75,
              delay: 0.08,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 82%',
                once: true,
              },
            })
          }

          if (image) {
            gsap.fromTo(
              image,
              {
                yPercent: -4,
                scale: 1.07,
              },
              {
                yPercent: 5,
                scale: 1.02,
                ease: 'none',
                scrollTrigger: {
                  trigger: card,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.8,
                },
              },
            )
          }
        })

        /*
        --------------------------------------------------
        CAPABILITY ROWS
        --------------------------------------------------
        */

        gsap.from('[data-capability]', {
          x: 24,
          opacity: 0,
          duration: 0.7,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '[data-capabilities]',
            start: 'top 75%',
            once: true,
          },
        })

        /*
        --------------------------------------------------
        MOTION STUDIES
        --------------------------------------------------
        */

        gsap.from('[data-motion-card]', {
          y: 45,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '[data-motion-grid]',
            start: 'top 76%',
            once: true,
          },
        })

        /*
        --------------------------------------------------
        PROCESS
        --------------------------------------------------
        */

        gsap.utils.toArray<HTMLElement>('[data-process-row]').forEach((row) => {
          gsap.from(row, {
            y: 24,
            opacity: 0,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: row,
              start: 'top 86%',
              once: true,
            },
          })
        })

        ScrollTrigger.refresh()
      }, pageRef)

      return () => {
        ctx.revert()
        lenis.off('scroll', onScroll)
        lenis.destroy()
        gsap.ticker.remove(raf)
      }
    },
    {
      scope: pageRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  )

  return (
    <main
      ref={pageRef}
      className="overflow-hidden bg-[#f7f7f4] text-[#111]"
    >
      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative bg-[#f7f7f4] pb-[clamp(70px,10vw,150px)] pt-[clamp(110px,12vw,175px)]">
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]">
          <div className="border-t border-black/15 pt-4">
            <div
              data-hero-kicker
              className="flex items-center justify-between gap-5 text-[10px] uppercase tracking-[0.16em]"
            >
              <span>Graphic Design / Motion</span>

              <div className="flex items-center gap-3 text-black/45">
                <span className="h-[6px] w-[6px] rounded-full bg-[#ccff00]" />
                <span>BrandWorks / Studio Practice</span>
              </div>
            </div>
          </div>

          <div className="mt-[clamp(50px,7vw,100px)] grid items-end gap-10 md:grid-cols-12">
            <div className="md:col-span-8">
              <h1 className="m-0 max-w-[940px] font-[400] text-[clamp(44px,6vw,72px)] leading-[0.91] tracking-[-0.055em] [font-family:Grimblade,serif]">
                <span className="block overflow-hidden pb-[0.08em]">
                  <span data-hero-line className="block">
                    Graphic systems
                  </span>
                </span>

                <span className="block overflow-hidden pb-[0.08em]">
                  <span data-hero-line className="block">
                    with a pulse.
                  </span>
                </span>
              </h1>
            </div>

            <div
              data-hero-copy
              className="md:col-span-4 md:col-start-9 md:pb-1"
            >
              <p className="m-0 max-w-[360px] text-[16px] leading-[1.72] text-black/64">
                Identity, campaigns, visual systems and motion designed to make
                brands easier to recognise and harder to forget.
              </p>

              <a
                href="#selected-work"
                className="group mt-8 inline-flex items-center gap-4 border-b border-black pb-2 text-[12px] uppercase tracking-[0.12em] text-black no-underline"
              >
                Selected work
                <Arrow down />
              </a>
            </div>
          </div>

          {/* HERO ARTBOARD */}

          <div
            data-hero-canvas
            className="relative mt-[clamp(70px,9vw,130px)] h-[clamp(540px,64vw,850px)]"
          >
            <div className="absolute left-0 top-0 text-[9px] uppercase tracking-[0.16em] text-black/45">
              Visual study 001
            </div>

            {/* MAIN FRAME */}

            <div
              data-hero-main
              className="absolute left-[4%] top-[7%] h-[71%] w-[68%] overflow-hidden bg-[#deded8] max-md:left-0 max-md:top-[8%] max-md:h-[62%] max-md:w-[88%]"
            >
              <video
                data-hero-main-image
                className="h-[112%] w-full -translate-y-[6%] object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster="https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1800&q=88"
                aria-label="BrandWorks graphic design motion study"
              >
                <source src={heroVideo} type="video/mp4" />
              </video>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-[clamp(18px,2.5vw,36px)] text-white">
                <div>
                  <p className="m-0 text-[9px] uppercase tracking-[0.15em] text-white/60">
                    Studio experiment
                  </p>

                  <p className="mb-0 mt-2 text-[15px]">
                    Form / Colour / Motion
                  </p>
                </div>

                <span className="text-[10px] uppercase tracking-[0.15em]">
                  01
                </span>
              </div>
            </div>

            {/* SECONDARY FRAME */}

            <div
              data-hero-secondary
              className="absolute bottom-[3%] right-[2%] z-10 w-[35%] max-md:bottom-[5%] max-md:right-0 max-md:w-[54%]"
            >
              <div className="aspect-[4/5] overflow-hidden bg-[#d8d8d2]">
                <img
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=88"
                  alt="BrandWorks visual design study"
                />
              </div>

              <div className="mt-3 flex justify-between gap-5 text-[9px] uppercase tracking-[0.13em]">
                <span>Direction / 02</span>
                <span className="text-black/45">2026</span>
              </div>
            </div>

            {/* LIME DETAIL */}

            <div
              data-hero-float
              className="absolute right-[18%] top-[4%] z-20 flex aspect-square w-[clamp(90px,11vw,150px)] items-center justify-center bg-[#ccff00] max-md:right-[2%]"
            >
              <span className="-rotate-90 text-[9px] uppercase tracking-[0.18em]">
                BrandWorks
              </span>
            </div>

            <div
              data-hero-detail
              className="absolute bottom-[16%] left-0 hidden h-px w-[16%] bg-black/25 md:block"
            />

            <div
              data-hero-detail
              className="absolute bottom-[13%] left-0 hidden text-[9px] uppercase leading-[1.7] tracking-[0.13em] text-black/45 md:block"
            >
              Ideas
              <br />
              Systems
              <br />
              Motion
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          POINT OF VIEW
      ========================================================= */}

      <section className="bg-white py-[clamp(90px,12vw,180px)]">
        <div
          data-section-intro
          className="mx-auto grid w-full max-w-[1440px] gap-9 px-[clamp(20px,5vw,80px)] md:grid-cols-12"
        >
          <div
            data-intro-child
            className="md:col-span-3"
          >
            <p className="m-0 text-[10px] font-medium uppercase tracking-[0.16em] text-black/45">
              Point of view
            </p>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            <h2
              data-intro-child
              className="m-0 max-w-[880px] font-[400] text-[clamp(34px,4.3vw,52px)] leading-[0.95] tracking-[-0.05em] [font-family:Grimblade,serif]"
            >
              Attention is easy to get.
              <br />
              <span className="text-black/40">
                Recognition is harder.
              </span>
            </h2>

            <div
              data-intro-child
              className="mt-[clamp(42px,6vw,72px)] grid gap-8 border-t border-black/15 pt-6 sm:grid-cols-2"
            >
              <p className="m-0 max-w-[400px] text-[16px] leading-[1.75] text-black/65">
                We create graphic systems with enough character to be
                remembered and enough structure to keep working across
                different formats.
              </p>

              <p className="m-0 max-w-[400px] text-[16px] leading-[1.75] text-black/65">
                Sometimes that means an identity. Sometimes a campaign, title
                sequence, packaging system or one visual idea strong enough to
                hold everything together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WORK
      ========================================================= */}

      <section
        id="selected-work"
        className="bg-[#f7f7f4] py-[clamp(90px,12vw,180px)]"
      >
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]">
          <div
            data-section-intro
            className="grid gap-8 border-t border-black/15 pt-5 md:grid-cols-12"
          >
            <div
              data-intro-child
              className="md:col-span-4"
            >
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 bg-[#ccff00]" />

                <p className="m-0 text-[10px] font-medium uppercase tracking-[0.16em]">
                  Selected frames
                </p>
              </div>
            </div>

            <div className="md:col-span-7 md:col-start-6">
              <h2
                data-intro-child
                className="m-0 max-w-[720px] font-[400] text-[clamp(36px,4.5vw,54px)] leading-[0.93] tracking-[-0.055em] [font-family:Grimblade,serif]"
              >
                Client work.
                <br />
                Studio work.
                <br />
                <span className="text-black/35">
                  Same level of intent.
                </span>
              </h2>

              <p
                data-intro-child
                className="mt-7 max-w-[450px] text-[14px] leading-[1.7] text-black/55"
              >
                A changing collection of identities, campaigns, digital
                graphics, motion experiments and visual directions.
              </p>
            </div>
          </div>

          <div className="mt-[clamp(80px,12vw,170px)] grid grid-cols-1 gap-y-[90px] md:grid-cols-12 md:gap-x-[clamp(24px,4vw,64px)] md:gap-y-[clamp(110px,16vw,230px)]">
            {projects.map((project, index) => (
              <article
                data-project
                key={`${project.title}-${index}`}
                className={`group ${projectLayouts[index]}`}
              >
                <div
                  data-project-mask
                  className={`relative overflow-hidden bg-[#ddd] ${project.ratio}`}
                >
                  <img
                    data-project-image
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute -top-[7%] left-0 h-[114%] w-full object-cover will-change-transform"
                  />

                  <div className="absolute inset-0 bg-black/0 transition-colors duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:bg-black/[0.07]" />

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-[clamp(14px,1.8vw,22px)]">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="translate-y-2 text-[9px] uppercase tracking-[0.14em] text-white opacity-0 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                      View frame ↗
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 translate-y-3 opacity-0 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="inline-flex bg-[#ccff00] px-3 py-2 text-[9px] uppercase tracking-[0.13em] text-black">
                      {project.kind} project
                    </span>
                  </div>
                </div>

                <div
                  data-project-meta
                  className="mt-[18px]"
                >
                  <div className="flex items-center justify-between gap-5 border-t border-black/15 pt-3">
                    <p className="m-0 text-[9px] uppercase tracking-[0.14em] text-black/48">
                      {project.type}
                    </p>

                    <div className="flex gap-4 text-[9px] uppercase tracking-[0.14em] text-black/38">
                      <span>{project.kind}</span>
                      <span>{project.year}</span>
                    </div>
                  </div>

                  <h3 className="mb-0 mt-4 max-w-[520px] font-[400] text-[clamp(24px,2.5vw,35px)] leading-[0.98] tracking-[-0.04em] [font-family:Grimblade,serif]">
                    {project.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CAPABILITIES
      ========================================================= */}

      <section
        data-capabilities
        className="bg-white py-[clamp(90px,12vw,180px)]"
      >
        <div className="mx-auto grid w-full max-w-[1440px] gap-[70px] px-[clamp(20px,5vw,80px)] md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-[120px]">
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-black/45">
                What we make
              </p>

              <h2 className="mb-0 mt-5 max-w-[400px] font-[400] text-[clamp(34px,4vw,48px)] leading-[0.94] tracking-[-0.05em] [font-family:Grimblade,serif]">
                One idea.
                <br />
                Many forms.
              </h2>

              <p className="mt-7 max-w-[350px] text-[15px] leading-[1.75] text-black/55">
                We can build the full visual system or focus on the part that
                needs more clarity, craft or movement.
              </p>
            </div>
          </div>

          <div className="md:col-span-7 md:col-start-6">
            <div className="border-t border-black/15">
              {capabilities.map(([number, title, label]) => (
                <div
                  data-capability
                  key={title}
                  className="group relative grid min-h-[92px] grid-cols-[42px_1fr_auto] items-center gap-5 overflow-hidden border-b border-black/15"
                >
                  <div className="absolute inset-0 origin-left scale-x-0 bg-[#ccff00] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-x-100" />

                  <span className="relative z-10 text-[9px] text-black/45">
                    {number}
                  </span>

                  <strong className="relative z-10 font-[400] text-[clamp(18px,2vw,25px)] tracking-[-0.025em]">
                    {title}
                  </strong>

                  <div className="relative z-10 flex items-center gap-7">
                    <span className="hidden text-[9px] uppercase tracking-[0.13em] text-black/45 sm:block">
                      {label}
                    </span>

                    <Arrow />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MOTION
      ========================================================= */}

      <section className="bg-[#101010] py-[clamp(90px,11vw,160px)] text-white">
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]">
          <div
            data-section-intro
            className="grid gap-8 border-t border-white/20 pt-5 md:grid-cols-12"
          >
            <p
              data-intro-child
              className="m-0 text-[10px] uppercase tracking-[0.16em] text-white/45 md:col-span-4"
            >
              Motion studies
            </p>

            <div className="md:col-span-7 md:col-start-6">
              <h2
                data-intro-child
                className="m-0 font-[400] text-[clamp(36px,4.5vw,54px)] leading-[0.94] tracking-[-0.05em] [font-family:Grimblade,serif]"
              >
                Design should know
                <br />
                when to move.
              </h2>

              <p
                data-intro-child
                className="mt-7 max-w-[420px] text-[14px] leading-[1.75] text-white/50"
              >
                Motion is treated as part of the visual language — not
                decoration added at the end.
              </p>
            </div>
          </div>

          <div
            data-motion-grid
            className="mt-[clamp(70px,9vw,120px)] grid gap-[clamp(35px,5vw,70px)] md:grid-cols-12"
          >
            <article
              data-motion-card
              className="group md:col-span-7"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
                <video
                  className="h-full w-full object-cover opacity-90 transition duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025] group-hover:opacity-100"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="BrandWorks title sequence motion study"
                >
                  <source src={heroVideo} type="video/mp4" />
                </video>

                <span className="absolute left-4 top-4 text-[9px] uppercase tracking-[0.15em]">
                  01 / Motion
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-6">
                <div>
                  <p className="m-0 text-[9px] uppercase tracking-[0.14em] text-white/40">
                    Title sequence
                  </p>

                  <h3 className="mb-0 mt-2 font-[400] text-[26px] leading-none tracking-[-0.035em] [font-family:Grimblade,serif]">
                    Static thinking, set in motion.
                  </h3>
                </div>

                <span className="text-[10px] text-white/40">↗</span>
              </div>
            </article>

            <article
              data-motion-card
              className="group md:col-span-4 md:col-start-9 md:mt-[120px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
                <video
                  className="h-full w-full object-cover opacity-85 transition duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.025] group-hover:opacity-100"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="BrandWorks brand film motion study"
                >
                  <source src={motionVideo} type="video/mp4" />
                </video>

                <span className="absolute left-4 top-4 text-[9px] uppercase tracking-[0.15em]">
                  02 / Film
                </span>
              </div>

              <div className="mt-4">
                <p className="m-0 text-[9px] uppercase tracking-[0.14em] text-white/40">
                  Brand motion
                </p>

                <h3 className="mb-0 mt-2 font-[400] text-[26px] leading-none tracking-[-0.035em] [font-family:Grimblade,serif]">
                  A visual language with a pulse.
                </h3>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROCESS
      ========================================================= */}

      <section className="bg-[#f7f7f4] py-[clamp(90px,12vw,180px)]">
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]">
          <div
            data-section-intro
            className="grid gap-8 md:grid-cols-12"
          >
            <div
              data-intro-child
              className="md:col-span-4"
            >
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-black/45">
                How we work
              </p>
            </div>

            <h2
              data-intro-child
              className="m-0 md:col-span-7 md:col-start-6 font-[400] text-[clamp(36px,4.5vw,54px)] leading-[0.94] tracking-[-0.05em] [font-family:Grimblade,serif]"
            >
              From first thought
              <br />
              to final frame.
            </h2>
          </div>

          <div className="mt-[clamp(70px,9vw,120px)] border-t border-black/20">
            {process.map((step) => (
              <article
                key={step.number}
                data-process-row
                className="group grid gap-x-6 gap-y-5 border-b border-black/20 py-[clamp(30px,4vw,48px)] md:grid-cols-12 md:items-start"
              >
                <div className="md:col-span-1">
                  <span className="inline-flex h-8 w-8 items-center justify-center border border-black/20 text-[9px] transition-colors duration-400 group-hover:border-[#ccff00] group-hover:bg-[#ccff00]">
                    {step.number}
                  </span>
                </div>

                <h3 className="m-0 font-[400] text-[clamp(25px,2.6vw,34px)] leading-none tracking-[-0.04em] [font-family:Grimblade,serif] md:col-span-4">
                  {step.title}
                </h3>

                <p className="m-0 max-w-[540px] text-[15px] leading-[1.75] text-black/55 md:col-span-5 md:col-start-8">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}

      <section className="bg-[#ccff00]">
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]">
          <div className="grid min-h-[clamp(460px,52vw,700px)] items-center gap-12 py-[clamp(80px,10vw,140px)] md:grid-cols-12">
            <div className="md:col-span-3">
              <p className="m-0 text-[10px] uppercase tracking-[0.16em]">
                Start a project
              </p>
            </div>

            <div className="md:col-span-8 md:col-start-5">
              <h2 className="m-0 max-w-[850px] font-[400] text-[clamp(40px,5.5vw,68px)] leading-[0.92] tracking-[-0.055em] [font-family:Grimblade,serif]">
                What should your brand
                <br />
                look like next?
              </h2>

              <div className="mt-[clamp(42px,5vw,64px)] flex flex-wrap items-end justify-between gap-8 border-t border-black/25 pt-5">
                <p className="m-0 max-w-[390px] text-[15px] leading-[1.7] text-black/60">
                  Bring us the brief, the problem, the half-formed idea or just
                  the feeling that the current thing is not working.
                </p>

                <Link
                  to="/services"
                  className="group inline-flex items-center gap-5 border-b border-black pb-2 text-[12px] uppercase tracking-[0.12em] text-black no-underline"
                >
                  Start a conversation
                  <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}