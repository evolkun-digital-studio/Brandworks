import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from '../routing'
import { useNativeMetadata } from '../routing/context'

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const PAGE_PATH = '/services/brand-positioning-strategy'
const PAGE_NAME = 'Brand Positioning & Strategy'
const SEO_TITLE = 'Brand Positioning & Strategy | BrandWorks'
const SEO_DESCRIPTION =
  'Building a brand without a strategy? BrandWorks defines who you’re for, what you stand for and why you win, then turns it into a 90-day growth roadmap.'

// Served from ImageKit; the ?tr= options pick width, format (WebP/AVIF) and quality.
const HERO_IMAGE = 'https://ik.imagekit.io/rxoyjxx4c/Brainstorming%20Man%20Covered%20in%20Sticky%20Notes.png'

const STEPS = [
  { name: 'Discover', desc: 'An honest look at your brand, market, competitors and customers.' },
  { name: 'Define', desc: 'Who you are for, what you promise and why you win.' },
  { name: 'Design', desc: 'Messaging, voice and visual direction that all point one way.' },
  { name: 'Drive', desc: 'A 90-day roadmap with clear priorities and KPIs.' },
]

const DELIVERABLES = [
  'Positioning statement',
  'Audience personas',
  'Messaging & tone of voice',
  'Content & channel plan',
  '90-day growth roadmap',
]

const FAQS = [
  {
    q: 'What is brand positioning?',
    a: 'It is the space your brand owns in your customer’s mind: who you are for, what you promise and why you over the alternatives. Strategy is how you claim that space and grow from it.',
  },
  {
    q: 'We already have a logo. Do we need this?',
    a: 'Yes. A logo is one answer. Positioning is what makes the logo, colours, story and content all point the same way.',
  },
  {
    q: 'Can BrandWorks also execute it?',
    a: 'Yes. Our creative, content and web teams can bring the strategy to life, or hand it to your in-house team.',
  },
]

/* -------------------------------------------------------------------------- */
/*  Small utilities                                                           */
/* -------------------------------------------------------------------------- */

// Same container as the other BrandWorks service pages, so edges line up.
const shell = 'mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12'
const section = 'py-20 lg:py-28'
const button =
  'group inline-flex min-h-[50px] items-center gap-3 whitespace-nowrap rounded-full bg-neutral-950 px-7 text-[14px] font-semibold text-white transition-colors duration-300 hover:bg-[#CCFF00] hover:text-neutral-950'

function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    // Reduced motion is handled by the motion-reduce classes, so the highlight still appears, just without the sweep.
    if (!el || typeof IntersectionObserver === 'undefined') return
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

/** Lime highlighter that sweeps across a phrase, as on the SEO and PR pages. */
function Mark({ children }: { children: ReactNode }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.6 })
  return (
    <span
      ref={ref}
      className="box-decoration-clone bg-no-repeat px-[0.08em] transition-[background-size] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
      style={{
        backgroundImage: 'linear-gradient(#CCFF00, #CCFF00)',
        backgroundPosition: '0 88%',
        backgroundSize: seen ? '100% 78%' : '0% 78%',
        transitionDelay: '250ms',
      }}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className={`${shell} pb-20 pt-24 sm:pt-28 lg:pb-28 lg:pt-32`}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Text first on small screens so the H1 isn't pushed below a tall photo. */}
        <div className="order-2 flex justify-center lg:order-1">
          <img
            src={`${HERO_IMAGE}?tr=w-1122,f-auto,q-80`}
            srcSet={[600, 900, 1122].map((w) => `${HERO_IMAGE}?tr=w-${w},f-auto,q-80 ${w}w`).join(', ')}
            sizes="(min-width: 1024px) 560px, 100vw"
            alt="A man with sticky notes on his face asking: logo, colours, fonts, story, audience, packaging"
            width={1122}
            height={1402}
            loading="eager"
            fetchPriority="high"
            className="block h-auto max-h-[640px] w-auto max-w-full object-contain"
          />
        </div>

        <div className="order-1 flex min-w-0 flex-col items-start lg:order-2">
          <h1 className="text-[clamp(2.5rem,4.5vw,4rem)] font-normal leading-[1] tracking-[-0.045em]">
            <span className="sm:block sm:whitespace-nowrap">Building a brand</span>{' '}
            <span className="sm:block sm:whitespace-nowrap"><Mark>without a strategy?</Mark></span>
          </h1>
          <p className="section-description mt-6 max-w-[44ch]">
            That’s why everything feels random. We define who you’re for and what you stand for, so every choice after that is easy.
          </p>
          <Link to="/contact" className={`${button} mt-8`}>
            Get a clear strategy
          </Link>
        </div>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section id="approach" className="scroll-mt-24 border-y border-neutral-200">
      <div className={`${shell} ${section}`}>
        <h2 className="section-heading max-w-[16ch]">Four steps from random to on-purpose.</h2>
        <ol className="m-0 mt-12 grid list-none gap-10 p-0 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((s) => (
            <li key={s.name}>
              <h3 className="text-[20px] font-medium tracking-[-0.01em]">{s.name}</h3>
              <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.7] text-neutral-600">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Deliverables() {
  return (
    <section className="border-b border-neutral-200">
      <div className={`${shell} ${section} grid gap-10 lg:grid-cols-2 lg:gap-16`}>
        <h2 className="section-heading">What you get</h2>
        <ul className="m-0 list-none p-0">
          {DELIVERABLES.map((item) => (
            <li key={item} className="flex items-center gap-4 border-b border-neutral-200 py-4 text-[16px] text-neutral-900">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-neutral-950" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(-1)
  const baseId = useId()
  return (
    <section id="faq" className="scroll-mt-24">
      <div className={`${shell} ${section}`}>
        <div className="mx-auto max-w-[720px]">
          <h2 className="section-heading">Questions</h2>
          <div className="mt-10 border-t border-neutral-200">
            {FAQS.map((f, i) => {
              const isOpen = i === open
              const panelId = `${baseId}-faq-${i}`
              return (
                <div key={f.q} className="border-b border-neutral-200">
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-8 py-5 text-left"
                    >
                      {/* Type sits on the span: a global rule resets button fonts to inherit. */}
                      <span className="text-[17px] font-medium tracking-[-0.01em]">{f.q}</span>
                      <span className="relative block size-3 shrink-0" aria-hidden="true">
                        <span className="absolute left-0 top-1/2 h-px w-full bg-neutral-950" />
                        <span className={`absolute left-1/2 top-0 h-full w-px bg-neutral-950 transition-transform duration-300 ${isOpen ? 'scale-y-0' : ''}`} />
                      </span>
                    </button>
                  </h3>
                  <div id={panelId} hidden={!isOpen}>
                    <p className="max-w-[64ch] pb-6 text-[15px] leading-[1.75] text-neutral-600">{f.a}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section id="contact" className="scroll-mt-24 border-t border-neutral-200">
      <div className={`${shell} ${section} flex flex-col items-center text-center`}>
        <h2 className="section-heading max-w-[18ch]">
          Stop guessing. <Mark>Start positioning.</Mark>
        </h2>
        <p className="section-description mt-6">Tell us where your brand is today. We’ll take it from there.</p>
        <Link to="/contact" className={`${button} mt-8`}>
          Book a strategy call
        </Link>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Metadata + structured data                                                */
/* -------------------------------------------------------------------------- */

function usePageMetadata(siteUrl?: string) {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    const previousTitle = document.title
    if (!nativeMetadata) document.title = SEO_TITLE

    const existing = nativeMetadata ? null : document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = existing?.content
    const meta = existing ?? (!nativeMetadata ? document.createElement('meta') : null)
    if (meta) {
      meta.name = 'description'
      meta.content = SEO_DESCRIPTION
      if (!existing) document.head.appendChild(meta)
    }

    let origin = ''
    try {
      origin = siteUrl ? new URL(siteUrl).origin : window.location.origin
    } catch {
      origin = window.location.origin
    }
    const pageUrl = `${origin}${PAGE_PATH}`

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
        {
          '@type': 'Service',
          '@id': `${pageUrl}#service`,
          name: PAGE_NAME,
          serviceType: 'Brand positioning and strategy',
          url: pageUrl,
          description: SEO_DESCRIPTION,
          provider: { '@type': 'Organization', name: 'BrandWorks', url: origin },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
            { '@type': 'ListItem', position: 3, name: PAGE_NAME, item: pageUrl },
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

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function BrandPositioningStrategyPage({ siteUrl }: { siteUrl?: string }) {
  usePageMetadata(siteUrl)
  return (
    <main className="w-full overflow-x-clip bg-white text-neutral-950">
      <Hero />
      <Steps />
      <Deliverables />
      <Faq />
      <Cta />
    </main>
  )
}
