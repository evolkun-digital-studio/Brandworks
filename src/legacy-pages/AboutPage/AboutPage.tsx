import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useNativeMetadata } from '../../routing/context'
import { removeLinkTag, removeMetaTag, setDocumentTitle, setLinkTag, setMetaTag } from '../../blog/lib/documentHead'
import {
  ABOUT_CLOSING,
  ABOUT_HERO,
  ABOUT_INTRO,
  ABOUT_JOURNEY,
  ABOUT_PRINCIPLES,
  ABOUT_STATEMENT,
  ABOUT_TEAM,
} from '../../data/aboutPage'
import type { AboutImage, TeamMember } from '../../data/aboutPage'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const ABOUT_DESCRIPTION =
  'Meet BrandWorks: the journey, thinking and people behind an interdisciplinary creative and marketing studio.'

/*
 * Motion vocabulary. Markup opts in with data attributes and the single
 * effect below turns each `[data-reveal-group]` into one short, once-only
 * timeline — its `[data-reveal]` children play in DOM order:
 *   line   rises through its clipping parent (masked text reveal)
 *   fade   fades up a few pixels
 *   rise   a team portrait's entrance, a little further
 *   media  a frame uncovered from the bottom edge, its photograph settling
 * With reduced motion none of it runs and everything is simply in place.
 */
type Reveal = 'line' | 'fade' | 'rise' | 'media'

function Media({
  image,
  sizes,
  className,
  eager = false,
}: {
  image: AboutImage
  sizes: string
  className?: string
  eager?: boolean
}) {
  const img = (
    <img
      className="block size-full object-cover [@media(hover:hover)_and_(pointer:fine)]:transition-transform [@media(hover:hover)_and_(pointer:fine)]:duration-900 [@media(hover:hover)_and_(pointer:fine)]:ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover/visual:scale-[1.025]"
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding={eager ? undefined : 'async'}
      style={image.position ? { objectPosition: image.position } : undefined}
    />
  )

  return (
    <figure data-reveal="media" className={`relative m-0 min-w-0 max-w-full overflow-hidden bg-[rgba(17,17,17,0.06)] ${className ?? ''}`}>
      {img}
    </figure>
  )
}

/** One masked line (or phrase) of display type. */
function MaskLine({ children, className }: { children: string; className?: string }) {
  return (
    <span className="block overflow-hidden pt-[0.04em] px-[0.08em] pb-[0.1em] -mt-[0.04em] -mx-[0.08em] -mb-[0.1em]">
      <span data-reveal="line" className={`block ${className ?? ''}`}>
        {children}
      </span>
    </span>
  )
}

// ------------------------------------------------------------------ sections

/*
 * Hero, Our Journey and Where We Are Now share one composition: a 12-column
 * row with copy on six columns and one 4:5 photograph on four, the side
 * alternating. Same frame and type in each; the optional caption and footer
 * give each row its own small variation without a new layout.
 */
function Feature({
  id,
  heading,
  as: Heading = 'h2',
  image,
  caption,
  mediaSide,
  eager = false,
  footer,
  children,
}: {
  id: string
  heading: string
  as?: 'h1' | 'h2'
  image: AboutImage
  caption?: string
  mediaSide: 'start' | 'end'
  eager?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full max-w-(--page-max-width) mx-auto px-(--page-gutter)">
      <div className="flex flex-col gap-x-(--grid-gap) gap-y-8 md:grid md:grid-cols-8 lg:grid-cols-12 [&>*]:min-w-0 [&>*]:max-w-full max-md:[&>*]:self-stretch items-center md:gap-y-(--content-gap)" data-reveal-group>
        <div className={`grid content-start gap-(--text-gap) ${mediaSide === 'end' ? 'md:col-start-1 md:col-end-5 lg:col-end-7' : 'md:col-start-5 md:col-end-9 md:row-start-1 lg:col-start-7 lg:col-end-13 border-t border-(--about-rule) pt-(--text-gap)'}`}>
          <Heading id={id} className="m-0 font-[family-name:var(--section-title-font)] text-(length:--section-title-size) font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance text-(--ink)">
            <MaskLine>{heading}</MaskLine>
          </Heading>
          <div data-reveal="fade" className="grid gap-4">
            {children}
          </div>
          {footer && (
            <div data-reveal="fade" className="mt-2">
              {footer}
            </div>
          )}
        </div>
        <div className={`group/visual grid gap-3 max-md:order-1 max-md:w-full ${mediaSide === 'start' ? 'md:col-start-1 md:col-end-5 md:row-start-1 md:w-[min(100%,calc(64svh*0.8))]' : eager ? 'md:col-start-5 md:col-end-9 lg:col-start-8 lg:col-end-13 md:w-[min(100%,calc(66svh*0.8))] justify-self-end' : 'md:col-start-5 md:col-end-9 lg:col-start-9 lg:col-end-13 md:w-[min(100%,calc(64svh*0.8))] justify-self-end'}`}>
          <Media
            image={image}
            className="aspect-[4/5]"
            sizes="(min-width: 1440px) 420px, (min-width: 768px) 34vw, 100vw"
            eager={eager}
          />
          {caption && (
            <p data-reveal="fade" className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] max-w-none! font-secondary text-[11px]! font-medium! leading-[1.2]! tracking-[0.14em] uppercase text-(--about-copy) flex justify-between">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function AboutHero() {
  return (
    <section className="about-green box-border h-svh pt-[max(104px,calc(88px+env(safe-area-inset-top)))] pb-[max(16px,3svh,env(safe-area-inset-bottom))] bg-[#dcff52] text-(--ink)" aria-labelledby="about-hero-heading">
      <div className="mx-auto grid h-full w-full max-w-(--page-max-width) grid-rows-[auto_minmax(0,1fr)] gap-[clamp(16px,3svh,32px)] px-(--page-gutter) md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:items-center md:gap-x-(--grid-gap) min-[480px]:landscape:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[480px]:landscape:grid-rows-[minmax(0,1fr)] min-[480px]:landscape:items-center min-[480px]:landscape:gap-x-(--grid-gap)" data-reveal-group>
        <div className="grid min-w-0 content-center gap-[clamp(12px,2svh,24px)]">
          <h1 id="about-hero-heading" className="m-0 font-[family-name:var(--section-title-font)] text-[clamp(28px,5svh,var(--section-title-size))] font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance">
            <MaskLine>{ABOUT_HERO.heading}</MaskLine>
          </h1>
          <div data-reveal="fade" className="grid gap-[clamp(8px,1.6svh,16px)] font-secondary text-[clamp(14px,2.2svh,18px)] font-normal leading-[1.5] text-pretty [&_p]:m-0 [&_p]:max-w-[58ch]">
            <p>{ABOUT_HERO.description}</p>
            {ABOUT_HERO.body.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
        <div className="group/visual h-full min-h-0 min-w-0 md:aspect-[4/5] md:h-auto md:w-[min(100%,calc((100svh_-_104px_-_max(16px,3svh,env(safe-area-inset-bottom)))*0.8))] md:justify-self-end min-[480px]:landscape:aspect-[4/5] min-[480px]:landscape:h-auto min-[480px]:landscape:w-[min(100%,calc((100svh_-_104px_-_max(16px,3svh,env(safe-area-inset-bottom)))*0.8))] min-[480px]:landscape:justify-self-end">
          <Media
            image={ABOUT_HERO.image}
            className="h-full w-full"
            sizes="(min-width: 768px) 40vw, (orientation: landscape) 44vw, 100vw"
            eager
          />
        </div>
      </div>
    </section>
  )
}

function AboutIntro() {
  return (
    <section className="py-(--about-space) bg-white" aria-labelledby="about-intro-heading">
      <div className="w-full max-w-(--page-max-width) mx-auto px-(--page-gutter)">
        <div data-reveal-group>
          <h2 id="about-intro-heading" className="m-0 font-[family-name:var(--section-title-font)] text-(length:--section-title-size) font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance text-(--ink) max-w-[22em]">
            <MaskLine>{ABOUT_INTRO.statement.lead}</MaskLine>
          </h2>
        </div>

        <div className="flex flex-col gap-x-(--grid-gap) gap-y-8 md:grid md:grid-cols-8 lg:grid-cols-12 [&>*]:min-w-0 [&>*]:max-w-full max-md:[&>*]:self-stretch mt-(--content-gap) md:gap-y-(--content-gap)" data-reveal-group>
          <div data-reveal="fade" className="grid content-start gap-(--text-gap) md:col-span-4 lg:col-start-1 lg:col-end-7">
            <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px]">{ABOUT_INTRO.studio}</p>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-(--grid-gap) p-0 max-[380px]:grid-cols-1 [&_li]:border-t [&_li]:border-(--about-rule) [&_li]:py-2.5 [&_li]:font-secondary [&_li]:text-[15px] [&_li]:leading-[1.35] [&_li]:text-(--ink)" aria-label="Disciplines">
              {ABOUT_INTRO.disciplines.map((discipline) => (
                <li key={discipline}>{discipline}</li>
              ))}
            </ul>
          </div>

          <div data-reveal="fade" className="grid content-start gap-4 md:col-span-4 lg:col-start-8 lg:col-end-13">
            <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] text-(--ink)!">{ABOUT_INTRO.approach[0]}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutJourney() {
  const [beginning] = ABOUT_JOURNEY.stages

  return (
    <section className="pb-(--about-space) bg-white" aria-labelledby="about-journey-heading">
      <Feature
        id="about-journey-heading"
        heading={ABOUT_JOURNEY.heading}
        image={ABOUT_JOURNEY.images.beginning}
        mediaSide="start"
        footer={
          // The path the story takes, by its stage names: an index, not
          // more copy.
          <ol className="m-0 grid max-w-[32ch] list-none justify-items-start p-0 [&_li]:w-full [&_li]:border-t [&_li]:border-(--about-rule) [&_li]:py-2.5 [&_li]:text-left [&_li]:font-secondary [&_li]:text-[15px] [&_li]:leading-[1.35] [&_li]:text-[rgba(17,17,17,0.64)]" aria-label="Stages of the journey">
            {ABOUT_JOURNEY.stages.map((stage) => (
              <li key={stage.title}>{stage.title}</li>
            ))}
          </ol>
        }
      >
        <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] text-(--ink)!">{ABOUT_JOURNEY.description}</p>
        <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px]">{beginning.text}</p>
      </Feature>
    </section>
  )
}

function AboutStatement() {
  return (
    <section className="pb-(--about-space) bg-white" aria-labelledby="about-brand-heading">
      <Feature
        id="about-brand-heading"
        heading={ABOUT_STATEMENT.heading}
        image={ABOUT_STATEMENT.image}
        mediaSide="end"
      >
        <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] text-(--ink)!">{ABOUT_STATEMENT.text}</p>
      </Feature>
    </section>
  )
}

function AboutPrinciples() {
  return (
    <section className="py-(--about-space) about-green bg-[#dcff52] text-(--ink) [--about-rule:rgba(17,17,17,0.16)] [--about-rule-strong:rgba(17,17,17,0.32)] [--about-copy:var(--ink)]" aria-labelledby="about-principles-heading">
      <div className="w-full max-w-(--page-max-width) mx-auto px-(--page-gutter)">
        <div className="flex flex-col gap-x-(--grid-gap) gap-y-8 md:grid md:grid-cols-8 lg:grid-cols-12 [&>*]:min-w-0 [&>*]:max-w-full max-md:[&>*]:self-stretch md:gap-y-(--content-gap)">
          <header className="grid content-start gap-(--text-gap) col-span-full lg:col-start-1 lg:col-end-5" data-reveal-group>
            <h2 id="about-principles-heading" className="m-0 font-[family-name:var(--section-title-font)] text-(length:--section-title-size) font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance text-(--ink)">
              <MaskLine>{ABOUT_PRINCIPLES.heading}</MaskLine>
            </h2>
          </header>

          <ol className="col-span-full m-0 grid list-none grid-cols-1 gap-x-(--grid-gap) gap-y-7 p-0 md:grid-cols-2 md:gap-y-10 lg:col-start-6 lg:col-end-13" data-reveal-group>
            {ABOUT_PRINCIPLES.items.map((item) => (
              <li key={item.title} data-reveal="fade" className="grid content-start gap-2 border-t border-(--about-rule-strong) pt-5">
                <h3 className="m-0 text-[clamp(20px,1.6vw,24px)] font-medium leading-[1.15] tracking-[-0.015em] text-(--ink)">{item.title}</h3>
                <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px]">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Member({ member, order }: { member: TeamMember; order: number }) {
  return (
    <li className="group/member" style={{ order } as CSSProperties}>
      <div data-reveal="rise">
        <div className="aspect-[var(--ratio,4/5)] overflow-hidden bg-[rgba(17,17,17,0.08)]" style={{ '--ratio': member.ratio } as CSSProperties}>
          <img
            className="block size-full object-cover transition-transform duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover/member:scale-[1.025] motion-reduce:transition-none"
            src={member.image.src}
            srcSet={member.image.srcSet}
            sizes="(min-width: 1024px) 26vw, (min-width: 480px) 46vw, 100vw"
            width={member.image.width}
            height={member.image.height}
            alt={member.image.alt}
            loading="lazy"
            decoding="async"
            style={member.image.position ? { objectPosition: member.image.position } : undefined}
          />
        </div>
        <div className="mt-4 grid gap-1">
          <h3 className="m-0 text-[clamp(20px,1.6vw,24px)] font-medium leading-[1.15] tracking-[-0.015em] text-(--ink)">{member.name}</h3>
          <p className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] text-[15px]! leading-[1.4]! text-[rgba(17,17,17,0.64)]!">{member.role}</p>
        </div>
      </div>
    </li>
  )
}

function AboutTeam() {
  const members = ABOUT_TEAM.members.map((member, i) => ({ member, order: i }))
  // Two staggered columns on wider screens; on a phone the columns dissolve
  // (display: contents) and `order` puts everyone back in sequence.
  const columns = [members.filter((_, i) => i % 2 === 0), members.filter((_, i) => i % 2 === 1)]

  return (
    <section className="pb-(--about-space) about-green bg-[#dcff52] text-(--ink) [--about-rule:rgba(17,17,17,0.16)] [--about-rule-strong:rgba(17,17,17,0.32)] [--about-copy:var(--ink)]" aria-labelledby="about-team-heading">
      <div className="w-full max-w-(--page-max-width) mx-auto px-(--page-gutter)">
        <div className="flex flex-col gap-x-(--grid-gap) gap-y-8 md:grid md:grid-cols-8 lg:grid-cols-12 [&>*]:min-w-0 [&>*]:max-w-full max-md:[&>*]:self-stretch md:gap-y-(--media-gap)">
          <header className="col-span-full grid self-start gap-(--text-gap) max-lg:max-w-[560px] lg:sticky lg:top-[clamp(112px,14vh,160px)] lg:col-start-1 lg:col-end-5" data-reveal-group>
            <h2 id="about-team-heading" className="m-0 font-[family-name:var(--section-title-font)] text-(length:--section-title-size) font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance text-(--ink)">
              <MaskLine>{ABOUT_TEAM.heading}</MaskLine>
            </h2>
            <p data-reveal="fade" className="m-0 max-w-[58ch] font-secondary text-base font-normal leading-[1.6] text-pretty text-(--about-copy) md:text-[18px] max-w-[28ch]!">
              {ABOUT_TEAM.description}
            </p>
          </header>

          <div className="col-span-full flex flex-col items-start gap-[clamp(40px,12vw,64px)] min-[480px]:max-md:grid min-[480px]:max-md:grid-cols-2 min-[480px]:max-md:gap-x-4 min-[480px]:max-md:gap-y-10 md:grid md:grid-cols-2 md:gap-x-(--grid-gap) max-lg:mt-(--content-gap) lg:col-start-6 lg:col-end-13" data-reveal-group>
            {columns.map((column, c) => (
              <ul key={c} className={`m-0 list-none p-0 max-md:contents md:flex md:flex-col md:gap-[clamp(48px,6vw,96px)] ${c === 1 ? 'md:pt-[clamp(64px,12vw,200px)]' : ''}`}>
                {column.map(({ member, order }) => (
                  <Member key={member.name} member={member} order={order} />
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutClosing() {
  const [first, second] = ABOUT_CLOSING.lines

  return (
    <section className="py-(--about-space) bg-white" aria-labelledby="about-closing-heading" data-reveal-group>
      <div className="w-full max-w-(--page-max-width) mx-auto px-(--page-gutter) grid justify-items-center gap-(--content-gap) text-center">
        <h2 id="about-closing-heading" className="m-0 font-[family-name:var(--section-title-font)] text-(length:--section-title-size) font-(--section-title-weight) leading-[1.05] tracking-(--section-title-tracking) text-balance text-(--ink) text-center">
          <MaskLine className="text-[rgba(17,17,17,0.64)]">{first}</MaskLine> <MaskLine>{second}</MaskLine>
        </h2>
        <a data-reveal="fade" href={ABOUT_CLOSING.cta.href} className="group/link inline-flex items-center gap-3 border-b border-current pb-2 font-secondary text-[13px] font-semibold leading-none tracking-[0.12em] text-(--ink) uppercase focus-visible:outline-2 focus-visible:outline-(--ink) focus-visible:outline-offset-6">
          <span>{ABOUT_CLOSING.cta.label}</span>
          <span className="text-[1.2em] tracking-normal transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:translate-x-1 group-focus-visible/link:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------- page

function AboutPage() {
  const nativeMetadata = useNativeMetadata()
  const rootRef = useRef<HTMLElement>(null)

  // Routes don't reset scroll on their own: arriving from a link low on the
  // homepage would otherwise open this page mid-way down.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Same set-then-clean-up head pattern as BlogPage.tsx.
  useEffect(() => {
    if (nativeMetadata) return
    const previousTitle = document.title
    setDocumentTitle('About | BRANDWORKS')
    setMetaTag('name', 'description', ABOUT_DESCRIPTION)
    setLinkTag('canonical', `${window.location.origin}/about`)

    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
    }
  }, [nativeMetadata])

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal-group]', root).forEach((group) => {
          const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', group)
          if (!items.length) return

          const timeline = gsap.timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          })

          items.forEach((el, i) => {
            const at = i * 0.09
            switch (el.dataset.reveal as Reveal) {
              case 'line':
                timeline.from(el, { yPercent: 110, duration: 1, ease: 'power4.out' }, at)
                break
              case 'rise':
                timeline.from(el, { autoAlpha: 0, y: 40, duration: 1 }, i * 0.12)
                break
              case 'media': {
                timeline.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' }, at)
                const img = el.querySelector('img')
                if (img) timeline.from(img, { scale: 1.08, duration: 1.6 }, at)
                break
              }
              default:
                timeline.from(el, { autoAlpha: 0, y: 18, duration: 0.8 }, at)
            }
          })
        })
      })


      // Not motion, so it runs with reduced motion too. The header capsules
      // follow the section under them, by class (via the header’s Tailwind
      // variants). Declared first: a trigger already active fires onToggle
      // while it is still being created.
      let onGreen: ScrollTrigger[] = []
      const sync = () =>
        document.body.classList.toggle('about-logo-on-light', !onGreen.some((trigger) => trigger.isActive))
      onGreen = gsap.utils.toArray<HTMLElement>('.about-green', root).map((section) =>
        ScrollTrigger.create({ trigger: section, start: 'top 48px', end: 'bottom 48px', onToggle: sync }),
      )
      sync()

      // The header logo is the one-colour version on this page's green and
      // off-white sections, and the brand colours over the dark footer.
      const footer = document.getElementById('footer')
      const overFooter = footer && ScrollTrigger.create({
        trigger: footer,
        start: 'top 48px',
        end: 'bottom 48px',
        toggleClass: { targets: document.body, className: 'about-logo-on-dark' },
      })

      return () => {
        mm.revert()
        onGreen.forEach((trigger) => trigger.kill())
        overFooter?.kill()
        document.body.classList.remove('about-logo-on-light', 'about-logo-on-dark')
      }
    },
    { scope: rootRef },
  )

  return (
    <main ref={rootRef} className="about-page overflow-x-clip bg-[#f5f5f0] text-(--ink) not-italic [&_*]:not-italic [--about-space:56px] md:[--about-space:clamp(64px,8vw,128px)] [--about-rule:rgba(17,17,17,0.12)] [--about-rule-strong:rgba(17,17,17,0.22)] [--about-copy:rgba(17,17,17,0.64)]">
      <AboutHero />
      <AboutIntro />
      <AboutJourney />
      <AboutStatement />
      <AboutPrinciples />
      <AboutTeam />
      <AboutClosing />
    </main>
  )
}

export default AboutPage
