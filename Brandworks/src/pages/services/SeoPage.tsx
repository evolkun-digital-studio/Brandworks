import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

/* -------------------------------------------------------------------------- */
/*                                  DATA                                      */
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

  return Array.from({ length }, (_, index) => {
    const progress = index / Math.max(length - 1, 1)

    const seasonal =
      Math.sin(progress * Math.PI * 3.5) * noise * 0.22

    return (
      Math.round(
        (base +
          drift * progress +
          seasonal +
          (rand() - 0.5) * noise) *
          10,
      ) / 10
    )
  })
}

const SEARCH_DEMAND = makeSeries(34, 118, 52, 22, 8)

const ORGANIC_VISIBILITY = makeSeries(30, 19, 31, 7, 14)

const PREVIOUS_VISIBILITY = makeSeries(30, 19, 6, 5, 22)

const SEARCH_INTENT = [
  {
    short: 'I',
    label: 'Informational',
    value: 46,
  },
  {
    short: 'C',
    label: 'Commercial',
    value: 31,
  },
  {
    short: 'T',
    label: 'Transactional',
    value: 17,
  },
  {
    short: 'N',
    label: 'Navigational',
    value: 6,
  },
] as const

const CAPABILITIES = [
  {
    number: '01',
    title: 'Search strategy',
    description:
      'Demand, competitors, search intent and realistic opportunities.',
  },
  {
    number: '02',
    title: 'Technical SEO',
    description:
      'Crawling, indexing, structure, performance and schema.',
  },
  {
    number: '03',
    title: 'Content systems',
    description:
      'Pages built around topics people actually need.',
  },
  {
    number: '04',
    title: 'AEO',
    description:
      'Clear information structured for answer engines.',
  },
  {
    number: '05',
    title: 'GEO',
    description:
      'Improving how AI systems interpret and reference the business.',
  },
  {
    number: '06',
    title: 'Measurement',
    description:
      'Search visibility connected to useful business outcomes.',
  },
]

const TECHNICAL_CHECKS = [
  {
    label: 'Indexable pages',
    value: '141 / 147',
    status: 'Healthy',
    tone: 'bg-emerald-500',
  },
  {
    label: 'Core Web Vitals',
    value: 'Passing',
    status: 'Healthy',
    tone: 'bg-emerald-500',
  },
  {
    label: 'Structured data',
    value: '92%',
    status: 'Healthy',
    tone: 'bg-emerald-500',
  },
  {
    label: 'Internal links',
    value: '6 orphaned',
    status: 'Review',
    tone: 'bg-orange-400',
  },
  {
    label: 'Duplicate pages',
    value: '3',
    status: 'Review',
    tone: 'bg-orange-400',
  },
]

const PAGE_ARCHITECTURE = [
  {
    type: 'Core',
    title: 'SEO Services',
    intent: 'Commercial',
    position: '01',
  },
  {
    type: 'Service',
    title: 'Technical SEO',
    intent: 'Commercial',
    position: '02',
  },
  {
    type: 'Service',
    title: 'Content SEO',
    intent: 'Commercial',
    position: '03',
  },
  {
    type: 'Guide',
    title: 'SEO Audit Guide',
    intent: 'Informational',
    position: '04',
  },
  {
    type: 'Guide',
    title: 'Search Intent',
    intent: 'Informational',
    position: '05',
  },
]

const AI_SURFACES = [
  {
    name: 'Google AI',
    role: 'AI discovery',
    coverage: 84,
  },
  {
    name: 'ChatGPT Search',
    role: 'Answer discovery',
    coverage: 72,
  },
  {
    name: 'Perplexity',
    role: 'Citation discovery',
    coverage: 67,
  },
  {
    name: 'Bing / Copilot',
    role: 'Search + AI',
    coverage: 61,
  },
]

const PROCESS = [
  {
    number: '01',
    title: 'Understand demand',
    description:
      'We identify what people search for, how they phrase it and where commercial opportunity exists.',
  },
  {
    number: '02',
    title: 'Fix the foundation',
    description:
      'Technical problems that limit crawling, indexing or performance are handled before scaling content.',
  },
  {
    number: '03',
    title: 'Build the structure',
    description:
      'Pages, internal links and information architecture are organised around real search behaviour.',
  },
  {
    number: '04',
    title: 'Improve continuously',
    description:
      'Search data tells us what is gaining visibility, what is being missed and what should happen next.',
  },
]

const FAQS = [
  {
    question: 'How long does SEO take?',
    answer:
      'SEO compounds over time. Technical changes can have an effect relatively quickly, while stronger organic visibility usually develops over several months depending on the website, competition and starting position.',
  },
  {
    question: 'Do you guarantee first-page rankings?',
    answer:
      'No. Search results are controlled by search engines and change constantly. We focus on building the technical, content and authority signals that give the website a stronger ability to compete.',
  },
  {
    question: 'What are AEO and GEO?',
    answer:
      'AEO focuses on making information easier for answer engines to understand and use. GEO extends that thinking toward generative AI systems and the sources they use when producing answers.',
  },
  {
    question: 'Do you work with an existing website?',
    answer:
      'Yes. Most SEO work can be carried out on an existing website. If technical or structural limitations are restricting performance, we identify them during the audit.',
  },
]

/* -------------------------------------------------------------------------- */
/*                               MOTION SYSTEM                                */
/* -------------------------------------------------------------------------- */

const RevealContext = createContext(true)

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useInView<T extends Element>(threshold = 0.12) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      reducedMotion()
    ) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        setVisible(true)
        observer.disconnect()
      },
      {
        threshold,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return [ref, visible] as const
}

function RevealGroup({
  children,
  className = '',
  threshold = 0.12,
}: {
  children: ReactNode
  className?: string
  threshold?: number
}) {
  const [ref, visible] = useInView<HTMLDivElement>(threshold)

  return (
    <RevealContext.Provider value={visible}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </RevealContext.Provider>
  )
}

function Reveal({
  children,
  className = '',
  delay = 0,
  distance = 18,
}: {
  children: ReactNode
  className?: string
  delay?: number
  distance?: number
}) {
  const visible = useContext(RevealContext)

  return (
    <div
      className={`
        transition-[opacity,translate]
        duration-[850ms]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        motion-reduce:transition-none
        ${visible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
      style={{
        translate:
          visible || distance === 0
            ? 'none'
            : `0 ${distance}px`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function Wipe({
  children,
  className = '',
  delay = 0,
  duration = 1300,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  const visible = useContext(RevealContext)

  return (
    <div
      className={`
        transition-[clip-path]
        motion-reduce:transition-none
        ${className}
      `}
      style={{
        clipPath: visible
          ? 'inset(-2px)'
          : 'inset(-2px 100% -2px -2px)',
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction:
          'cubic-bezier(0.65, 0, 0.35, 1)',
      }}
    >
      {children}
    </div>
  )
}

function AnimatedBar({
  width,
  delay = 0,
  className = 'bg-neutral-950',
}: {
  width: number
  delay?: number
  className?: string
}) {
  const visible = useContext(RevealContext)

  return (
    <div
      className={`
        h-full
        transition-[width]
        duration-[1300ms]
        motion-reduce:transition-none
        ${className}
      `}
      style={{
        width: visible ? `${width}%` : '0%',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction:
          'cubic-bezier(0.65, 0, 0.35, 1)',
      }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                                CHART                                       */
/* -------------------------------------------------------------------------- */

function makeLine(
  values: readonly number[],
  min: number,
  max: number,
) {
  return values
    .map((value, index) => {
      const x =
        (index / Math.max(values.length - 1, 1)) * 100

      const y =
        100 - ((value - min) / Math.max(max - min, 1)) * 100

      return `${index === 0 ? 'M' : 'L'}${x.toFixed(
        2,
      )} ${y.toFixed(2)}`
    })
    .join(' ')
}

function LineChart({
  data,
  comparison,
  min,
  max,
  labels,
}: {
  data: readonly number[]
  comparison?: readonly number[]
  min: number
  max: number
  labels: readonly string[]
}) {
  const path = makeLine(data, min, max)

  const comparisonPath = comparison
    ? makeLine(comparison, min, max)
    : null

  return (
    <div>
      <div className="relative h-[150px] sm:h-[180px]">
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className="block border-t border-neutral-100"
            />
          ))}
        </div>

        <Wipe
          delay={250}
          className="absolute inset-0 text-blue-600"
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {comparisonPath && (
              <path
                d={comparisonPath}
                fill="none"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                className="stroke-neutral-400"
              />
            )}

            <path
              d={`${path} L100 100 L0 100 Z`}
              fill="currentColor"
              fillOpacity="0.06"
            />

            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Wipe>
      </div>

      <div className="mt-3 flex justify-between text-[10px] text-neutral-400 sm:text-[11px]">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                             FIGURE PRIMITIVES                              */
/* -------------------------------------------------------------------------- */

function Figure({
  children,
  caption,
}: {
  children: ReactNode
  caption?: string
}) {
  return (
    <Reveal className="w-full">
      <figure className="w-full">
        <div className="border border-neutral-200 bg-white p-5 sm:p-6 md:p-7">
          {children}
        </div>

        {caption && (
          <figcaption className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.11em] text-neutral-400 sm:text-[10px]">
            <span className="h-px w-5 bg-neutral-300" />
            {caption}
          </figcaption>
        )}
      </figure>
    </Reveal>
  )
}

function FigureHeader({
  title,
  meta,
}: {
  title: string
  meta?: string
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h4 className="text-[12px] font-medium text-neutral-900 sm:text-[13px]">
        {title}
      </h4>

      {meta && (
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-neutral-400 sm:text-[10px]">
          {meta}
        </span>
      )}
    </header>
  )
}

function FigureDivider() {
  return <div className="my-6 border-t border-neutral-100" />
}

function Dot({
  className = 'bg-neutral-900',
}: {
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${className}`}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                              HERO FIGURE                                   */
/* -------------------------------------------------------------------------- */

function SearchSystemFigure() {
  return (
    <Figure >
      <FigureHeader
        title="How discovery works"
        meta="Search / AI"
      />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="border border-neutral-200 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-400">
            Business
          </p>

          <p className="mt-8 text-[14px] font-medium">
            Your website
          </p>

          <p className="mt-1 text-[11px] text-neutral-500">
            Pages + information
          </p>
        </div>

        <div className="font-mono text-[13px] text-neutral-300">
          →
        </div>

        <div className="space-y-2">
          {[
            'Search engines',
            'Answer engines',
            'AI systems',
          ].map((item, index) => (
            <div
              key={item}
              className="flex min-h-[42px] items-center justify-between border border-neutral-200 px-3"
            >
              <span className="text-[11px] text-neutral-700">
                {item}
              </span>

              <span className="font-mono text-[9px] text-neutral-400">
                0{index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FigureDivider />

      <div className="grid grid-cols-3 divide-x divide-neutral-100">
        {[
          ['Crawl', 'Accessible'],
          ['Understand', 'Structured'],
          ['Surface', 'Relevant'],
        ].map(([title, value]) => (
          <div
            key={title}
            className="px-3 first:pl-0 last:pr-0"
          >
            <p className="text-[9px] uppercase tracking-[0.1em] text-neutral-400">
              {title}
            </p>

            <p className="mt-2 text-[12px] text-neutral-800">
              {value}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                           SEARCH DEMAND FIGURE                             */
/* -------------------------------------------------------------------------- */

function SearchDemandFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="Search Demand"
        meta="Last 12 months"
      />

      <div className="flex items-end justify-between gap-6">
        <div>
          <span className="block text-[36px] font-normal leading-none tracking-[-0.045em] text-neutral-950 sm:text-[42px]">
            164K
          </span>

          <p className="mt-2 text-[11px] text-neutral-500">
            monthly searches
          </p>
        </div>

        <div className="text-right">
          <p className="font-mono text-[10px] text-emerald-600">
            ↑ 18.4%
          </p>

          <p className="mt-1 text-[10px] text-neutral-400">
            demand change
          </p>
        </div>
      </div>

      <LineChart
        data={SEARCH_DEMAND}
        min={100}
        max={190}
        labels={['Oct', 'Jan', 'Apr', 'Jul', 'Sep']}
      />

      <FigureDivider />

      <div className="flex items-end justify-between gap-5">
        <div>
          <h5 className="text-[12px] font-medium">
            Search intent
          </h5>

          <p className="mt-1 text-[10px] text-neutral-400">
            Share of relevant searches
          </p>
        </div>
      </div>

      <Wipe delay={350} className="mt-4">
        <div className="flex h-1.5 overflow-hidden">
          {SEARCH_INTENT.map((item, index) => (
            <div
              key={item.short}
              className={
                index === 0
                  ? 'bg-blue-700'
                  : index === 1
                    ? 'bg-blue-500'
                    : index === 2
                      ? 'bg-blue-300'
                      : 'bg-neutral-300'
              }
              style={{ width: `${item.value}%` }}
            />
          ))}
        </div>
      </Wipe>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SEARCH_INTENT.map((item, index) => (
          <div key={item.short}>
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 ${
                  index === 0
                    ? 'bg-blue-700'
                    : index === 1
                      ? 'bg-blue-500'
                      : index === 2
                        ? 'bg-blue-300'
                        : 'bg-neutral-300'
                }`}
              />

              <span className="font-mono text-[11px]">
                {item.value}%
              </span>
            </div>

            <p className="mt-1 text-[10px] text-neutral-400">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                            TECHNICAL FIGURE                                */
/* -------------------------------------------------------------------------- */

function TechnicalFigure() {
  return (
    <Figure  >
      <FigureHeader title="Technical Audit" meta="Site crawl" />

      <div className="flex items-baseline gap-3">
        <span className="text-[36px] leading-none tracking-[-0.045em] sm:text-[42px]">
          147
        </span>

        <span className="text-[11px] text-neutral-500">
          pages analysed
        </span>
      </div>

      <div className="mt-6 flex h-2 overflow-hidden">
        <div
          className="bg-red-500"
          style={{ width: '3%' }}
        />

        <div
          className="bg-orange-400"
          style={{ width: '9%' }}
        />

        <div
          className="bg-emerald-500"
          style={{ width: '88%' }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          ['Critical', '3', 'bg-red-500'],
          ['Review', '12', 'bg-orange-400'],
          ['Healthy', '132', 'bg-emerald-500'],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div className="flex items-center gap-2">
              <Dot className={color} />

              <span className="text-[10px] text-neutral-500">
                {label}
              </span>
            </div>

            <p className="mt-2 font-mono text-[12px]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <FigureDivider />

      <div>
        {TECHNICAL_CHECKS.map((check) => (
          <div
            key={check.label}
            className="grid min-h-[46px] grid-cols-[1fr_auto] items-center gap-5 border-t border-neutral-100 first:border-t-0"
          >
            <div className="flex items-center gap-2.5">
              <Dot className={check.tone} />

              <span className="text-[11px] text-neutral-500 sm:text-[12px]">
                {check.label}
              </span>
            </div>

            <span className="font-mono text-[10px] text-neutral-800 sm:text-[11px]">
              {check.value}
            </span>
          </div>
        ))}
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                           CONTENT FIGURE                                   */
/* -------------------------------------------------------------------------- */

function ContentArchitectureFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="Content Architecture"
        meta="Topic cluster"
      />

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute bottom-5 left-[17px] top-5 w-px bg-neutral-200"
        />

        <div className="relative space-y-2">
          {PAGE_ARCHITECTURE.map((page, index) => (
            <div
              key={page.title}
              className="relative grid grid-cols-[35px_1fr_auto] items-center gap-3 bg-white py-2"
            >
              <div className="relative z-10 flex h-[35px] w-[35px] items-center justify-center border border-neutral-200 bg-white font-mono text-[9px] text-neutral-400">
                {page.position}
              </div>

              <div>
                <p className="text-[11px] font-medium text-neutral-800 sm:text-[12px]">
                  {page.title}
                </p>

                <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-neutral-400">
                  {page.type}
                </p>
              </div>

              <span
                className={`hidden px-2 py-1 font-mono text-[8px] uppercase tracking-[0.06em] sm:block ${
                  index === 0
                    ? 'bg-neutral-950 text-white'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {page.intent}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FigureDivider />

      <div className="grid grid-cols-3 divide-x divide-neutral-100">
        <div className="pr-4">
          <p className="font-mono text-[18px]">01</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-neutral-400">
            Core topic
          </p>
        </div>

        <div className="px-4">
          <p className="font-mono text-[18px]">04</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-neutral-400">
            Supporting
          </p>
        </div>

        <div className="pl-4">
          <p className="font-mono text-[18px]">12</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-neutral-400">
            Internal links
          </p>
        </div>
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                              AI FIGURE                                     */
/* -------------------------------------------------------------------------- */

function AIVisibilityFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="AI Visibility"
        meta="Discovery surfaces"
      />

      <p className="max-w-[390px] text-[11px] leading-5 text-neutral-500">
        How clearly the business can be interpreted across
        search and AI-led discovery environments.
      </p>

      <div className="mt-6">
        {AI_SURFACES.map((surface, index) => (
          <div
            key={surface.name}
            className="border-t border-neutral-100 py-4 first:border-t-0 first:pt-0"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-medium sm:text-[12px]">
                  {surface.name}
                </p>

                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-neutral-400">
                  {surface.role}
                </p>
              </div>

              <span className="font-mono text-[10px] text-neutral-500">
                {surface.coverage}%
              </span>
            </div>

            <div className="mt-3 h-[2px] bg-neutral-100">
              <AnimatedBar
                width={surface.coverage}
                delay={250 + index * 100}
                className="bg-blue-600"
              />
            </div>
          </div>
        ))}
      </div>

      <FigureDivider />

      <div className="grid grid-cols-2 gap-x-7 gap-y-5">
        {[
          ['Entities', 'Clear'],
          ['Services', 'Structured'],
          ['Expertise', 'Supported'],
          ['Sources', 'Consistent'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-[0.08em] text-neutral-400">
              {label}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Dot className="bg-emerald-500" />

              <span className="text-[11px] text-neutral-700">
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                          PERFORMANCE FIGURE                                */
/* -------------------------------------------------------------------------- */

function PerformanceFigure() {
  return (
    <Figure  >
      <FigureHeader
        title="Organic Performance"
        meta="Current period"
      />

      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        {[
          ['Visibility', '42.8', '+18%'],
          ['Clicks', '12.8K', '+33%'],
          ['CTR', '6.9%', '+0.8'],
          ['Position', '9.6', '+4.6'],
        ].map(([label, value, delta]) => (
          <div key={label}>
            <p className="text-[10px] text-neutral-400">
              {label}
            </p>

            <p className="mt-2 text-[21px] leading-none tracking-[-0.03em]">
              {value}
            </p>

            <p className="mt-2 font-mono text-[9px] text-emerald-600">
              ↑ {delta}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <LineChart
          data={ORGANIC_VISIBILITY}
          comparison={PREVIOUS_VISIBILITY}
          min={14}
          max={55}
          labels={['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-neutral-400">
        <span className="flex items-center gap-2">
          <span className="h-px w-4 bg-blue-600" />
          Current
        </span>

        <span className="flex items-center gap-2">
          <span className="w-4 border-t border-dashed border-neutral-400" />
          Previous
        </span>
      </div>
    </Figure>
  )
}

/* -------------------------------------------------------------------------- */
/*                                CHAPTER                                     */
/* -------------------------------------------------------------------------- */

function Chapter({
  number,
  eyebrow,
  title,
  description,
  figure,
  reverse = false,
}: {
  number: string
  eyebrow: string
  title: string
  description: string
  figure: ReactNode
  reverse?: boolean
}) {
  return (
    <RevealGroup
      threshold={0.05}
      className="relative border-t border-neutral-200 py-16 sm:py-20 lg:py-24"
    >
      <div
        className={`
          grid min-w-0 items-center gap-12
          lg:grid-cols-[minmax(0,0.8fr)_minmax(440px,1fr)]
          lg:gap-16
          xl:gap-24
          ${
            reverse
              ? 'lg:grid-cols-[minmax(440px,1fr)_minmax(0,0.8fr)]'
              : ''
          }
        `}
      >
        <div className={reverse ? 'lg:order-2' : ''}>
          

          <Reveal delay={80}>
            <h2 className="site-heading mt-5 max-w-[590px] text-balance text-[clamp(2rem,4vw,3.1rem)] font-normal leading-[1.02] tracking-[-0.04em] text-neutral-950">
              {title}
            </h2>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-6 max-w-[520px] text-[14px] leading-[1.75] text-neutral-500 sm:text-[15px]">
              {description}
            </p>
          </Reveal>
        </div>

        <RevealGroup
          threshold={0.18}
          className={reverse ? 'lg:order-1' : ''}
        >
          {figure}
        </RevealGroup>
      </div>
    </RevealGroup>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  PAGE                                      */
/* -------------------------------------------------------------------------- */

export default function SEOPage() {
  return (
    <main className="w-full overflow-x-clip bg-white text-neutral-950">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 md:px-8 lg:px-10 lg:pb-24 lg:pt-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid items-end gap-12 lg:grid-cols-[1fr_0.75fr] lg:gap-20">
              <div>
                
                <Reveal delay={80}>
                  <h1 className="site-display mt-6 max-w-[840px] text-balance text-[clamp(2.5rem,5vw,3.1rem)] font-normal leading-[0.98] tracking-[-0.045em] text-neutral-950">
                    Be found when people search.
                    <span className="block">
                      Be understood when AI answers.
                    </span>
                  </h1>
                </Reveal>

                <Reveal delay={150}>
                  <p className="mt-7 max-w-[650px] text-[15px] leading-[1.75] text-neutral-500 sm:text-[16px]">
                    BrandWorks builds search visibility across
                    traditional search and emerging AI discovery.
                    Strategy, technical SEO, content, AEO and GEO
                    work together so the business is easier to
                    find, understand and trust.
                  </p>
                </Reveal>

                <Reveal delay={220}>
                  <div className="mt-9 flex flex-wrap items-center gap-6">
                    <Link
                      to="/contact"
                      className="group inline-flex min-h-[46px] items-center gap-8 bg-neutral-950 px-5 text-[12px] font-medium text-white transition-colors duration-300 hover:bg-[#CCFF00] hover:text-neutral-950"
                    >
                      Start a project

                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </Link>

                    <a
                      href="#seo-approach"
                      className="border-b border-neutral-300 pb-1 text-[12px] font-medium text-neutral-600 transition-colors duration-300 hover:border-neutral-950 hover:text-neutral-950"
                    >
                      How we approach search
                    </a>
                  </div>
                </Reveal>
              </div>

              <RevealGroup threshold={0.1}>
                <SearchSystemFigure />
              </RevealGroup>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SMALL CAPABILITY INDEX                                             */}
      {/* ------------------------------------------------------------------ */}

      <section className=" ">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <RevealGroup>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              {CAPABILITIES.map((item, index) => (
                <Reveal
                  key={item.number}
                  delay={index * 55}
                  className="border-b border-neutral-200 px-0 py-6 even:border-l even:pl-5 md:border-l md:px-5 md:first:border-l-0 md:[&:nth-child(4)]:border-l-0 xl:border-b-0 xl:[&:nth-child(4)]:border-l"
                > 

                  <h2 className="mt-4 text-[18px] font-medium">
                    {item.title}
                  </h2>

                  <p className="mt-2 hidden text-[12px] leading-5 text-neutral-400 xl:block">
                    {item.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* INTRO                                                              */}
      {/* ------------------------------------------------------------------ */}

      <section
        id="seo-approach"
        className="px-4 py-20 sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16"
      >
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-10 lg:grid-cols-[0.45fr_1fr] lg:gap-24">
              <Reveal>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-400 sm:text-[10px]">
                  Search, without the noise
                </p>
              </Reveal>

              <div>
                <Reveal delay={80}>
                  <h2 className="site-heading max-w-[900px] text-balance text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em]">
                    More traffic is not the goal.
                    <span className="block  ">
                      Better discovery is.
                    </span>
                  </h2>
                </Reveal>

                <div className="mt-9 grid gap-7 border-t border-neutral-200 pt-7 md:grid-cols-2">
                  

                  <Reveal delay={210}>
                    <p className="max-w-[440px] text-[14px] leading-[1.75] text-neutral-500">
                      That requires more than keywords. Technical
                      structure, content architecture, brand
                      clarity and measurement all affect what gets
                      discovered.
                    </p>
                  </Reveal>
                </div>
              </div>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN SEO CHAPTERS                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <Chapter
            number="01"
            eyebrow="Search demand"
            title="Start with what people are actually looking for."
            description="We study queries, topics, competitors and search intent before deciding what should be created or changed. The goal is to understand where useful demand already exists and where the business can realistically compete."
            figure={<SearchDemandFigure />}
          />

          <Chapter
            number="02"
            eyebrow="Technical foundation"
            title="Make the website easy to crawl and understand."
            description="Before content can perform, search systems need a technically clear website. We review indexing, performance, site structure, canonicalisation, internal links, structured data and the signals that help search engines interpret each page."
            figure={<TechnicalFigure />}
            reverse
          />

          <Chapter
            number="03"
            eyebrow="Content architecture"
            title="Give every useful search a clear destination."
            description="We structure service pages, supporting content and internal links around the way people search. Each page should have a clear role rather than competing with other pages on the same website."
            figure={<ContentArchitectureFigure />}
          />

          <Chapter
            number="04"
            eyebrow="AEO + GEO"
            title="Search visibility now extends beyond ten blue links."
            description="People increasingly discover businesses through AI-generated answers as well as traditional results. We improve the clarity, structure and consistency of the information AI systems can interpret about the brand, services and expertise."
            figure={<AIVisibilityFigure />}
            reverse
          />

          <Chapter
            number="05"
            eyebrow="Measurement"
            title="Measure what changed. Then decide what happens next."
            description="SEO is an ongoing feedback loop. We look at visibility, impressions, clicks, query movement, conversions and emerging AI discovery signals to understand what is working and where the next opportunity sits."
            figure={<PerformanceFigure />}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SEO / AEO / GEO                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-y border-neutral-200 bg-[#f7f7f5] px-4 py-20 sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1fr] lg:gap-24">
              <div>
               

                <Reveal delay={80}>
                  <h2 className="site-heading mt-5 max-w-[530px] text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em]">
                    Search is changing.
                    <span className="block">
                      The fundamentals are not.
                    </span>
                  </h2>
                </Reveal>

                <Reveal delay={150}>
                  <p className="mt-6 max-w-[500px] text-[14px] leading-[1.75] text-neutral-500">
                    Systems still need clear information,
                    trustworthy sources and a technically accessible
                    website. The surfaces using that information are
                    simply expanding.
                  </p>
                </Reveal>
              </div>

              <div className="border-t border-neutral-300">
                {[
                  {
                    number: '01',
                    title: 'SEO',
                    subtitle: 'Search Engine Optimisation',
                    body:
                      'Improving organic visibility in traditional search results through technical, content and authority signals.',
                  },
                  {
                    number: '02',
                    title: 'AEO',
                    subtitle: 'Answer Engine Optimisation',
                    body:
                      'Structuring useful information so answer engines can interpret it clearly and surface direct responses.',
                  },
                  {
                    number: '03',
                    title: 'GEO',
                    subtitle: 'Generative Engine Optimisation',
                    body:
                      'Improving how generative systems understand the brand, its expertise, entities, services and supporting sources.',
                  },
                ].map((item, index) => (
                  <Reveal
                    key={item.number}
                    delay={index * 90}
                    className="grid gap-4 border-b border-neutral-300 py-7 sm:grid-cols-[45px_1fr_1.5fr] sm:gap-7"
                  >
                    <span className="font-mono text-[12px] text-neutral-700">
                      {item.number}
                    </span>

                    <div>
                      <p className="text-[20px] tracking-[-0.025em]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[12px] uppercase tracking-[0.08em] text-neutral-700">
                        {item.subtitle}
                      </p>
                    </div>

                    <p className="text-[12px] leading-6 text-neutral-500">
                      {item.body}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PROCESS                                                            */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 py-20 sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-10 lg:grid-cols-[0.42fr_1fr] lg:gap-24">
              <div>
                <Reveal>
                  <p className=" text-[12px] uppercase tracking-[0.14em] text-black sm:text-[10px]">
                    How the work moves
                  </p>
                </Reveal>
              </div>

              <Reveal delay={80}>
                <h2 className="site-heading max-w-[820px] text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em]">
                  Research first.
                  <span className="block">
                    Execution follows the evidence.
                  </span>
                </h2>
              </Reveal>
            </div>

            <div className="mt-14 border-t border-neutral-200">
              {PROCESS.map((item, index) => (
                <Reveal
                  key={item.number}
                  delay={index * 70}
                  className="grid gap-5 border-b border-neutral-200 py-7 md:grid-cols-[70px_0.8fr_1.1fr] md:items-start md:gap-10"
                >
                  <span className="font-mono text-[9px] text-neutral-400">
                    {item.number}
                  </span>

                  <h3 className="text-[17px] font-normal tracking-[-0.02em] sm:text-[19px]">
                    {item.title}
                  </h3>

                  <p className="max-w-[580px] text-[12px] leading-6 text-neutral-500 sm:text-[13px]">
                    {item.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* WHAT WE LOOK AT                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1fr] lg:gap-24">
              <div>
                <Reveal>
                  <p className=" text-[9px] uppercase tracking-[0.14em] text-white sm:text-[10px]">
                    What we look at
                  </p>
                </Reveal>

                <Reveal delay={80}>
                  <h2 className="site-heading mt-5 max-w-[580px] text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em] text-white">
                    The website is one system.
                  </h2>
                </Reveal>

                <Reveal delay={150}>
                  <p className="mt-6 max-w-[490px] text-[13px] leading-7 text-white/80">
                    Search performance rarely comes down to one
                    missing keyword. We look at how the entire
                    website communicates with users and search
                    systems.
                  </p>
                </Reveal>
              </div>

              <div className=" ">
                {[
                  ['Technical', 'Crawlability, indexing, speed, schema'],
                  ['Architecture', 'Hierarchy, URLs, internal links'],
                  ['Content', 'Intent, usefulness, topical depth'],
                  ['On-page', 'Titles, headings, entities, context'],
                  ['Authority', 'Reputation, references, backlinks'],
                  ['Experience', 'Usability, mobile, conversion path'],
                  ['AI visibility', 'Entities, citations, source clarity'],
                  ['Measurement', 'Search Console, analytics, conversion'],
                ].map(([title, detail], index) => (
                  <Reveal
                    key={title}
                    delay={index * 45}
                    className="grid grid-cols-[32px_0.65fr_1fr] gap-4 border-b border-neutral-800 py-5 sm:gap-7"
                  >
                    <span className="font-mono text-[12px] text-white/80">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="text-[14px] text-neutral-200">
                      {title}
                    </span>

                    <span className="text-[13px] text-neutral-300">
                      {detail}
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* REPORTING                                                          */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 py-20 sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-12 lg:grid-cols-[0.62fr_1fr] lg:gap-24">
              <div>
               
                <Reveal delay={80}>
                  <h2 className="site-heading mt-5 max-w-[590px] text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em]">
                    Reports should lead to decisions.
                  </h2>
                </Reveal>

                <Reveal delay={150}>
                  <p className="mt-6 max-w-[500px] text-[14px] leading-[1.75] text-neutral-500">
                    Not pages of screenshots. We focus on the
                    signals that explain whether visibility is
                    improving and where effort should go next.
                  </p>
                </Reveal>
              </div>

              <div className=" ">
                {[
                  {
                    number: '01',
                    metric: 'Visibility',
                    question:
                      'Are the right pages appearing for relevant searches?',
                  },
                  {
                    number: '02',
                    metric: 'Qualified clicks',
                    question:
                      'Are relevant people choosing the website?',
                  },
                  {
                    number: '03',
                    metric: 'Search intent',
                    question:
                      'Are we visible at the right stage of demand?',
                  },
                  {
                    number: '04',
                    metric: 'Conversions',
                    question:
                      'Is organic discovery creating useful actions?',
                  },
                  {
                    number: '05',
                    metric: 'AI discovery',
                    question:
                      'How is the business appearing in emerging answer surfaces?',
                  },
                ].map((item, index) => (
                  <Reveal
                    key={item.number}
                    delay={index * 65}
                    className="grid gap-3 border-b border-neutral-200 py-6 sm:grid-cols-[45px_0.65fr_1fr] sm:gap-7"
                  >
                    <span className="font-mono text-[12px] text-neutral-800">
                      {item.number}
                    </span>

                    <span className="text-[16px] font-medium">
                      {item.metric}
                    </span>

                    <span className="text-[14px] leading-5 text-neutral-600">
                      {item.question}
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BRAND + SEARCH                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 md:px-8 lg:px-10 lg:pb-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <Reveal>
              <div className="grid gap-12 bg-[#CCFF00] px-6 py-12 sm:px-9 sm:py-14 lg:grid-cols-[1fr_0.65fr] lg:items-end lg:px-12 lg:py-16">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em]">
                    Search + Brand
                  </p>

                  <h2 className="site-heading mt-6 max-w-[720px] text-[clamp(2rem,4vw,3.1rem)] leading-[1.02] tracking-[-0.04em]">
                    Getting found is the first step.
                    <span className="block">
                      Being understood is what matters next.
                    </span>
                  </h2>
                </div>

                {/* <p className="max-w-[470px] text-[12px] leading-6 text-neutral-700 lg:justify-self-end">
                  SEO can create discovery. Brand, messaging and
                  experience determine what happens after someone
                  arrives. We treat them as parts of the same
                  system.
                </p> */}
              </div>
            </Reveal>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-t border-neutral-200 px-4 py-20 sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="grid gap-12 lg:grid-cols-[0.55fr_1fr] lg:gap-24">
              <div>
                 

                <Reveal delay={80}>
                  <h2 className="site-heading mt-5 text-[clamp(2rem,4vw,3.1rem)] leading-[1.03] tracking-[-0.04em]">
                    Useful answers.
                  </h2>
                </Reveal>
              </div>

              <div>
                {FAQS.map((faq, index) => (
                  <Reveal
                    key={faq.question}
                    delay={index * 60}
                  >
                    <details className="group border-t border-neutral-200 last:border-b">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-8 py-6">
                        <div className="flex items-center gap-5">
                          

                          <h3 className="text-[22px]">
                            {faq.question}
                          </h3>
                        </div>

                        <span className="relative block h-3.5 w-3.5 shrink-0">
                          <span className="absolute left-0 top-1/2 h-px w-full bg-neutral-950" />

                          <span className="absolute left-1/2 top-0 h-full w-px bg-neutral-950 transition-opacity duration-300 group-open:opacity-0" />
                        </span>
                      </summary>

                      <div className="pb-7 sm:pl-[38px]">
                        <p className="max-w-[700px] text-[14px] leading-6 text-neutral-600 sm:text-[16px]">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  </Reveal>
                ))}
              </div>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FINAL CTA                                                          */}
      {/* ------------------------------------------------------------------ */}

      <section className="bg-neutral-950 px-4 py-20 text-white sm:px-6 sm:py-24 md:px-8 lg:px-10 lg:py-28 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1440px]">
          <RevealGroup>
            <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-end">
              <div>
              
                <Reveal delay={80}>
                  <h2 className="site-display mt-6 max-w-[820px] text-balance text-[clamp(2.3rem,4.5vw,3.1rem)] leading-[0.99] tracking-[-0.045em]">
                    Find the search opportunities your business
                    should own.
                  </h2>
                </Reveal>
              </div>

              <Reveal delay={160}>
                <Link
                  to="/contact"
                  className="group inline-flex min-h-[50px] w-fit items-center gap-12 bg-[#CCFF00] px-6 text-[12px] font-medium text-neutral-950"
                >
                  Talk to BrandWorks

                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </Reveal>
            </div>
          </RevealGroup>
        </div>
      </section>
    </main>
  )
}