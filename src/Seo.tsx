import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'

/* -------------------------------------------------------------------------- */
/*  SEO story section                                                         */
/*                                                                            */
/*  Five SEO ideas, each pairing copy with one analytical figure (plain       */
/*  SVG/HTML — no chart library) that acts as evidence, followed by the       */
/*  methodology and a closing statement. A figure can combine two related     */
/*  views into a single composition; they are never a dashboard grid.         */
/*                                                                            */
/*  Self-contained: Tailwind v4 utilities only, no global CSS, no motion      */
/*  library. Every figure is illustrative sample data, labelled as an         */
/*  "example" — it shows what we analyse, not results for a client.           */
/*                                                                            */
/*  Colour is reserved for data: blue = search / traffic, green = healthy /   */
/*  positive, orange = warning, red = critical.                               */
/*                                                                            */
/*  The page colour is the CSS variable --seo-bg (override it from the host   */
/*  via `className`, e.g. "[--seo-bg:#fff]").                                 */
/* -------------------------------------------------------------------------- */

export interface WebsiteSectionProps {
  /** Extra classes from the host page (spacing, background overrides, etc.). */
  className?: string
  /** Destination of the closing call to action. */
  ctaHref?: string
}

/* ---------------------------------- Data ---------------------------------- */

/** Deterministic pseudo-random series so charts look like real data but never change between renders. */
function makeSeries(length: number, base: number, drift: number, noise: number, seed: number) {
  let s = seed
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length }, (_, i) => {
    const seasonal = Math.sin((i / length) * Math.PI * 4) * noise * 0.25
    return Math.round((base + drift * (i / (length - 1)) + seasonal + (rand() - 0.5) * noise) * 10) / 10
  })
}

/** Monthly search volume (thousands), 12 months of weekly samples. */
const DEMAND = makeSeries(52, 152, 12, 44, 11)
const DEMAND_AVERAGE = 164
/** Organic clicks (thousands) this period vs. the previous period. */
const CLICKS = makeSeries(26, 6, 7.5, 2.4, 5)
const CLICKS_PREVIOUS = makeSeries(26, 6, 1.8, 1.6, 23)

type Intent = 'I' | 'C' | 'T' | 'N'

const INTENT_NAME: Record<Intent, string> = {
  I: 'Informational',
  C: 'Commercial',
  T: 'Transactional',
  N: 'Navigational',
}

/** Intent is a search dimension, so it stays in the blue family (plus neutral). */
const INTENT_SPLIT: readonly { intent: Intent; share: number; swatch: string }[] = [
  { intent: 'I', share: 58, swatch: 'bg-blue-600' },
  { intent: 'C', share: 27, swatch: 'bg-blue-400' },
  { intent: 'T', share: 12, swatch: 'bg-blue-300' },
  { intent: 'N', share: 3, swatch: 'bg-neutral-300' },
]

const KEYWORDS: readonly {
  term: string
  intent: Intent
  demand: string
  difficulty: number
  page: string
}[] = [
  { term: 'creative agency', intent: 'C', demand: '12K', difficulty: 61, page: '/creative-agency' },
  { term: 'branding agency', intent: 'C', demand: '8.4K', difficulty: 54, page: '/branding' },
  { term: 'performance marketing', intent: 'C', demand: '6.1K', difficulty: 58, page: '/performance' },
  { term: 'website design', intent: 'T', demand: '5.3K', difficulty: 49, page: '/web-design' },
]

const AUDIT_SPLIT = [
  { label: 'Critical', count: 3, bar: 'bg-red-500' },
  { label: 'Warnings', count: 12, bar: 'bg-orange-400' },
  { label: 'Healthy', count: 132, bar: 'bg-emerald-500' },
] as const

type Status = 'good' | 'warn'

const AUDIT_CHECKS: readonly { label: string; value: string; status: Status }[] = [
  { label: 'Indexing', value: '141 / 147', status: 'good' },
  { label: 'Page speed (LCP)', value: '2.1 s', status: 'good' },
  { label: 'Internal links', value: '6 orphaned', status: 'warn' },
]

const STATUS_DOT: Record<Status, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-orange-400',
}

const GAPS = [
  { label: 'Content', value: 68 },
  { label: 'Authority', value: 41 },
  { label: 'Technical', value: 18 },
] as const

const RANKINGS = [
  { label: 'Top 3', page: 'Page 1', value: 18, bar: 'bg-blue-700', reach: false },
  { label: '4–10', page: 'Page 1', value: 42, bar: 'bg-blue-500', reach: false },
  { label: '11–20', page: 'Page 2 · Within reach', value: 67, bar: 'bg-blue-300', reach: true },
  { label: '21+', page: 'Page 3+', value: 114, bar: 'bg-neutral-300', reach: false },
] as const
const RANKING_MAX = Math.max(...RANKINGS.map((r) => r.value))
const RANKING_TOTAL = RANKINGS.reduce((sum, r) => sum + r.value, 0)

const PERFORMANCE = [
  { label: 'Impressions', to: 184, decimals: 0, suffix: 'K', delta: '41', unit: '%' },
  { label: 'Clicks', to: 12.8, decimals: 1, suffix: 'K', delta: '33', unit: '%' },
  { label: 'Avg. position', to: 9.6, decimals: 1, suffix: '', delta: '4.6', unit: '' },
  { label: 'CTR', to: 6.9, decimals: 1, suffix: '%', delta: '0.8', unit: ' pts' },
] as const

const METHOD = ['Research', 'Diagnose', 'Prioritise', 'Improve', 'Measure'] as const

/* ------------------------------ Motion helpers ----------------------------- */

const EASE_OUT = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Flips to true once the element scrolls into view (and stays true). */
function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setInView(true))
      return () => cancelAnimationFrame(raf)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView] as const
}

/** Eases a number from 0 to `target` once `active`. Jumps straight to it under reduced motion. */
function useCountUp(target: number, active: boolean, { delay = 0, duration = 1600 } = {}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(raf)
    }
    let raf = 0
    let start = 0
    const timeout = window.setTimeout(() => {
      const tick = (now: number) => {
        start ||= now
        const t = Math.min((now - start) / duration, 1)
        setValue(target * (1 - Math.pow(1 - t, 4)))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [active, target, delay, duration])

  return value
}

/**
 * "Has this group entered the viewport" flag. Every chapter's copy and figure
 * are separate groups, so a figure animates when *it* becomes visible — not
 * when the chapter starts.
 */
const RevealContext = createContext(true)

function RevealGroup({
  as: Tag = 'div',
  threshold,
  className = '',
  children,
}: {
  as?: ElementType
  threshold?: number
  className?: string
  children: ReactNode
}) {
  const [ref, inView] = useInView<HTMLElement>(threshold)
  return (
    <RevealContext.Provider value={inView}>
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    </RevealContext.Provider>
  )
}

/** Fades in and rises by `distance` px when its group is revealed. */
function Reveal({
  as: Tag = 'div',
  delay = 0,
  distance = 20,
  duration = 900,
  className = '',
  children,
}: {
  as?: ElementType
  delay?: number
  distance?: number
  duration?: number
  className?: string
  children?: ReactNode
}) {
  const revealed = useContext(RevealContext)
  return (
    <Tag
      className={`transition-[opacity,translate] ${EASE_OUT} motion-reduce:transition-none ${
        revealed ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        translate: revealed || distance === 0 ? 'none' : `0 ${distance}px`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}

/** Left-to-right wipe. `bleed` keeps strokes that overhang the box from being clipped. */
function Wipe({
  delay = 0,
  duration = 1600,
  bleed = 0,
  className = '',
  children,
}: {
  delay?: number
  duration?: number
  bleed?: number
  className?: string
  children: ReactNode
}) {
  const revealed = useContext(RevealContext)
  return (
    <div
      className={`transition-[clip-path] motion-reduce:transition-none ${className}`}
      style={{
        clipPath: revealed ? `inset(${-bleed}px)` : `inset(${-bleed}px 100% ${-bleed}px ${-bleed}px)`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: EASE_IN_OUT,
      }}
    >
      {children}
    </div>
  )
}

/** Horizontal bar whose fill grows from 0 to `value`% (of its track). */
function GrowBar({ value, delay = 0, className }: { value: number; delay?: number; className: string }) {
  const revealed = useContext(RevealContext)
  return (
    <div
      className={`h-full transition-[width] motion-reduce:transition-none ${className}`}
      style={{
        width: revealed ? `${value}%` : '0%',
        transitionDuration: '1300ms',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: EASE_IN_OUT,
      }}
    />
  )
}

/** Thin rule that draws in from the left. Pass a `bg-*` class for other backgrounds. */
function Rule({ delay = 0, className = 'bg-neutral-200' }: { delay?: number; className?: string }) {
  const revealed = useContext(RevealContext)
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-x-0 top-0 h-px origin-left transition-[scale] duration-[1100ms] motion-reduce:transition-none ${className}`}
      style={{
        scale: revealed ? 'none' : '0 1',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: EASE_IN_OUT,
      }}
    />
  )
}

function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  delay = 0,
  duration = 1600,
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  delay?: number
  duration?: number
}) {
  const revealed = useContext(RevealContext)
  const value = useCountUp(to, revealed, { delay, duration })
  return (
    <span className="tabular-nums">
      {prefix}
      {value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

/* ------------------------------ Small elements ----------------------------- */

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${className}`} />
}

function Delta({ value, unit = '', direction = 'up' }: { value: string; unit?: string; direction?: 'up' | 'down' }) {
  const up = direction === 'up'
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums ${
        up ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      <svg viewBox="0 0 8 8" className={`size-2 ${up ? '' : 'rotate-180'}`} aria-hidden="true">
        <path d="M4 1.5 7 6H1z" fill="currentColor" />
      </svg>
      <span className="sr-only">{up ? 'up' : 'down'}</span>
      {value}
      {unit}
    </span>
  )
}

/** Neutral on purpose: colour is reserved for the data itself. */
function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-neutral-100 font-mono text-[10px] leading-none text-neutral-600 ring-1 ring-inset ring-neutral-200"
    >
      {intent}
    </span>
  )
}

const difficultyDot = (kd: number) => (kd >= 60 ? 'bg-orange-500' : kd >= 45 ? 'bg-orange-300' : 'bg-emerald-500')

/** Large figure numbers: light weight, tight tracking. */
const METRIC_SIZE = {
  xl: 'text-[52px] sm:text-[60px]',
  lg: 'text-[40px]',
  md: 'text-[30px]',
  sm: 'text-[26px]',
} as const

function Metric({ size, className = '', children }: { size: keyof typeof METRIC_SIZE; className?: string; children: ReactNode }) {
  return (
    <span className={`block font-normal leading-none tracking-tight text-neutral-900 ${METRIC_SIZE[size]} ${className}`}>
      {children}
    </span>
  )
}

const SUBLABEL = 'text-[13px] text-neutral-500'
const NUMERIC = 'font-mono text-xs tabular-nums'

/** Label left, value right, hairline above — the row pattern used across the figures. */
function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 border-t border-neutral-100 text-[13px]">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`flex items-center gap-2 text-neutral-800 ${NUMERIC}`}>{children}</dd>
    </div>
  )
}

/* ------------------------------- Chart (SVG) ------------------------------- */

const linePath = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')

/**
 * Plain SVG trend chart. The SVG only draws paths (stretched to fit, with
 * non-scaling strokes); labels are HTML so they never distort. The wrapper's
 * text colour (`text-*`) drives the series colour. Every chart uses the same
 * 1.5px series stroke and 1px reference lines.
 */
function TrendChart({
  data,
  compare,
  domain,
  ticks,
  formatTick = String,
  guide,
  xLabels,
  delay = 0,
  className = '',
  plotClassName = '',
}: {
  data: readonly number[]
  compare?: readonly number[]
  domain: readonly [number, number]
  ticks?: readonly number[]
  formatTick?: (value: number) => string
  /** Value for a dashed horizontal guide (e.g. the average). */
  guide?: number
  xLabels?: readonly string[]
  delay?: number
  className?: string
  /** Use `min-h-*` (not `h-*`): the plot is a flex-1 child, whose basis would override a fixed height. */
  plotClassName?: string
}) {
  const [min, max] = domain
  const toY = (v: number) => 100 - ((v - min) / (max - min)) * 100
  const toPoints = (series: readonly number[]) =>
    series.map((v, i) => [(i / (series.length - 1)) * 100, toY(v)] as const)

  const line = linePath(toPoints(data))

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`relative flex-1 ${ticks ? 'mt-4' : ''} ${plotClassName}`}>
        {ticks ? (
          ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-neutral-200/80"
              style={{ top: `${toY(t)}%` }}
            >
              <span className="absolute bottom-full right-0 mb-1 text-[11px] leading-none tabular-nums text-neutral-500">
                {formatTick(t)}
              </span>
            </div>
          ))
        ) : (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-neutral-200" />
        )}

        <Wipe delay={delay} bleed={4} className="absolute inset-0">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            focusable="false"
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
          >
            {compare && (
              <path
                d={linePath(toPoints(compare))}
                fill="none"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                className="stroke-neutral-400"
              />
            )}
            {guide !== undefined && (
              <line
                x1={0}
                x2={100}
                y1={toY(guide)}
                y2={toY(guide)}
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                className="stroke-neutral-400"
              />
            )}
            <path d={`${line} L100 100 L0 100 Z`} fill="currentColor" fillOpacity={0.08} />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Wipe>
      </div>

      {xLabels && (
        <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] leading-none text-neutral-500">
          {xLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function ChartLegend({ series, dashed }: { series: string; dashed: string }) {
  return (
    <ul className="mt-3 flex items-center gap-4 text-[11px] text-neutral-500">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0 w-3 border-t-[1.5px] border-blue-600" /> {series}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0 w-3 border-t border-dashed border-neutral-400" /> {dashed}
      </li>
    </ul>
  )
}

/* ------------------------- Keyword-difficulty gauge ------------------------ */

const GAUGE_R = 88
const GAUGE_SEGMENTS = 5
const GAUGE_PATHS = Array.from({ length: GAUGE_SEGMENTS }, (_, i) => {
  const span = 180 / GAUGE_SEGMENTS
  const halfGap = 1.6
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return `${(100 + GAUGE_R * Math.cos(rad)).toFixed(2)} ${(100 - GAUGE_R * Math.sin(rad)).toFixed(2)}`
  }
  const start = 180 - i * span - (i === 0 ? 0 : halfGap)
  const end = 180 - (i + 1) * span + (i === GAUGE_SEGMENTS - 1 ? 0 : halfGap)
  return `M ${point(start)} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${point(end)}`
})

function DifficultyGauge({ score, label, delay = 0 }: { score: number; label: string; delay?: number }) {
  const revealed = useContext(RevealContext)
  const value = useCountUp(score, revealed, { delay, duration: 1800 })
  const segmentSize = 100 / GAUGE_SEGMENTS

  return (
    <div className="relative mx-auto w-full max-w-64 pb-6">
      <svg viewBox="0 0 200 102" className="block w-full" aria-hidden="true" focusable="false">
        {GAUGE_PATHS.map((d, i) => {
          const filled = Math.min(Math.max((value - i * segmentSize) / segmentSize, 0), 1)
          return (
            <g key={i} fill="none" strokeWidth={15}>
              <path d={d} className="stroke-neutral-200" />
              <path d={d} pathLength={100} strokeDasharray={`${filled * 100} 100`} className="stroke-orange-500" />
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center">
        <span className="text-[52px] font-normal leading-none tracking-tight tabular-nums">{Math.round(value)}</span>
        <span className="mt-1.5 text-[13px] text-neutral-600">{label}</span>
      </div>
      {/* Scale ends sit under the arc's feet (centred at 6% / 94% of the width). */}
      <span aria-hidden="true" className="absolute bottom-0 left-[6%] -translate-x-1/2 text-[11px] tabular-nums text-neutral-500">
        0
      </span>
      <span aria-hidden="true" className="absolute bottom-0 left-[94%] -translate-x-1/2 text-[11px] tabular-nums text-neutral-500">
        100
      </span>
    </div>
  )
}

/* --------------------------------- Figures --------------------------------- */

/**
 * One analytical composition, presented as evidence for a chapter: a single
 * thin-bordered card plus a mono caption that labels it as an example. On tablet
 * it fills most of the content width, aligned to the copy's left edge; on desktop
 * it sits against its column edge.
 */
function Figure({ caption, wide = false, children }: { caption: string; wide?: boolean; children: ReactNode }) {
  return (
    <Reveal
      as="figure"
      distance={24}
      duration={1000}
      className={`w-full sm:w-[92%] sm:max-w-[44rem] lg:w-full ${
        wide ? 'lg:max-w-[36rem]' : 'lg:max-w-[34rem]'
      }`}
    >
      <div className="@container rounded-sm border border-neutral-200 bg-white p-5 sm:p-6">{children}</div>
      <figcaption className="mt-3 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-500">
        <span aria-hidden="true" className="h-px w-5 bg-neutral-300" />
        {caption}
      </figcaption>
    </Reveal>
  )
}

function FigureHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <h4 className="text-[13px] font-semibold text-neutral-900">{title}</h4>
      {meta && <div className="text-[11px] text-neutral-500">{meta}</div>}
    </header>
  )
}

/** A second view inside the same figure: hairline-separated, so it reads as one composition. */
function FigurePart({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mt-6 border-t border-neutral-100 pt-5 ${className}`}>{children}</div>
}

/** 01 — Understand search: demand over time, with the intent split underneath. */
function SearchFigure() {
  return (
    <Figure caption="Example analysis · search demand & intent">
      <FigureHeader title="Search Demand" meta="Last 12 months" />
      <Metric size="xl">
        <CountUp to={164} suffix="K" delay={250} />
      </Metric>
      <p className={`mt-2 ${SUBLABEL}`}>Monthly searches</p>

      <TrendChart
        data={DEMAND}
        domain={[110, 200]}
        ticks={[200]}
        formatTick={(v) => `${v}K`}
        guide={DEMAND_AVERAGE}
        xLabels={['Oct', 'Jan', 'Apr', 'Jul', 'Sep']}
        delay={350}
        className="mt-2 text-blue-600"
        plotClassName="min-h-32 sm:min-h-40"
      />
      <ChartLegend series="Monthly searches" dashed="12-month average" />

      <FigurePart>
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-[13px] font-semibold text-neutral-900">Search intent</h5>
          <p className="text-[11px] text-neutral-500">Share of searches</p>
        </div>
        <Wipe delay={500} duration={1300} className="mt-3">
          <div className="flex h-1.5 gap-px overflow-hidden rounded-[2px]" aria-hidden="true">
            {INTENT_SPLIT.map(({ intent, share, swatch }) => (
              <div key={intent} className={swatch} style={{ width: `${share}%` }} />
            ))}
          </div>
        </Wipe>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 @md:grid-cols-4">
          {INTENT_SPLIT.map(({ intent, share, swatch }) => (
            <li key={intent}>
              <span className={`flex items-center gap-1.5 text-neutral-800 ${NUMERIC}`}>
                <span aria-hidden="true" className={`size-1.5 rounded-[1px] ${swatch}`} />
                {intent} {share}%
              </span>
              <span className="mt-0.5 block text-[11px] text-neutral-500">{INTENT_NAME[intent]}</span>
            </li>
          ))}
        </ul>
      </FigurePart>
    </Figure>
  )
}

/** 02 — Choose the right opportunities: difficulty gauge, with the competitor gap as supporting evidence. */
function OpportunityFigure() {
  return (
    <Figure caption="Example analysis · keyword difficulty & competitor gap">
      <FigureHeader title="Keyword Difficulty" meta="Example keyword" />
      <DifficultyGauge score={72} label="Competitive" delay={350} />
      <p className="mt-3 text-center text-xs text-neutral-500">Estimated strength required for page-one competition.</p>

      <FigurePart>
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-[13px] font-semibold text-neutral-900">Competitor Gap</h5>
          <p className="text-[11px] text-neutral-500">vs. top 5 competitors</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-5">
          <div>
            <dd>
              <Metric size="md">
                <CountUp to={1247} delay={300} />
              </Metric>
            </dd>
            <dt className={`mt-1.5 ${SUBLABEL}`}>Missing keywords</dt>
          </div>
          <div className="border-l border-neutral-100 pl-5">
            <dd>
              <Metric size="md">
                <CountUp to={38} delay={300} />
              </Metric>
            </dd>
            <dt className={`mt-1.5 ${SUBLABEL}`}>High-intent opportunities</dt>
          </div>
        </dl>

        <ul className="mt-5 grid grid-cols-3 gap-4">
          {GAPS.map(({ label, value }, i) => (
            <li key={label}>
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="text-neutral-600">{label}</span>
                <span className={`text-neutral-800 ${NUMERIC}`}>{value}%</span>
              </div>
              <div aria-hidden="true" className="mt-1.5 h-1 rounded-[2px] bg-neutral-100">
                <GrowBar value={value} delay={500 + i * 110} className="rounded-[2px] bg-blue-500" />
              </div>
            </li>
          ))}
        </ul>
      </FigurePart>
    </Figure>
  )
}

/** 03 — Fix what search engines can't see. */
function AuditFigure() {
  const total = AUDIT_SPLIT.reduce((sum, s) => sum + s.count, 0)
  return (
    <Figure caption="Example analysis · technical crawl">
      <FigureHeader title="Technical Audit" meta="Site crawl" />
      <p className="flex items-baseline gap-2">
        <Metric size="xl">
          <CountUp to={total} delay={250} />
        </Metric>
        <span className={SUBLABEL}>pages crawled</span>
      </p>

      <div className="mt-5">
        <Wipe delay={350} duration={1300}>
          <div className="flex h-2 gap-px overflow-hidden rounded-[2px]" aria-hidden="true">
            {AUDIT_SPLIT.map(({ label, count, bar }) => (
              <div key={label} className={bar} style={{ width: `${(count / total) * 100}%`, minWidth: 3 }} />
            ))}
          </div>
        </Wipe>
      </div>

      <dl className="mt-3">
        {AUDIT_SPLIT.map(({ label, count, bar }) => (
          <div key={label} className="flex h-8 items-center justify-between gap-3 text-[13px]">
            <dt className="flex items-center gap-2.5 text-neutral-500">
              <Dot className={bar} />
              {label}
            </dt>
            <dd className={`text-neutral-800 ${NUMERIC}`}>{count}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4">
        {AUDIT_CHECKS.map(({ label, value, status }) => (
          <StatRow key={label} label={label}>
            {value}
            <Dot className={STATUS_DOT[status]} />
          </StatRow>
        ))}
      </dl>
    </Figure>
  )
}

/**
 * 04 — Turn research into the right pages. An editorial list rather than a data
 * table: five aligned columns from @md up, a compact two-line row below that.
 */
const MAP_COLS = '@md:grid-cols-[minmax(0,9.5rem)_6.25rem_2.75rem_3.5rem_minmax(0,1fr)]'

function MappingFigure() {
  return (
    <Figure caption="Example analysis · keyword mapping" wide>
      <FigureHeader title="Keyword Mapping" meta="4 of 2,840" />

      <div
        aria-hidden="true"
        className={`hidden gap-x-3 pb-2 text-[11px] font-medium text-neutral-500 @md:grid ${MAP_COLS}`}
      >
        <span>Keyword</span>
        <span>Intent</span>
        <span>Demand</span>
        <span>Difficulty</span>
        <span>Target</span>
      </div>

      <ul>
        {KEYWORDS.map(({ term, intent, demand, difficulty, page }) => (
          <li
            key={term}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-neutral-100 py-3.5 @md:gap-y-0 @md:py-4 ${MAP_COLS}`}
          >
            <p className="text-sm font-medium leading-snug text-neutral-950 @md:text-[13px]">{term}</p>

            <p className="col-start-2 row-start-1 justify-self-end whitespace-nowrap font-mono text-xs text-blue-700 @md:order-last @md:col-auto @md:row-auto @md:justify-self-start">
              <span className="sr-only">Target page: </span>
              <span aria-hidden="true" className="mr-1 text-neutral-300">
                →
              </span>
              {page}
            </p>

            <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 @md:contents">
              <p className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-neutral-600 @md:text-xs">
                <IntentBadge intent={intent} />
                <span className="sr-only">Intent: </span>
                {INTENT_NAME[intent]}
              </p>
              <p className={`whitespace-nowrap text-neutral-700 ${NUMERIC}`}>
                <span className="sr-only">Demand: </span>
                {demand}
                <span className="text-neutral-400 @md:hidden"> /mo</span>
              </p>
              <p className={`flex items-center gap-1.5 whitespace-nowrap text-neutral-700 ${NUMERIC}`}>
                <Dot className={difficultyDot(difficulty)} />
                <span className="text-neutral-400 @md:hidden">KD </span>
                <span className="sr-only">Difficulty: </span>
                {difficulty}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Figure>
  )
}

/** 05 — Improve. Measure. Repeat: ranking movement leads into visibility and clicks. */
function LoopFigure() {
  return (
    <Figure caption="Example performance view">
      <FigureHeader
        title="Ranking Distribution"
        meta={
          <>
            <CountUp to={RANKING_TOTAL} delay={250} /> keywords · Top 100
          </>
        }
      />

      <ul className="space-y-2.5">
        {RANKINGS.map(({ label, page, value, bar, reach }, i) => (
          <li
            key={label}
            className="grid grid-cols-[3rem_minmax(0,1fr)_2rem] items-center gap-x-3 gap-y-0.5 @md:grid-cols-[3rem_minmax(0,1fr)_2rem_9.5rem]"
          >
            <span className="text-[13px] text-neutral-800">{label}</span>
            <div aria-hidden="true" className="h-3 bg-neutral-100">
              <GrowBar value={(value / RANKING_MAX) * 100} delay={350 + i * 110} className={bar} />
            </div>
            <span className={`text-right text-neutral-800 ${NUMERIC}`}>{value}</span>
            <span
              className={`col-start-2 col-end-4 text-[11px] @md:col-auto ${reach ? 'text-blue-700' : 'text-neutral-500'}`}
            >
              {page}
            </span>
          </li>
        ))}
      </ul>

      {/* Ranking movement → visibility → clicks. */}
      <div aria-hidden="true" className="relative my-5 h-px bg-neutral-100">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 font-mono text-[11px] text-neutral-400">
          ↓
        </span>
      </div>

      <FigureHeader title="Organic Performance" meta="vs. previous period" />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 @md:grid-cols-4 @md:gap-x-4">
        {PERFORMANCE.map(({ label, to, decimals, suffix, delta, unit }) => (
          <div key={label}>
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="mt-1.5">
              <span className="block text-[26px] font-normal leading-none tracking-tight text-neutral-900">
                <CountUp to={to} decimals={decimals} suffix={suffix} delay={500} />
              </span>
              <span className="mt-1.5 block">
                <Delta value={delta} unit={unit} />
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <TrendChart
        data={CLICKS}
        compare={CLICKS_PREVIOUS}
        domain={[3, 15]}
        xLabels={['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']}
        delay={700}
        className="mt-5 text-blue-600"
        plotClassName="min-h-24"
      />
      <ChartLegend series="Clicks" dashed="Previous period" />
    </Figure>
  )
}

/* ---------------------------------- Layout --------------------------------- */

const EYEBROW_BASE = 'font-mono text-xs uppercase tracking-[0.16em]'
const EYEBROW = `${EYEBROW_BASE} text-neutral-500`
const CHAPTER_HEADING =
  'text-balance text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.03em] text-neutral-950 sm:text-3xl lg:text-[2rem] xl:text-[2.25rem]'
const BODY = 'space-y-4 text-base leading-relaxed text-neutral-600 sm:text-[17px]'

/**
 * A thin rail down the left edge of the chapters, with the chapter number sitting
 * on it. Desktop only — on smaller screens the number moves into the eyebrow.
 */
function Rail({ number }: { number: string }) {
  const revealed = useContext(RevealContext)
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 hidden w-px lg:block">
      <span
        className="absolute inset-0 origin-top bg-neutral-200 transition-[scale] duration-[1400ms] motion-reduce:transition-none"
        style={{ scale: revealed ? 'none' : '1 0', transitionTimingFunction: EASE_IN_OUT }}
      />
      <span
        className={`absolute left-1/2 top-16 -translate-x-1/2 bg-(--seo-bg) px-1.5 py-1 font-mono text-[11px] tabular-nums text-neutral-500 transition-opacity duration-700 motion-reduce:transition-none ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: '300ms' }}
      >
        {number}
      </span>
    </div>
  )
}

/** Never wraps: below ~375px the tracking and separator tighten so even the longest label fits on one line. */
function ChapterEyebrow({ number, label }: { number: string; label: string }) {
  return (
    <Reveal as="p" className={`flex items-center gap-2.5 whitespace-nowrap sm:gap-3 ${EYEBROW} text-[11px] tracking-[0.1em] max-[374px]:gap-2 max-[374px]:tracking-[0.04em] sm:text-xs sm:tracking-[0.16em]`}>
      <span className="tabular-nums text-neutral-900 lg:hidden">{number}</span>
      <span aria-hidden="true" className="h-px w-4 shrink-0 bg-neutral-300 max-[374px]:w-3 sm:w-6 lg:hidden" />
      {label}
    </Reveal>
  )
}

/**
 * Copy on one side, a figure on the other. Copy and figure are separate reveal
 * groups, so the figure animates when it is actually on screen. On small screens
 * the copy always comes first. Vertical rhythm: ~72–80px between chapters on
 * mobile, ~100px on tablet, ~128px on desktop.
 */
function Chapter({
  number,
  label,
  title,
  figureFirst = false,
  figure,
  children,
}: {
  number: string
  label: string
  title: ReactNode
  /** Put the figure on the left on desktop (copy on the right). */
  figureFirst?: boolean
  figure: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <RevealGroup as="article" threshold={0.05} className="relative py-9 sm:py-12 lg:py-16 lg:pl-16">
      <Rail number={number} />
      <div
        aria-labelledby={titleId}
        role="group"
        className={`grid items-center gap-8 sm:gap-10 lg:gap-x-16 xl:gap-x-24 ${
          figureFirst ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
        }`}
      >
        <RevealGroup className={figureFirst ? 'lg:order-2' : ''}>
          <ChapterEyebrow number={number} label={label} />
          <Reveal delay={80} className="mt-4 sm:mt-5">
            <h3 id={titleId} className={CHAPTER_HEADING}>
              {title}
            </h3>
          </Reveal>
          <Reveal delay={160} className={`mt-4 max-w-md sm:mt-5 sm:max-w-xl lg:max-w-md ${BODY}`}>
            {children}
          </Reveal>
        </RevealGroup>

        <RevealGroup threshold={0.2} className={`flex ${figureFirst ? 'lg:order-1 lg:justify-start' : 'lg:justify-end'}`}>
          {figure}
        </RevealGroup>
      </div>
    </RevealGroup>
  )
}

/* --------------------------------- Sections -------------------------------- */

function Intro({ headingId }: { headingId: string }) {
  return (
    <RevealGroup className="pb-2 pt-16 sm:pt-24 lg:pt-28">
      <Reveal as="p" className={`flex items-center gap-2.5 ${EYEBROW}`}>
        <Dot className="bg-blue-600" />
        SEO / ORGANIC GROWTH
      </Reveal>

      <Reveal delay={80} className="mt-5 sm:mt-6">
        <h2
          id={headingId}
          className="max-w-5xl text-balance text-[2.70rem] font-semibold leading-[1.02] tracking-[-0.04em] text-neutral-950 sm:text-5xl lg:text-6xl"
        >
          Being online isn’t enough.
          <span className="block text-neutral-400">You need to be findable.</span>
        </h2>
      </Reveal>

      <Reveal as="p" delay={180} className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 sm:mt-8 sm:text-xl">
        Your customers are already searching. SEO makes sure your website appears when their intent is highest — and
        gives them a reason to choose you.
      </Reveal>

      <Reveal as="p" delay={300} className="mt-8 flex items-center gap-4 text-sm text-neutral-500 sm:mt-10">
        <span aria-hidden="true" className="h-px w-10 shrink-0 bg-neutral-300" />
        We turn search behaviour into measurable growth.
      </Reveal>
    </RevealGroup>
  )
}

/**
 * The methodology: a full-bleed dark band, so the way we work reads as the
 * climax of the story. (To keep it light, swap the colour utilities in this
 * component for their neutral-50/900 equivalents.)
 */
// function HowWeWork() {
//   return (
//     <RevealGroup className="-mx-4 bg-neutral-950 px-4 py-14 text-neutral-50 sm:-mx-6 sm:px-6 sm:py-20 lg:-mx-8 lg:px-8 lg:py-24">
//       <div className="mx-auto max-w-7xl">
//         <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-16 xl:gap-x-24">
//           <div>
//             <Reveal as="p" className={`${EYEBROW_BASE} text-neutral-400`}>
//               HOW WE WORK
//             </Reveal>
//             <Reveal delay={80} className="mt-5">
//               <h3 className="text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
//                 Strategy before tactics.
//               </h3>
//             </Reveal>
//           </div>
//           <Reveal delay={160} className="max-w-md space-y-4 text-base leading-relaxed text-neutral-300 sm:text-[17px] lg:self-end">
//             <p>
//               We don’t start with backlinks, blogs or a checklist. We start by understanding demand, competition,
//               technical barriers and user intent — then decide what actually deserves attention.
//             </p>
//           </Reveal>
//         </div>

//         <div className="relative mt-10 pt-7 sm:mt-14 lg:mt-16">
//           <Rule delay={200} className="bg-neutral-700" />
//           <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[1.75rem] font-medium tracking-[-0.025em] text-white sm:text-4xl xl:text-[2.5rem]">
//             {METHOD.map((step, i) => (
//               <Reveal as="li" key={step} delay={350 + i * 120} distance={10} className="flex items-center gap-4">
//                 {step}
//                 {i < METHOD.length - 1 && (
//                   <span aria-hidden="true" className="font-normal text-neutral-600">
//                     →
//                   </span>
//                 )}
//               </Reveal>
//             ))}
//           </ol>
//         </div>

//         <div className="relative mt-10 grid gap-3 pt-7 sm:mt-12 lg:mt-14 lg:grid-cols-2 lg:gap-x-16 xl:gap-x-24">
//           <Rule delay={300} className="bg-neutral-800" />
//           <Reveal delay={200}>
//             <h4 className="text-xl font-medium tracking-tight text-white sm:text-2xl">No fixed SEO checklist.</h4>
//           </Reveal>
//           <Reveal as="p" delay={280} className="max-w-md text-base leading-relaxed text-neutral-400 sm:text-[17px]">
//             Different websites have different constraints. We prioritise the work based on opportunity, impact and
//             what the data actually shows — not because a generic SEO template says it should come next.
//           </Reveal>
//         </div>

//         <Reveal delay={700} className="mt-12 sm:mt-16 lg:mt-20">
//           <p className="text-base text-neutral-400 sm:text-lg">Every recommendation should answer one question:</p>
//           <p className="mt-3 text-balance text-[2.5rem] font-semibold leading-[1.03] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
//             What will this change improve?
//           </p>
//         </Reveal>
//       </div>
//     </RevealGroup>
//   )
// }

function Closing({ ctaHref }: { ctaHref: string }) {
  return (
    <RevealGroup className="pb-16 pt-16 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-28">
      <Reveal>
        <h3 className="max-w-5xl text-balance text-[2.25rem] font-medium leading-[1.05] tracking-[-0.04em] text-neutral-950 sm:text-4xl lg:text-[1.75rem]">
          Better SEO isn’t more traffic.It’s more of the people
          <span className="block text-neutral-400">finding you at the right moment.</span>
        </h3>
      </Reveal>

      <Reveal as="p" delay={200} className="mt-8 max-w-md text-lg leading-relaxed text-neutral-600 sm:mt-10">
        Search gives us the signals. Strategy tells us what to do with them.
      </Reveal>

      <Reveal delay={320} className="mt-8 sm:mt-10">
        <a
          href={ctaHref}
          className="group inline-flex items-center gap-2 border-b border-neutral-900 pb-1 text-base font-medium text-neutral-900"
        >
          Let’s find your search opportunities
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          >
            →
          </span>
        </a>
      </Reveal>
    </RevealGroup>
  )
}

/* ---------------------------------- Section -------------------------------- */

export default function WebsiteSection({ className = '', ctaHref = '#contact' }: WebsiteSectionProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className={`relative w-full overflow-x-clip bg-white px-4 text-neutral-900 [--seo-bg:#ffffff] sm:px-6 lg:px-8 ${className}`}
    >
      <div className="mx-auto max-w-7xl">
        <Intro headingId={headingId} />

        <div className="mt-4 lg:mt-8">
          <Chapter
            number="01"
            label="Understand search"
            title="We start with what people are actually looking for."
            figure={<SearchFigure />}
          >
            <p>
              Before changing your website, we understand the demand already happening around your business — what
              people search, how often they search and what they actually mean when they type it.
            </p>
          </Chapter>

          <Chapter
            number="02"
            label="Choose the right opportunities"
            title="Not every keyword is worth chasing."
            figureFirst
            figure={<OpportunityFigure />}
          >
            <p>
              We compare demand with competition, authority and competitor visibility to find opportunities where
              ranking is both valuable and realistic.
            </p>
          </Chapter>

          <Chapter
            number="03"
            label="Technical SEO"
            title="Strong content can’t perform on a weak foundation."
            figure={<AuditFigure />}
          >
            <p>
              We make sure search engines can crawl, understand and trust the website before trying to push more
              content through it.
            </p>
          </Chapter>

          <Chapter
            number="04"
            label="Turn research into the right pages"
            title="Research only matters when it changes what we build."
            figureFirst
            figure={<MappingFigure />}
          >
            <p>
              We connect search intent to the right page, message and purpose — so every important keyword has
              somewhere useful to land.
            </p>
          </Chapter>

          <Chapter
            number="05"
            label="Improve. Measure. Repeat."
            title={
              <>
                SEO isn’t a launch.
                <span className="block text-neutral-400">It’s a feedback loop.</span>
              </>
            }
            figure={<LoopFigure />}
          >
            <p>
              We track how visibility changes, where pages are moving and what deserves attention next. Every
              improvement gives us another signal.
            </p>
          </Chapter>
        </div>
      </div>

      {/* Outside the width-constrained container so the band can bleed to the section edges. */}
      {/* <HowWeWork /> */}

      <div className="mx-auto max-w-7xl">
        <Closing ctaHref={ctaHref} />
      </div>
    </section>
  )
}
