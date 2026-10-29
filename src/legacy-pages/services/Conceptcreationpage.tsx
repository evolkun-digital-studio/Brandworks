import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from '../../routing'
import { useNativeMetadata } from '../../routing/context'
import { mediaUrl } from '../../lib/media'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* -------------------------------------------------------------------------- */
/*  BrandWorks website media                                                  */
/* -------------------------------------------------------------------------- */

const PHOTOS = {
  hero: mediaUrl('our_stra.jpg'),
  billboard: mediaUrl('ideas.jpg'),
  film: mediaUrl('campaign-still.webp'),
  pack: mediaUrl('moisturizer mock up.png'),
  social: mediaUrl('content-still.webp'),
  window: mediaUrl('creative.jpg'),
  event: mediaUrl('campaign-action.jpg'),
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

// An illustrative concept for a made-up tea brand, used in the scroll scene.
const IDEA = 'The beginning of something.'

const EXECUTIONS = [
  { key: 'billboard', photo: PHOTOS.billboard, where: 'On a billboard above morning traffic', line: 'Stuck on the flyover? Ten minutes of mountains.', pos: 'left-[3%] top-[8%] w-[27%] aspect-[16/10]', from: { x: -260, y: -60, rotate: -8 } },
  { key: 'pack', photo: PHOTOS.pack, where: 'On the pack', line: 'Brew for ten. Leave for the hills.', pos: 'left-[6%] bottom-[7%] w-[17%] aspect-[4/5]', from: { x: -200, y: 220, rotate: 6 } },
  { key: 'film', photo: PHOTOS.film, where: 'In a thirty-second film', line: 'A ten-minute timer, one long shot of a hillside.', pos: 'right-[3%] top-[6%] w-[29%] aspect-[16/9]', from: { x: 280, y: -80, rotate: 7 } },
  { key: 'social', photo: PHOTOS.social, where: 'On a phone', line: 'Ten-minute mountain livestreams at 7am.', pos: 'right-[7%] bottom-[6%] w-[15%] aspect-[9/16]', from: { x: 220, y: 240, rotate: -6 } },
  { key: 'window', photo: PHOTOS.window, where: 'In a shop window', line: 'A window you can step into, ten minutes at a time.', pos: 'left-[25%] bottom-[5%] w-[19%] aspect-[4/3]', from: { x: -80, y: 260, rotate: -4 } },
  { key: 'event', photo: PHOTOS.event, where: 'At a launch', line: 'A pop-up tea room on a city rooftop.', pos: 'right-[25%] bottom-[5%] w-[19%] aspect-[4/3]', from: { x: 80, y: 260, rotate: 4 } },
]

const EXECUTION_STAGES = [
  [EXECUTIONS[0], EXECUTIONS[2]],
  [EXECUTIONS[1], EXECUTIONS[3]],
  [EXECUTIONS[4], EXECUTIONS[5]],
]

const DELIVERABLES = [
  ['Three creative routes', 'Early, rough directions that each answer the brief differently, so you choose where to go before anything is polished.'],
  ['The concept, written down', 'One page that states the idea, the insight behind it and what it rules out. If it can’t be written simply, it isn’t ready.'],
  ['A key visual and line', 'The image and words that carry the idea on their own, without a paragraph of explanation next to them.'],
  ['A manifesto or film script', 'The longer version of the idea, for launch films, brand videos or the first page of a pitch deck.'],
  ['Worked examples by channel', 'How it looks on social, outdoor, packaging, retail and at events, so your team and other partners can carry it on.'],
  ['A launch plan', 'What goes out first, where, and how the idea builds over the first months rather than appearing once and vanishing.'],
]

const PROCESS = [
  ['Listen', 'We talk to you, your customers and the people on your shop floor or sales team. Most good ideas start with something someone already said.'],
  ['Find the tension', 'We look for the gap between what people want and what they’re putting up with. That gap is usually where the idea lives.'],
  ['Explore routes', 'We develop three rough creative routes and present them side by side, with the reasoning behind each one.'],
  ['Choose and sharpen', 'You pick a direction, or a mix. We refine the line, the visual and the tone until it can be said in one sentence.'],
  ['Prove it everywhere', 'We mock the idea up across real channels. If it only works as a poster, it isn’t a concept yet.'],
  ['Hand it over', 'You get the concept, the toolkit and the launch plan. If you want us to make it too, our photo, film, design and social teams pick it up from there.'],
]

const FAQS = [
  ['How long does concept creation take?', 'Usually weeks rather than months, depending on how much research the brief needs and how many people need to sign off. We’ll give you a timeline once we’ve seen the brief.'],
  ['What if we don’t like any of the routes?', 'Then we go again. Your reaction to the first routes, even “not this”, is useful information, and the second round is almost always sharper.'],
  ['Can you produce the campaign as well?', 'Yes. Our photo, film, design, social and web teams can take the concept into production, or we can hand it to your existing partners with everything they need.'],
  ['Does a concept replace our brand identity?', 'No. Your identity is how you look; a concept is what you say and why it matters right now. A good one works inside your existing brand.'],
  ['Who owns the idea?', 'Ownership and usage rights are set out clearly in our proposal before any work starts, so there are no surprises later.'],
]

const SOURCES = [
  { label: 'Peter Field for the IPA, “The Crisis in Creative Effectiveness” (2019)', url: 'https://ipa.co.uk/media/7699/ipa_crisis_in_creative_effectiveness_2019.pdf' },
  { label: 'Marketing Week, “Link between creativity and effectiveness ‘broken’ as short-termism rises”', url: 'https://www.marketingweek.com/crisis-creative-effectiveness/' },
]

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

const shell = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14'
const display = 'font-(--font-primary) font-normal tracking-[-0.035em]'

function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`${shell} ${className}`}>
      {children}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero — one orchestrated load                                              */
/* -------------------------------------------------------------------------- */

function Hero() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('[data-hero-line]', { yPercent: 110, duration: 1.2, stagger: 0.09 }, 0.1)
        .fromTo('[data-hero-photo]', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' }, 0)
        .from('[data-hero-photo] img', { scale: 1.25, duration: 2 }, 0)
        .from('[data-hero-copy]', { opacity: 0, y: 14, duration: 0.9, stagger: 0.08 }, 0.7)

      // the photo drifts slower than the page as you leave the hero
      gsap.to('[data-hero-photo] img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true } })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <section ref={ref} className={`${shell} grid min-h-[100svh] items-end gap-10 pb-12 pt-28 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:pb-16 lg:pt-32`}>
      <div className="pb-2">
        <h1 className="m-0">
          <span className="block overflow-hidden text-[clamp(18px,1.6vw,22px)] font-normal tracking-[-0.01em] text-[#6b6b6b]">
            {/* <span data-hero-line className="block"></span> */}
          </span>
          <span className={`${display} mt-5 block text-[72px] leading-[0.9] text-[#0d0d0d]`}>
            <span className="block overflow-hidden pb-[0.04em]"><span data-hero-line className="block">Concept creation</span></span>
            {/* <span className="block overflow-hidden pb-[0.04em]"><span data-hero-line className="block">it needs to go.</span></span> */}
          </span>
        </h1>
        <p data-hero-copy className="mt-10 max-w-[44ch] text-[17px] leading-[1.65] text-[#3d3d3d]">
          We find the single idea that makes your brand worth talking about, then show exactly how it works on a billboard, a pack, a phone screen and a shop floor.
        </p>
        <div data-hero-copy className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link to="/contact" className="inline-flex min-h-[52px] items-center bg-[#0d0d0d] px-7 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-[#ccff00] hover:text-[#0d0d0d]">
            Start with a brief
          </Link>
          <a href="#how-an-idea-travels" className="text-[14px] text-[#3d3d3d] underline decoration-[#0d0d0d]/25 underline-offset-[6px] transition-colors hover:decoration-[#0d0d0d]">
            See how an idea travels
          </a>
        </div>
      </div>

      <figure className="m-0 lg:w-[86%] lg:justify-self-end">
        <div data-hero-photo className="relative aspect-[4/5] w-full overflow-hidden bg-[#e6e6e6] lg:aspect-[3/4]">
          <img src={PHOTOS.hero} alt="A studio wall covered in sketches, notes and printed references" className="absolute inset-x-0 -top-[6%] h-[112%] w-full object-cover" />
        </div>
        {/* <figcaption data-hero-copy className="mt-3 text-[13px] text-[#6b6b6b]">Most concepts start on a wall like this, long before they reach a screen.</figcaption> */}
      </figure>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  The memorable moment — one idea, assembling into a campaign               */
/* -------------------------------------------------------------------------- */

function IdeaTravels() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const stage = ref.current?.querySelector<HTMLElement>('[data-stage]')
      const cards = gsap.utils.toArray<HTMLElement>('[data-exec]')
      const cardsByKey = new Map(
        cards.map((card) => [card.dataset.exec, card]),
      )
      const idea = ref.current?.querySelector<HTMLElement>('[data-idea]')
      if (!stage || !idea) return

      gsap.set(cards, { autoAlpha: 0 })
      gsap.set(idea, { scale: 1.15 })

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: ref.current, start: 'top top', end: () => `+=${window.innerHeight * EXECUTION_STAGES.length}`, pin: stage, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
      })

      tl.to(idea, { scale: 1, duration: 0.8 }, 0)
      EXECUTION_STAGES.forEach((executions, i) => {
        const at = i
        executions.forEach((ex) => {
          const card = cardsByKey.get(ex.key)
          if (!card) return

          tl.fromTo(card, { autoAlpha: 0, x: ex.from.x, y: ex.from.y, rotate: ex.from.rotate, scale: 0.85 }, { autoAlpha: 1, x: 0, y: 0, rotate: 0, scale: 1, duration: 0.9 }, at)
        })
      })
      tl.to({}, { duration: 0.4 })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <section id="how-an-idea-travels" ref={ref} className="relative border-t border-[#e6e6e6]">
      {/* desktop: pinned stage */}
      <div data-stage className="relative hidden h-[100svh] overflow-hidden lg:block">
        <div className={`${shell} relative h-full`}>
          <div className="absolute inset-x-5 inset-y-0 sm:inset-x-8 lg:inset-x-14">
            {EXECUTIONS.map((ex) => (
              <figure key={ex.key} data-exec={ex.key} className={`absolute m-0 ${ex.pos}`}>
                <div className="relative h-full w-full overflow-hidden bg-[#e6e6e6] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)]">
                  <img src={ex.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              </figure>
            ))}

            {/* the idea */}
            <div data-idea className="absolute left-1/2 top-[42%] w-[min(34vw,520px)] -translate-x-1/2 -translate-y-1/2 bg-[#ccff00] px-[2.4vw] py-[2.2vw] text-[#0d0d0d]">
              <p className="m-0 text-[13px] text-[#0d0d0d]/60">THE IDEA</p>
              <p className={`${display} m-0 mt-3 text-[clamp(34px,3.4vw,58px)] leading-[0.95]`}>{IDEA}</p>
              {/* <p className="m-0 mt-5 text-[13px] leading-[1.5] text-[#0d0d0d]/70">An example for a made-up city tea brand whose customers have no time and miss the hills.</p> */}
            </div>
          </div>

        </div>
      </div>

      {/* mobile / reduced motion: simple stack */}
      <div className={`${shell} py-20 lg:hidden`}>
        <div className="bg-[#ccff00] p-7">
          <p className="m-0 text-[13px] text-[#0d0d0d]/60">THE IDEA</p>
          <p className={`${display} m-0 mt-3 text-[40px] leading-[0.95]`}>{IDEA}</p>
          <p className="m-0 mt-4 text-[13px] leading-[1.5] text-[#0d0d0d]/70">For a city tea brand whose customers have no time and miss the hills.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {EXECUTIONS.map((ex) => (
            <figure key={ex.key} className="m-0">
              <img src={ex.photo} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Quiet sections                                                            */
/* -------------------------------------------------------------------------- */

function WhyItMatters() {
  return (
    <Section className="grid gap-10 border-t border-[#e6e6e6] py-24 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-36">
      <h2 className="section-heading m-0 max-w-[14ch]">A concept is the reason the work hangs together.</h2>
      <div className="flex max-w-[58ch] flex-col gap-6 text-[17px] leading-[1.7] text-[#3d3d3d] lg:pt-3">
        <p className="m-0">
          Without one, every post, ad and launch is its own small project, and none of them add up. With one, people start to recognise you before they see the logo, and every new piece of work makes the last one stronger.
        </p>
          <p className="m-0">
            The evidence backs this up, with a warning attached. In Peter Field’s analysis of campaigns submitted to the IPA Effectiveness Awards, creatively awarded campaigns were once around twelve times more efficient at growing market share than other campaigns. As more of that work became short, one-off activity, the advantage fell to around four times.{' '}
            <a href={SOURCES[1].url} target="_blank" rel="noopener noreferrer" className="underline decoration-[#0d0d0d]/25 underline-offset-4 hover:decoration-[#0d0d0d]">Source</a>
          </p>
        <p className="m-0 text-[#0d0d0d]">
          Creativity pays when it’s given time to build. That’s why we design concepts to run for years, not weeks.
        </p>
      </div>
    </Section>
  )
}

function Deliverables() {
  return (
    <Section className="border-t border-[#e6e6e6] py-24 lg:py-36">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <h2 className="section-heading m-0">What you leave with</h2>
        <p className="m-0 max-w-[50ch] text-[17px] leading-[1.7] text-[#3d3d3d] lg:pt-3">
          Not a mood board and a tagline. A working idea with everything your team needs to use it well, long after the presentation.
        </p>
      </div>
      <dl className="m-0 mt-16 grid gap-4 sm:grid-cols-2 lg:mt-24 lg:gap-5">
        {DELIVERABLES.map(([title, body]) => (
          <div key={title} className="min-h-[220px] rounded-[24px] border border-[#e6e6e6] bg-[#f7f7f5] p-6 transition-colors duration-300 hover:bg-[#f1f1ed] sm:p-8">
            <dt className="text-[clamp(20px,1.7vw,26px)] tracking-[-0.015em] text-[#0d0d0d]">{title}</dt>
            <dd className="m-0 mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-[#5a5a5a]">{body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function Process() {
  const ref = useRef<HTMLOListElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // the line along the steps fills as you read down — it tracks progress, nothing else moves
      gsap.fromTo('[data-progress]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 70%', end: 'bottom 60%', scrub: true } })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <Section className="border-t border-[#e6e6e6] py-24 lg:py-36">
      <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="section-heading m-0 max-w-[12ch]">How we get to the idea</h2>
          <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.7] text-[#3d3d3d]">
            Six steps, in this order. The early ones take the longest, because the idea is only as good as the insight under it.
          </p>
        </div>

        <ol ref={ref} className="relative m-0 list-none p-0 pl-10">
          <span className="absolute bottom-2 left-[7px] top-2 w-px bg-[#e6e6e6]" aria-hidden="true" />
          <span data-progress className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-[#0d0d0d]" aria-hidden="true" />
          {PROCESS.map(([title, body], i) => (
            <li key={title} className="relative pb-14 last:pb-0">
              <span className="absolute -left-10 top-[6px] grid size-[15px] place-items-center rounded-full border border-[#0d0d0d] bg-white" aria-hidden="true">
                <span className="size-[5px] rounded-full bg-[#0d0d0d]" />
              </span>
              <p className="m-0 text-[13px] text-[#6b6b6b]">Step {i + 1}</p>
              <h3 className="m-0 mt-2 text-[clamp(22px,2vw,30px)] font-normal tracking-[-0.02em] text-[#0d0d0d]">{title}</h3>
              <p className="m-0 mt-3 max-w-[50ch] text-[15px] leading-[1.7] text-[#5a5a5a]">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

function Faq() {
  return (
    <Section className="grid gap-12 border-t border-[#e6e6e6] py-24 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-36">
      <h2 className="section-heading m-0">Questions</h2>
      <div>
        {FAQS.map(([q, a]) => (
          <details key={q} className="group border-t border-[#e6e6e6] last:border-b">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-8 py-6 text-[clamp(18px,1.5vw,22px)] tracking-[-0.01em] text-[#0d0d0d] [&::-webkit-details-marker]:hidden">
              {q}
              <span className="relative mt-2 block size-3 shrink-0" aria-hidden="true">
                <span className="absolute left-0 top-1/2 h-px w-full bg-current" />
                <span className="absolute left-1/2 top-0 h-full w-px bg-current transition-transform duration-300 group-open:scale-y-0" />
              </span>
            </summary>
            <p className="m-0 max-w-[58ch] pb-7 text-[15px] leading-[1.7] text-[#5a5a5a]">{a}</p>
          </details>
        ))}
        <div className="mt-14 text-[13px] leading-[1.6] text-[#6b6b6b]">
          <p className="m-0 text-[#0d0d0d]">Sources</p>
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
            {SOURCES.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#0d0d0d]">{s.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

function Closing() {
  return (
    <section className="bg-[#0d0d0d] text-white">
      <div className={`${shell} grid gap-12 py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:py-36`}>
        <h2 className="section-heading m-0 max-w-[14ch]">Got a brief, or just a problem?</h2>
        <div>
          <p className="m-0 max-w-[40ch] text-[17px] leading-[1.7] text-white/70">
            Either is a fine place to start. Tell us what you’re launching or what isn’t working, and we’ll tell you how we’d approach it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link to="/contact" className="inline-flex min-h-[52px] items-center bg-[#ccff00] px-7 text-[14px] font-medium text-[#0d0d0d] transition-colors duration-300 hover:bg-white">
              Start with a brief
            </Link>
            <Link to="/work" className="text-[14px] text-white/80 underline decoration-white/30 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white">
              See our work
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ConceptCreationPage({ siteUrl }: { siteUrl?: string }) {
  usePageMetadata(siteUrl)
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => window.removeEventListener('load', refresh)
  }, [])

  return (
    <main className="w-full overflow-x-clip bg-white text-[#0d0d0d] font-(--font-secondary) [--font-primary:var(--section-title-font)]">
      <Hero />
      <IdeaTravels />
      {/* <WhyItMatters /> */}
      <Deliverables />
      <Process />
      <Faq />
      <Closing />
    </main>
  )
}
