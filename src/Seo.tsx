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

export interface WebsiteSectionProps {
  className?: string
  ctaHref?: string
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

function makeSeries(
  length: number,
  base: number,
  drift: number,
  noise: number,
  seed: number,
) {
  let s = seed

  const rand = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return Array.from({ length }, (_, i) => {
    const seasonal =
      Math.sin((i / length) * Math.PI * 4) * noise * 0.25

    return (
      Math.round(
        (
          base +
          drift * (i / (length - 1)) +
          seasonal +
          (rand() - 0.5) * noise
        ) * 10,
      ) / 10
    )
  })
}

const DEMAND = makeSeries(52, 152, 12, 44, 11)
const DEMAND_AVERAGE = 164

const CLICKS = makeSeries(26, 6, 7.5, 2.4, 5)
const CLICKS_PREVIOUS = makeSeries(26, 6, 1.8, 1.6, 23)

type Intent = 'I' | 'C' | 'T' | 'N'

const INTENT_NAME: Record<Intent, string> = {
  I: 'Informational',
  C: 'Commercial',
  T: 'Transactional',
  N: 'Navigational',
}

const INTENT_SPLIT: readonly {
  intent: Intent
  share: number
  swatch: string
}[] = [
  { intent: 'I', share: 58, swatch: 'bg-blue-600' },
  { intent: 'C', share: 27, swatch: 'bg-blue-400' },
  { intent: 'T', share: 12, swatch: 'bg-blue-300' },
  { intent: 'N', share: 3, swatch: 'bg-neutral-300' },
]

const AUDIT_SPLIT = [
  { label: 'Critical', count: 3, bar: 'bg-red-500' },
  { label: 'Warnings', count: 12, bar: 'bg-orange-400' },
  { label: 'Healthy', count: 132, bar: 'bg-emerald-500' },
] as const

type Status = 'good' | 'warn'

const AUDIT_CHECKS: readonly {
  label: string
  value: string
  status: Status
}[] = [
  { label: 'Indexing', value: '141 / 147', status: 'good' },
  { label: 'Page speed (LCP)', value: '2.1 s', status: 'good' },
  { label: 'Internal links', value: '6 orphaned', status: 'warn' },
]

const STATUS_DOT: Record<Status, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-orange-400',
}

const RANKINGS = [
  {
    label: 'Top 3',
    page: 'Page 1',
    value: 18,
    bar: 'bg-blue-700',
    reach: false,
  },
  {
    label: '4–10',
    page: 'Page 1',
    value: 42,
    bar: 'bg-blue-500',
    reach: false,
  },
  {
    label: '11–20',
    page: 'Page 2 · Within reach',
    value: 67,
    bar: 'bg-blue-300',
    reach: true,
  },
  {
    label: '21+',
    page: 'Page 3+',
    value: 114,
    bar: 'bg-neutral-300',
    reach: false,
  },
] as const

const RANKING_MAX = Math.max(...RANKINGS.map((r) => r.value))
const RANKING_TOTAL = RANKINGS.reduce((sum, r) => sum + r.value, 0)

const PERFORMANCE = [
  {
    label: 'Impressions',
    to: 184,
    decimals: 0,
    suffix: 'K',
    delta: '41',
    unit: '%',
  },
  {
    label: 'Clicks',
    to: 12.8,
    decimals: 1,
    suffix: 'K',
    delta: '33',
    unit: '%',
  },
  {
    label: 'Avg. position',
    to: 9.6,
    decimals: 1,
    suffix: '',
    delta: '4.6',
    unit: '',
  },
  {
    label: 'CTR',
    to: 6.9,
    decimals: 1,
    suffix: '%',
    delta: '0.8',
    unit: ' pts',
  },
] as const

/* -------------------------------------------------------------------------- */
/*  Motion helpers                                                            */
/* -------------------------------------------------------------------------- */

const EASE_OUT = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      prefersReducedMotion()
    ) {
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
      {
        threshold,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView] as const
}

function useCountUp(
  target: number,
  active: boolean,
  { delay = 0, duration = 1600 } = {},
) {
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
        translate:
          revealed || distance === 0 ? 'none' : `0 ${distance}px`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  )
}

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
        clipPath: revealed
          ? `inset(${-bleed}px)`
          : `inset(${-bleed}px 100% ${-bleed}px ${-bleed}px)`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: EASE_IN_OUT,
      }}
    >
      {children}
    </div>
  )
}

function GrowBar({
  value,
  delay = 0,
  className,
}: {
  value: number
  delay?: number
  className: string
}) {
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
      {value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Small UI                                                                  */
/* -------------------------------------------------------------------------- */

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full ${className}`}
    />
  )
}

function Delta({
  value,
  unit = '',
  direction = 'up',
}: {
  value: string
  unit?: string
  direction?: 'up' | 'down'
}) {
  const up = direction === 'up'

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums ${
        up ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      <svg
        viewBox="0 0 8 8"
        className={`size-2 ${up ? '' : 'rotate-180'}`}
        aria-hidden="true"
      >
        <path d="M4 1.5 7 6H1z" fill="currentColor" />
      </svg>

      {value}
      {unit}
    </span>
  )
}

const METRIC_SIZE = {
  xl: 'text-[40px] min-[420px]:text-[44px] sm:text-[50px] md:text-[56px] xl:text-[60px]',
  md: 'text-[26px] sm:text-[28px] md:text-[30px]',
} as const

function Metric({
  size,
  className = '',
  children,
}: {
  size: keyof typeof METRIC_SIZE
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={`block font-normal leading-none tracking-tight text-neutral-900 ${METRIC_SIZE[size]} ${className}`}
    >
      {children}
    </span>
  )
}

const SUBLABEL = 'text-[12px] leading-snug text-neutral-500 sm:text-[13px]'
const NUMERIC = 'font-mono text-xs tabular-nums'

function StatRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-t border-neutral-100 py-2 text-[12px] sm:text-[13px]">
      <dt className="text-neutral-500">{label}</dt>

      <dd
        className={`flex items-center gap-2 text-neutral-800 ${NUMERIC}`}
      >
        {children}
      </dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chart                                                                     */
/* -------------------------------------------------------------------------- */

const linePath = (
  pts: readonly (readonly [number, number])[],
) =>
  pts
    .map(
      ([x, y], i) =>
        `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(' ')

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
  guide?: number
  xLabels?: readonly string[]
  delay?: number
  className?: string
  plotClassName?: string
}) {
  const [min, max] = domain

  const toY = (v: number) =>
    100 - ((v - min) / (max - min)) * 100

  const toPoints = (series: readonly number[]) =>
    series.map(
      (v, i) =>
        [
          (i / (series.length - 1)) * 100,
          toY(v),
        ] as const,
    )

  const line = linePath(toPoints(data))

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className={`relative flex-1 ${
          ticks ? 'mt-4' : ''
        } ${plotClassName}`}
      >
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
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-neutral-200"
          />
        )}

        <Wipe
          delay={delay}
          bleed={4}
          className="absolute inset-0"
        >
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

            <path
              d={`${line} L100 100 L0 100 Z`}
              fill="currentColor"
              fillOpacity={0.08}
            />

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
        <div
          aria-hidden="true"
          className="mt-2 flex justify-between text-[11px] leading-none text-neutral-500"
        >
          {xLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function ChartLegend({
  series,
  dashed,
}: {
  series: string
  dashed: string
}) {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-neutral-500 sm:text-[11px]">
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-0 w-3 border-t-[1.5px] border-blue-600"
        />
        {series}
      </li>

      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-0 w-3 border-t border-dashed border-neutral-400"
        />
        {dashed}
      </li>
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/*  Figure                                                                    */
/* -------------------------------------------------------------------------- */

function Figure({ 
  children,
}: { 
  children: ReactNode
}) {
  return (
    <Reveal
      as="figure"
      distance={24}
      duration={1000}
      className="w-full min-w-0 max-w-full sm:max-w-[46rem] lg:max-w-[52rem] xl:max-w-[34rem]"
    >
      <div className="@container overflow-hidden rounded-sm border border-neutral-200 bg-white p-4 min-[420px]:p-5 sm:p-6">
        {children}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-neutral-500 min-[420px]:text-[10px] sm:gap-2.5 sm:text-[11px] sm:tracking-[0.1em]">
        <span
          aria-hidden="true"
          className="h-px w-5 bg-neutral-300"
        />
        {/* {caption} */}
      </figcaption>
    </Reveal>
  )
}

function FigureHeader({
  title,
  meta,
}: {
  title: string
  meta?: ReactNode
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
      <h4 className="text-[12px] font-semibold text-neutral-900 sm:text-[13px]">
        {title}
      </h4>

      {meta && (
        <div className="text-[10px] text-neutral-500 sm:text-[11px]">
          {meta}
        </div>
      )}
    </header>
  )
}

function FigurePart({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`mt-6 border-t border-neutral-100 pt-5 ${className}`}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Essential figures                                                         */
/* -------------------------------------------------------------------------- */

function SearchFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="Search Demand"
        meta="Last 12 months"
      />

      <Metric size="xl">
        <CountUp to={164} suffix="K" delay={250} />
      </Metric>

      <p className={`mt-2 ${SUBLABEL}`}>
        Monthly searches
      </p>

      <TrendChart
        data={DEMAND}
        domain={[110, 200]}
        ticks={[200]}
        formatTick={(v) => `${v}K`}
        guide={DEMAND_AVERAGE}
        xLabels={['Oct', 'Jan', 'Apr', 'Jul', 'Sep']}
        delay={350}
        className="mt-2 text-blue-600"
        plotClassName="min-h-28 min-[420px]:min-h-32 sm:min-h-40"
      />

      <ChartLegend
        series="Monthly searches"
        dashed="12-month average"
      />

      <FigurePart>
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-[13px] font-semibold text-neutral-900">
            Search intent
          </h5>

          <p className="text-[11px] text-neutral-500">
            Share of searches
          </p>
        </div>

        <Wipe
          delay={500}
          duration={1300}
          className="mt-3"
        >
          <div
            className="flex h-1.5 gap-px overflow-hidden rounded-[2px]"
            aria-hidden="true"
          >
            {INTENT_SPLIT.map(
              ({ intent, share, swatch }) => (
                <div
                  key={intent}
                  className={swatch}
                  style={{ width: `${share}%` }}
                />
              ),
            )}
          </div>
        </Wipe>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 @md:grid-cols-4">
          {INTENT_SPLIT.map(
            ({ intent, share, swatch }) => (
              <li key={intent}>
                <span
                  className={`flex items-center gap-1.5 text-neutral-800 ${NUMERIC}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-[1px] ${swatch}`}
                  />
                  {intent} {share}%
                </span>

                <span className="mt-0.5 block text-[11px] text-neutral-500">
                  {INTENT_NAME[intent]}
                </span>
              </li>
            ),
          )}
        </ul>
      </FigurePart>
    </Figure>
  )
}

function AuditFigure() {
  const total = AUDIT_SPLIT.reduce(
    (sum, s) => sum + s.count,
    0,
  )

  return (
    <Figure  >
      <FigureHeader
        title="Technical Audit"
        meta="Site crawl"
      />

      <p className="flex items-baseline gap-2">
        <Metric size="xl">
          <CountUp to={total} delay={250} />
        </Metric>

        <span className={SUBLABEL}>
          pages crawled
        </span>
      </p>

      <div className="mt-5">
        <Wipe delay={350} duration={1300}>
          <div
            className="flex h-2 gap-px overflow-hidden rounded-[2px]"
            aria-hidden="true"
          >
            {AUDIT_SPLIT.map(
              ({ label, count, bar }) => (
                <div
                  key={label}
                  className={bar}
                  style={{
                    width: `${(count / total) * 100}%`,
                    minWidth: 3,
                  }}
                />
              ),
            )}
          </div>
        </Wipe>
      </div>

      <dl className="mt-3">
        {AUDIT_SPLIT.map(
          ({ label, count, bar }) => (
            <div
              key={label}
              className="flex min-h-8 items-center justify-between gap-3 py-1 text-[12px] sm:text-[13px]"
            >
              <dt className="flex items-center gap-2.5 text-neutral-500">
                <Dot className={bar} />
                {label}
              </dt>

              <dd
                className={`text-neutral-800 ${NUMERIC}`}
              >
                {count}
              </dd>
            </div>
          ),
        )}
      </dl>

      <dl className="mt-4">
        {AUDIT_CHECKS.map(
          ({ label, value, status }) => (
            <StatRow key={label} label={label}>
              {value}
              <Dot className={STATUS_DOT[status]} />
            </StatRow>
          ),
        )}
      </dl>
    </Figure>
  )
}

function LoopFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="Ranking Distribution"
        meta={
          <>
            <CountUp
              to={RANKING_TOTAL}
              delay={250}
            />{' '}
            keywords · Top 100
          </>
        }
      />

      <ul className="space-y-2.5">
        {RANKINGS.map(
          ({ label, page, value, bar, reach }, i) => (
            <li
              key={label}
              className="grid grid-cols-[2.6rem_minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-1 sm:grid-cols-[3rem_minmax(0,1fr)_2rem] sm:gap-x-3 @md:grid-cols-[3rem_minmax(0,1fr)_2rem_9.5rem]"
            >
              <span className="text-[13px] text-neutral-800">
                {label}
              </span>

              <div
                aria-hidden="true"
                className="h-3 bg-neutral-100"
              >
                <GrowBar
                  value={(value / RANKING_MAX) * 100}
                  delay={350 + i * 110}
                  className={bar}
                />
              </div>

              <span
                className={`text-right text-neutral-800 ${NUMERIC}`}
              >
                {value}
              </span>

              <span
                className={`col-start-2 col-end-4 text-[11px] @md:col-auto ${
                  reach
                    ? 'text-blue-700'
                    : 'text-neutral-500'
                }`}
              >
                {page}
              </span>
            </li>
          ),
        )}
      </ul>

      <div
        aria-hidden="true"
        className="relative my-5 h-px bg-neutral-100"
      >
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 font-mono text-[11px] text-neutral-400">
          ↓
        </span>
      </div>

      <FigureHeader
        title="Organic Performance"
        meta="vs. previous period"
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-6 @lg:grid-cols-4 @lg:gap-x-4">
        {PERFORMANCE.map(
          ({
            label,
            to,
            decimals,
            suffix,
            delta,
            unit,
          }) => (
            <div key={label}>
              <dt className="text-xs text-neutral-500">
                {label}
              </dt>

              <dd className="mt-1.5">
                <span className="block text-[22px] font-normal leading-none tracking-tight text-neutral-900 min-[420px]:text-[24px] sm:text-[26px]">
                  <CountUp
                    to={to}
                    decimals={decimals}
                    suffix={suffix}
                    delay={500}
                  />
                </span>

                <span className="mt-1.5 block">
                  <Delta
                    value={delta}
                    unit={unit}
                  />
                </span>
              </dd>
            </div>
          ),
        )}
      </dl>

      <TrendChart
        data={CLICKS}
        compare={CLICKS_PREVIOUS}
        domain={[3, 15]}
        xLabels={[
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
        ]}
        delay={700}
        className="mt-5 text-blue-600"
        plotClassName="min-h-20 min-[420px]:min-h-24 sm:min-h-28"
      />

      <ChartLegend
        series="Clicks"
        dashed="Previous period"
      />
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*  Layout                                                                    */
/* -------------------------------------------------------------------------- */

const EYEBROW_BASE =
  'font-mono text-[10px] uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em] md:text-xs md:tracking-[0.16em]'

const EYEBROW = `${EYEBROW_BASE} text-neutral-500`

const CHAPTER_HEADING =
  'text-balance text-[clamp(1.65rem,4.8vw,2.25rem)] leading-[1.1] tracking-[-0.035em] text-neutral-950 sm:leading-[1.08] xl:text-[2.15rem]'

const BODY =
  'space-y-4 text-[15px] leading-[1.65] text-neutral-600 sm:text-base md:text-[17px]'

function Rail({ number }: { number: string }) {
  const revealed = useContext(RevealContext)

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-4 hidden w-px xl:block"
    >
      <span
        className="absolute inset-0 origin-top bg-neutral-200 transition-[scale] duration-[1400ms] motion-reduce:transition-none"
        style={{
          scale: revealed ? 'none' : '1 0',
          transitionTimingFunction: EASE_IN_OUT,
        }}
      />

      <span
        className={`absolute left-1/2 top-10 -translate-x-1/2 bg-(--seo-bg) px-1.5 py-1 font-mono text-[10px] tabular-nums text-neutral-500 transition-opacity duration-700 motion-reduce:transition-none xl:top-12 xl:text-[11px] ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: '300ms' }}
      >
        {number}
      </span>
    </div>
  )
}

function ChapterEyebrow({
  number,
  label,
}: {
  number: string
  label: string
}) {
  return (
    <Reveal
      as="p"
      className={`flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 ${EYEBROW}`}
    >
      <span className="tabular-nums text-neutral-900 xl:hidden">
        {number}
      </span>

      <span
        aria-hidden="true"
        className="h-px w-4 shrink-0 bg-neutral-300 sm:w-6 xl:hidden"
      />

      {label}
    </Reveal>
  )
}

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
  figureFirst?: boolean
  figure: ReactNode
  children: ReactNode
}) {
  const titleId = useId()

  return (
    <RevealGroup
      as="article"
      threshold={0.05}
      className="relative py-10 sm:py-12 md:py-14 lg:py-16 xl:py-[72px] xl:pl-16"
    >
      <Rail number={number} />

      <div
        aria-labelledby={titleId}
        role="group"
        className={`grid min-w-0 items-center gap-8 sm:gap-10 md:gap-12 xl:gap-x-14 2xl:gap-x-20 ${
          figureFirst
            ? 'xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]'
            : 'xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
        }`}
      >
        <RevealGroup
          className={`min-w-0 ${figureFirst ? 'xl:order-2' : ''}`}
        >
          <ChapterEyebrow
            number={number}
            label={label}
          />

          <Reveal
            delay={80}
            className="mt-4 sm:mt-5 md:mt-6"
          >
            <h3
              id={titleId}
              className={CHAPTER_HEADING}
            >
              {title}
            </h3>
          </Reveal>

          <Reveal
            delay={160}
            className={`mt-4 max-w-[42rem] sm:mt-5 md:mt-6 xl:max-w-md ${BODY}`}
          >
            {children}
          </Reveal>
        </RevealGroup>

        <RevealGroup
          threshold={0.2}
          className={`flex min-w-0 justify-center sm:justify-start ${
            figureFirst
              ? 'xl:order-1 xl:justify-start'
              : 'xl:justify-end'
          }`}
        >
          {figure}
        </RevealGroup>
      </div>
    </RevealGroup>
  )
}

/* -------------------------------------------------------------------------- */
/*  Intro / Closing                                                           */
/* -------------------------------------------------------------------------- */

function Intro({ headingId }: { headingId: string }) {
  return (
    <RevealGroup className="pb-2 pt-12 sm:pt-14 md:pt-16 lg:pt-20 xl:pt-24">
      {/* <Reveal
        as="p"
        className={`flex items-center gap-2.5 ${EYEBROW}`}
      > 
        SEO / ORGANIC GROWTH
      </Reveal> */}

      <Reveal
        delay={80}
        className="mt-4 sm:mt-5 md:mt-6"
      >
        <h2
          id={headingId}className="site-display max-w-[1100px] text-balance text-[clamp(2rem,6vw,4.8rem)] font-normal leading-[0.96] tracking-[-0.045em] text-neutral-950 sm:text-[clamp(2.4rem,5.5vw,4.8rem)] sm:leading-[0.94] md:tracking-[-0.05em] lg:text-[clamp(3rem,4.5vw,4.8rem)]"
        >
          Being online isn&apos;t enough.
          <span className="block">
            You need to be findable.
          </span>
        </h2>
      </Reveal>

      <Reveal
        as="p"
        delay={180}
        className="mt-5 max-w-[42rem] text-[15px] leading-[1.65] text-neutral-600 sm:mt-6 sm:text-[17px] md:text-lg lg:text-xl"
      >
        Your customers are already searching. SEO makes sure your
        website appears when their intent is highest.
      </Reveal>
    </RevealGroup>
  )
}

function Closing({
  ctaHref,
}: {
  ctaHref: string
}) {
  return (
    <RevealGroup className="pb-14 pt-10 sm:pb-16 sm:pt-12 md:pb-20 md:pt-16 lg:pb-24 lg:pt-20">
      <Reveal>
        <h3 className="site-heading max-w-[1000px] text-balance text-[clamp(2rem,4vw,2rem)] leading-[0.98] tracking-[-0.045em] text-neutral-950">
          Better SEO isn&apos;t more traffic.
          <span className="block">
            It&apos;s more of the right people finding you.
          </span>
        </h3>
      </Reveal>

      <Reveal
        delay={260}
        className="mt-6 sm:mt-7 md:mt-8"
      >
        <a
          href={ctaHref}
          className="group inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 border-b border-neutral-900 pb-1 text-[14px] font-medium text-neutral-900 sm:text-base"
        >
          Let&apos;s find your search opportunities

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

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */

export default function WebsiteSection({
  className = '',
  ctaHref = '#contact',
}: WebsiteSectionProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className={`relative w-full overflow-x-clip bg-white px-4 text-neutral-900 [--seo-bg:#ffffff] min-[420px]:px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 ${className}`}
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <Intro headingId={headingId} />

        <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10">
          {/* ESSENTIAL 01 */}
          <Chapter
            number="01"
            label=""
            title="We start with what people are actually looking for."
            figure={<SearchFigure />}
          >
            <p>
              We understand the demand around your business —
              what people search, how often they search and what
              they mean when they type it.
            </p>
          </Chapter>

          {/* ESSENTIAL 02 */}
          <Chapter
            number="02"
            label=""
            title="Strong content can’t perform on a weak foundation."
            figureFirst
            figure={<AuditFigure />}
          >
            <p>
              We make sure search engines can crawl, understand
              and trust the website before pushing more content
              through it.
            </p>
          </Chapter>

          {/* ESSENTIAL 03 */}
          <Chapter
            number="03"
            label=""
            title={
              <>
                SEO isn&apos;t a launch.
                <span className="block ">
                  It&apos;s a feedback loop.
                </span>
              </>
            }
            figure={<LoopFigure />}
          >
            <p>
              We track visibility, rankings and clicks to see what
              is working — then focus the next round of work where
              it can create the most impact.
            </p>
          </Chapter>
        </div>

        <Closing ctaHref={ctaHref} />
      </div>
    </section>
  )
}
