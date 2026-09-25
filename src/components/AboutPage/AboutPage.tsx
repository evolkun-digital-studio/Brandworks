import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
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
import type { AboutImage, JourneyStage, TeamMember } from '../../data/aboutPage'
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
 * `[data-parallax]` is the oversized layer inside a frame that drifts with
 * scroll. With reduced motion none of it runs and everything is simply
 * in place.
 */
type Reveal = 'line' | 'fade' | 'rise' | 'media'

function Media({
  image,
  sizes,
  className,
  eager = false,
  parallax = false,
}: {
  image: AboutImage
  sizes: string
  className?: string
  eager?: boolean
  parallax?: boolean
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
      {parallax ? (
        <div data-parallax className="about-media__parallax">
          {img}
        </div>
      ) : (
        img
      )}
    </figure>
  )
}

/** Small uppercase section index: "02 — Who We Are". */
function Label({ number, children, className }: { number: string; children: string; className?: string }) {
  return (
    <p data-reveal="fade" className={`section-label about-label ${className ?? ''}`}>
      <span className="about-label__number">{number}</span>
      <span aria-hidden="true"> — </span>
      {children}
    </p>
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

function AboutHero() {
  const [first, ...rest] = ABOUT_HERO.heading.split(' ')

  return (
    <section className="about-hero" aria-labelledby="about-hero-heading" data-reveal-group>
      <div className="section-container">
        <div className="about-hero__meta" data-reveal="fade">
          <span className="section-label about-label">{ABOUT_HERO.index}</span>
          <span className="section-label about-label about-hero__location">{ABOUT_HERO.location}</span>
        </div>

        <h1 id="about-hero-heading" className="about-hero__heading">
          <MaskLine>{first}</MaskLine> <MaskLine>{rest.join(' ')}</MaskLine>
        </h1>

        <p data-reveal="fade" className="about-hero__description">
          {ABOUT_HERO.description}
        </p>

        <Media
          image={ABOUT_HERO.image}
          className="about-hero__media"
          sizes="(min-width: 1440px) 380px, (min-width: 768px) 27vw, 62vw"
          eager
          parallax
        />
      </div>
    </section>
  )
}

function AboutIntro() {
  return (
    <section className="about-intro about-surface" aria-labelledby="about-intro-heading">
      <div className="section-container">
        <div className="about-intro__head" data-reveal-group>
          <Label number="02">{ABOUT_INTRO.label}</Label>
          <h2 id="about-intro-heading" className="about-statement">
            <MaskLine className="about-statement__lead">{ABOUT_INTRO.statement.lead}</MaskLine>{' '}
            <MaskLine>{ABOUT_INTRO.statement.idea}</MaskLine>
          </h2>
        </div>

        <div className="section-grid about-intro__columns" data-reveal-group>
          <div data-reveal="fade" className="about-intro__studio">
            <p className="about-copy">{ABOUT_INTRO.studio}</p>
            <ul className="about-disciplines" aria-label="Disciplines">
              {ABOUT_INTRO.disciplines.map((discipline, i) => (
                <li key={discipline}>
                  <span className="about-disciplines__number" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {discipline}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal="fade" className="about-intro__approach">
            <p className="section-label about-label">{ABOUT_INTRO.approachLabel}</p>
            <p className="about-lede">{ABOUT_INTRO.approach[0]}</p>
            <p className="about-copy about-copy--muted">{ABOUT_INTRO.approach[1]}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stage({ stage, className }: { stage: JourneyStage; className: string }) {
  return (
    <article data-reveal="fade" className={`about-stage ${className}`} aria-labelledby={`about-stage-${stage.number}`}>
      <h3 id={`about-stage-${stage.number}`} className="section-label about-stage__title">
        <span className="about-stage__number">{stage.number}</span>
        <span aria-hidden="true"> — </span>
        {stage.title}
      </h3>
      <p className="about-stage__text">{stage.text}</p>
    </article>
  )
}

function AboutJourney() {
  const [beginning, studio, strategy, now] = ABOUT_JOURNEY.stages
  const { images } = ABOUT_JOURNEY

  return (
    <section className="about-journey about-surface" aria-labelledby="about-journey-heading">
      <div className="section-container">
        <header className="section-grid about-journey__head" data-reveal-group>
          <Label number="03" className="about-journey__label">
            {ABOUT_JOURNEY.label}
          </Label>
          <div className="about-journey__intro">
            <h2 id="about-journey-heading" className="about-heading">
              <MaskLine>{ABOUT_JOURNEY.heading}</MaskLine>
            </h2>
            <p data-reveal="fade" className="section-description about-journey__description">
              {ABOUT_JOURNEY.description}
            </p>
          </div>
        </header>

        <div className="about-journey__story">
          <div className="section-grid about-journey__row about-journey__row--one" data-reveal-group>
            <Stage stage={beginning} className="about-stage--left about-stage--end" />
            <Media
              image={images.beginning}
              className="about-journey__image about-journey__image--tall"
              sizes="(min-width: 1024px) 38vw, (min-width: 768px) 46vw, 100vw"
              parallax
            />
          </div>

          <div className="section-grid about-journey__row about-journey__row--two" data-reveal-group>
            <Media
              image={images.studio}
              className="about-journey__image about-journey__image--small"
              sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 100vw"
            />
            <Stage stage={studio} className="about-stage--right about-stage--center" />
          </div>

          <div className="section-grid about-journey__row about-journey__row--three" data-reveal-group>
            <Stage stage={strategy} className="about-stage--left" />
          </div>

          <div className="section-grid about-journey__row about-journey__row--wide" data-reveal-group>
            <Media
              image={images.road}
              className="about-journey__image about-journey__image--wide"
              sizes="(min-width: 1440px) 1100px, (min-width: 1024px) 80vw, 100vw"
              parallax
            />
          </div>

          <div className="section-grid about-journey__row about-journey__row--four" data-reveal-group>
            <Stage stage={now} className="about-stage--right" />
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutStatement() {
  return (
    <section className="about-brand about-surface" aria-labelledby="about-brand-heading">
      <div className="section-container">
        <div className="section-grid about-brand__grid" data-reveal-group>
          <Media
            image={ABOUT_STATEMENT.image}
            className="about-brand__image"
            sizes="(min-width: 1024px) 44vw, (min-width: 768px) 50vw, 100vw"
            parallax
          />
          <div className="about-brand__copy">
            <Label number="04">{ABOUT_STATEMENT.label}</Label>
            <h2 id="about-brand-heading" className="about-heading about-brand__heading">
              <MaskLine>{ABOUT_STATEMENT.heading}</MaskLine>
            </h2>
            <p data-reveal="fade" className="section-description about-brand__text">
              {ABOUT_STATEMENT.text}
            </p>
            <p data-reveal="fade" className="section-label about-label about-brand__signature">
              {ABOUT_STATEMENT.signature}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutPrinciples() {
  return (
    <section className="about-principles about-green" aria-labelledby="about-principles-heading">
      <div className="section-container">
        <header className="about-principles__head" data-reveal-group>
          <Label number="05">{ABOUT_PRINCIPLES.label}</Label>
          <h2 id="about-principles-heading" className="about-statement about-principles__heading">
            <MaskLine>{ABOUT_PRINCIPLES.heading}</MaskLine>
          </h2>
        </header>

        <ol className="about-principles__list" data-reveal-group>
          {ABOUT_PRINCIPLES.items.map((item) => (
            <li key={item.number} data-reveal="fade" className="about-principle">
              <span className="about-principle__number" aria-hidden="true">
                {item.number}
              </span>
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
          <p className="about-member__speciality">{member.speciality}</p>
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
            <Label number="06">{ABOUT_TEAM.label}</Label>
            <h2 id="about-team-heading" className="about-statement about-team__heading">
              <MaskLine>{ABOUT_TEAM.heading}</MaskLine>
            </h2>
            <p data-reveal="fade" className="about-copy about-team__description">
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
        <h2 id="about-closing-heading" className="about-heading about-closing__heading">
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
  const rootRef = useRef<HTMLElement>(null)

  // Routes don't reset scroll on their own: arriving from a link low on the
  // homepage would otherwise open this page mid-way down.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Same set-then-clean-up head pattern as BlogPage.tsx.
  useEffect(() => {
    const previousTitle = document.title
    setDocumentTitle('About | BRANDWORKS')
    setMetaTag('name', 'description', ABOUT_DESCRIPTION)
    setLinkTag('canonical', `${window.location.origin}/about`)

    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
    }
  }, [])

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

      // Parallax is a desktop/tablet nicety; on a phone the frames are
      // near full-width and the drift reads as jitter rather than depth.
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-parallax]', root).forEach((layer) => {
          gsap.fromTo(
            layer,
            { yPercent: -4 },
            {
              yPercent: 4,
              ease: 'none',
              scrollTrigger: { trigger: layer.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
      })

      return () => mm.revert()
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
