import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/* -------------------------------------------------------------------------- */
/*  Photos — swap these paths for your own shoots                             */
/* -------------------------------------------------------------------------- */

const PHOTOS = {
  hero: '/images/pr/founder-portrait.jpg',
  searchFounder: '/images/pr/founder-headshot.jpg',
  media: '/images/pr/media-interview.jpg',
  founder: '/images/pr/founder-writing.jpg',
  speaking: '/images/pr/founder-on-stage.jpg',
  search: '/images/pr/founder-laptop.jpg',
  issues: '/images/pr/team-meeting.jpg',
  portraits: '/images/pr/portrait-session.jpg',
  strip: [
    '/images/pr/strip-01.jpg',
    '/images/pr/strip-02.jpg',
    '/images/pr/strip-03.jpg',
    '/images/pr/strip-04.jpg',
    '/images/pr/strip-05.jpg',
    '/images/pr/strip-06.jpg',
  ],
}

/* -------------------------------------------------------------------------- */
/*  Sources — every figure on the page links back to one of these             */
/* -------------------------------------------------------------------------- */

const SOURCES = {
  weber: {
    label: 'Weber Shandwick, “The CEO Reputation Premium” (2015)',
    url: 'https://webershandwick.com/news-insights/the-ceo-reputation-premium-a-new-era-of-engagement',
  },
  edelmanLinkedIn: {
    label: 'Edelman and LinkedIn, “2024 B2B Thought Leadership Impact Report”',
    url: 'https://www.edelman.com/sites/g/files/aatuss191/files/2024-02/_2024%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report%20Final.pdf',
  },
  edelmanTrust: {
    label: 'Edelman, “2025 Edelman Trust Barometer”',
    url: 'https://www.edelman.com/news-awards/2025-edelman-trust-barometer-reveals-high-level-grievance',
  },
  muckRack: {
    label: 'Muck Rack, “State of Journalism 2024” findings',
    url: 'https://muckrack.com/blog/2025/01/03/data-driven-tips-to-secure-more-earned-media',
  },
  googleKp: {
    label: 'Google Knowledge Panel Help, “Get verified on Google”',
    url: 'https://support.google.com/knowledgepanel/answer/7534902?hl=en',
  },
  amec: {
    label: 'AMEC, “Say No to AVEs”',
    url: 'https://amecorg.com/say-no-to-aves/',
  },
} as const

const SERVICES = [
  {
    id: 'media',
    title: 'Media relations',
    photo: PHOTOS.media,
    alt: 'A founder being interviewed by a journalist',
    body: 'We find the reporters, editors and producers who actually cover your field, then pitch them stories they can use: new data, a clear point of view, or a customer story with real numbers behind it.',
    detail: 'Every pitch is written for one person and kept short. Mass emails are easy for journalists to spot and easy for them to ignore.',
  },
  {
    id: 'founder',
    title: 'Founder profile and thought leadership',
    photo: PHOTOS.founder,
    alt: 'A founder writing at a desk',
    body: 'Bylined articles, opinion pieces and LinkedIn posts written with you and in your voice. We work from interviews, not templates, so what goes out sounds like you on a good day.',
    detail: 'We help you choose two or three subjects you can speak on with real authority, and stick to them until people start to connect you with them.',
  },
  {
    id: 'speaking',
    title: 'Speaking and podcasts',
    photo: PHOTOS.speaking,
    alt: 'A founder speaking on stage at a conference',
    body: 'We put you forward for panels, industry events and podcasts whose audiences include your customers, investors or the people you want to hire.',
    detail: 'Before you go on, we prepare talking points with you and run media training, including the awkward questions.',
  },
  {
    id: 'search',
    title: 'Search reputation',
    photo: PHOTOS.search,
    alt: 'A founder checking search results on a laptop',
    body: 'What appears when someone searches your name is often the first impression an investor, client or new hire gets. We make sure profiles, bios and your company’s About page are accurate and current, and that good coverage is easy to find.',
    detail: 'Where Google shows a knowledge panel for you, we help you claim it. Verified owners can suggest changes to it directly.',
    source: 'googleKp' as const,
  },
  {
    id: 'issues',
    title: 'Issues and crisis response',
    photo: PHOTOS.issues,
    alt: 'A leadership team in a meeting',
    body: 'When something goes wrong, we help you establish what actually happened, say something true quickly, and say it consistently to press, customers and your own team.',
    detail: 'If coverage gets the facts wrong, we go through the publication’s corrections process rather than threatening anyone.',
  },
  {
    id: 'portraits',
    title: 'Portraits and press kit',
    photo: PHOTOS.portraits,
    alt: 'A founder portrait session in a studio',
    body: 'Our photo team shoots founder portraits and team images that work for articles, speaker bios and LinkedIn.',
    detail: 'We also put together a press kit with approved bios, a fact sheet, logos and images, so journalists never have to chase you for the basics.',
  },
]

const PHASES = [
  {
    when: 'First month',
    title: 'Listen and audit',
    body: 'We interview you and the people around you, look at what search and the press currently say about you, and find the stories only you can tell. You get a narrative, a target media list and a plan.',
  },
  {
    when: 'Months two and three',
    title: 'Fix the foundations, start pitching',
    body: 'New portraits, an accurate bio, a press kit and an updated About page go live. Profiles get tidied up. The first pitches and bylined pieces go out.',
  },
  {
    when: 'Month four onwards',
    title: 'Show up consistently',
    body: 'Regular pitching, writing and speaking, adjusted to what’s getting picked up. Every quarter we review coverage and search results with you and decide what to keep doing.',
  },
]

const FAQS = [
  {
    q: 'How quickly will we get coverage?',
    a: 'It depends on news value more than effort. A founder with original data, a strong view or a timely story can land coverage within weeks. Building a steady presence in the publications that matter usually takes several months.',
  },
  {
    q: 'Do you guarantee placements?',
    a: 'No. Editorial coverage is decided by editors, and that independence is exactly what makes it worth having. If a paid placement suits a goal, we’ll tell you, and it will be labelled as what it is.',
  },
  {
    q: 'Can you remove negative articles or reviews?',
    a: 'We can’t make legitimate journalism or genuine reviews disappear, and anyone who promises that is likely using tactics that backfire. We can correct factual errors through the proper channels, help you respond well, and publish accurate material that people find first.',
  },
  {
    q: 'Will you write in my name?',
    a: 'Yes, with you. We draft from conversations with you and nothing is published without your approval. Most founders spend about an hour a month with us once things are running.',
  },
  {
    q: 'Do you work with companies, or only founders?',
    a: 'Both. Company PR and founder PR work best together, because journalists often want a person to talk to, and a founder’s profile is more credible when the company behind it is visible too.',
  },
  {
    q: 'How do you measure results?',
    a: 'Coverage in the publications on your target list, how you’re described in it, what shows up when people search your name, and what the coverage leads to: enquiries, investor conversations, applications. We don’t report advertising value equivalents (AVEs), which the industry body AMEC calls outdated and flawed.',
    source: 'amec' as const,
  },
]

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
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

function FadeIn({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`transition-[opacity,translate] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${seen ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ translate: seen ? 'none' : '0 16px', transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Mark({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.6 })
  return (
    <span
      ref={ref}
      className="box-decoration-clone bg-no-repeat px-[0.08em] transition-[background-size,color] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
      style={{
        backgroundImage: 'linear-gradient(#CCFF00, #CCFF00)',
        backgroundPosition: '0 88%',
        backgroundSize: seen ? '100% 78%' : '0% 78%',
        transitionDelay: '250ms',
        color: dark && seen ? '#0a0a0a' : undefined,
      }}
    >
      {children}
    </span>
  )
}

function SourceLink({ id, children }: { id: keyof typeof SOURCES; children: ReactNode }) {
  return (
    <a href={SOURCES[id].url} target="_blank" rel="noopener noreferrer" className="underline decoration-current/30 underline-offset-[3px] transition-colors hover:decoration-current">
      {children}
    </a>
  )
}

/** Photo that wipes up into view, then settles from a slight zoom. */
function RevealPhoto({ src, alt, className = '', delay = 0, eager = false }: { src: string; alt: string; className?: string; delay?: number; eager?: boolean }) {
  // observe an unclipped wrapper: a fully clipped element never reports as visible
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.2 })
  return (
    <div ref={ref} className={className}>
      <div
        className="h-full w-full overflow-hidden bg-neutral-200 transition-[clip-path] duration-[1300ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
        style={{ clipPath: seen ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', transitionDelay: `${delay}ms` }}
      >
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-[scale] duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ scale: seen ? '1' : '1.12', transitionDelay: `${delay}ms` }}
        />
      </div>
    </div>
  )
}

const shell = 'mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12'
const h2 = 'site-heading text-balance text-[clamp(2rem,4.2vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.035em]'

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.2 })
  return (
    <section className={`${shell} pb-20 pt-24 sm:pt-28 lg:pb-28 lg:pt-32`}>
      <div className="grid items-end gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <FadeIn>
            <h1 className="site-display text-balance text-[clamp(2.75rem,6.2vw,5.6rem)] font-normal leading-[0.95] tracking-[-0.045em]">
              PR and founder reputation, built on <Mark>what’s true.</Mark>
            </h1>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="mt-10 max-w-[48ch] text-[16px] leading-[1.7] text-neutral-700 sm:text-[17px]">
              We get founders and leadership teams into the publications their customers read, onto the stages and podcasts that matter in their industry, and make sure that what people find when they search your name is accurate and current.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/contact"
                className="group inline-flex min-h-[50px] items-center gap-10 whitespace-nowrap bg-neutral-950 px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#CCFF00] hover:text-neutral-950"
              >
                Talk to our PR team
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <a href="#search-yourself" className="border-b border-neutral-300 pb-0.5 text-[13px] text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950">
                What people find when they search you
              </a>
            </div>
          </FadeIn>
        </div>

        <div ref={ref} className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:ml-auto">
          <RevealPhoto src={PHOTOS.hero} alt="Founder portrait" eager className="aspect-[4/5] w-full" />

          {/* press clipping */}
          <div
            className={`absolute -left-4 bottom-10 w-[min(78%,300px)] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.14)] transition-[opacity,translate,rotate] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:-left-10 ${seen ? 'opacity-100' : 'opacity-0'}`}
            style={{ translate: seen ? 'none' : '0 24px', rotate: seen ? '-2deg' : '0deg', transitionDelay: '900ms' }}
            aria-hidden="true"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Interview</p>
            <p className="mt-2 font-serif text-[19px] leading-[1.2] text-neutral-950">“We stopped selling software and started fixing shipping.”</p>
            <p className="mt-3 text-[11px] text-neutral-500">Business section · 6 min read</p>
          </div>

          {/* podcast chip */}
          <div
            className={`absolute -right-3 top-8 flex items-center gap-3 rounded-full bg-neutral-950 py-2 pl-2 pr-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition-[opacity,translate] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:-right-6 ${seen ? 'opacity-100' : 'opacity-0'}`}
            style={{ translate: seen ? 'none' : '0 -16px', transitionDelay: '1150ms' }}
            aria-hidden="true"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#CCFF00] text-[11px] text-neutral-950">▶</span>
            <span className="text-[12px] leading-tight">
              Podcast guest
              <span className="block text-[10px] text-white/60">Episode 48 · 42 min</span>
            </span>
          </div>
        </div>
      </div>

      {/* the kinds of places we pitch — no logos we haven't earned */}
      <FadeIn delay={300} className="mt-20 border-y border-neutral-200 py-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-[14px] text-neutral-500">
          <span className="text-neutral-950">Where we place founders</span>
          <span>National business press</span>
          <span>Trade publications</span>
          <span>Podcasts</span>
          <span>Conference stages</span>
          <span>Industry newsletters</span>
          <span>Regional news</span>
        </div>
      </FadeIn>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  "Search your name" — before / after                                       */
/* -------------------------------------------------------------------------- */

type Result = { site: string; path: string; title: string; snippet: string; tone?: 'bad' | 'off' | 'good' }

const TODAY: Result[] = [
  { site: 'LinkedIn', path: 'linkedin.com › in › ananya-rao-38b2', title: 'Ananya Rao - Pune | LinkedIn', snippet: 'Pune, Maharashtra · 500+ connections. View Ananya Rao’s profile on LinkedIn, a professional community of…', tone: 'off' },
  { site: 'Business directory', path: 'bizlistings.in › directors', title: 'Ananya Rao | Director Details and Companies', snippet: 'Registered director of 2 companies. View DIN, registered address and filing history for Ananya Rao…', tone: 'off' },
  { site: 'Culture News', path: 'culturenews.in › dance', title: 'Ananya Rao’s Bharatanatyam recital draws a full house', snippet: 'The classical dancer returned to the city for a one-night performance at the…', tone: 'off' },
  { site: 'Startup forum', path: 'startupforum.in › threads › 2021', title: 'Anyone dealt with Kiln Logistics? Delivery delays', snippet: 'Our shipment was two weeks late and nobody answered emails. Has anyone else had this with Rao’s company…', tone: 'bad' },
]

const AFTER: Result[] = [
  { site: 'Kiln Logistics', path: 'kilnlogistics.in › about', title: 'Ananya Rao, Founder and CEO | Kiln Logistics', snippet: 'Ananya founded Kiln in 2019 after six years running export operations. She leads a team of 40 helping small exporters ship…', tone: 'good' },
  { site: 'Trade journal', path: 'logisticsweekly.in › interviews', title: 'Interview: the founder fixing shipping for small exporters', snippet: 'Ananya Rao on why small exporters pay more per kilo than large ones, and what Kiln changed after its…', tone: 'good' },
  { site: 'Podcast', path: 'buildinginindia.fm › episode-48', title: 'Building for small exporters, with Ananya Rao', snippet: 'Episode 48. Ananya talks about the delivery crisis that nearly ended Kiln in 2021 and what fixed it…', tone: 'good' },
  { site: 'LinkedIn', path: 'linkedin.com › in › ananyarao', title: 'Ananya Rao - Founder at Kiln Logistics | LinkedIn', snippet: '“Last month we shipped for 1,200 small exporters. Here’s what we learned about customs delays…”', tone: 'good' },
]

function ResultItem({ r }: { r: Result }) {
  return (
    <div className="py-3.5">
      <div className="flex items-center gap-2.5">
        <span className={`size-6 shrink-0 rounded-full ${r.tone === 'bad' ? 'bg-red-200' : r.tone === 'good' ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
        <span className="min-w-0 text-[11px] leading-tight">
          <span className="block text-neutral-800">{r.site}</span>
          <span className="block truncate text-neutral-500">{r.path}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[15px] leading-snug text-[#1a0dab]">{r.title}</p>
      <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.55] text-neutral-600">{r.snippet}</p>
    </div>
  )
}

function KnowledgePanel() {
  return (
    <aside className="border border-neutral-200 p-4">
      <div className="flex gap-3">
        <img src={PHOTOS.searchFounder} alt="" className="size-16 shrink-0 object-cover" loading="lazy" />
        <div>
          <p className="flex items-center gap-1.5 text-[17px] leading-tight text-neutral-950">
            Ananya Rao
            <svg viewBox="0 0 24 24" className="size-4 text-[#1a73e8]" aria-label="Verified">
              <path fill="currentColor" d="m12 1 2.6 2.2 3.4-.3.8 3.3 2.9 1.8-1.3 3.2 1.3 3.2-2.9 1.8-.8 3.3-3.4-.3L12 23l-2.6-2.2-3.4.3-.8-3.3-2.9-1.8L3.6 12 2.3 8.8l2.9-1.8.8-3.3 3.4.3z" />
              <path fill="#fff" d="m10.6 15.6-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4z" />
            </svg>
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">Founder and CEO, Kiln Logistics</p>
        </div>
      </div>
      <p className="mt-4 text-[12px] leading-[1.55] text-neutral-600">Founder of Kiln Logistics, a Pune-based company that handles shipping for small exporters.</p>
      <dl className="mt-3 space-y-1 text-[12px]">
        <div className="flex gap-2"><dt className="text-neutral-950">Founded:</dt><dd className="text-neutral-600">Kiln Logistics, 2019</dd></div>
        <div className="flex gap-2"><dt className="text-neutral-950">Education:</dt><dd className="text-neutral-600">College of Engineering, Pune</dd></div>
      </dl>
    </aside>
  )
}

function SearchYourself() {
  const [after, setAfter] = useState(false)
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.45 })
  const reduced = usePrefersReducedMotion()
  const touched = useRef(false)

  // flip once by itself so people notice the toggle
  useEffect(() => {
    if (!seen || reduced) return
    const t = window.setTimeout(() => { if (!touched.current) setAfter(true) }, 1800)
    return () => window.clearTimeout(t)
  }, [seen, reduced])

  const choose = (value: boolean) => { touched.current = true; setAfter(value) }

  return (
    <section id="search-yourself" className="scroll-mt-16 border-y border-neutral-200 bg-[#f6f6f3]">
      <div className={`${shell} grid gap-12 py-20 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20 lg:py-28`}>
        <div>
          <FadeIn>
            <h2 className={h2}>Search your own name. <Mark>Then</Mark> imagine an investor doing it.</h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-600">
              Before a meeting, most people look you up. What they often find is a thin profile, a directory listing, someone else with your name, and the one complaint thread from three years ago.
            </p>
            <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-600">
              We don’t hide criticism. We make sure the full, accurate picture is there too, so the first page reflects who you are now.
            </p>
          </FadeIn>
          <FadeIn delay={140}>
            <div className="mt-8 inline-flex border border-neutral-950 p-1" role="group" aria-label="Compare search results">
              {[
                ['Today', false],
                ['Six months on', true],
              ].map(([label, value]) => (
                <button
                  key={String(label)}
                  type="button"
                  aria-pressed={after === value}
                  onClick={() => choose(value as boolean)}
                  className={`px-4 py-2 text-[13px] transition-colors duration-300 ${after === value ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950'}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={120}>
          <div ref={ref} className="bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:p-7">
            <div className="flex h-11 items-center gap-3 rounded-full border border-neutral-200 px-4 text-[14px] text-neutral-900">
              <svg viewBox="0 0 24 24" className="size-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              ananya rao kiln
            </div>

            <div className="mt-4 grid">
              {[false, true].map((state) => (
                <div
                  key={String(state)}
                  aria-hidden={after !== state}
                  className={`col-start-1 row-start-1 grid gap-6 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:grid-cols-[1.4fr_1fr] ${after === state ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  style={{ translate: after === state ? 'none' : `0 ${state ? 14 : -14}px` }}
                >
                  <div className="divide-y divide-neutral-100">
                    {(state ? AFTER : TODAY).map((r) => <ResultItem key={r.title} r={r} />)}
                    {state && (
                      <p className="pt-3.5 text-[12px] text-neutral-400">The 2021 forum thread is still there, now on page two, below Ananya’s own account of what went wrong.</p>
                    )}
                  </div>
                  {state ? <div className="hidden md:block"><KnowledgePanel /></div> : <div className="hidden md:block" />}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] text-neutral-400">Illustrative example. Ananya Rao and Kiln Logistics are made up.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Why it matters — three researched figures                                 */
/* -------------------------------------------------------------------------- */

function WhyItMatters() {
  const stats = [
    {
      figure: '44%',
      text: 'of a company’s market value is attributed to the reputation of its CEO, according to executives surveyed by Weber Shandwick.',
      note: '1,700+ executives worldwide, 2015.',
      source: 'weber' as const,
    },
    {
      figure: '73%',
      text: 'of B2B decision-makers say an organisation’s thought leadership is a more trustworthy way to judge it than its marketing materials.',
      note: '3,484 professionals in seven countries, including India, 2024.',
      source: 'edelmanLinkedIn' as const,
    },
    {
      figure: '69%',
      text: 'of people worry that business leaders, government officials and journalists deliberately mislead them.',
      note: '33,000+ respondents in 28 countries, 2025.',
      source: 'edelmanTrust' as const,
    },
  ]
  return (
    <section className={`${shell} py-20 lg:py-32`}>
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20">
        <FadeIn>
          <h2 className={h2}>People judge the company by the person <Mark>running it.</Mark></h2>
        </FadeIn>
        <FadeIn delay={80}>
          <p className="max-w-[52ch] text-[15px] leading-[1.75] text-neutral-600 lg:pt-3">
            The research points two ways at once. A founder’s reputation carries real commercial weight, and audiences are more sceptical than ever. That’s why the only reputation worth building is one that holds up when people check.
          </p>
        </FadeIn>
      </div>

      <div className="mt-14 grid border-t border-neutral-950 md:grid-cols-3 lg:mt-20">
        {stats.map((s, i) => (
          <FadeIn key={s.figure} delay={i * 120} className={`border-b border-neutral-200 py-9 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 ${i > 0 ? 'md:border-l' : ''}`}>
            <p className="site-display text-[clamp(3.5rem,7vw,6rem)] font-normal leading-none tracking-[-0.05em]">{s.figure}</p>
            <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.65] text-neutral-700">{s.text}</p>
            <p className="mt-4 text-[12px] text-neutral-400">
              {s.note} <SourceLink id={s.source}>Source</SourceLink>
            </p>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Services — sticky photo that changes as you read                          */
/* -------------------------------------------------------------------------- */

function Services() {
  const [active, setActive] = useState(SERVICES[0].id)

  useEffect(() => {
    const rows = SERVICES.map((s) => document.getElementById(`pr-${s.id}`)).filter(Boolean) as HTMLElement[]
    if (!rows.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id.replace('pr-', ''))
      },
      { rootMargin: '-40% 0px -50% 0px' },
    )
    rows.forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="services" className="bg-neutral-950 text-white">
      <div className={`${shell} py-20 lg:py-32`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <FadeIn>
            <h2 className={`${h2} text-white`}>What we <Mark dark>do</Mark></h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="max-w-[48ch] text-[15px] leading-[1.75] text-white/65 lg:pt-3">
              Most founders need some of this, not all of it. We start with an audit of where you stand and recommend the smallest set of work that will make a real difference.
            </p>
          </FadeIn>
        </div>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[1fr_1fr] lg:gap-20">
          {/* sticky photo (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 aspect-[4/5] w-full overflow-hidden bg-neutral-800">
              {SERVICES.map((s) => (
                <img
                  key={s.id}
                  src={s.photo}
                  alt={active === s.id ? s.alt : ''}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${active === s.id ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
                />
              ))}
              <span className="absolute bottom-4 left-4 bg-neutral-950/80 px-3 py-1.5 text-[12px] text-white backdrop-blur">
                {SERVICES.find((s) => s.id === active)?.title}
              </span>
            </div>
          </div>

          <div className="border-t border-white/25">
            {SERVICES.map((s) => (
              <article id={`pr-${s.id}`} key={s.id} className={`border-b border-white/15 py-10 transition-opacity duration-500 lg:min-h-[48vh] lg:py-14 ${active === s.id ? 'lg:opacity-100' : 'lg:opacity-40'}`}>
                <img src={s.photo} alt={s.alt} loading="lazy" className="mb-6 aspect-[16/10] w-full object-cover lg:hidden" />
                <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] font-normal tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-5 max-w-[50ch] text-[15px] leading-[1.75] text-white/80">{s.body}</p>
                <p className="mt-4 max-w-[50ch] text-[15px] leading-[1.75] text-white/55">
                  {s.detail}
                  {s.source && (
                    <>
                      {' '}
                      <SourceLink id={s.source}>See Google’s help page</SourceLink>.
                    </>
                  )}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  A real pitch, not a press release                                         */
/* -------------------------------------------------------------------------- */

const PITCH_BODY = [
  'Hi Priya,',
  'I read your piece last week on freight costs after the monsoon. One thing it didn’t cover: small exporters pay far more per kilo to ship than large ones, often for the same route.',
  'Kiln Logistics has data from 4,000 shipments made by small exporters in Maharashtra over the past year, and the gap is wider than most people assume. Founder Ananya Rao can walk you through it and share the full dataset.',
  'She’s also happy to talk about the delivery problems Kiln had in 2021 and what it changed afterwards, if that’s useful context.',
  'Would a short call this week work?',
  'Thanks,\nMeera, BrandWorks',
]

function PitchExample() {
  const words = PITCH_BODY.join(' ').split(/\s+/).filter(Boolean).length
  return (
    <section className={`${shell} py-20 lg:py-32`}>
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20">
        <div>
          <FadeIn>
            <h2 className={h2}>We send pitches, <Mark>not press releases.</Mark></h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-600">
              In Muck Rack’s survey of more than 1,000 journalists, 73% said they reject pitches because they aren’t relevant to what they cover, and 65% prefer pitches under 200 words. <SourceLink id="muckRack">Read the findings</SourceLink>.
            </p>
            <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-600">
              So every pitch goes to someone who covers the subject, refers to their actual work, offers something new, and fits on one screen. This is roughly what one looks like.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={120}>
          <div className="border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <div className="space-y-2 border-b border-neutral-200 px-6 py-5 text-[13px] sm:px-8">
              <p><span className="inline-block w-16 text-neutral-400">To</span>Priya, logistics correspondent</p>
              <p><span className="inline-block w-16 text-neutral-400">Subject</span><span className="text-neutral-950">Small exporters pay more per kilo to ship. Data from 4,000 shipments</span></p>
            </div>
            <div className="space-y-4 px-6 py-6 text-[14.5px] leading-[1.7] text-neutral-700 sm:px-8">
              {PITCH_BODY.map((para) => (
                <p key={para} className="whitespace-pre-line">{para}</p>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 text-[12px] text-neutral-500 sm:px-8">
              <span>{words} words</span>
              <span className="bg-[#CCFF00] px-2 py-0.5 text-neutral-950">Under 200</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-neutral-400">Illustrative example. The people, company and figures are made up.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Process                                                                   */
/* -------------------------------------------------------------------------- */

function Process() {
  const [ref, seen] = useInView<HTMLDivElement>({ threshold: 0.3 })
  return (
    <section className="border-t border-neutral-200">
      <div className={`${shell} py-20 lg:py-32`}>
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20">
          <FadeIn>
            <h2 className={h2}>How we <Mark>work together</Mark></h2>
          </FadeIn>
          <FadeIn delay={80}>
            <p className="max-w-[52ch] text-[15px] leading-[1.75] text-neutral-600 lg:pt-3">
              Reputation is built by showing up consistently, so we plan for months, not a single launch. You’ll have one named lead who knows your story and answers your messages.
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
              <li key={phase.when}>
                <FadeIn delay={200 + i * 160}>
                  <p className="text-[13px] text-neutral-500">{phase.when}</p>
                  <h3 className="mt-3 text-[clamp(1.35rem,2.2vw,1.75rem)] font-normal tracking-[-0.02em]">{phase.title}</h3>
                  <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.75] text-neutral-700">{phase.body}</p>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Crisis callout                                                            */
/* -------------------------------------------------------------------------- */

function IfSomethingWentWrong() {
  return (
    <section className={`${shell} pb-20 lg:pb-28`}>
      <FadeIn>
        <div className="grid gap-10 bg-[#CCFF00] p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-20 lg:p-16">
          <div>
            <h2 className={`${h2} max-w-[18ch]`}>Something already gone wrong?</h2>
            <p className="mt-6 max-w-[50ch] text-[15px] leading-[1.75] text-neutral-800">
              A bad story, a viral complaint or a misquote moves fast. Call us before you respond publicly. The first statement usually shapes the coverage that follows, and it’s much easier to get right than to fix later.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <Link
              to="/contact"
              className="group inline-flex min-h-[52px] items-center gap-10 whitespace-nowrap bg-neutral-950 px-6 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-white hover:text-neutral-950"
            >
              Get urgent help
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <p className="text-[12px] text-neutral-700">Tell us it’s urgent and we’ll reply the same day.</p>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Photo strip — the portrait side of the service                            */
/* -------------------------------------------------------------------------- */

function PhotoStrip() {
  const photos = [...PHOTOS.strip, ...PHOTOS.strip]
  return (
    <section className="overflow-hidden border-t border-neutral-200 py-20 lg:py-28">
      <div className={`${shell} grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20`}>
        <FadeIn>
          <h2 className={h2}>Photos that look like you, <Mark>on a good day.</Mark></h2>
        </FadeIn>
        <FadeIn delay={80}>
          <p className="max-w-[52ch] text-[15px] leading-[1.75] text-neutral-600 lg:pt-3">
            Journalists and event organisers ask for photos constantly, and an old cropped selfie undoes a lot of good work. Our photo team shoots portraits, team pictures and behind-the-scenes images you can send anywhere.
          </p>
        </FadeIn>
      </div>

      <div className="group mt-14 lg:mt-20" aria-hidden="true">
        <div className="flex w-max animate-[pr-marquee_60s_linear_infinite] gap-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {photos.map((src, i) => (
            <div key={`${src}-${i}`} className={`shrink-0 overflow-hidden bg-neutral-200 ${i % 3 === 1 ? 'h-[300px] w-[240px] sm:h-[380px] sm:w-[300px]' : 'h-[260px] w-[200px] sm:h-[320px] sm:w-[250px]'} self-center`}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-[scale] duration-700 hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
      <style>{'@keyframes pr-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }'}</style>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  FAQ, sources, CTA                                                         */
/* -------------------------------------------------------------------------- */

function Faq() {
  return (
    <section className="border-t border-neutral-200 bg-[#f6f6f3]">
      <div className={`${shell} grid gap-12 py-20 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20 lg:py-28`}>
        <FadeIn>
          <h2 className={h2}>Questions founders ask us</h2>
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
              <p className="max-w-[64ch] pb-7 text-[15px] leading-[1.75] text-neutral-600">
                {item.a}
                {item.source && (
                  <>
                    {' '}
                    <SourceLink id={item.source}>AMEC’s position</SourceLink>.
                  </>
                )}
              </p>
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
      <div className="grid gap-6 border-t border-neutral-200 pt-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-20">
        <h2 className="text-[14px] font-medium">Sources</h2>
        <ul className="space-y-2.5 text-[13px] leading-[1.6] text-neutral-500">
          {Object.values(SOURCES).map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neutral-950">{source.label}</a>
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
      <div className={`${shell} grid gap-12 py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:py-28`}>
        <FadeIn>
          <h2 className="site-display max-w-[16ch] text-balance text-[clamp(2.25rem,4.8vw,4rem)] font-normal leading-[1] tracking-[-0.04em]">
            Have a story worth <Mark dark>telling?</Mark>
          </h2>
          <p className="mt-6 max-w-[50ch] text-[15px] leading-[1.75] text-white/65">
            Tell us a little about you and your company. We’ll come back with an honest view of where you could be covered and what it would take to get there.
          </p>
        </FadeIn>
        <FadeIn delay={120}>
          <Link
            to="/contact"
            className="group inline-flex min-h-[54px] items-center gap-12 whitespace-nowrap bg-[#CCFF00] px-7 text-[13px] font-medium text-neutral-950 transition-colors duration-300 hover:bg-white"
          >
            Talk to our PR team
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

function usePageMetadata(siteUrl?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'PR and Founder Reputation Management | BrandWorks'

    const description =
      'PR and founder reputation management from BrandWorks: media relations, thought leadership, speaking, search reputation, crisis response and founder portraits.'
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = existing?.content
    const meta = existing ?? document.createElement('meta')
    meta.name = 'description'
    meta.content = description
    if (!existing) document.head.appendChild(meta)

    let origin = ''
    try { origin = siteUrl ? new URL(siteUrl).origin : window.location.origin } catch { origin = window.location.origin }
    const pageUrl = `${origin}/services/pr-founder-reputation`

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
          name: 'PR and founder reputation management',
          serviceType: 'Public relations',
          url: pageUrl,
          description,
          provider: { '@type': 'Organization', name: 'BrandWorks', url: origin },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'PR services',
            itemListElement: SERVICES.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.body } })),
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
            { '@type': 'ListItem', position: 3, name: 'PR and founder reputation', item: pageUrl },
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

export default function PRReputationPage({ siteUrl }: { siteUrl?: string }) {
  usePageMetadata(siteUrl)
  return (
    <main className="w-full overflow-x-clip bg-white text-neutral-950">
      <Hero />
      <SearchYourself />
      <WhyItMatters />
      <Services />
      <PitchExample />
      <Process />
      <IfSomethingWentWrong />
      <PhotoStrip />
      {/* <Faq /> */}
      <Sources />
      <FinalCta />
    </main>
  )
}
