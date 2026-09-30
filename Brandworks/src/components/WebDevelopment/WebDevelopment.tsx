import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'
import { SectionContainer, SectionDescription, SectionHeading, SectionLabel } from '../../SectionPrimitives'
import { WEB_PROJECTS, WEB_SECTION } from '../../data/webDevelopment'
import WebProject from './WebProject'
import './WebDevelopment.css'

gsap.registerPlugin(ScrollTrigger)

const TOTAL = WEB_PROJECTS.length
const pad = (n: number) => String(n).padStart(2, '0')

/** Enough room for the pinned stage to read as a stage; smaller screens stack. */
const CINEMATIC = '(min-width: 768px) and (min-height: 560px)'
const STACKED = '(max-width: 767px), (max-height: 559px)'

const RADIUS = 8
/** Pinned scroll length, in viewport heights: shorter on tablets. */
const PIN_DESKTOP = 2.8
const PIN_TABLET = 2
/** Timeline units: how long each project holds, and each sheet takes to pass. */
const HOLD = 0.7
const PASS = 1
const EXPAND = 1.1

/**
 * Web Design & Development — an editorial digital reel. Deliberately not the
 * hero's language (no browser, cursor, code or wireframes): the work itself
 * is the image, passed through one frame like printed sheets.
 *
 *   1. The intro enters once, softly (20–30px, opacity).
 *   2. A 1px lime rule draws across as the intro scrolls away.
 *   3. The frame's clip-path opens upward to reveal project 01 (1.05 → 1).
 *   4. The stage pins. Each project drifts a few percent while it holds;
 *      its sheet then slides up out of the frame, uncovering the next one
 *      beneath, while captions swap through their line masks.
 *   5. The last project's frame opens to the full viewport (radius 8 → 0),
 *      the pin releases and the next section takes over.
 *
 * Lenis drives the real window scroll, so ScrollTrigger needs no proxy.
 * Phones get a stacked list with a per-image clip reveal; reduced motion
 * gets the same list with no animation at all.
 */
function WebDevelopment() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = Boolean(useReducedMotion())

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section || reduceMotion || typeof window.matchMedia !== 'function') return

      const q = gsap.utils.selector(section)
      const EASE = 'power3.out'

      // 1 — intro, once.
      gsap.from(q('.wdr-intro__item'), {
        autoAlpha: 0,
        y: 24,
        duration: 1.1,
        stagger: 0.1,
        ease: EASE,
        scrollTrigger: { trigger: q('.wdr-intro')[0], start: 'top 72%', once: true },
      })

      // 2 — the lime rule that introduces the reel.
      gsap.fromTo(
        q('.wdr-rule'),
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: q('.wdr-rule')[0], start: 'top 92%', end: 'top 45%', scrub: 0.6 },
        },
      )

      const mm = gsap.matchMedia()

      mm.add(CINEMATIC, () => {
        section.classList.add('is-cinematic')

        const stage = q('.wdr-stage')[0] as HTMLElement
        const frame = q('.wdr-window')[0] as HTMLElement
        const articles = q('.wdr-project') as HTMLElement[]
        const masks = q('.wdr-mask') as HTMLElement[]
        const sheets = q('.wdr-sheet') as HTMLElement[]
        const arts = q('.wdr-art') as HTMLElement[]
        const lines = articles.map((a) => Array.from(a.querySelectorAll<HTMLElement>('.wdr-line__inner')))
        const allLines = lines.flat()
        const last = TOTAL - 1

        // The frame is drawn by CSS (.wdr-window); the clip-path copies it in px.
        const measure = () => {
          const s = stage.getBoundingClientRect()
          const w = frame.getBoundingClientRect()
          return { t: w.top - s.top, r: s.right - w.right, b: s.bottom - w.bottom, l: w.left - s.left, h: s.height }
        }
        const windowClip = () => {
          const m = measure()
          return `inset(${m.t}px ${m.r}px ${m.b}px ${m.l}px round ${RADIUS}px)`
        }
        // Zero height, sitting on the frame's bottom edge: inset(100% 0 0 0).
        const closedClip = () => {
          const m = measure()
          return `inset(${m.h - m.b}px ${m.r}px ${m.b}px ${m.l}px round ${RADIUS}px)`
        }
        const fullClip = 'inset(0px 0px 0px 0px round 0px)'

        gsap.set(allLines, { yPercent: 100 })
        gsap.set(arts.slice(1), { scale: 1.06, yPercent: 3 })
        // Only the sheet on show is drawn at rest; the next one appears as
        // its pass begins. Identical clip edges would otherwise let the
        // layers beneath bleed through the frame's anti-aliased edge.
        gsap.set(sheets.slice(1), { autoAlpha: 0 })

        // Captions swap discretely — fast and understated — rather than
        // being scrubbed, so they never rest half-masked.
        let active = -1
        const setActive = (next: number) => {
          if (next === active) return
          const dir = next > active ? 1 : -1
          if (active >= 0) {
            articles[active].classList.remove('is-active')
            gsap.to(lines[active], { yPercent: -100 * dir, duration: 0.45, stagger: 0.03, ease: 'power3.in', overwrite: true })
          }
          if (next >= 0) {
            articles[next].classList.add('is-active')
            gsap.fromTo(
              lines[next],
              { yPercent: 100 * dir },
              { yPercent: 0, duration: 0.7, delay: active >= 0 ? 0.2 : 0, stagger: 0.04, ease: EASE, overwrite: true },
            )
          }
          active = next
        }

        const switchTimes: number[] = []
        let reveal: gsap.core.Timeline | null = null
        let reel: gsap.core.Timeline | null = null
        const sync = () => {
          if (!reveal || !reel) return
          let next = reveal.progress() > 0.55 ? 0 : -1
          if (next === 0) for (const t of switchTimes) if (reel.time() >= t) next++
          setActive(next)
        }

        // 3 — the first frame opens while the stage travels up to the pin.
        reveal = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: sync,
          scrollTrigger: { trigger: stage, start: 'top 70%', end: 'top top', scrub: 0.8, invalidateOnRefresh: true },
        })
        reveal
          .fromTo(masks, { clipPath: closedClip }, { clipPath: windowClip, ease: 'power2.out', duration: 1 }, 0)
          .fromTo(arts[0], { scale: 1.05 }, { scale: 1, duration: 1 }, 0)
          .fromTo(q('.wdr-chrome'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.6)

        // 4–5 — the pinned reel.
        // Every tween states its own start (fromTo, rendered lazily) so a
        // refresh mid-reel can never re-record a start from a mid-scroll state.
        reel = gsap.timeline({
          defaults: { ease: 'none', immediateRender: false },
          onUpdate: sync,
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => `+=${window.innerHeight * (window.innerWidth >= 1024 ? PIN_DESKTOP : PIN_TABLET)}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        let time = 0
        arts.forEach((art, i) => {
          // Hold: the barest drift, like a slow camera on a print.
          reel!.fromTo(art, { yPercent: 0 }, { yPercent: -3, duration: HOLD }, time)
          time += HOLD
          if (i === last) return
          // Pass: this sheet slides up out of the frame, its image lagging a
          // little behind; the next is uncovered beneath and settles.
          reel!
            .fromTo(sheets[i + 1], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, time)
            .fromTo(sheets[i], { yPercent: 0 }, { yPercent: -100, duration: PASS, ease: 'power3.inOut' }, time)
            .fromTo(art, { yPercent: -3 }, { yPercent: 4, duration: PASS, ease: 'power3.inOut' }, time)
            .fromTo(
              arts[i + 1],
              { scale: 1.06, yPercent: 3 },
              { scale: 1, yPercent: 0, duration: PASS, ease: 'power2.out' },
              time,
            )
          switchTimes.push(time + PASS * 0.5)
          time += PASS
        })

        reel.fromTo(q('.wdr-progress__fill'), { scaleX: 0 }, { scaleX: 1, duration: time }, 0)

        // The last frame opens to the full viewport, its furniture recedes.
        reel
          .fromTo(masks[last], { clipPath: windowClip }, { clipPath: fullClip, duration: EXPAND, ease: 'power2.inOut' }, time)
          .fromTo(arts[last], { yPercent: -3 }, { yPercent: 0, duration: EXPAND, ease: 'power2.inOut' }, time)
          .fromTo(
            [...q('.wdr-chrome'), articles[last].querySelector('.wdr-kicker'), articles[last].querySelector('.wdr-meta')],
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: EXPAND * 0.4 },
            time,
          )
          .to({}, { duration: 0.4 })

        return () => {
          gsap.killTweensOf(allLines)
          gsap.set(allLines, { clearProps: 'transform' })
          articles.forEach((a) => a.classList.remove('is-active'))
          section.classList.remove('is-cinematic')
        }
      })

      mm.add(STACKED, () => {
        ;(q('.wdr-project') as HTMLElement[]).forEach((article) => {
          gsap
            .timeline({ scrollTrigger: { trigger: article, start: 'top 82%', once: true } })
            .fromTo(
              article.querySelector('.wdr-mask'),
              { clipPath: 'inset(100% 0% 0% 0% round 6px)', y: 32 },
              { clipPath: 'inset(0% 0% 0% 0% round 6px)', y: 0, duration: 1.3, ease: EASE, clearProps: 'clipPath' },
            )
            .fromTo(article.querySelector('.wdr-art'), { scale: 1.06 }, { scale: 1, duration: 1.5, ease: EASE }, 0)
            .fromTo(
              article.querySelectorAll('.wdr-line__inner'),
              { yPercent: 100 },
              { yPercent: 0, duration: 0.8, stagger: 0.05, ease: EASE },
              0.25,
            )
        })
      })
    },
    { scope: sectionRef, dependencies: [reduceMotion], revertOnUpdate: true },
  )

  const { label, heading, description, capabilities } = WEB_SECTION

  return (
    <section ref={sectionRef} id="web-design-development" aria-labelledby="web-development-heading" className="wdr">
      <SectionContainer className="wdr-intro">
        <header className="wdr-intro__header">
          <SectionLabel className="wdr-intro__item wdr-label">{label}</SectionLabel>

          <div className="wdr-intro__grid section-grid">
            <SectionHeading id="web-development-heading" className="wdr-intro__item wdr-heading">
              {heading.map((line) => (
                <span key={line} className="wdr-heading__line">
                  {line}
                </span>
              ))}
            </SectionHeading>

            <div className="wdr-intro__aside">
              <SectionDescription className="wdr-intro__item wdr-description">{description}</SectionDescription>
              <ul className="wdr-intro__item wdr-capabilities" aria-label="Capabilities">
                {capabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <div className="wdr-rule" aria-hidden="true" />
      </SectionContainer>

      <div className="wdr-stage">
        {/* The frame every project passes through, and its quiet furniture.
            Only drawn in the pinned stage; decorative either way. */}
        <div className="wdr-window wdr-chrome" aria-hidden="true">
          <span className="wdr-guide wdr-guide--tl" />
          <span className="wdr-guide wdr-guide--tr" />
          <span className="wdr-guide wdr-guide--bl" />
          <span className="wdr-guide wdr-guide--br" />
        </div>

        <div className="wdr-projects">
          {WEB_PROJECTS.map((project, index) => (
            <WebProject key={project.id} project={project} index={index} total={TOTAL} />
          ))}
        </div>

        {/* One caption rule for the stage, rather than one per stacked
            project — those would stay drawn over the work beneath them. */}
        <span className="wdr-caption-rule wdr-chrome" aria-hidden="true" />

        <div className="wdr-progress wdr-chrome" aria-hidden="true">
          <span>01</span>
          <span className="wdr-progress__track">
            <span className="wdr-progress__fill" />
          </span>
          <span>{pad(TOTAL)}</span>
        </div>
      </div>
    </section>
  )
}

export default WebDevelopment
