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
import './AboutPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const ABOUT_DESCRIPTION =
  'Meet BrandWorks: the journey, thinking and people behind an interdisciplinary creative and marketing studio.'

/*
 * Motion vocabulary. Markup opts in with data attributes and the single
 * effect below turns each `[data-reveal-group]` into one short, once-only
 * timeline — its `[data-reveal]` children play in DOM order:
 *   line   rises through its `.about-mask` parent (masked text reveal)
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
    <figure data-reveal="media" className={`about-media ${className ?? ''}`}>
      {img}
    </figure>
  )
}

/** One masked line (or phrase) of display type. */
function MaskLine({ children, className }: { children: string; className?: string }) {
  return (
    <span className="about-mask">
      <span data-reveal="line" className={`about-mask__line ${className ?? ''}`}>
        {children}
      </span>
    </span>
  )
}

// ------------------------------------------------------------------ sections

/*
 * Hero, Our Journey and Where We Are Now share one composition: a 12-column
 * row with copy on six columns and one 4:5 photograph on five, the side
 * alternating. Same frame, same gap, same type in every one of them.
 */
function Feature({
  id,
  heading,
  as: Heading = 'h2',
  image,
  mediaSide,
  eager = false,
  className,
  children,
}: {
  id: string
  heading: string
  as?: 'h1' | 'h2'
  image: AboutImage
  mediaSide: 'start' | 'end'
  eager?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`section-container about-feature about-feature--media-${mediaSide} ${className ?? ''}`}>
      <div className="section-grid about-feature__grid" data-reveal-group>
        <div className="about-feature__copy">
          <Heading id={id} className="section-heading about-feature__heading">
            <MaskLine>{heading}</MaskLine>
          </Heading>
          <div data-reveal="fade" className="about-feature__text">
            {children}
          </div>
        </div>
        <Media
          image={image}
          className="about-feature__media"
          sizes="(min-width: 1440px) 520px, (min-width: 768px) 40vw, 100vw"
          eager={eager}
        />
      </div>
    </div>
  )
}

function AboutHero() {
  return (
    <section className="about-hero" aria-labelledby="about-hero-heading">
      <Feature id="about-hero-heading" as="h1" heading={ABOUT_HERO.heading} image={ABOUT_HERO.image} mediaSide="end" eager>
        <p className="about-feature__lead">{ABOUT_HERO.description}</p>
        {ABOUT_HERO.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Feature>
    </section>
  )
}

function AboutIntro() {
  return (
    <section className="about-intro about-surface" aria-labelledby="about-intro-heading">
      <div className="section-container">
        <div className="about-intro__head" data-reveal-group>
          <h2 id="about-intro-heading" className="section-heading about-statement">
            <MaskLine className="about-statement__lead">{ABOUT_INTRO.statement.lead}</MaskLine>{' '}
            <MaskLine>{ABOUT_INTRO.statement.idea}</MaskLine>
          </h2>
        </div>

        <div className="section-grid about-intro__columns" data-reveal-group>
          <div data-reveal="fade" className="about-intro__studio">
            <p>{ABOUT_INTRO.studio}</p>
            <ul className="about-disciplines" aria-label="Disciplines">
              {ABOUT_INTRO.disciplines.map((discipline) => (
                <li key={discipline}>{discipline}</li>
              ))}
            </ul>
          </div>

          <div data-reveal="fade" className="about-intro__approach">
            <p className="about-intro__lead">{ABOUT_INTRO.approach[0]}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutJourney() {
  return (
    <section className="about-journey about-surface" aria-labelledby="about-journey-heading">
      <Feature
        id="about-journey-heading"
        heading={ABOUT_JOURNEY.heading}
        image={ABOUT_JOURNEY.images.beginning}
        mediaSide="start"
      >
        <p className="about-feature__lead">{ABOUT_JOURNEY.description}</p>
        <p>{ABOUT_JOURNEY.stages[0].text}</p>
      </Feature>
    </section>
  )
}

function AboutStatement() {
  return (
    <section className="about-brand about-surface" aria-labelledby="about-brand-heading">
      <Feature id="about-brand-heading" heading={ABOUT_STATEMENT.heading} image={ABOUT_STATEMENT.image} mediaSide="end">
        <p className="about-feature__lead">{ABOUT_STATEMENT.text}</p>
      </Feature>
    </section>
  )
}

function AboutPrinciples() {
  return (
    <section className="about-principles about-green" aria-labelledby="about-principles-heading">
      <div className="section-container">
        <header className="about-principles__head" data-reveal-group>
          <h2 id="about-principles-heading" className="section-heading about-principles__heading">
            <MaskLine>{ABOUT_PRINCIPLES.heading}</MaskLine>
          </h2>
        </header>

        <ol className="about-principles__list" data-reveal-group>
          {ABOUT_PRINCIPLES.items.map((item) => (
            <li key={item.title} data-reveal="fade" className="about-principle">
              <h3 className="about-principle__title">{item.title}</h3>
              <p className="about-principle__text">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Member({ member, order }: { member: TeamMember; order: number }) {
  return (
    <li className="about-member" style={{ order } as CSSProperties}>
      <div data-reveal="rise" className="about-member__inner">
        <div className="about-member__media" style={{ '--ratio': member.ratio } as CSSProperties}>
          <img
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
        <div className="about-member__meta">
          <h3 className="about-member__name">{member.name}</h3>
          <p className="about-member__role">{member.role}</p>
          {/* <p className="about-member__speciality">{member.speciality}</p> */}
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
    <section className="about-team about-green" aria-labelledby="about-team-heading">
      <div className="section-container">
        <div className="section-grid about-team__grid">
          <header className="about-team__intro" data-reveal-group>
            <h2 id="about-team-heading" className="section-heading about-team__heading">
              <MaskLine>{ABOUT_TEAM.heading}</MaskLine>
            </h2>
            <p data-reveal="fade" className="about-team__description">
              {ABOUT_TEAM.description}
            </p>
          </header>

          <div className="about-team__members" data-reveal-group>
            {columns.map((column, c) => (
              <ul key={c} className={`about-team__column about-team__column--${c === 0 ? 'a' : 'b'}`}>
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
    <section className="about-closing about-surface" aria-labelledby="about-closing-heading" data-reveal-group>
      <div className="section-container about-closing__inner">
        <h2 id="about-closing-heading" className="section-heading about-closing__heading">
          <MaskLine className="about-closing__muted">{first}</MaskLine> <MaskLine>{second}</MaskLine>
        </h2>
        <a data-reveal="fade" href={ABOUT_CLOSING.cta.href} className="about-link">
          <span>{ABOUT_CLOSING.cta.label}</span>
          <span className="about-link__arrow" aria-hidden="true">
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


      // Not motion, so it runs with reduced motion too: the header logo turns
      // to ink while it sits over a green section (see AboutPage.css).
      const sync = () =>
        document.body.classList.toggle('about-logo-on-green', onGreen.some((trigger) => trigger.isActive))
      const onGreen: ScrollTrigger[] = gsap.utils.toArray<HTMLElement>('.about-green', root).map((section) =>
        ScrollTrigger.create({ trigger: section, start: 'top 48px', end: 'bottom 48px', onToggle: sync }),
      )
      sync()

      return () => {
        mm.revert()
        onGreen.forEach((trigger) => trigger.kill())
        document.body.classList.remove('about-logo-on-green')
      }
    },
    { scope: rootRef },
  )

  return (
    <main ref={rootRef} className="about-page">
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
