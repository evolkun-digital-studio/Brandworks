import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useMotionTemplate,
  useScroll,
  useTransform,
} from 'motion/react'
import type { MotionValue } from 'motion/react'

const services = [
  { name: 'Videography', description: 'Concept-led films and moving brand stories.' },
  { name: 'Photography', description: "Distinctive imagery shaped around the brand's visual language." },
  { name: 'PR', description: 'Stories worth telling, placed where they can matter.' },
  {
    name: 'Founder Reputation Management',
    description: 'Build a credible public presence around the people behind the brand.',
  },
  {
    name: 'Performance & SEO Marketing',
    description: 'Connect creative thinking with discovery, demand and measurable growth.',
  },
  {
    name: 'Graphics & Animation',
    description: 'Turn brand systems into expressive visual and motion communication.',
  },
  {
    name: 'Social Media & Content Creation',
    description: 'Carry one brand idea consistently across formats and conversations.',
  },
]

// Preferred first-line breaks for the long names in the scroll index;
// narrower columns may still wrap further, but never at a worse point.
const LINE_BREAKS: Record<string, string> = {
  'Founder Reputation Management': 'Founder Reputation',
  'Performance & SEO Marketing': 'Performance & SEO',
  'Social Media & Content Creation': 'Social Media &',
}

const TOTAL = services.length
const pad = (n: number) => String(n).padStart(2, '0')

const INTRO_WORDS = ['Different', 'disciplines.', null, 'One', 'connected', 'system.'] as const
const INTRO_WORD_COUNT = INTRO_WORDS.filter(Boolean).length

const EASE = [0.22, 1, 0.36, 1] as const
const GROTESK = "font-['Google_Sans_Flex','Helvetica',sans-serif]"
// Display type uses the Thin cut; small text (labels, counters, copy) Regular.
const DISPLAY = `${GROTESK} font-thin`

// The title is SemiBold, from the variable display cut (see .services-display).
const TITLE_CLASS = `services-display font-semibold text-[clamp(44px,12vw,64px)] leading-[0.96] tracking-[-0.04em] text-[#111] md:text-[clamp(46px,4.7vw,78px)]`
const LABEL_CLASS = `${GROTESK} text-[11px] leading-none font-normal tracking-[0.14em] text-[#777] uppercase`
const COUNTER_CLASS = `${GROTESK} text-[11px] leading-none font-normal tracking-[0.08em] text-[#888] tabular-nums`

// The runway's scroll progress (0 = stage pinned, 1 = released) is
// mapped linearly onto the list: row 0 sits on the focus line at
// FOCUS_START and the last row at FOCUS_END, with a short hold on
// either side so the first and last services get a moment in focus.
const FOCUS_START = 0.06
const FOCUS_END = 0.92

// Focus steps by distance (in rows) from the focus line. Tone is opacity
// on #111 and size is a transform scale on one shared base font-size, so
// both stay on the compositor instead of re-laying out text every frame.
const OPACITY_BY_DISTANCE = [1, 0.55, 0.28, 0.08] as const
const SCALE_BY_DISTANCE = [1.18, 0.94, 0.86, 0.8] as const
const BLUR_BY_DISTANCE = [0, 0, 0.3, 1, 1.4] as const

/** Piecewise-linear lookup: distance (in rows) from the focus line → value. */
function lookup(table: readonly number[], d: number) {
  const i = Math.floor(d)
  if (i >= table.length - 1) return table[table.length - 1]
  return table[i] + (table[i + 1] - table[i]) * (d - i)
}

/** Centre (px, within the list) of the fractional row index `s`. */
function centerAt(c: number[], s: number) {
  const lo = Math.max(0, Math.min(TOTAL - 1, Math.floor(s)))
  const hi = Math.min(TOTAL - 1, lo + 1)
  return c[lo] + (c[hi] - c[lo]) * (s - lo)
}

type Mode = 'scroll' | 'stacked' | 'static'

const MIN_SCROLL_WIDTH = '(min-width: 768px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function matches(query: string) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

function currentMode(): Mode {
  if (matches(REDUCED_MOTION)) return 'static'
  return matches(MIN_SCROLL_WIDTH) ? 'scroll' : 'stacked'
}

/**
 * Phones get stacked rows, tablet/desktop get the sticky index, and
 * reduced motion always gets the static list. Only one variant is ever
 * rendered, so the service list never appears twice in the DOM.
 */
function useMode() {
  const [mode, setMode] = useState<Mode>(currentMode)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const queries = [MIN_SCROLL_WIDTH, REDUCED_MOTION].map((q) => window.matchMedia(q))
    const onChange = () => setMode(currentMode())
    queries.forEach((q) => q.addEventListener('change', onChange))
    return () => queries.forEach((q) => q.removeEventListener('change', onChange))
  }, [])

  return mode
}

function Capabilities() {
  const mode = useMode()
  const animated = mode !== 'static'

  return (
    <section aria-labelledby="our-services-heading" className="bg-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 md:px-[7vw]">
        <div className="grid grid-cols-1 gap-y-6 border-t border-black/[0.08] pt-20 pb-5 sm:pt-28 md:grid-cols-12 md:gap-x-6 md:pb-12 lg:pt-36">
          {animated ? (
            <IntroHeading />
          ) : (
            <h2 className={INTRO_CLASS}>
              Different disciplines.
              <br />
              One connected system.
            </h2>
          )}

          {/* <p className={`${GROTESK} site-copy font-normal max-w-[440px] self-end text-[#777] md:col-span-5 md:col-start-8`}>
            From the first concept to the way it reaches people,
            <br className="hidden lg:block" /> Brandworks carries one thought
            across every discipline.
          </p> */}
        </div>
      </div>

      {mode === 'scroll' ? <ServiceScrollIndex /> : <ServiceStack animated={animated} />}
    </section>
  )
}

const INTRO_CLASS = `${DISPLAY} text-[clamp(2rem,3.4vw,3rem)] leading-[1.04] tracking-[-0.04em] text-[#111] md:col-span-7`

/**
 * Intro H2: word-by-word opacity .15 → 1 / blur 4px → 0, scrubbed by
 * the heading's own position in the viewport (same idea as About.tsx).
 */
function IntroHeading() {
  const ref = useRef<HTMLHeadingElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.42'] })

  return (
    <h2 ref={ref} className={INTRO_CLASS}>
      {INTRO_WORDS.map((word, i) => {
        if (word === null) return <br key={`br-${i}`} />
        const index = INTRO_WORDS.slice(0, i).filter(Boolean).length
        return (
          <IntroWord key={word} progress={scrollYProgress} index={index}>
            {word}
            {INTRO_WORDS[i + 1] ? ' ' : ''}
          </IntroWord>
        )
      })}
    </h2>
  )
}

function IntroWord({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>
  index: number
  children: ReactNode
}) {
  const range = [index / INTRO_WORD_COUNT, (index + 2.5) / INTRO_WORD_COUNT]
  const opacity = useTransform(progress, range, [0.15, 1])
  const blur = useTransform(progress, range, [4, 0])
  const filter = useMotionTemplate`blur(${blur}px)`

  return (
    <motion.span style={{ opacity, filter }} className="inline-block">
      {children}
    </motion.span>
  )
}

/** Thin, long arrow drawn as a hairline — the typographic → glyph is too heavy in most fallbacks. */
function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 56 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-auto w-[clamp(40px,3.4vw,56px)] text-[#111]"
    >
      <line x1="1" y1="8" x2="54" y2="8" />
      <polyline points="47 1.5 54 8 47 14.5" />
    </svg>
  )
}

/**
 * Tablet/desktop: a 320vh (240vh on tablet) runway with a 100vh sticky
 * stage. Native page scroll drives everything — useScroll reads how far
 * the runway has travelled, the list's y is a straight linear map of
 * that, and each row's tone is derived from its distance to the focus
 * line. React state only changes when the active service changes.
 */
function ServiceScrollIndex() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // Row centres (px within the list) and the window height, measured
  // from layout. Bumping `layout` makes every derived value recompute.
  const centers = useRef<number[]>([])
  const windowHeight = useRef(0)
  const layout = useMotionValue(0)

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // Fractional index of the row on the focus line — linear (ease: none).
  const focus = useTransform(scrollYProgress, [FOCUS_START, FOCUS_END], [0, TOTAL - 1])
  const y = useTransform([focus, layout], ([s]: number[]) =>
    centers.current.length === TOTAL ? windowHeight.current / 2 - centerAt(centers.current, s) : 0,
  )

  const [active, setActive] = useState(0)
  useMotionValueEvent(focus, 'change', (s) => {
    const next = Math.max(0, Math.min(TOTAL - 1, Math.round(s)))
    setActive((prev) => (prev === next ? prev : next))
  })

  // offsetTop ignores transforms, so measurements stay stable while the
  // list moves; re-measured whenever it reflows (wrapping, fonts, resize).
  useLayoutEffect(() => {
    const measure = () => {
      centers.current = itemRefs.current.map((item) =>
        item ? item.offsetTop + item.offsetHeight / 2 : 0,
      )
      windowHeight.current = windowRef.current?.clientHeight ?? 0
      layout.set(layout.get() + 1)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (listRef.current) observer?.observe(listRef.current)
    if (windowRef.current) observer?.observe(windowRef.current)
    return () => observer?.disconnect()
  }, [layout])

  return (
    <div ref={runwayRef} className="relative min-h-[240vh] lg:min-h-[320vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-[4.5fr_1fr_6.5fr] gap-x-[clamp(16px,2vw,40px)] px-[7vw]">
          {/* Left: label + counter, title on the focus line, active detail. */}
          <div className="relative h-full">
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2">
              <div className="absolute bottom-full left-0 mb-[clamp(20px,2.6vh,32px)] flex items-baseline gap-6">
                <span className={LABEL_CLASS}>What we do</span>
                <span aria-hidden="true" className={COUNTER_CLASS}>
                  {pad(active + 1)} / {pad(TOTAL)}
                </span>
              </div>

              <h2 id="our-services-heading" className={TITLE_CLASS}>
                Our Services.
              </h2>

              <div
                aria-hidden="true"
                className="absolute top-full left-0 mt-[clamp(28px,4.5vh,52px)] w-full max-w-[380px]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={active}
                    className={`${GROTESK} text-[16px] leading-[1.4] font-normal text-[#777]`}
                    initial={{ opacity: 0, filter: 'blur(4px)', y: 6 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    exit={{ opacity: 0, filter: 'blur(4px)', y: -6 }}
                    transition={{ duration: 0.36, ease: EASE }}
                  >
                    {services[active].description}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Stationary arrow, sitting close to the index like the reference. */}
          <div className="flex h-full items-center justify-end">
            <Arrow />
          </div>

          {/* Right: masked window; the list inside is scrubbed by scroll. */}
          <div
            ref={windowRef}
            className="relative -mr-[7vw] h-full overflow-hidden pr-[7vw]"
            style={{
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 17%, black 83%, transparent 100%)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 17%, black 83%, transparent 100%)',
            }}
          >
            <motion.ul
              ref={listRef}
              style={{ y }}
              className="relative m-0 flex list-none flex-col gap-[clamp(34px,4.6vh,64px)] p-0 will-change-transform"
            >
              {services.map((service, i) => (
                <ServiceRow
                  key={service.name}
                  index={i}
                  name={service.name}
                  description={service.description}
                  active={i === active}
                  focus={focus}
                  layout={layout}
                  centers={centers}
                  itemRef={(node) => {
                    itemRefs.current[i] = node
                  }}
                />
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * One row of the index. Its distance to the focus line (in rows,
 * continuous) sets scale, tone and a whisper of blur on the far rows.
 * Scale grows from the left edge, so the text's alignment never moves
 * and its layout box (and thus the measured row centres) never changes.
 */
function ServiceRow({
  index,
  name,
  description,
  active,
  focus,
  layout,
  centers,
  itemRef,
}: {
  index: number
  name: string
  description: string
  /** The row the arrow points at — the same index as the counter. */
  active: boolean
  focus: MotionValue<number>
  layout: MotionValue<number>
  centers: RefObject<number[]>
  itemRef: (node: HTMLLIElement | null) => void
}) {
  // Small plateau so the focused row reads fully #111 between steps.
  const distance = useTransform([focus, layout], ([s]: number[]) =>
    centers.current.length === TOTAL ? Math.max(0, Math.abs(index - s) - 0.08) : index,
  )
  const opacity = useTransform(distance, (d) => lookup(OPACITY_BY_DISTANCE, d))
  const filter = useTransform(distance, (d) => {
    const blur = lookup(BLUR_BY_DISTANCE, d)
    return blur < 0.05 ? 'none' : `blur(${blur.toFixed(2)}px)`
  })
  const scale = useTransform(distance, (d) => lookup(SCALE_BY_DISTANCE, d))
  // The index tag cancels the row's scale so it stays a quiet 10px label.
  const tagScale = useTransform(scale, (v) => 1 / v)
  const firstLine = LINE_BREAKS[name]
  const rest = firstLine ? name.slice(firstLine.length).trim() : name
  const split = rest.lastIndexOf(' ')
  const head = split === -1 ? '' : rest.slice(0, split + 1)
  const last = rest.slice(split + 1)

  return (
    <motion.li
      ref={itemRef}
      style={{ opacity, filter, scale, transformOrigin: 'left center' }}
      className={`services-display service-row${active ? ' is-active' : ''} max-w-[400px] text-[clamp(36px,3.3vw,48px)] leading-[1.08] tracking-[-0.035em]`}
    >
      {firstLine && (
        <>
          {firstLine}
          <br />
        </>
      )}
      {head}
      {/* Small index tag riding the end of the name, like the reference's
         country codes — bound to the last word so it never wraps alone. */}
      <span className="whitespace-nowrap">
        {last}
        <motion.span
          aria-hidden="true"
          style={{ scale: tagScale, transformOrigin: 'left center' }}
          className="ml-[0.4em] inline-block align-top text-[10px] leading-[2.2] font-thin tracking-[0.08em] tabular-nums opacity-50"
        >
          {pad(index + 1)}
        </motion.span>
      </span>
      <span className="sr-only">: {description}</span>
    </motion.li>
  )
}

/**
 * Phones (and reduced motion at any width): a plain stacked editorial
 * list. Every row carries its number, name and description as text;
 * when animated, each row sharpens in once as it enters the viewport.
 */
function ServiceStack({ animated }: { animated: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-24 sm:px-8 md:grid md:grid-cols-12 md:gap-x-6 md:px-[7vw] md:pb-36">
      <div className="md:sticky md:top-[30vh] md:col-span-5 md:self-start">
        <span className={LABEL_CLASS}>What we do</span>
        <h2 id="our-services-heading" className={`mt-3 ${TITLE_CLASS}`}>
          Our Services.
        </h2>
      </div>

      <ul className="m-0 mt-14 list-none space-y-11 p-0 md:col-span-6 md:col-start-7 md:mt-0 md:space-y-14">
        {services.map((service, i) => (
          <motion.li
            key={service.name}
            initial={animated ? { opacity: 0, filter: 'blur(4px)', y: 12 } : false}
            whileInView={animated ? { opacity: 1, filter: 'blur(0px)', y: 0 } : undefined}
            viewport={{ once: true, margin: '0px 0px -12% 0px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span aria-hidden="true" className={`block ${COUNTER_CLASS}`}>
              {pad(i + 1)}
            </span>
            <span
              className={`${DISPLAY} mt-3 block text-[clamp(34px,10vw,50px)] leading-[1.1] tracking-[-0.035em] text-[#111] font-medium md:text-[clamp(38px,4.4vw,38px)]`}
            >
              {service.name}
            </span>
            <span className={`${GROTESK} site-copy mt-3 block max-w-[420px] font-normal text-[#777]`}>
              {service.description}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export default Capabilities
