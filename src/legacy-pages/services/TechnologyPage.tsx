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

gsap.registerPlugin(ScrollTrigger, useGSAP)

const pad = (index: number) => String(index + 1).padStart(2, '0')

// Shared type and link patterns; individual layout utilities stay on the elements.
const sectionHeadingClasses = `
  font-[family-name:var(--section-title-font)] text-(length:--section-title-size)
  font-(--section-title-weight) leading-none tracking-(--section-title-tracking) text-balance
`
const textLinkClasses = `
  group/link relative z-0 inline-flex min-h-11 items-center gap-2.5 no-underline transition-colors duration-300
  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111]
  after:absolute after:right-0 after:bottom-2.5 after:left-0 after:-z-1 after:h-px after:bg-current after:opacity-35 after:transition-[height,background-color,opacity] after:duration-300
  hover:text-[#111] hover:after:h-2 hover:after:bg-bw-lime hover:after:opacity-100 focus-visible:after:h-2 focus-visible:after:bg-bw-lime focus-visible:after:opacity-100
  data-[unlinked=true]:cursor-default data-[unlinked=true]:after:hidden
`

/*                                  Shared                                    */
/* -------------------------------------------------------------------------- */

/** ↗ for links that leave the site, → for everything else. */
function ArrowIcon({ external = false }: { external?: boolean }) {
  return (
    <svg
      className="size-full"
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
        <span key={line} className="bwt-mask block overflow-hidden pb-[0.1em] -mb-[0.1em]">
          <span className="block" data-reveal>{line}</span>
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
  if (!EVOLKUN_URL) return <span className={className} data-unlinked="true">{children}</span>
  return (
    <a className={className} href={EVOLKUN_URL} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="
        bwt-arrow inline-flex size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        group-hover/link:translate-x-[3px]
        group-focus-visible/link:translate-x-[3px]
        group-hover/link:-translate-y-[3px]
        group-focus-visible/link:-translate-y-[3px]
        motion-reduce:duration-10
      ">
        <ArrowIcon external />
      </span>
      <span className="bwt-sr-only sr-only"> (opens in a new tab)</span>
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
    <section ref={sectionRef} className="bwt-hero relative z-1 motion-safe:h-[260svh] motion-safe:max-[761px]:h-[190svh]" aria-labelledby="bwt-hero-title">
      <div className="
        bwt-hero__stage sticky top-0 flex h-svh items-center overflow-hidden
        max-[761px]:items-start
        motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh
      ">
        <div className="
          bwt-container bwt-hero__inner mx-auto w-full
          max-w-[1440px] px-[clamp(24px,5vw,80px)] relative z-1 pt-16
          max-[761px]:pt-[clamp(112px,16svh,150px)]
        " data-hero>
          {/* <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-hero-fade>
            {technologyHero.label}
          </p> */}
          <h1 id="bwt-hero-title" className="
            bwt-hero__title mt-[26px]
            max-w-[11.5em] text-[clamp(48px,6vw,4rem)] font-normal leading-[0.96] tracking-[-0.045em] text-balance
            max-[761px]:text-[clamp(40px,11vw,4rem)]
          ">
            <MaskedLines lines={technologyHero.heading} />
          </h1>
          <p className="bwt-hero__copy mt-[clamp(24px,2.6vw,36px)] max-w-[32em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.6]" data-hero-fade>
            {technologyHero.copy}
          </p>
          <div className="bwt-hero__actions mt-[clamp(32px,3.4vw,48px)] flex flex-wrap items-center gap-x-8 gap-y-[18px]" data-hero-fade>
            <a href="#capabilities" className={`${textLinkClasses} text-[clamp(16px,1.2vw,18px)] text-[#111]`}>
              {technologyHero.cta}
              <span className="
                bwt-arrow inline-flex size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                group-hover/link:translate-x-[3px]
                group-focus-visible/link:translate-x-[3px]
                motion-reduce:duration-10
              ">
                <ArrowIcon />
              </span>
            </a>
            <EvolkunLink className={`${textLinkClasses} text-[15px] text-[#111]/66`}>{technologyHero.partnerLink}</EvolkunLink>
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
    <section className="bwt-intro relative z-1 pt-[clamp(96px,11vw,170px)] pb-[clamp(80px,8vw,130px)]" aria-labelledby="bwt-intro-title">
      <div className="bwt-container bwt-intro__grid mx-auto w-full max-w-[1440px] px-[clamp(24px,5vw,80px)] grid grid-cols-12 gap-(--grid-gap)" data-reveal-group>
        <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52 col-span-full lg:col-span-3 lg:pt-[0.9em]" data-reveal>
          {technologyIntro.label}
        </p>
        <div className="bwt-intro__body col-span-full lg:col-start-4">
          <h2 id="bwt-intro-title" className={`bwt-intro__statement max-w-[18em] ${sectionHeadingClasses}`} data-reveal>
            {technologyIntro.statement}
          </h2>
          <p className="bwt-intro__copy mt-[clamp(32px,3.6vw,52px)] ml-auto max-w-[36em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.65]" data-reveal>
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
      className="bwt-caps relative z-1 scroll-mt-6 pt-[clamp(88px,9vw,140px)] pb-[clamp(110px,11vw,170px)]"
      aria-labelledby="bwt-caps-title"
    >
      <div className="bwt-container mx-auto w-full max-w-[1440px] px-[clamp(24px,5vw,80px)]">
        <div className="bwt-caps__head mb-[clamp(40px,5vw,72px)] flex items-baseline justify-between gap-6" data-reveal-group>
          <h2 id="bwt-caps-title" className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-reveal>
            Capabilities
          </h2>
        </div>

        <div className="bwt-caps__grid grid grid-cols-1 items-start gap-[clamp(48px,7vw,120px)] lg:grid-cols-[1fr_0.9fr]">
          <ol className="bwt-caps__list">
            {capabilities.map((capability, index) => (
              <li
                key={capability.id}
                data-active={index === active}
                className="
                  bwt-cap group/cap relative grid grid-cols-[clamp(44px,5vw,72px)_minmax(0,1fr)] items-baseline border-t border-[#111]/10
                  py-[clamp(26px,2.6vw,38px)] last:border-b before:absolute before:-top-px before:left-0 before:h-px before:w-full before:origin-left
                  before:scale-x-0 before:bg-[#111] before:transition-transform before:duration-700 before:ease-[cubic-bezier(0.22,1,0.36,1)] data-[active=true]:before:scale-x-100 motion-reduce:before:duration-10
                "
                onPointerEnter={() => setActive(index)}
              >
                <span className="bwt-cap__num text-[13px] text-[#111]/52 tabular-nums transition-colors duration-500 group-data-[active=true]/cap:text-[#111]"></span>
                <div className="bwt-cap__text">
                  <h3 className="
                    text-[clamp(22px,2vw,30px)] font-normal leading-[1.12] tracking-[-0.03em] text-balance text-[#111]/36
                    transition-colors duration-500
                    group-data-[active=true]/cap:text-[#111]
                  ">{capability.title}</h3>
                  <p className="
                    mt-3
                    max-w-[34em] text-[15px] leading-[1.6] text-pretty text-[#111]/52 transition-colors duration-500
                    group-data-[active=true]/cap:text-[#111]/66
                  ">{capability.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="bwt-caps__visual sticky top-[14svh] hidden h-[min(72svh,640px)] rounded bg-[#f4f4f1] lg:block" aria-hidden="true">
            {capabilities.map((capability, index) => (
              <div
                key={capability.id}
                data-active={index === active}
                data-live={index === active}
                className="
                  bwt-cap-visual group/visual absolute inset-[clamp(28px,3.4vw,52px)] translate-y-[18px] opacity-0 [clip-path:inset(0_0_14%_0)] transition-[opacity,translate,clip-path]
                  duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] data-[active=true]:translate-y-0 data-[active=true]:opacity-100 data-[active=true]:[clip-path:inset(0)] motion-reduce:duration-10
                "
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
    <svg className="
      bwt-story__diagram block h-auto
      max-h-[78svh] w-full overflow-visible
      max-[761px]:-mx-[clamp(14.4px,3vw,48px)] max-[761px]:w-[calc(100%+clamp(28.8px,6vw,96px))] max-[761px]:max-w-none
      motion-safe:max-lg:max-h-[44svh]
    " viewBox="0 0 640 420" aria-hidden="true" focusable="false">
      {automationStory.triggers.map((name, i) => {
        const y = triggerY[i]
        const d = `M166 ${y} C222 ${y} 222 ${core.y} ${core.x - 48} ${core.y}`
        return (
          <g key={name} className="bwt-story__in">
            <text className="bwt-v-label bwt-story__label fill-[#111]/66 font-secondary text-[12px] max-[761px]:text-[17px]" x={0} y={y + 4}>
              {name}
            </text>
            <path className="bwt-v-line bwt-story__path fill-none stroke-[#111]/24 stroke-1 [vector-effect:none] [stroke-dasharray:1_2] [stroke-dashoffset:0]" d={d} pathLength={1} />
            <path className="bwt-story__signal fill-none stroke-[#111] stroke-2 [stroke-linecap:round] [stroke-dasharray:0.08_1.4] [stroke-dashoffset:-1.2] opacity-0" d={d} pathLength={1} />
          </g>
        )
      })}

      <g className="bwt-story__core">
        <circle className="bwt-v-node fill-white stroke-[#111]/60 stroke-1 [vector-effect:non-scaling-stroke]" cx={core.x} cy={core.y} r={46} />
        <circle className="bwt-story__ring fill-none stroke-[#111]/40 stroke-1 [stroke-dasharray:1_2] [vector-effect:non-scaling-stroke]" cx={core.x} cy={core.y} r={32} pathLength={60} />
        <circle className="bwt-v-dot bwt-story__heart fill-[#111]" cx={core.x} cy={core.y} r={5} />
        <text className="bwt-v-label bwt-story__think fill-[#111] font-secondary text-[12px] max-[761px]:text-[17px]" x={core.x} y={core.y + 78} textAnchor="middle">
          Rules · Data · AI
        </text>
      </g>

      {automationStory.actions.map((name, i) => {
        const y = actionY[i]
        const d = `M${core.x + 48} ${core.y} C425 ${core.y} 425 ${y} 488 ${y}`
        return (
          <g key={name} className="bwt-story__out">
            <path className="bwt-v-line bwt-story__path fill-none stroke-[#111]/24 stroke-1 [vector-effect:none] [stroke-dasharray:1_2] [stroke-dashoffset:0]" d={d} pathLength={1} />
            <path className="bwt-story__signal fill-none stroke-[#111] stroke-2 [stroke-linecap:round] [stroke-dasharray:0.08_1.4] [stroke-dashoffset:-1.2] opacity-0" d={d} pathLength={1} />
            <text className="bwt-v-label bwt-story__label fill-[#111]/66 font-secondary text-[12px] max-[761px]:text-[17px]" x={500} y={y + 4}>
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

      section.dataset.animated = 'true'
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

      return () => {
        delete section.dataset.animated
      }
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  )

  return (
    <section ref={sectionRef} className="bwt-story group/story relative z-1 motion-safe:h-[320svh] motion-safe:max-lg:h-[280svh]" aria-labelledby="bwt-story-title">
      <div className="
        bwt-story__stage sticky top-0 flex h-svh items-center overflow-hidden
        motion-reduce:relative motion-reduce:h-auto motion-reduce:py-[clamp(110px,12vw,170px)]
      ">
        <div className="
          bwt-container bwt-story__grid mx-auto w-full
          max-w-[1440px] px-[clamp(24px,5vw,80px)] grid grid-cols-1 items-center gap-[clamp(40px,6vw,110px)]
          lg:grid-cols-[0.8fr_1.2fr]
          motion-safe:max-lg:gap-7
        ">
          <div className="bwt-story__copy">
            <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52">Automation</p>
            <h2 id="bwt-story-title" className={`bwt-story__title mt-[22px] grid ${sectionHeadingClasses}`}>
              {automationStory.stages.map((stage) => (
                <span key={stage.word} className="bwt-story__word block">
                  {stage.word}.
                </span>
              ))}
            </h2>
            <div className="bwt-story__lines mt-[clamp(28px,3vw,44px)] grid gap-2.5 group-data-[animated=true]/story:gap-0">
              {automationStory.stages.map((stage) => (
                <p key={stage.word} className="
                  bwt-story__line
                  max-w-[26em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.6]
                  group-data-[animated=true]/story:col-start-1 group-data-[animated=true]/story:row-start-1
                ">
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
    <section ref={sectionRef} className="bwt-flow relative z-1 pt-[clamp(96px,11vw,170px)] pb-[clamp(96px,10vw,150px)]" aria-labelledby="bwt-flow-title">
      <div className="bwt-container mx-auto w-full max-w-[1440px] px-[clamp(24px,5vw,80px)]">
        <div className="bwt-flow__head " data-reveal-group>
          {/* <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-reveal>
            Business automation
          </p> */}
          <h2 id="bwt-flow-title" className={`mt-[22px] ${sectionHeadingClasses}`}>
            <MaskedLines lines={workflowExample.heading} />
          </h2>
        </div>

        <div ref={trackRef} className="bwt-flow__track relative mt-[clamp(72px,8vw,120px)] [--p:1]">
          <svg className="
            bwt-flow__line is-horizontal absolute overflow-visible top-1.5 right-[calc(100%/12)] left-[calc(100%/12)] block
            h-0.5 w-[calc(100%-100%/6)]
            max-[761px]:hidden
          " viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
            <line className="bwt-flow__base stroke-[#111]/14 stroke-1" x1={0} y1={1} x2={100} y2={1} />
            <line className="bwt-flow__progress stroke-[#111] stroke-1 [stroke-dasharray:1_2] [stroke-dashoffset:0]" x1={0} y1={1} x2={100} y2={1} pathLength={1} />
          </svg>
          <svg className="
            bwt-flow__line is-vertical absolute overflow-visible hidden
            max-[761px]:top-[7px] max-[761px]:bottom-[7px] max-[761px]:left-1.5 max-[761px]:block
            max-[761px]:h-[calc(100%-14px)] max-[761px]:w-0.5
          " viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
            <line className="bwt-flow__base stroke-[#111]/14 stroke-1" x1={1} y1={0} x2={1} y2={100} />
            <line className="bwt-flow__progress stroke-[#111] stroke-1 [stroke-dasharray:1_2] [stroke-dashoffset:0]" x1={1} y1={0} x2={1} y2={100} pathLength={1} />
          </svg>
          <span className="
            bwt-flow__signal absolute z-2 top-[7px] left-[calc(100%/12+var(--p)*(100%-100%/6))] size-2 -translate-1/2
            rounded-full bg-[#111]
            max-[761px]:top-[calc(7px+var(--p)*(100%-14px))] max-[761px]:left-[7px]
          " aria-hidden="true" />
          <ol className="bwt-flow__steps grid grid-cols-6 max-[761px]:grid-cols-1 max-[761px]:gap-[34px]">
            {workflowExample.steps.map((step, index) => (
              <li key={step} className="
                bwt-step grid justify-items-center gap-3.5 text-center
                max-[761px]:grid-cols-[14px_auto_minmax(0,1fr)] max-[761px]:items-center max-[761px]:justify-items-start
                max-[761px]:gap-[18px] max-[761px]:text-left
              ">
                <span className="bwt-step__node relative z-1 size-3.5 rounded-full border border-[#111] bg-bw-lime" aria-hidden="true" />
                <span className="bwt-step__num mt-2.5 text-[13px] text-[#111]/52 tabular-nums max-[761px]:mt-0">{pad(index)}</span>
                <span className="bwt-step__label max-w-[10em] text-[clamp(14px,1.1vw,16px)] leading-[1.4] text-[#111] max-[761px]:max-w-none">{step}</span>
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
    <section ref={sectionRef} className="bwt-data relative z-1 py-[clamp(96px,10vw,160px)]" aria-labelledby="bwt-data-title">
      <div className="
        bwt-container bwt-data__grid mx-auto w-full
        max-w-[1440px] px-[clamp(24px,5vw,80px)] grid grid-cols-1 items-center gap-[clamp(48px,7vw,120px)]
        lg:grid-cols-2
      ">
        <div className="bwt-data__head " data-reveal-group>
          {/* <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-reveal>
            {dataSection.label}
          </p> */}
          <h2 id="bwt-data-title" className={`mt-[22px] ${sectionHeadingClasses}`}>
            <MaskedLines lines={dataSection.heading} />
          </h2>
          <p className="bwt-data__copy mt-[clamp(24px,2.6vw,36px)] max-w-[30em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.6]" data-reveal>
            {dataSection.copy}
          </p>
        </div>

        <figure className="bwt-dash rounded bg-[#f4f4f1] px-[clamp(22px,2.6vw,40px)] pt-[clamp(22px,2.4vw,34px)] pb-[clamp(8px,1vw,14px)]" aria-label="Illustrative dashboard with sample data">
          <figcaption className="bwt-dash__caption text-[13px] text-[#111]/52">Sample data</figcaption>

          <div className="bwt-dash__revenue pt-[clamp(32px,4vw,52px)] pb-[clamp(20px,2.4vw,30px)]">
            <p className="bwt-dash__label text-[12px] font-semibold tracking-[0.08em] text-[#111]/52 uppercase">{revenue.label}</p>
            <p className="bwt-dash__big mt-2.5 flex items-baseline gap-4 text-[clamp(44px,5vw,72px)] leading-none tracking-[-0.04em] tabular-nums">
              <span data-count={revenue.value}>{formatNumber(revenue.value)}</span>
              <span className="bwt-dash__change rounded-full bg-bw-lime px-2.5 py-[3px] text-[14px] tracking-normal text-[#111]">{revenue.change}</span>
            </p>
            <svg className="bwt-dash__spark mt-[clamp(20px,2.4vw,32px)] block h-[clamp(56px,6vw,84px)] w-full overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
              <path
                className="bwt-dash__spark-line fill-none stroke-[#111] stroke-[1.5] [stroke-dasharray:1_2] [stroke-dashoffset:0]"
                d="M0 66 C30 62 48 52 70 56 S118 40 142 44 S190 30 214 36 S262 18 290 24 S346 10 372 12 L400 8"
                pathLength={1}
              />
            </svg>
          </div>

          <dl className="bwt-dash__metrics grid grid-cols-2 border-t border-[#111]/10">
            {others.map((metric, index) => (
              <div key={metric.label} className="bwt-dash__metric grid gap-2.5 border-b border-[#111]/10 py-[22px] odd:pr-6 even:border-l even:pl-6 max-[761px]:odd:pr-4 max-[761px]:even:pl-4">
                <dt className="bwt-dash__label text-[12px] font-semibold tracking-[0.08em] text-[#111]/52 uppercase">{metric.label}</dt>
                <dd className="bwt-dash__value text-[clamp(24px,2.2vw,32px)] leading-[1.1] tracking-[-0.03em] tabular-nums">
                  <span data-count={metric.value} data-decimals={metric.decimals ?? 0}>
                    {formatNumber(metric.value, metric.decimals ?? 0)}
                  </span>
                  {metric.suffix}
                </dd>
                <span className="bwt-dash__track block h-0.5 bg-[#111]/10" aria-hidden="true">
                  <span className="bwt-dash__fill block h-full origin-left bg-[#111]" style={{ transform: `scaleX(${METRIC_FILL[index]})` }} />
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
    <svg className="bwt-erp__diagram ml-auto block h-auto w-full max-w-[640px] overflow-visible max-lg:mr-auto" viewBox="0 0 520 440" aria-hidden="true" focusable="false">
      <circle className="bwt-v-faint fill-none stroke-1 [vector-effect:non-scaling-stroke] stroke-[#111]/10" cx={cx} cy={cy} r={165} />
      {erpSection.departments.map((name, i) => {
        const a = (i / erpSection.departments.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * 165
        const y = cy + Math.sin(a) * 165
        const d = `M${x.toFixed(1)} ${y.toFixed(1)} L${cx} ${cy}`
        return (
          <g key={name}>
            <path className="bwt-v-line bwt-erp__path fill-none stroke-[#111]/24 stroke-1 [vector-effect:none] [stroke-dasharray:1_2] [stroke-dashoffset:0]" d={d} pathLength={1} />
            <path className="
              bwt-v-signal fill-none stroke-[#111] stroke-2 [stroke-linecap:round] [stroke-dasharray:0.07_1.4]
              [stroke-dashoffset:0.12] opacity-0 animate-bwt-signal [animation-play-state:paused]
              group-data-[live=true]/visual:opacity-100 group-data-[live=true]/visual:[animation-play-state:running]
              motion-reduce:animate-none
            " d={d} pathLength={1} style={{ animationDelay: `${i * 0.45}s` }} />
            <circle className="bwt-v-node fill-white stroke-[#111]/60 stroke-1 [vector-effect:non-scaling-stroke]" cx={x} cy={y} r={6} />
            <text
              className="bwt-v-label fill-[#111]/66 font-secondary text-[12px] max-[761px]:text-base"
              x={cx + Math.cos(a) * 192}
              y={cy + Math.sin(a) * 192 + 5}
              textAnchor={Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}
            >
              {name}
            </text>
          </g>
        )
      })}
      <circle className="bwt-v-accent fill-bw-lime stroke-[#111] stroke-1 [vector-effect:non-scaling-stroke]" cx={cx} cy={cy} r={50} />
      <text className="bwt-v-label bwt-erp__core fill-[#111] font-secondary text-[14px] max-[761px]:text-base" x={cx} y={cy + 5} textAnchor="middle">
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
      ScrollTrigger.create({
        trigger: diagram,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          if (diagram instanceof HTMLElement) diagram.dataset.live = String(self.isActive)
        },
      })
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
    <section ref={sectionRef} className="bwt-erp relative z-1 pt-[clamp(110px,12vw,180px)] pb-[clamp(96px,10vw,150px)]" aria-labelledby="bwt-erp-title">
      <div className="
        bwt-container bwt-erp__grid mx-auto w-full
        max-w-[1440px] px-[clamp(24px,5vw,80px)] grid grid-cols-1 items-center gap-[clamp(48px,7vw,120px)]
        lg:grid-cols-[0.85fr_1.15fr]
      ">
        <div className="bwt-erp__text " data-reveal-group>
          {/* <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-reveal>
            ERP / Custom systems
          </p> */}
          <h2 id="bwt-erp-title" data-reveal className={`max-w-[11em] mt-[22px] ${sectionHeadingClasses}`}>
            {erpSection.heading}
          </h2>
          <p className="bwt-erp__copy mt-[clamp(24px,2.6vw,36px)] max-w-[30em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.6]" data-reveal>
            {erpSection.copy}
          </p>
        </div>
        <div className="bwt-erp__visual group/visual">
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
    <section className="bwt-partner relative z-1 pt-[clamp(110px,12vw,180px)] pb-[clamp(120px,13vw,200px)]" aria-labelledby="bwt-partner-title">
      <div className="bwt-container bwt-partner__inner mx-auto w-full max-w-[1440px] px-[clamp(24px,5vw,80px)]" data-reveal-group>
        {/* <span className="bwt-partner__rule mb-8 block h-px w-[72px] bg-[#111]" data-reveal aria-hidden="true" /> */}
        {/* <p className="bwt-label font-secondary text-[13px] font-semibold leading-normal tracking-[0.06em] text-[#111]/52" data-reveal>
          {evolkunSection.label}
        </p> */}
        <h2 id="bwt-partner-title" className={`bwt-partner__title mt-5 max-w-[14em] ${sectionHeadingClasses}`} data-reveal>
          {evolkunSection.heading}
        </h2>
        <div className="
          bwt-partner__foot mt-[clamp(40px,5vw,72px)] flex items-end justify-between gap-8 border-t border-[#111]/10 pt-7
          max-[761px]:flex-col max-[761px]:items-start
        ">
          <p className="bwt-partner__copy max-w-[34em] text-[clamp(16px,1.3vw,20px)] text-[#111]/66 text-pretty leading-[1.6]" data-reveal>
            {evolkunSection.copy}
          </p>
          <div data-reveal>
            <EvolkunLink className={`${textLinkClasses} text-[clamp(16px,1.2vw,18px)] text-[#111]`}>{evolkunSection.cta}</EvolkunLink>
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
    <main ref={pageRef} className="bwt-page relative isolate overflow-x-clip bg-white font-secondary text-[#111] antialiased selection:bg-bw-lime selection:text-[#111]">
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
