import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Pause, Play, Plus } from 'lucide-react'
import { Link } from '../../routing'
import { useNativeMetadata } from '../../routing/context'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PHOTOS = {
  orange: '/images/concept-creation/orange-study.webp',
  water: '/images/concept-creation/sunlit-water.webp',
  grove: '/images/concept-creation/orange-grove.webp',
}
const shell = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-[var(--hero-gutter)]'
const label = 'text-[10px] font-medium uppercase tracking-[0.16em] leading-relaxed'
const heading = 'm-0 font-medium tracking-[-0.035em] leading-[1.15] text-[clamp(26px,2.6vw,36px)]'
const CAMPAIGN_FORMATS = ['Outdoor', 'Social', 'Packaging']
const CAMPAIGN_INTERVAL = 2500
const subscribeToHydration = () => () => undefined
const clientSnapshot = () => true
const serverSnapshot = () => false
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b33e14]'
const body = 'm-0 text-[15px] leading-[1.75] text-[#62635d]'
const FAQS = [
  ['Can you start with a problem rather than a brief?', 'Yes. Tell us what needs to change, who you need to reach and what is getting in the way. We can shape the brief together.'],
  ['Can you take the idea into production?', 'Yes. Our design, photography, film, social and web teams can bring it to life. We can also prepare a toolkit for your existing partners.'],
  ['How do timelines and ownership work?', 'We agree the scope, timeline, deliverables and usage rights in the proposal before work begins. The right process depends on your brief.'],
]
const STEPS = [
  { title: 'Get close to the real problem.', text: 'We listen to your team and your audience. We look beyond the requested deliverable to find what the work actually needs to change.', note: 'A sharper brief', word: 'Listen' },
  { title: 'Find the interesting tension.', text: 'What people say, what they do, and the gap between the two. We look for a human truth your brand has a reason to speak about.', note: 'An insight worth exploring', word: 'Connect' },
  { title: 'Give the thought a shape.', text: 'We explore different creative routes through words, images and rough executions. You see the thinking before we polish the surface.', note: 'Distinct creative directions', word: 'Explore' },
  { title: 'See if it has somewhere to go.', text: 'We put the chosen idea into real formats. Then we refine the line, visual direction and toolkit so the concept holds together beyond the presentation.', note: 'One idea. Many expressions.', word: 'Make' },
]

function Sun({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="19" stroke="currentColor" strokeWidth="1.5" />
      <path d="M50 6v14m0 60v14M6 50h14m60 0h14M19 19l10 10m42 42 10 10M19 81l10-10m42-42 10-10M33 9l5 12m24 58 5 12M9 33l12 5m58 24 12 5M9 67l12-5m58-24 12-5M33 91l5-12m24-58 5-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Advance only while the preview is visible; manual selection restarts its clock. */
function useRotatingPreview(count: number) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const motionPreference = useReducedMotion()
  // Keep the first client render identical to SSR before applying motion preferences.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)
  const reducedMotion = hydrated && Boolean(motionPreference)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.25 })

  useEffect(() => {
    if (paused || reducedMotion || !inView) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % count)
    }, CAMPAIGN_INTERVAL)
    return () => window.clearInterval(timer)
  }, [index, count, paused, reducedMotion, inView])

  return { index, setIndex, paused, setPaused, reducedMotion, ref }
}

/** A little physical thinking: reference, association, then a creative platform. */
function IdeaWorkbench() {
  const { index: stage, setIndex: setStage, paused, setPaused, reducedMotion, ref } = useRotatingPreview(3)
  const routes = ['Start with a truth', 'Make a connection', 'Find the concept']
  const captions = [
    'The product truth: oranges grow in the sunshine.',
    'The human truth: sometimes a little brightness changes your day.',
    'The concept: a little sunshine, bottled. A feeling the brand can own.',
  ]
  const transition = { duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div ref={ref} className="min-w-0">
      <div className="relative isolate h-[370px] overflow-hidden rounded-[3px] bg-[#f0f0e9] sm:h-[480px] lg:h-[520px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#b9bbb0_0.7px,transparent_0.7px)] bg-size-[18px_18px] opacity-45" />
        <div className="absolute left-[19%] top-[18%] size-[240px] rounded-full border border-[#d9b060]/40 sm:size-[330px]" aria-hidden="true" />
        <motion.figure
          initial={false}
          animate={{ rotate: stage === 0 ? -3 : -9, x: stage === 0 ? 30 : 0, y: stage === 0 ? 10 : 0 }}
          transition={transition}
          className="absolute left-[7%] top-[21%] m-0 w-[44%] bg-white p-2 shadow-[0_6px_16px_#242a1910]"
        >
          <img src={PHOTOS.orange} alt="A single orange on a pale surface, the starting point for a creative idea" width="1100" height="1508" fetchPriority="high" className="aspect-square w-full object-cover" />
          <span className="absolute -top-3 left-[32%] h-6 w-[40%] -rotate-6 bg-[#d8d1b8]/60" aria-hidden="true" />
        </motion.figure>
        <motion.figure
          initial={false}
          animate={{ opacity: stage >= 1 ? 1 : 0, rotate: stage === 2 ? 8 : 5, y: stage >= 1 ? 0 : 30 }}
          transition={transition}
          aria-hidden={stage < 1}
          className="absolute right-[7%] top-[16%] m-0 w-[42%] bg-white p-2 shadow-[0_8px_24px_#242a1918]"
        >
          <img src={PHOTOS.water} alt="Warm sunlight reflected on ocean waves, a reference for a brighter feeling" width="1600" height="1067" className="aspect-[5/4] w-full object-cover" />
        </motion.figure>
        <svg className="pointer-events-none absolute left-[34%] top-[44%] h-[21%] w-[32%] text-[#b34923]" viewBox="0 0 170 90" fill="none" aria-hidden="true">
          <path d="M8 4c-22 77 109 81 151 27m-23 5 24-9-3 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <motion.div
          initial={false}
          animate={{ opacity: stage === 2 ? 1 : 0, y: stage === 2 ? 0 : 24, rotate: stage === 2 ? -3 : 2 }}
          transition={transition}
          aria-hidden={stage !== 2}
          className="absolute bottom-[10%] right-[9%] z-10 w-[60%] bg-[#f6ed91] px-5 py-5 shadow-[2px_7px_14px_#34341d15] sm:w-[57%] sm:px-7 sm:py-6"
        >
          <p className="m-0 max-w-[15ch] font-[family-name:var(--section-title-font)] text-[24px] font-medium leading-[1.12] tracking-[-0.035em] text-[#353a27] sm:text-[31px]">A little sunshine,<br />bottled.</p>
          <Sun className="absolute bottom-5 right-4 size-12 -rotate-12 text-[#a96025] sm:size-16" />
        </motion.div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Explore the concept creation stages">
        {routes.map((route, i) => (
          <button key={route} type="button" aria-pressed={stage === i} aria-controls="concept-stage-description" onClick={() => setStage(i)} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[11px]! transition-colors sm:px-4 ${focus} ${stage === i ? 'border-[#343c2b] bg-[#343c2b] text-white' : 'border-[#dedfd7] bg-transparent text-[#5c6153] hover:border-[#818773] hover:bg-[#eeeee7]'}`}>
            <span className="font-mono text-[9px] opacity-60"></span>{route}
          </button>
        ))}
        {!reducedMotion && (
          <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? 'Resume concept rotation' : 'Pause concept rotation'} title={paused ? 'Resume' : 'Pause'} className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dedfd7] text-[#626859] transition-colors hover:bg-[#eeeee7] ${focus}`}>
            {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          </button>
        )}
      </div>
      <p id="concept-stage-description" aria-live={paused || reducedMotion ? 'polite' : 'off'} className="mb-0 mt-3 min-h-10 max-w-[60ch] text-[12px] leading-relaxed text-[#717369]">{captions[stage]}</p>
    </div>
  )
}

function ConceptHero() {
  return (
    <section className={`${shell} pb-14 pt-28 sm:pb-20 sm:pt-36`} aria-labelledby="concept-heading">
      {/* <div className="mb-9 flex items-center gap-3 text-[11px] text-[#6f7267] lg:mb-12">
        <Link to="/services" className={`transition-colors hover:text-[#b33e14] ${focus}`}>Services</Link><span aria-hidden="true">/</span><span>Concept creation</span>
      </div> */}
      <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:gap-16">
        <div data-concept-reveal>
          <h1 id="concept-heading" className="m-0 max-w-[16ch] text-[clamp(32px,3.3vw,44px)] font-medium leading-[1.12] tracking-[-0.04em]">Same fruit.<br />Different thought.</h1>
          <p className={`${body} mt-6 max-w-[36ch]`}>The world has enough content. We find the idea that gives yours a reason to exist.</p>
          <p className={`${body} mt-4 max-w-[37ch]`}>Concept creation connects a brand truth with a human feeling. Then gives that connection a life of its own.</p>
          <a href="#concept-in-action" className={`mt-8 inline-flex min-h-11 items-center gap-5 border-b border-[#383d30] pb-1 text-[12px] font-medium text-[#343c2b] transition-colors hover:text-[#b33e14] ${focus}`}>Follow a thought <ArrowDown size={15} strokeWidth={1.5} /></a>
        </div>
        <IdeaWorkbench />
      </div>
    </section>
  )
}

function TheConnection() {
  return (
    <section className="border-y border-[#e2e3db] bg-white" aria-labelledby="connection-heading">
      <div className={`${shell} py-14 sm:py-20`}>
        <div data-concept-reveal className="grid gap-6 md:grid-cols-2 md:gap-16">
          <h2 id="connection-heading" className={`${heading} max-w-[18ch]`}>A concept is the connection.<br /><span className="text-[#92958b]">The work grows from it.</span></h2>
          <p className={`${body} max-w-[48ch] md:self-end`}>An image can catch your eye. A line can make you smile. A concept gives them a shared purpose, so every piece of the campaign feels like part of the same thought.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            ['Product truth', 'Grown in the sun.', 'Start with something true about the brand.'],
            ['Human truth', 'We all need a brighter day.', 'Find something people can feel.'],
            ['Creative platform', 'A little sunshine, bottled.', 'Turn the connection into an idea you can build on.'],
          ].map(([title, text, description], i) => (
            <div key={title} data-concept-reveal className="relative border-t border-[#d9ddd0] pt-5">
              <span className={`${label} text-[#828778]`}>{title}</span>
              <h3 className="mb-0 mt-4 text-[18px] font-medium leading-snug tracking-[-0.02em]">{text}</h3>
              <p className="mb-0 mt-2 max-w-[32ch] text-[12px] leading-relaxed text-[#73766a]">{description}</p>
              {i < 2 && <ArrowRight className="absolute -right-8 top-5 hidden text-[#a1a791] md:block" size={16} strokeWidth={1} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** CSS-built campaign applications: original layouts over sourced reference photography. */
function CampaignPreview({ format }: { format: number }) {
  return (
    <div className="relative flex h-full min-h-[380px] items-center justify-center overflow-hidden bg-[#e8e8e0] px-5 py-10 sm:min-h-[500px] sm:px-12" aria-label={['Outdoor campaign concept', 'Social campaign concept', 'Packaging campaign concept'][format]} role="img">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,#ffffff65_40.2%,transparent_75%)]" />
      {format === 0 && (
        <div className="relative w-full max-w-[800px]">
          <div className="relative z-10 grid h-[clamp(240px,29vw,350px)] grid-cols-[1fr_1fr] overflow-hidden border-[7px] border-[#51564c] bg-[#fff9d8] shadow-[12px_18px_0_#00000008] sm:border-[10px]">
            <div className="flex flex-col items-start justify-between p-4 sm:p-8">
              <span className="font-[family-name:var(--section-title-font)] text-[16px] font-semibold tracking-[-0.06em] text-[#9a411d] sm:text-[22px]">daylight<span className="text-[10px]">®</span></span>
              <div><Sun className="mb-3 size-9 text-[#b34d22] sm:mb-5 sm:size-12" /><p className="m-0 max-w-[12ch] text-[clamp(19px,2.8vw,34px)] font-medium leading-[1.1] tracking-[-0.04em] text-[#643c23]">A little<br />sunshine,<br />bottled.</p></div>
              <span className="mt-4 text-[8px] text-[#866948] sm:text-[10px]">Good mornings. Grown naturally.</span>
            </div>
            <img src={PHOTOS.grove} alt="" loading="lazy" width="1000" height="1500" className="h-full min-h-0 w-full object-cover" />
          </div>
          <div className="mx-auto flex h-12 w-[72%] justify-between sm:h-16" aria-hidden="true"><span className="w-2 bg-[#51564c]" /><span className="w-2 bg-[#51564c]" /></div>
          <div className="mx-auto h-px w-[90%] bg-[#555e4530]" aria-hidden="true" />
        </div>
      )}
      {format === 1 && (
        <div className="relative flex w-full max-w-[660px] items-center justify-center gap-4 sm:gap-8">
          <div className="relative w-[47%] -rotate-5 bg-[#fff9d8] p-3 pb-5 shadow-[0_10px_30px_#29301818] sm:p-5">
            <span className="text-[12px] font-semibold tracking-[-0.05em] text-[#9a411d] sm:text-[18px]">daylight®</span>
            <img src={PHOTOS.orange} alt="" width="1100" height="1508" loading="lazy" className="my-4 aspect-square w-full rounded-full object-cover mix-blend-multiply" />
            <p className="m-0 text-[16px] leading-[1.15] tracking-[-0.025em] text-[#643c23] sm:text-[24px]">Forecast:<br />a brighter day.</p>
          </div>
          <div className="relative w-[43%] rotate-6 overflow-hidden border-[5px] border-[#33382d] bg-[#33382d] shadow-[0_12px_28px_#29301820] sm:border-[7px]">
            <img src={PHOTOS.water} alt="" width="1600" height="1067" loading="lazy" className="aspect-[9/15] w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between p-3 text-white sm:p-5"><span className="text-[12px] font-medium">daylight®</span><div><Sun className="mb-4 size-10 sm:size-14" /><p className="m-0 text-[18px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[28px]">Take a sip.<br />Let the day in.</p><span className="mt-5 inline-block rounded-full border border-white/60 px-3 py-1.5 text-[8px] sm:text-[10px]">Find your sunshine ↗</span></div></div>
          </div>
        </div>
      )}
      {format === 2 && (
        <div className="relative flex w-full max-w-[650px] items-end justify-center gap-5 sm:gap-10">
          <div className="relative w-[43%] max-w-[230px] -rotate-6 rounded-t-[20px] rounded-b-[26px] border-x-[3px] border-[#e5bd5a] bg-[#f9df80] px-4 pb-7 pt-5 shadow-[10px_16px_25px_#4d381720] sm:px-7">
            <div className="absolute inset-x-0 top-0 h-3 rounded-[50%] border border-[#9c9568] bg-[#d6d4c3]" />
            <span className="mt-7 block text-center text-[20px] font-semibold tracking-[-0.055em] text-[#86441f] sm:text-[30px]">daylight®</span>
            <Sun className="mx-auto my-8 size-16 text-[#b65a20] sm:my-12 sm:size-24" />
            <p className="m-0 text-center text-[15px] font-medium leading-[1.15] text-[#86441f] sm:text-[20px]">A little sunshine,<br />bottled.</p>
            <span className="mt-5 block text-center text-[8px] uppercase tracking-[0.12em] text-[#885b37] sm:text-[10px]">Orange · 250ml</span>
          </div>
          <div className="relative mb-4 w-[40%] max-w-[220px] rotate-5 bg-[#fff9d8] p-4 text-[#86441f] shadow-[4px_8px_18px_#4d381710] sm:p-6">
            <span className={`${label} text-[8px]`}>A note from daylight</span><p className="mb-0 mt-5 text-[20px] font-medium leading-tight tracking-[-0.03em] sm:text-[29px]">Open on<br />a cloudy day.</p>
            <img src={PHOTOS.grove} alt="" width="1000" height="1500" loading="lazy" className="mt-6 aspect-square w-full object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}

function AnIdeaInTheWorld() {
  const { index: format, setIndex: setFormat, paused, setPaused, reducedMotion, ref: previewRef } = useRotatingPreview(CAMPAIGN_FORMATS.length)
  const descriptions = ['A small moment of brightness on an ordinary journey.', 'A recognisable thought, adapted to the way people scroll.', 'The same promise, right there in someone’s hand.']
  return (
    <section id="concept-in-action" className={`${shell} scroll-mt-24 py-16 sm:py-24`} aria-labelledby="campaign-heading">
      <div data-concept-reveal className="mb-9 grid items-end gap-7 md:grid-cols-[1fr_auto]">
        {/* <div><p className={`${label} mb-4 mt-0 text-[#7b8070]`}>One thought, out in the world</p><h2 id="campaign-heading" className={heading}>An idea should have legs.</h2><p className={`${body} mt-4 max-w-[55ch]`}>The format changes. The feeling stays. Here’s how our sunshine thought could become a campaign.</p></div> */}
        <div className="flex gap-1 rounded-full border border-[#dfe1d6] p-1 justify-self-start" role="group" aria-label="Choose a campaign format">
          {CAMPAIGN_FORMATS.map((name, i) => <button key={name} type="button" aria-pressed={format === i} aria-controls="campaign-preview" onClick={() => setFormat(i)} className={`min-h-10 cursor-pointer rounded-full px-4 text-[11px]! transition-colors duration-500 motion-reduce:transition-none ${focus} ${format === i ? 'bg-[#343c2b] text-white' : 'text-[#626859] hover:bg-[#eeeee7]'}`}>{name}</button>)}
          {!reducedMotion && (
            <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? 'Resume campaign rotation' : 'Pause campaign rotation'} title={paused ? 'Resume' : 'Pause'} className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#626859] transition-colors hover:bg-[#eeeee7] ${focus}`}>
              {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
      <div ref={previewRef} id="campaign-preview" className="grid overflow-hidden bg-[#e8e8e0]">
        {CAMPAIGN_FORMATS.map((name, i) => (
          <motion.div
            key={name}
            initial={false}
            animate={{ opacity: format === i ? 1 : 0, y: reducedMotion || format === i ? 0 : 10, scale: reducedMotion || format === i ? 1 : 0.985 }}
            transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden={format !== i}
            className={`min-w-0 [grid-area:1/1] ${format === i ? '' : 'pointer-events-none'}`}
          >
            <CampaignPreview format={i} />
          </motion.div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-[11px] leading-relaxed text-[#74796a] sm:grid-cols-[1fr_auto]">
        {/* <p aria-live="polite" className="m-0">{descriptions[format]}</p><p className="m-0">daylight® is a fictional brand · Studio exploration</p> */}
      </div>
    </section>
  )
}

function TheProcess() {
  const [step, setStep] = useState(0)
  return (
    <section className="bg-[#eeeee7]" aria-labelledby="process-heading">
      <div className={`${shell} grid gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:gap-20`}>
        <div data-concept-reveal>
          {/*  */}
          <h2 id="process-heading" className={`${heading} max-w-[18ch]`}>We ask a little more.<br />To make something matter.</h2>
          <div className="relative mt-10 grid aspect-[5/4] max-w-[480px] place-items-center overflow-hidden bg-[#dedfd3]">
            <img src={PHOTOS.grove} alt="Ripe oranges among green leaves: looking closely at the real product before inventing a story" width="1000" height="1500" loading="lazy" className="absolute left-6 top-7 h-[73%] w-[56%] -rotate-6 object-cover shadow-sm sm:left-9" />
            <div className="absolute right-[7%] top-[24%] w-[53%] rotate-5 bg-[#faf8ed] p-5 shadow-[0_5px_18px_#33381712] sm:p-7">
              <p className="m-0 text-[22px] font-medium leading-[1.18] tracking-[-0.03em] text-[#454d38] sm:text-[28px]">Why would<br />anyone care?</p>
            </div>
          </div>
        </div>
        <div className="self-center">
          {STEPS.map((item, i) => (
            <div key={item.word} className="border-t border-[#cfd3c3] last:border-b">
              <h3 className="m-0"><button type="button" aria-expanded={step === i} aria-controls={`concept-process-${i}`} id={`concept-process-trigger-${i}`} onClick={() => setStep(step === i ? -1 : i)} className={`flex min-h-[76px] w-full cursor-pointer items-center gap-4 py-5 text-left transition-colors hover:text-[#b33e14] ${focus}`}><span className="w-5 shrink-0 font-mono text-[10px] text-[#919780]">0{i + 1}</span><span className="flex-1 text-[18px] font-medium tracking-[-0.025em]">{item.word}</span><Plus size={16} strokeWidth={1.3} className={`shrink-0 transition-transform duration-300 motion-reduce:transition-none ${step === i ? 'rotate-45' : ''}`} aria-hidden="true" /></button></h3>
              <div id={`concept-process-${i}`} role="region" aria-labelledby={`concept-process-trigger-${i}`} hidden={step !== i} className="pb-7 pl-9">
                <p className="m-0 text-[15px] font-medium">{item.title}</p><p className={`${body} mb-5 mt-3 max-w-[45ch]`}>{item.text}</p><span className="inline-flex items-center gap-2 text-[11px] text-[#68724e]"><Check size={12} strokeWidth={1.5} aria-hidden="true" />{item.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TheTakeaway() {
  return (
    <section className={`${shell} grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`} aria-labelledby="takeaway-heading">
      <div data-concept-reveal><h2 id="takeaway-heading" className={heading}>More than a good line.</h2><p className={`${body} mt-5 max-w-[38ch]`}>You leave with a clear creative direction and the tools to carry it forward. We shape the exact scope around your brief.</p></div>
      <dl className="m-0 grid gap-x-10 sm:grid-cols-2">
        {[
          ['Creative routes', 'Different ways into the same challenge.'],
          ['The core concept', 'The idea, its insight and its reason to exist.'],
          ['Words with a point of view', 'Campaign lines, stories and tone.'],
          ['A visual direction', 'References, key visuals and art direction.'],
          ['Channel expressions', 'Proof that the idea works beyond one format.'],
          ['A practical toolkit', 'A clear handover for the people making it.'],
        ].map(([title, text]) => <div key={title} data-concept-reveal className="border-t border-[#dfe2d6] py-6"><dt className="text-[15px] font-medium tracking-[-0.015em]">{title}</dt><dd className="mb-0 ml-0 mt-2 text-[12px] leading-relaxed text-[#72796a]">{text}</dd></div>)}
      </dl>
    </section>
  )
}

function QuestionsAndNextThought() {
  return (
    <>
      <section className={`${shell} grid gap-8 border-t border-[#e1e4d8] py-14 md:grid-cols-[0.9fr_1.1fr] md:gap-20`} aria-labelledby="questions-heading">
        <h2 id="questions-heading" className="m-0 text-[24px] font-medium tracking-[-0.025em]">A few things you might ask.</h2>
        <div>{FAQS.map(([question, answer]) => <details key={question} className="group border-b border-[#e1e4d8] first:border-t"><summary className={`flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-5 text-[13px] font-medium transition-colors hover:text-[#b33e14] [&::-webkit-details-marker]:hidden ${focus}`}>{question}<Plus size={14} strokeWidth={1.5} className="shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" /></summary><p className={`${body} max-w-[53ch] pb-6 text-[13px]`}>{answer}</p></details>)}</div>
      </section>
      <section className={`${shell} pb-16 pt-8 sm:pb-24`} aria-labelledby="next-thought-heading">
        <div data-concept-reveal className="relative overflow-hidden bg-[#d5fa76] px-7 py-12 sm:px-12 sm:py-16">
          <Sun className="pointer-events-none absolute -right-12 -top-9 size-[260px] text-[#5c7134]/15 sm:right-[3%] sm:top-[-80px] sm:size-[380px]" />
          <div className="relative grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <div><h2 id="next-thought-heading" className={`${heading} max-w-[19ch]`}>Bring us the<br />unfinished thought.</h2><p className="mb-0 mt-5 max-w-[39ch] text-[14px] leading-relaxed text-[#4f6030]">A new launch. An old problem. A scribble on a napkin. We can start there.</p></div>
            <Link to="/start-project" className={`inline-flex min-h-12 items-center justify-between gap-10 rounded-full bg-[#343c2b] px-6 text-[12px] font-medium text-white transition-colors hover:bg-[#4e5a3c] md:mb-1 ${focus}`}>Let’s find your idea <ArrowUpRight size={17} strokeWidth={1.5} /></Link>
          </div>
        </div>
        <p className="mb-0 mt-5 text-[10px] leading-relaxed text-[#828779]">Photography: <a href="https://unsplash.com/photos/orange-fruit-on-white-table-PUMfrQZQfFU" target="_blank" rel="noreferrer" className={`underline underline-offset-2 hover:text-[#343c2b] ${focus}`}>Jocelyn Morales</a>, <a href="https://unsplash.com/photos/wave-of-water-OKagoQYqEy8" target="_blank" rel="noreferrer" className={`underline underline-offset-2 hover:text-[#343c2b] ${focus}`}>Dakota Feliciano</a> &amp; <a href="https://unsplash.com/photos/a-tree-filled-with-lots-of-ripe-oranges-LuWr5tVYiFo" target="_blank" rel="noreferrer" className={`underline underline-offset-2 hover:text-[#343c2b] ${focus}`}>Igor Sporynin</a> / Unsplash.</p>
      </section>
    </>
  )
}
function usePageMetadata(siteUrl?: string) {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    const previousTitle = document.title
    if (!nativeMetadata) document.title = 'Concept Creation | BrandWorks'
    const description = 'Concept creation from BrandWorks: we find one clear idea for your brand and show how it works across film, outdoor, packaging, social and retail.'
    const existing = nativeMetadata ? null : document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = existing?.content
    const meta = existing ?? (!nativeMetadata ? document.createElement('meta') : null)
    if (meta) {
      meta.name = 'description'
      meta.content = description
      if (!existing) document.head.appendChild(meta)
    }

    let origin = window.location.origin
    try { if (siteUrl) origin = new URL(siteUrl).origin } catch { /* keep current origin */ }
    const pageUrl = `${origin}/services/concept-creation`
    const canonical = nativeMetadata ? null : document.createElement('link')
    if (canonical) {
      canonical.rel = 'canonical'
      canonical.href = pageUrl
      document.head.appendChild(canonical)
    }

    const schema = document.createElement('script')
    schema.type = 'application/ld+json'
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Service', name: 'Concept creation', serviceType: 'Creative concept development', url: pageUrl, description, provider: { '@type': 'Organization', name: 'BrandWorks', url: origin } },
        { '@type': 'FAQPage', mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ],
    })
    document.head.appendChild(schema)

    return () => {
      if (!nativeMetadata) {
        document.title = previousTitle
        if (existing && previousDescription !== undefined) existing.content = previousDescription
        else meta?.remove()
        canonical?.remove()
      }
      schema.remove()
    }
  }, [siteUrl, nativeMetadata])
}


export default function ConceptCreationPage({ siteUrl }: { siteUrl?: string }) {
  usePageMetadata(siteUrl)
  const ref = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-concept-reveal]', ref.current).forEach((element) => {
        gsap.from(element, {
          y: 22, opacity: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 92%', once: true },
        })
      })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <main ref={ref} className="overflow-x-clip bg-[#fafaf7] font-secondary text-[#343c2b] [--font-primary:var(--section-title-font)]">
      <ConceptHero />
      <TheConnection />
      <AnIdeaInTheWorld />
      <TheProcess />
      <TheTakeaway />
      <QuestionsAndNextThought />
    </main>
  )
}
