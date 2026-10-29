import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'
import CapabilityVisual from '../../components/Technology/CapabilityVisual'
import RibbonTrace from '../../components/Technology/RibbonTrace'
import { EVOLKUN_URL } from '../../config/evolkun'
import { useNativeMetadata } from '../../routing/context'
import {
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setLinkTag,
  setMetaTag,
} from '../../blog/lib/documentHead'
import {
  automationStory,
  capabilities,
  dataSection,
  erpSection,
  evolkunSection,
  technologyHero,
  technologyIntro,
  technologySeo,
  workflowExample,
} from '../../data/technology'
import './TechnologyPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const pad = (index: number) => String(index + 1).padStart(2, '0')


/*                                  Shared                                    */
/* ----------------------------------------jjj---------------------------------- */

/** ↗ for links that leave the site, → for everything else. */
function ArrowIcon({ external = false }: { external?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {external ? (
        <>
          <line x1="6" y1="18" x2="18" y2="6" />
          <polyline points="8 6 18 6 18 16" />
        </>
      ) : (
        <>
          <line x1="4" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </>
      )}
    </svg>
  )
}

/** Heading lines, each in its own mask so the reveal rises from behind it. */
function MaskedLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className="bwt-mask">
          <span data-reveal>{line}</span>
        </span>
      ))}
    </>
  )
}

/**
 * Link to the official Evolkun site in a new tab. Until VITE_EVOLKUN_URL is
 * configured (src/config/evolkun.ts) it renders as plain text, never as a
 * link to a guessed address.
 */
function EvolkunLink({ className, children }: { className: string; children: ReactNode }) {
  if (!EVOLKUN_URL) return <span className={`${className} is-unlinked`}>{children}</span>
  return (
    <a className={className} href={EVOLKUN_URL} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="bwt-arrow">
        <ArrowIcon external />
      </span>
      <span className="bwt-sr-only"> (opens in a new tab)</span>
    </a>
  )
}

function useTechnologyMetadata() {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    if (nativeMetadata) return
    const previousTitle = document.title
    const url = `${window.location.origin}${technologySeo.pathname}`
    setDocumentTitle(technologySeo.title)
    setMetaTag('name', 'description', technologySeo.description)
    setMetaTag('property', 'og:title', technologySeo.title)
    setMetaTag('property', 'og:description', technologySeo.description)
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:url', url)
    setLinkTag('canonical', url)
    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      for (const key of ['og:title', 'og:description', 'og:type', 'og:url']) {
        removeMetaTag('property', key)
      }
      removeLinkTag('canonical')
    }
  }, [nativeMetadata])
}

/* -------------------------------------------------------------------------- */
/*                                  01 Hero                                   */
/* -------------------------------------------------------------------------- */

function Hero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      gsap.from(section.querySelectorAll('[data-hero] [data-reveal], [data-hero-fade]'), {
        opacity: 0,
        y: reduced ? 0 : 28,
        duration: reduced ? 0.6 : 0.85,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.15,
      })
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-hero" aria-labelledby="bwt-hero-title">
      <div className="bwt-hero__stage">
        <div className="bwt-container bwt-hero__inner" data-hero>
          <p className="bwt-label" data-hero-fade>
            {technologyHero.label}
          </p>
          <h1 id="bwt-hero-title" className="bwt-hero__title">
            <MaskedLines lines={technologyHero.heading} />
          </h1>
          <p className="bwt-hero__copy" data-hero-fade>
            {technologyHero.copy}
          </p>
          <div className="bwt-hero__actions" data-hero-fade>
            <a href="#capabilities" className="bwt-text-link bwt-text-link--primary">
              {technologyHero.cta}
              <span className="bwt-arrow">
                <ArrowIcon />
              </span>
            </a>
            <EvolkunLink className="bwt-text-link">{technologyHero.partnerLink}</EvolkunLink>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  02 Intro                                  */
/* -------------------------------------------------------------------------- */

function Intro() {
  return (
    <section className="bwt-intro" aria-labelledby="bwt-intro-title">
      <div className="bwt-container bwt-intro__grid" data-reveal-group>
        <p className="bwt-label" data-reveal>
          {technologyIntro.label}
        </p>
        <div className="bwt-intro__body">
          <h2 id="bwt-intro-title" className="bwt-intro__statement" data-reveal>
            {technologyIntro.statement}
          </h2>
          <p className="bwt-intro__copy" data-reveal>
            {technologyIntro.copy}
          </p>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                               03 Capabilities                              */
/* -------------------------------------------------------------------------- */

function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  // Scrolling through the list selects the item crossing the middle of the
  // screen; hovering selects directly. Either way only `active` changes.
  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>('.bwt-cap', sectionRef.current)
      items.forEach((item, index) => {
        ScrollTrigger.create({
          trigger: item,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => {
            if (self.isActive) setActive(index)
          },
        })
      })
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className="bwt-caps"
      aria-labelledby="bwt-caps-title"
    >
      <div className="bwt-container">
        <div className="bwt-caps__head" data-reveal-group>
          <h2 id="bwt-caps-title" className="bwt-label" data-reveal>
            Capabilities
          </h2>
        </div>

        <div className="bwt-caps__grid">
          <ol className="bwt-caps__list">
            {capabilities.map((capability, index) => (
              <li
                key={capability.id}
                className={`bwt-cap${index === active ? ' is-active' : ''}`}
                onPointerEnter={() => setActive(index)}
              >
                <span className="bwt-cap__num">{pad(index)}</span>
                <div className="bwt-cap__text">
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="bwt-caps__visual" aria-hidden="true">
            {capabilities.map((capability, index) => (
              <div
                key={capability.id}
                className={`bwt-cap-visual${index === active ? ' is-active is-live' : ''}`}
              >
                <CapabilityVisual kind={capability.visual} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                            04 Automation story                             */
/* -------------------------------------------------------------------------- */

const STORY = {
  core: { x: 320, y: 210 },
  triggerY: [70, 140, 210, 280, 350],
  actionY: [40, 96.7, 153.3, 210, 266.7, 323.3, 380],
}

function StoryDiagram() {
  const { core, triggerY, actionY } = STORY
  return (
    <svg className="bwt-story__diagram" viewBox="0 0 640 420" aria-hidden="true" focusable="false">
      {automationStory.triggers.map((name, i) => {
        const y = triggerY[i]
        const d = `M166 ${y} C222 ${y} 222 ${core.y} ${core.x - 48} ${core.y}`
        return (
          <g key={name} className="bwt-story__in">
            <text className="bwt-v-label bwt-story__label" x={0} y={y + 4}>
              {name}
            </text>
            <path className="bwt-v-line bwt-story__path" d={d} pathLength={1} />
            <path className="bwt-story__signal" d={d} pathLength={1} />
          </g>
        )
      })}

      <g className="bwt-story__core">
        <circle className="bwt-v-node" cx={core.x} cy={core.y} r={46} />
        <circle className="bwt-story__ring" cx={core.x} cy={core.y} r={32} pathLength={60} />
        <circle className="bwt-v-dot bwt-story__heart" cx={core.x} cy={core.y} r={5} />
        <text className="bwt-v-label bwt-story__think" x={core.x} y={core.y + 78} textAnchor="middle">
          Rules · Data · AI
        </text>
      </g>

      {automationStory.actions.map((name, i) => {
        const y = actionY[i]
        const d = `M${core.x + 48} ${core.y} C425 ${core.y} 425 ${y} 488 ${y}`
        return (
          <g key={name} className="bwt-story__out">
            <path className="bwt-v-line bwt-story__path" d={d} pathLength={1} />
            <path className="bwt-story__signal" d={d} pathLength={1} />
            <text className="bwt-v-label bwt-story__label" x={500} y={y + 4}>
              {name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function AutomationStory({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section || reduced) return
      const q = gsap.utils.selector(section)
      const words = q('.bwt-story__word')
      const lines = q('.bwt-story__line')
      const groups = [q('.bwt-story__in'), [], q('.bwt-story__out')]

      section.classList.add('is-animated')
      gsap.set(words, { opacity: 0.14 })
      gsap.set(lines, { autoAlpha: 0, y: 16 })
      gsap.set(q('.bwt-story__path'), { strokeDashoffset: 1 })
      gsap.set(q('.bwt-story__label'), { opacity: 0 })
      gsap.set(q('.bwt-story__think'), { opacity: 0 })
      gsap.set(q('.bwt-story__heart'), { opacity: 0.25 })

      // Three equal stages across the pinned scroll; position only, scrubbed
      // straight to the (already smoothed) Lenis scroll.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      automationStory.stages.forEach((_, stage) => {
        const at = stage
        tl.to(words[stage], { opacity: 1, duration: 0.2 }, at)
        if (stage > 0) {
          tl.to(words[stage - 1], { opacity: 0.38, duration: 0.2 }, at)
          tl.to(lines[stage - 1], { autoAlpha: 0, y: -16, duration: 0.2 }, at)
        }
        tl.to(lines[stage], { autoAlpha: 1, y: 0, duration: 0.2 }, at + 0.05)

        const group = groups[stage] as HTMLElement[]
        group.forEach((g, i) => {
          const offset = at + 0.1 + i * 0.06
          tl.to(g.querySelector('.bwt-story__label'), { opacity: 1, duration: 0.15 }, offset)
          tl.to(g.querySelector('.bwt-story__path'), { strokeDashoffset: 0, duration: 0.35 }, offset)
          // Visible only while travelling: a dash parked just off either end
          // of a path can still be painted.
          const signal = g.querySelector('.bwt-story__signal')
          tl.set(signal, { opacity: 1 }, offset + 0.25)
          tl.fromTo(
            signal,
            { strokeDashoffset: 0.08 },
            { strokeDashoffset: -1.08, duration: 0.45 },
            offset + 0.25,
          )
          tl.set(signal, { opacity: 0 }, offset + 0.7)
        })
      })

      // Think: the core takes over.
      tl.to(q('.bwt-story__heart'), { opacity: 1, duration: 0.2 }, 1.05)
      tl.to(q('.bwt-story__think'), { opacity: 1, duration: 0.2 }, 1.1)
      tl.fromTo(
        q('.bwt-story__ring'),
        { rotation: 0 },
        { rotation: 180, svgOrigin: `${STORY.core.x} ${STORY.core.y}`, duration: 1.2 },
        1,
      )
      tl.to({}, { duration: 0.3 }, 3)

      return () => section.classList.remove('is-animated')
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-story" aria-labelledby="bwt-story-title">
      <div className="bwt-story__stage">
        <div className="bwt-container bwt-story__grid">
          <div className="bwt-story__copy">
            <p className="bwt-label">Automation</p>
            <h2 id="bwt-story-title" className="bwt-story__title">
              {automationStory.stages.map((stage) => (
                <span key={stage.word} className="bwt-story__word">
                  {stage.word}.
                </span>
              ))}
            </h2>
            <div className="bwt-story__lines">
              {automationStory.stages.map((stage) => (
                <p key={stage.word} className="bwt-story__line">
                  {stage.line}
                </p>
              ))}
            </div>
          </div>
          <StoryDiagram />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                               05 Workflow                                  */
/* -------------------------------------------------------------------------- */

function WorkflowExample({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track || reduced) return
      const q = gsap.utils.selector(track)
      const steps = q('.bwt-step')
      const vertical = () => window.matchMedia('(max-width: 760px)').matches

      gsap.set(track, { '--p': 0 })
      gsap.set(q('.bwt-flow__progress'), { strokeDashoffset: 1 })
      gsap.set(q('.bwt-step__node'), { backgroundColor: '#ffffff', borderColor: 'rgba(17,17,17,0.3)' })
      gsap.set(q('.bwt-step__label'), { color: 'rgba(17,17,17,0.42)' })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track,
          start: () => (vertical() ? 'top 70%' : 'top 78%'),
          end: () => (vertical() ? 'bottom 45%' : 'top 30%'),
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
      tl.to(track, { '--p': 1, duration: 1 }, 0)
      tl.to(q('.bwt-flow__progress'), { strokeDashoffset: 0, duration: 1 }, 0)
      steps.forEach((step, i) => {
        const at = i / (steps.length - 1)
        tl.to(
          step.querySelector('.bwt-step__node'),
          { backgroundColor: '#cefd10', borderColor: '#111111', duration: 0.04 },
          Math.max(0, at - 0.02),
        )
        tl.to(step.querySelector('.bwt-step__label'), { color: '#111111', duration: 0.06 }, Math.max(0, at - 0.02))
      })
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-flow" aria-labelledby="bwt-flow-title">
      <div className="bwt-container">
        <div className="bwt-flow__head" data-reveal-group>
          <p className="bwt-label" data-reveal>
            Business automation
          </p>
          <h2 id="bwt-flow-title">
            <MaskedLines lines={workflowExample.heading} />
          </h2>
        </div>

        <div ref={trackRef} className="bwt-flow__track">
          <svg className="bwt-flow__line is-horizontal" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
            <line className="bwt-flow__base" x1={0} y1={1} x2={100} y2={1} />
            <line className="bwt-flow__progress" x1={0} y1={1} x2={100} y2={1} pathLength={1} />
          </svg>
          <svg className="bwt-flow__line is-vertical" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
            <line className="bwt-flow__base" x1={1} y1={0} x2={1} y2={100} />
            <line className="bwt-flow__progress" x1={1} y1={0} x2={1} y2={100} pathLength={1} />
          </svg>
          <span className="bwt-flow__signal" aria-hidden="true" />
          <ol className="bwt-flow__steps">
            {workflowExample.steps.map((step, index) => (
              <li key={step} className="bwt-step">
                <span className="bwt-step__node" aria-hidden="true" />
                <span className="bwt-step__num">{pad(index)}</span>
                <span className="bwt-step__label">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  06 Data                                   */
/* -------------------------------------------------------------------------- */

const METRIC_FILL = [0.64, 0.42, 0.74, 0.56]

function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function DataSection({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const { revenue, others } = dataSection.metrics

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section || reduced) return
      const q = gsap.utils.selector(section)
      const panel = q('.bwt-dash')[0]

      const tl = gsap.timeline({
        scrollTrigger: { trigger: panel, start: 'top 78%', once: true },
        defaults: { ease: 'power2.out' },
      })
      tl.from(q('.bwt-dash__spark-line'), { strokeDashoffset: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      tl.from(q('.bwt-dash__fill'), { scaleX: 0, duration: 1.2, stagger: 0.08 }, 0.2)
      const counters = q('[data-count]')
      counters.forEach((el, i) => {
        const target = Number(el.dataset.count)
        const decimals = Number(el.dataset.decimals ?? 0)
        // Start from zero so the count-up never jumps down first.
        el.textContent = formatNumber(0, decimals)
        const counter = { value: 0 }
        tl.to(
          counter,
          {
            value: target,
            duration: 1.4,
            onUpdate: () => {
              el.textContent = formatNumber(counter.value, decimals)
            },
          },
          0.1 + i * 0.06,
        )
      })

      return () => {
        counters.forEach((el) => {
          el.textContent = formatNumber(Number(el.dataset.count), Number(el.dataset.decimals ?? 0))
        })
      }
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-data" aria-labelledby="bwt-data-title">
      <div className="bwt-container bwt-data__grid">
        <div className="bwt-data__head" data-reveal-group>
          <p className="bwt-label" data-reveal>
            {dataSection.label}
          </p>
          <h2 id="bwt-data-title">
            <MaskedLines lines={dataSection.heading} />
          </h2>
          <p className="bwt-data__copy" data-reveal>
            {dataSection.copy}
          </p>
        </div>

        <figure className="bwt-dash" aria-label="Illustrative dashboard with sample data">
          <figcaption className="bwt-dash__caption">Sample data</figcaption>

          <div className="bwt-dash__revenue">
            <p className="bwt-dash__label">{revenue.label}</p>
            <p className="bwt-dash__big">
              <span data-count={revenue.value}>{formatNumber(revenue.value)}</span>
              <span className="bwt-dash__change">{revenue.change}</span>
            </p>
            <svg className="bwt-dash__spark" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
              <path
                className="bwt-dash__spark-line"
                d="M0 66 C30 62 48 52 70 56 S118 40 142 44 S190 30 214 36 S262 18 290 24 S346 10 372 12 L400 8"
                pathLength={1}
              />
            </svg>
          </div>

          <dl className="bwt-dash__metrics">
            {others.map((metric, index) => (
              <div key={metric.label} className="bwt-dash__metric">
                <dt className="bwt-dash__label">{metric.label}</dt>
                <dd className="bwt-dash__value">
                  <span data-count={metric.value} data-decimals={metric.decimals ?? 0}>
                    {formatNumber(metric.value, metric.decimals ?? 0)}
                  </span>
                  {metric.suffix}
                </dd>
                <span className="bwt-dash__track" aria-hidden="true">
                  <span className="bwt-dash__fill" style={{ transform: `scaleX(${METRIC_FILL[index]})` }} />
                </span>
              </div>
            ))}
          </dl>
        </figure>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   07 ERP                                   */
/* -------------------------------------------------------------------------- */

function ErpDiagram() {
  const cx = 260
  const cy = 220
  return (
    <svg className="bwt-erp__diagram" viewBox="0 0 520 440" aria-hidden="true" focusable="false">
      <circle className="bwt-v-faint" cx={cx} cy={cy} r={165} />
      {erpSection.departments.map((name, i) => {
        const a = (i / erpSection.departments.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * 165
        const y = cy + Math.sin(a) * 165
        const d = `M${x.toFixed(1)} ${y.toFixed(1)} L${cx} ${cy}`
        return (
          <g key={name}>
            <path className="bwt-v-line bwt-erp__path" d={d} pathLength={1} />
            <path className="bwt-v-signal" d={d} pathLength={1} style={{ animationDelay: `${i * 0.45}s` }} />
            <circle className="bwt-v-node" cx={x} cy={y} r={6} />
            <text
              className="bwt-v-label"
              x={cx + Math.cos(a) * 192}
              y={cy + Math.sin(a) * 192 + 5}
              textAnchor={Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}
            >
              {name}
            </text>
          </g>
        )
      })}
      <circle className="bwt-v-accent" cx={cx} cy={cy} r={50} />
      <text className="bwt-v-label bwt-erp__core" x={cx} y={cy + 5} textAnchor="middle">
        {erpSection.core}
      </text>
    </svg>
  )
}

function ErpSection({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      const diagram = section.querySelector('.bwt-erp__visual')
      // Signals only run while the diagram is on screen.
      ScrollTrigger.create({ trigger: diagram, start: 'top bottom', end: 'bottom top', toggleClass: 'is-live' })
      if (reduced) return
      gsap.from(section.querySelectorAll('.bwt-erp__path'), {
        strokeDashoffset: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: diagram, start: 'top 80%', end: 'center 55%', scrub: true },
      })
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-erp" aria-labelledby="bwt-erp-title">
      <div className="bwt-container bwt-erp__grid">
        <div className="bwt-erp__text" data-reveal-group>
          <p className="bwt-label" data-reveal>
            ERP / Custom systems
          </p>
          <h2 id="bwt-erp-title" data-reveal>
            {erpSection.heading}
          </h2>
          <p className="bwt-erp__copy" data-reveal>
            {erpSection.copy}
          </p>
        </div>
        <div className="bwt-erp__visual">
          <ErpDiagram />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                08 Evolkun                                  */
/* -------------------------------------------------------------------------- */

function EvolkunSection() {
  return (
    <section className="bwt-partner" aria-labelledby="bwt-partner-title">
      <div className="bwt-container bwt-partner__inner" data-reveal-group>
        <span className="bwt-partner__rule" data-reveal aria-hidden="true" />
        <p className="bwt-label" data-reveal>
          {evolkunSection.label}
        </p>
        <h2 id="bwt-partner-title" className="bwt-partner__title" data-reveal>
          {evolkunSection.heading}
        </h2>
        <div className="bwt-partner__foot">
          <p className="bwt-partner__copy" data-reveal>
            {evolkunSection.copy}
          </p>
          <div data-reveal>
            <EvolkunLink className="bwt-text-link bwt-text-link--primary">{evolkunSection.cta}</EvolkunLink>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function TechnologyPage() {
  const pageRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion() ?? false
  useTechnologyMetadata()

  // Masked, staggered reveals for every [data-reveal-group] below the hero.
  // Reduced motion keeps a plain fade.
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>('[data-reveal-group]', pageRef.current).forEach((group) => {
        gsap.from(group.querySelectorAll('[data-reveal]'), {
          opacity: 0,
          y: reduced ? 0 : 28,
          duration: reduced ? 0.6 : 0.8,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: group, start: 'top 82%', once: true },
        })
      })

      const refresh = () => ScrollTrigger.refresh()
      void document.fonts?.ready.then(refresh)
    },
    { scope: pageRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <main ref={pageRef} className="bwt-page">
      <RibbonTrace reducedMotion={reduced} />
      <Hero reduced={reduced} />
      <Intro />
      <Capabilities />
      <AutomationStory reduced={reduced} />
      <WorkflowExample reduced={reduced} />
      <DataSection reduced={reduced} />
      <ErpSection reduced={reduced} />
      <EvolkunSection />
    </main>
  )
}
