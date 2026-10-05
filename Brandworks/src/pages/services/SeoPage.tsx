import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/*  Every figure on this page comes from a source listed in SOURCES below.    */
/* -------------------------------------------------------------------------- */

const SOURCES = {
  ahrefs: {
    label: 'Ahrefs, “96.55% of Content Gets No Traffic From Google” (2023)',
    url: 'https://ahrefs.com/blog/search-traffic-study/',
  },
  pew: {
    label: 'Pew Research Center, “Google users are less likely to click on links when an AI summary appears in the results” (July 2025)',
    url: 'https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/',
  },
  geo: {
    label: 'Aggarwal et al., “GEO: Generative Engine Optimization”, KDD 2024',
    url: 'https://arxiv.org/abs/2311.09735',
  },
  googleAi: {
    label: 'Google Search Central, “AI features and your website”',
    url: 'https://developers.google.com/search/docs/appearance/ai-features',
  },
  googleHire: {
    label: 'Google Search Central, “Do you need an SEO?”',
    url: 'https://developers.google.com/search/docs/fundamentals/do-i-need-seo',
  },
  googleHelpful: {
    label: 'Google Search Central, “Creating helpful, reliable, people-first content”',
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
  },
  googleLocal: {
    label: 'Google Business Profile Help, “Tips to improve your local ranking on Google”',
    url: 'https://support.google.com/business/answer/7091',
  },
  vitals: {
    label: 'web.dev, “Web Vitals”',
    url: 'https://web.dev/articles/vitals',
  },
} as const

const SERVICES = [
  {
    id: 'audit',
    title: 'SEO audit',
    body: 'A full crawl of your site, read alongside your Search Console and analytics data. We look at indexing, duplicate and thin pages, redirects, internal links, page speed and how your pages appear in results.',
    outcome: 'You get a prioritised list of fixes with the reasoning behind each one, written so your developer can act on it without needing a call.',
  },
  {
    id: 'technical',
    title: 'Technical SEO',
    body: 'Crawlability, indexing, site structure, canonical tags, XML sitemaps, structured data and Core Web Vitals, which are Google’s measures of loading speed, responsiveness and visual stability.',
    outcome: 'Redesigning or changing platforms? We map every redirect before launch so the rankings you already have carry over to the new site.',
  },
  {
    id: 'research',
    title: 'Keyword and search intent research',
    body: 'We find the searches that match what you sell, then sort them by what the person actually wants: to learn something, compare options, buy, or find a particular business.',
    outcome: 'That tells us which pages you need, and which existing pages should be merged, rewritten or left alone.',
  },
  {
    id: 'content',
    title: 'On-page SEO and content',
    body: 'Titles, headings, internal links and copy for your service and product pages, plus articles that answer the questions customers ask before they buy.',
    outcome: 'Where we can, we write from interviews with your team. First-hand experience is what Google’s helpful content guidance asks for, and it’s the thing generic copy can’t fake.',
    source: 'googleHelpful' as const,
  },
  {
    id: 'local',
    title: 'Local SEO',
    body: 'For businesses that serve a city or region: Google Business Profile setup and upkeep, consistent name, address and phone details across directories, and location pages that say something specific about each place.',
    outcome: 'We also set up a simple routine for asking happy customers for reviews. Google itself says more reviews and positive ratings can help a business’s local ranking.',
    source: 'googleLocal' as const,
  },
  {
    id: 'links',
    title: 'Link earning and digital PR',
    body: 'Links from other reputable websites are still one of the strongest signals in search. We earn them with useful resources, expert commentary and the press work our PR team already does.',
    outcome: 'We don’t buy links or use networks. Shortcuts like that can get a domain penalised, and the damage takes far longer to undo than it took to cause.',
  },
  {
    id: 'ai',
    title: 'AI search visibility',
    body: 'Making sure Google’s AI Overviews, ChatGPT search and similar tools can read your site and cite it accurately: key facts in text rather than images, consistent business details across the web, and content that names its sources.',
    outcome: 'Google says no special markup is needed for its AI features, so we treat this as SEO done thoroughly rather than a separate product with a separate fee.',
    source: 'googleAi' as const,
  },
  {
    id: 'reporting',
    title: 'Reporting',
    body: 'A monthly report in plain language covering what we did, what moved, what didn’t, and what comes next. We track rankings, but we lead with clicks, enquiries and sales from organic search.',
    outcome: 'Your Search Console, analytics and Business Profile stay in your name. If we ever part ways, you keep everything.',
  },
]

const VITALS = [
  { metric: 'Largest Contentful Paint', short: 'LCP', measures: 'How quickly the main content loads', target: '2.5 seconds or less' },
  { metric: 'Interaction to Next Paint', short: 'INP', measures: 'How quickly the page responds to a tap or click', target: '200 milliseconds or less' },
  { metric: 'Cumulative Layout Shift', short: 'CLS', measures: 'How much the layout jumps while loading', target: '0.1 or less' },
]

const PHASES = [
  {
    when: 'First four weeks',
    title: 'Audit and plan',
    body: 'We set up access, run the audit and do the research. By the end you have the audit, a map of which searches each page should target, and a plan for the next three months with the reasoning behind each priority.',
  },
  {
    when: 'Months two and three',
    title: 'Fix, then build',
    body: 'Technical fixes go in first, because content can’t perform on pages Google struggles to crawl or index. Then priority pages are rewritten or created, and internal links are rebuilt around them.',
  },
  {
    when: 'Month four onwards',
    title: 'Grow what works',
    body: 'Content, links and local work continue, steered by what Search Console shows. We review the plan with you every quarter and drop anything that isn’t earning its place.',
  },
]

const FAQS = [
  {
    q: 'How long does SEO take to work?',
    a: 'Technical fixes can show up within weeks, especially if pages weren’t being indexed. Rankings for competitive searches usually take several months, depending on where your site starts and who you’re competing with. We’ll give you a realistic view after the audit rather than a number up front.',
  },
  {
    q: 'Can you guarantee first-page rankings?',
    a: 'No, and you should be wary of anyone who does. Google’s own advice is that no one can guarantee a top ranking. What we commit to is the work: what we’ll do each month, why, and how we’ll measure it.',
  },
  {
    q: 'How much do your SEO services cost?',
    a: 'It depends on the size of the site and how competitive your market is. We quote after a short review of your site, so the price reflects the work your site actually needs rather than a fixed package.',
  },
  {
    q: 'Do we need a new website first?',
    a: 'Usually not. Most SEO work happens on the site you already have. If your platform is genuinely holding you back, the audit will say so, and our web team can rebuild it with SEO built in from the start.',
  },
  {
    q: 'Will you write the content?',
    a: 'Yes. We plan it, write it and optimise it, usually after a short interview with someone on your team who knows the subject. Nothing is published until you’ve approved it.',
  },
  {
    q: 'Do we need to do anything special for ChatGPT or AI Overviews?',
    a: 'Less than you might have heard. Google states there are no extra requirements for its AI features beyond being indexed and eligible to show a snippet. The things that help are the same things that help SEO: clear facts in text, accurate business information everywhere it appears, and content that cites its sources.',
  },
  {
    q: 'Who owns the accounts and the work?',
    a: 'You do. Search Console, analytics, your Business Profile and all content stay in your accounts. We work through access you grant and can remove at any time.',
  },
]

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                           */
/* -------------------------------------------------------------------------- */

function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true)
        observer.disconnect()
      }
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [ref, seen] as const
}

function FadeIn({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' | 'section' | 'article' }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`transition-[opacity,translate] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${seen ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ translate: seen ? 'none' : '0 16px', transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

function SourceLink({ id, children }: { id: keyof typeof SOURCES; children: ReactNode }) {
  return (
    <a
      href={SOURCES[id].url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-neutral-300 underline-offset-[3px] transition-colors hover:decoration-neutral-950"
    >
      {children}
    </a>
  )
}

const shell = 'mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12'
const h2 = 'site-heading text-balance text-[clamp(2rem,4.2vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.035em]'

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Lime highlighter — sweeps across one phrase per heading                   */
/* -------------------------------------------------------------------------- */

function Mark({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.6 })
  return (
    <span
      ref={ref}
      className={`box-decoration-clone bg-no-repeat px-[0.08em] transition-[background-size] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${dark ? 'text-neutral-950' : ''}`}
      style={{
        backgroundImage: 'linear-gradient(#CCFF00, #CCFF00)',
        backgroundPosition: '0 88%',
        backgroundSize: seen ? '100% 78%' : '0% 78%',
        transitionDelay: '250ms',
        // text stays readable on dark sections only once the highlight is behind it
        color: dark && !seen ? 'inherit' : undefined,
      }}
    >
      {children}
    </span>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* -------------------------------------------------------------------------- */
/*  Hero search demo — a query types out, BrandWorks climbs to the top        */
/* -------------------------------------------------------------------------- */

const DEMO_QUERIES = [
  'seo agency for small business',
  'why is my website not on google',
  'technical seo audit',
  'local seo services near me',
]
const ROW = 112

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function CompetitorRow() {
  return (
    <div className="flex h-full gap-3 px-5 py-4">
      <span className="mt-0.5 size-6 shrink-0 rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-2">
        <span className="block h-2 w-24 rounded-full bg-neutral-200" />
        <span className="block h-3 w-[70%] rounded-full bg-neutral-300" />
        <span className="block h-2 w-[90%] rounded-full bg-neutral-100" />
        <span className="block h-2 w-[60%] rounded-full bg-neutral-100" />
      </div>
    </div>
  )
}

function BrandRow({ top }: { top: boolean }) {
  return (
    <div className="flex h-full gap-3 px-5 py-4">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-neutral-950 text-[9px] font-semibold text-white">BW</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] leading-none text-neutral-500">
          <span className="text-neutral-800">BrandWorks</span>
          <span className="truncate">brandworks › services › seo</span>
          <span
            className={`ml-auto shrink-0 rounded-full bg-[#CCFF00] px-2 py-0.5 text-[10px] font-medium text-neutral-950 transition-[opacity,scale] duration-500 ${top ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          >
            Top result
          </span>
        </p>
        <p className="mt-2 truncate text-[15px] leading-tight text-[#1a0dab]">SEO Services That Bring In Enquiries | BrandWorks</p>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-neutral-600">
          Technical audits, keyword research, content and local SEO, with plain-English reporting and no ranking guarantees.
        </p>
      </div>
    </div>
  )
}

function SearchDemo() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.3 })
  const reduced = usePrefersReducedMotion()
  const [qi, setQi] = useState(0)
  const [chars, setChars] = useState(0)
  const [ranked, setRanked] = useState(false)
  const query = DEMO_QUERIES[qi]

  useEffect(() => {
    if (reduced) {
      setChars(query.length)
      setRanked(true)
      return
    }
    if (!seen) return
    let timer: number
    if (chars < query.length) {
      timer = window.setTimeout(() => setChars((c) => c + 1), 45 + Math.random() * 55)
    } else if (!ranked) {
      timer = window.setTimeout(() => setRanked(true), 450)
    } else {
      timer = window.setTimeout(() => {
        setRanked(false)
        setChars(0)
        setQi((i) => (i + 1) % DEMO_QUERIES.length)
      }, 3200)
    }
    return () => window.clearTimeout(timer)
  }, [seen, reduced, chars, ranked, query.length])

  // brand starts third, climbs to first; the others shift down
  const positions = ranked ? [1, 2, 0] : [0, 1, 2]

  return (
    <div ref={ref} aria-hidden="true" className="w-full max-w-[520px] select-none">
      <div className="flex h-[54px] items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <SearchIcon />
        <span className="truncate text-[15px] text-neutral-900">
          {query.slice(0, chars)}
          <span className="ml-px inline-block h-[18px] w-px translate-y-[3px] animate-pulse bg-neutral-900" />
        </span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[18px] border border-neutral-200 bg-white" style={{ height: ROW * 3 }}>
        {[0, 1, 2].map((slot) => (
          <div
            key={slot}
            className={`absolute inset-x-0 top-0 border-b border-neutral-100 transition-transform duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)] last:border-b-0 ${slot === 2 ? 'z-10 bg-white' : ''}`}
            style={{ height: ROW, transform: `translateY(${positions[slot] * ROW}px)` }}
          >
            {slot === 2 ? <BrandRow top={ranked} /> : <CompetitorRow />}
          </div>
        ))}
        {/* subtle wash while results "load" during typing */}
        <div className={`pointer-events-none absolute inset-0 bg-white/60 transition-opacity duration-300 ${chars < query.length ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className={`${shell} pb-20 pt-24 sm:pt-28 lg:pb-28 lg:pt-32`}>
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <FadeIn>
          <h1 className="site-display max-w-[14ch] text-balance text-[clamp(2.75rem,6.4vw,5.75rem)] font-normal leading-[0.95] tracking-[-0.045em]">
            SEO services that help the right people <Mark>find you.</Mark>
          </h1>
        </FadeIn>
        <FadeIn delay={150} className="flex justify-start lg:justify-end">
          <SearchDemo />
        </FadeIn>
      </div>

      <div className="mt-14 grid gap-10 border-t border-neutral-950 pt-8 md:grid-cols-2 lg:mt-20 lg:grid-cols-[1.15fr_1fr_auto] lg:gap-16">
        <FadeIn delay={100}>
          <p className="max-w-[46ch] text-[16px] leading-[1.7] text-neutral-700 sm:text-[17px]">
            We fix what stops search engines from reading your website, write the pages your customers are already searching for, and report on the enquiries that come from it. No ranking guarantees and no mystery retainers.
          </p>
        </FadeIn>

        <FadeIn delay={160}>
          <p className="max-w-[44ch] text-[14px] leading-[1.7] text-neutral-500">
            <span className="text-neutral-950">Usually a good fit if</span> your website looks fine but doesn’t bring in enquiries, you’re about to relaunch and don’t want to lose the rankings you have, or your customers find you by searching locally.
          </p>
        </FadeIn>

        <FadeIn delay={220} className="flex flex-col items-start gap-5 md:col-span-2 lg:col-span-1 lg:items-end">
          <Link
            to="/contact"
            className="group inline-flex min-h-[50px] items-center gap-10 whitespace-nowrap bg-neutral-950 px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#CCFF00] hover:text-neutral-950"
          >
            Get an SEO audit
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          <a href="#services" className="border-b border-neutral-300 pb-0.5 text-[13px] text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950">
            See what’s included
          </a>
        </FadeIn>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Before / after search listing slider                                      */
/* -------------------------------------------------------------------------- */

function Stars() {
  return (
    <span className="inline-flex text-[#e7711b]" aria-hidden="true">
      {'★★★★★'.split('').map((s, i) => (
        <span key={i} className={i === 4 ? 'opacity-60' : ''}>{s}</span>
      ))}
    </span>
  )
}

function ListingBefore() {
  return (
    <div className="h-full bg-white p-6 sm:p-8">
      <p className="text-[12px] text-neutral-500">www.northfielddental.in › index.php?page_id=12</p>
      <p className="mt-2 text-[20px] leading-tight text-[#1a0dab]">Home</p>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-[1.6] text-neutral-600">
        Welcome to our website. We are a leading company providing best quality services to our valued customers with full satisfaction. Contact us today for more…
      </p>
    </div>
  )
}

function ListingAfter() {
  return (
    <div className="h-full bg-white p-6 sm:p-8">
      <p className="text-[12px] text-neutral-500">northfielddental.in › dentist-kothrud-pune</p>
      <p className="mt-2 text-[20px] leading-tight text-[#1a0dab]">Dentist in Kothrud, Pune | Same-Week Appointments | Northfield Dental</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-neutral-600">
        <Stars /> <span>Rating: 4.8 · 212 reviews</span>
      </p>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-[1.6] text-neutral-600">
        Check-ups, fillings, root canals and implants from a team of five dentists near Karve Road. Open Saturdays. Book online or call to see a dentist this week.
      </p>
    </div>
  )
}

function SerpCompare() {
  const [value, setValue] = useState(50)
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.45 })
  const reduced = usePrefersReducedMotion()
  const touched = useRef(false)

  // a short nudge when it first comes into view, so people see it moves
  useEffect(() => {
    if (!seen || reduced) return
    const steps = [72, 30, 50]
    const timers = steps.map((v, i) => window.setTimeout(() => { if (!touched.current) setValue(v) }, 500 + i * 700))
    return () => timers.forEach(window.clearTimeout)
  }, [seen, reduced])

  return (
    <section className={`${shell} py-20 lg:py-28`}>
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
        <div>
          <FadeIn>
            <h2 className={h2}>The same page, <Mark>fixed.</Mark></h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-6 max-w-[40ch] text-[15px] leading-[1.7] text-neutral-500">
              Your search listing is the first thing people see, and it decides whether they click. Drag across to compare a typical listing with one that’s been worked on: a clear title, a readable address, review stars from structured data, and a description that answers the search.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={120}>
          <div ref={ref} className="relative overflow-hidden border border-neutral-200 bg-white" style={{ ['--pos' as string]: `${value}%` }}>
            {/* after (base layer) */}
            <div className="relative">
              <ListingAfter />
            </div>
            {/* before (clipped on top) */}
            <div className="absolute inset-0 transition-[clip-path] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
              <ListingBefore />
            </div>
            {/* handle */}
            <div className="pointer-events-none absolute inset-y-0 w-px bg-neutral-950 transition-[left] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]" style={{ left: `${value}%` }}>
              <span className="absolute top-1/2 -ml-[18px] -mt-[18px] grid size-9 place-items-center rounded-full bg-neutral-950 text-[13px] text-white">↔</span>
            </div>
            <span className="pointer-events-none absolute bottom-3 left-3 bg-white/90 px-2 py-1 text-[11px] text-neutral-500">Before</span>
            <span className="pointer-events-none absolute bottom-3 right-3 bg-[#CCFF00] px-2 py-1 text-[11px] text-neutral-950">After</span>
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => { touched.current = true; setValue(Number(e.target.value)) }}
              aria-label="Compare the listing before and after SEO work"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
          <p className="mt-3 text-[12px] text-neutral-400">Illustrative example. Northfield Dental is a made-up business.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI answer demo — an overview writes itself and cites its sources          */
/* -------------------------------------------------------------------------- */

const AI_ANSWER =
  'There’s nothing extra you need to do. To be shown as a source in AI Overviews, a page needs to be indexed and eligible to appear with a snippet. The advice is the same as for regular search: let Google crawl the site, keep important content in text, link pages together internally, and make sure structured data matches what’s on the page.'

function AiAnswerDemo() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.4 })
  const reduced = usePrefersReducedMotion()
  const words = AI_ANSWER.split(' ')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (reduced) { setCount(words.length); return }
    if (!seen || count >= words.length) return
    const t = window.setTimeout(() => setCount((c) => c + 1), 55)
    return () => window.clearTimeout(t)
  }, [seen, reduced, count, words.length])

  const done = count >= words.length

  return (
    <div ref={ref} className="rounded-[18px] bg-white p-6 text-neutral-950 sm:p-7">
      <div className="flex items-center gap-2 text-[13px] font-medium">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="currentColor" />
        </svg>
        AI Overview
      </div>
      <p className="mt-1 text-[12px] text-neutral-500">how do I get my business into google ai overviews</p>
      <p className="mt-4 min-h-[9.5em] text-[14px] leading-[1.65] text-neutral-800" aria-label={AI_ANSWER}>
        <span aria-hidden="true">
          {words.slice(0, count).join(' ')}
          {!done && <span className="ml-0.5 inline-block h-[14px] w-[7px] translate-y-[2px] animate-pulse bg-neutral-300" />}
        </span>
      </p>
      <div className={`mt-5 flex flex-wrap gap-2 transition-[opacity,translate] duration-700 ${done ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-700">
          <span className="size-3.5 rounded-full bg-neutral-200" /> Google Search Central
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-3 py-1.5 text-[12px] text-neutral-950">
          <span className="grid size-3.5 place-items-center rounded-full bg-neutral-950 text-[6px] font-bold text-white">BW</span> BrandWorks
        </span>
      </div>
    </div>
  )
}

function Problem() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.4 })
  return (
    <section className="border-y border-neutral-200 bg-[#f6f6f3]">
      <div className={`${shell} grid gap-12 py-20 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-28`}>
        <div>
          <FadeIn>
            <h2 className={`${h2} max-w-[16ch]`}>Most pages never get a <Mark>single visit</Mark> from Google.</h2>
          </FadeIn>

          <FadeIn delay={80}>
            <div ref={ref} className="mt-12 max-w-[520px]" aria-hidden="true">
              <div className="flex h-3 w-full overflow-hidden bg-neutral-300">
                <div
                  className="h-full bg-neutral-950 transition-[width] duration-[1600ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                  style={{ width: seen ? '3.45%' : '0%' }}
                />
              </div>
              <div className="mt-3 flex justify-between text-[12px] text-neutral-500">
                <span><span className="text-neutral-950">3.45%</span> get any search traffic</span>
                <span>96.55% get none</span>
              </div>
            </div>
          </FadeIn>
        </div>

        <div className="space-y-6 text-[16px] leading-[1.75] text-neutral-700 lg:pt-2">
          <FadeIn delay={120}>
            <p>
              When <SourceLink id="ahrefs">Ahrefs analysed around 14 billion pages</SourceLink>, 96.55% received no organic traffic from Google at all. The reasons were rarely mysterious. Some pages targeted topics almost nobody searches for. Some had no other websites linking to them. Many simply didn’t match what the searcher wanted, like a product page trying to rank for a question, or a blog post where people expected a price list.
            </p>
          </FadeIn>
          <FadeIn delay={180}>
            <p>
              Good SEO deals with those problems in order. Is there real demand? Does the page answer it better than the alternatives? Does the rest of the web vouch for it? Everything in our service sits under one of those three questions.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

function Services() {
  const [active, setActive] = useState(SERVICES[0].id)

  useEffect(() => {
    const rows = SERVICES.map((s) => document.getElementById(`service-${s.id}`)).filter(Boolean) as HTMLElement[]
    if (!rows.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id.replace('service-', ''))
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    rows.forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="services" className={`${shell} scroll-mt-16 py-20 lg:py-32`}>
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FadeIn>
            <h2 className={h2}>What our SEO service <Mark>covers</Mark></h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-6 max-w-[40ch] text-[15px] leading-[1.7] text-neutral-500">
              Every engagement starts with an audit. What happens next depends on what it finds, so you won’t pay for link building if the real problem is that half your pages aren’t indexed.
            </p>
          </FadeIn>

          <nav aria-label="SEO services" className="mt-10 hidden lg:block">
            <ul className="space-y-1.5">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#service-${s.id}`}
                    className={`group inline-flex items-center gap-3 text-[14px] transition-colors duration-300 ${active === s.id ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}
                  >
                    <span className={`h-px bg-neutral-950 transition-[width] duration-500 ${active === s.id ? 'w-6' : 'w-0 group-hover:w-3'}`} />
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0 border-t border-neutral-950">
          {SERVICES.map((s) => (
            <article id={`service-${s.id}`} key={s.id} className="scroll-mt-24 border-b border-neutral-200 py-9 sm:py-11">
              <FadeIn>
                <h3 className="text-[clamp(1.35rem,2.2vw,1.75rem)] font-normal tracking-[-0.02em]">{s.title}</h3>
                <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-10">
                  <p className="text-[15px] leading-[1.75] text-neutral-700">{s.body}</p>
                  <p className="text-[15px] leading-[1.75] text-neutral-500">
                    {s.outcome}
                    {s.source && (
                      <>
                        {' '}
                        <SourceLink id={s.source}>See Google’s guidance</SourceLink>.
                      </>
                    )}
                  </p>
                </div>
              </FadeIn>
            </article>
          ))}

          <FadeIn className="pt-12">
            <h3 className="text-[15px] font-medium">The performance thresholds we build to</h3>
            <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.7] text-neutral-500">
              These are Google’s “good” targets for Core Web Vitals, measured at the 75th percentile of real visits on both mobile and desktop. <SourceLink id="vitals">Source: web.dev</SourceLink>
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-neutral-950 text-[12px] text-neutral-500">
                    <th scope="col" className="py-3 pr-6 font-normal">Metric</th>
                    <th scope="col" className="py-3 pr-6 font-normal">What it measures</th>
                    <th scope="col" className="py-3 font-normal">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {VITALS.map((v) => (
                    <tr key={v.short} className="border-b border-neutral-200">
                      <th scope="row" className="py-4 pr-6 font-normal">
                        {v.metric} <span className="text-neutral-400">({v.short})</span>
                      </th>
                      <td className="py-4 pr-6 text-neutral-600">{v.measures}</td>
                      <td className="whitespace-nowrap py-4">{v.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

function AiSearch() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.35 })
  const bars = [
    { label: 'No AI summary on the page', value: 15 },
    { label: 'AI summary shown', value: 8 },
    { label: 'Clicked a link inside the summary', value: 1 },
  ]
  return (
    <section className="bg-neutral-950 text-white">
      <div className={`${shell} py-20 lg:py-32`}>
        <FadeIn>
          <h2 className={`${h2} max-w-[18ch] text-white`}>Search now <Mark dark>answers</Mark> before it sends anyone to you.</h2>
        </FadeIn>

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="space-y-6 text-[16px] leading-[1.75] text-white/75">
            <FadeIn>
              <p>
                In a <SourceLink id="pew">Pew Research Center study</SourceLink> of real browsing by 900 US adults in March 2025, Google showed an AI summary on 18% of searches. When one appeared, people clicked a traditional result on 8% of visits, compared with 15% when there was no summary. Links inside the summary itself were clicked on just 1% of visits.
              </p>
            </FadeIn>
            <FadeIn delay={60}>
              <p>
                That changes what a good result looks like. It matters whether your site is a source the answer draws on, and it matters that you win the click from people who want more than a summary. Those are often the people closest to making a decision.
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <p>
                <SourceLink id="geo">Research presented at KDD 2024</SourceLink> by teams from Princeton and IIT Delhi found that adding citations, quotations and statistics raised a page’s visibility in generative engine answers by up to 40%, while keyword stuffing didn’t help. <SourceLink id="googleAi">Google’s own guidance</SourceLink> is that there are no extra requirements for AI Overviews or AI Mode beyond being indexed and eligible to show a snippet. Both point the same way: clear, well-sourced pages on a technically sound site.
              </p>
            </FadeIn>
          </div>

          <div className="space-y-12">
          <FadeIn delay={60}>
            <AiAnswerDemo />
            <p className="mt-3 text-[12px] text-white/40">Illustration. The answer text paraphrases Google’s published guidance.</p>
          </FadeIn>
          <FadeIn delay={100}>
            <figure ref={ref} className="border-t border-white/25 pt-8">
              <figcaption className="text-[14px] text-white">How often a Google visit ended in a click</figcaption>
              <div className="mt-8 space-y-7">
                {bars.map((bar, i) => (
                  <div key={bar.label}>
                    <div className="flex items-baseline justify-between gap-6 text-[13px]">
                      <span className="text-white/70">{bar.label}</span>
                      <span className="text-[clamp(1.5rem,2.6vw,2.1rem)] leading-none tracking-[-0.03em] text-white">{bar.value}%</span>
                    </div>
                    <div className="mt-3 h-[6px] bg-white/10">
                      <div
                        className={`h-full transition-[width] duration-[1400ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${i === 0 ? 'bg-white' : i === 1 ? 'bg-[#CCFF00]' : 'bg-white/50'}`}
                        style={{ width: seen ? `${(bar.value / 15) * 100}%` : '0%', transitionDelay: `${i * 140}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-[12px] leading-[1.6] text-white/45">
                Share of visits to a Google results page. Based on 68,879 searches. Source: Pew Research Center, July 2025.
              </p>
            </figure>
          </FadeIn>
          </div>
        </div>
      </div>
    </section>
  )
}

function Process() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.3 })
  return (
    <section className={`${shell} py-20 lg:py-32`}>
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
        <FadeIn>
          <h2 className={h2}>How an engagement <Mark>runs</Mark></h2>
        </FadeIn>
        <FadeIn delay={80}>
          <p className="max-w-[56ch] text-[15px] leading-[1.75] text-neutral-500 lg:pt-3">
            SEO compounds slowly, so the order matters. Fixing the foundation before publishing anything means the content we create later has a fair chance of ranking.
          </p>
        </FadeIn>
      </div>

      <div ref={ref} className="relative mt-14 lg:mt-20">
        <div className="absolute inset-x-0 top-0 h-px bg-neutral-200" aria-hidden="true" />
        <div
          className="absolute left-0 top-0 h-px bg-neutral-950 transition-[width] duration-[1800ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
          style={{ width: seen ? '100%' : '0%' }}
          aria-hidden="true"
        />
        <ol className="grid gap-12 pt-10 md:grid-cols-3 md:gap-10">
          {PHASES.map((phase, i) => (
            <FadeIn as="li" key={phase.when} delay={200 + i * 160}>
              <p className="text-[13px] text-neutral-500">{phase.when}</p>
              <h3 className="mt-3 text-[clamp(1.35rem,2.2vw,1.75rem)] font-normal tracking-[-0.02em]">{phase.title}</h3>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-700">{phase.body}</p>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Guarantee() {
  return (
    <section className="border-t border-neutral-200">
      <div className={`${shell} grid gap-10 py-20 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-20 lg:py-28`}>
        <FadeIn>
          <blockquote>
            <p className="site-display text-balance text-[clamp(2.25rem,5.2vw,4.5rem)] font-normal leading-[1] tracking-[-0.04em]">
              “No one can guarantee a #1 ranking on Google.”
            </p>
            <footer className="mt-6 text-[13px] text-neutral-500">
              Google Search Central, <SourceLink id="googleHire">“Do you need an SEO?”</SourceLink>
            </footer>
          </blockquote>
        </FadeIn>
        <FadeIn delay={120}>
          <p className="max-w-[40ch] text-[16px] leading-[1.75] text-neutral-700">
            We agree, so we don’t promise one. What we can commit to is the work itself: what we’ll do each month, why we’re doing it, and how we’ll both know whether it’s working.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="border-t border-neutral-200 bg-[#f6f6f3]">
      <div className={`${shell} grid gap-12 py-20 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20 lg:py-28`}>
        <FadeIn>
          <h2 className={h2}>Questions we get asked</h2>
        </FadeIn>
        <div className="border-t border-neutral-950">
          {FAQS.map((item) => (
            <details key={item.q} className="group border-b border-neutral-300">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-8 py-6 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[clamp(1.05rem,1.6vw,1.25rem)] font-normal tracking-[-0.01em]">{item.q}</h3>
                <span className="relative mt-2 block size-3.5 shrink-0" aria-hidden="true">
                  <span className="absolute left-0 top-1/2 h-px w-full bg-neutral-950" />
                  <span className="absolute left-1/2 top-0 h-full w-px bg-neutral-950 transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[64ch] pb-7 text-[15px] leading-[1.75] text-neutral-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Sources() {
  return (
    <section className={`${shell} py-16`}>
      <div className="grid gap-6 border-t border-neutral-200 pt-8 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
        <h2 className="text-[14px] font-medium">Sources</h2>
        <ul className="space-y-2.5 text-[13px] leading-[1.6] text-neutral-500">
          {Object.values(SOURCES).map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neutral-950">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-neutral-950 text-white">
      <div className={`${shell} flex flex-col gap-10 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28`}>
        <FadeIn>
          <h2 className="site-display max-w-[18ch] text-balance text-[clamp(2.25rem,4.8vw,4rem)] font-normal leading-[1] tracking-[-0.04em]">
            Want to know what’s <Mark dark>holding your site back?</Mark>
          </h2>
          <p className="mt-6 max-w-[48ch] text-[15px] leading-[1.75] text-white/65">
            Send us your website address. We’ll take a look and tell you honestly whether SEO is the right investment for you right now.
          </p>
        </FadeIn>
        <FadeIn delay={120}>
          <Link
            to="/contact"
            className="group inline-flex min-h-[54px] items-center gap-12 whitespace-nowrap bg-[#CCFF00] px-7 text-[13px] font-medium text-neutral-950 transition-colors duration-300 hover:bg-white"
          >
            Request an SEO audit
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </FadeIn>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Metadata + structured data                                                */
/* -------------------------------------------------------------------------- */

function useSeoPageMetadata(siteUrl?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'SEO Services: Technical SEO, Content & Local SEO | BrandWorks'

    const description =
      'SEO services from BrandWorks: technical audits, keyword research, on-page and content work, local SEO, link earning and plain-English reporting. No ranking guarantees.'
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = existing?.content
    const meta = existing ?? document.createElement('meta')
    meta.name = 'description'
    meta.content = description
    if (!existing) document.head.appendChild(meta)

    let origin = ''
    try {
      origin = siteUrl ? new URL(siteUrl).origin : window.location.origin
    } catch {
      origin = window.location.origin
    }
    const pageUrl = `${origin}/services/seo`

    const canonical = document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = pageUrl
    document.head.appendChild(canonical)

    const schema = document.createElement('script')
    schema.type = 'application/ld+json'
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': `${pageUrl}#service`,
          name: 'SEO services',
          serviceType: 'Search engine optimisation',
          url: pageUrl,
          description,
          provider: { '@type': 'Organization', name: 'BrandWorks', url: origin },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'SEO services',
            itemListElement: SERVICES.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.body } })),
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
            { '@type': 'ListItem', position: 3, name: 'SEO', item: pageUrl },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
      ],
    })
    document.head.appendChild(schema)

    return () => {
      document.title = previousTitle
      if (existing && previousDescription !== undefined) existing.content = previousDescription
      else meta.remove()
      canonical.remove()
      schema.remove()
    }
  }, [siteUrl])
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SEOPage({ siteUrl }: { siteUrl?: string }) {
  useSeoPageMetadata(siteUrl)
  return (
    <main className="w-full overflow-x-clip bg-white text-neutral-950">
      <Hero />
      <Problem />
      <SerpCompare />
      <Services />
      <AiSearch />
      <Process />
      <Guarantee />
      <Faq />
      <Sources />
      <FinalCta />
    </main>
  )
}
