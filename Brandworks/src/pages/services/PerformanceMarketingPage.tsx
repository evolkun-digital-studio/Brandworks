import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setDocumentTitle, setMetaTag, removeMetaTag, setLinkTag, removeLinkTag } from '../../blog/lib/documentHead'
import productImage from '../../assets/photography/photo4-720.jpg'
import portraitImage from '../../assets/photography/photo3-720.jpg'
import './PerformanceMarketingPage.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const capabilities = ['Meta Ads', 'Google Search Ads', 'Google Display', 'YouTube Advertising', 'Performance Max', 'LinkedIn Ads', 'Remarketing', 'Lead Generation Campaigns', 'E-commerce Acquisition', 'App Promotion', 'Conversion Rate Optimization', 'Landing Page Strategy', 'Campaign Creative Strategy', 'Analytics & Tracking', 'Budget Scaling', 'Performance Reporting']

const capabilitySections = ['04', '04', '04', '04', '04', '04', '13', '15', '14', '04', '09', '09', '06', '10', '18', '19']

const stages = [
  ['Research', 'Understand the market, customer intent, competitors and demand. Find the problem worth solving before choosing a platform.'],
  ['Offer', 'Clarify what someone is being asked to buy, enquire about or sign up for, and why that decision makes sense now.'],
  ['Audience', 'Build targeting around intent, behaviour, first-party customer data and market signals.'],
  ['Creative', 'Earn attention and communicate value quickly, with a clear connection between the idea and the action.'],
  ['Media', 'Choose placements, campaign objectives, bidding strategies and budgets that serve the business goal.'],
  ['Landing Page', 'Carry the promise of the ad into a fast, clear experience. Remove unnecessary steps between interest and action.'],
  ['Tracking', 'Verify the events that matter, from a qualified enquiry to a completed purchase.'],
  ['Conversion', 'Connect campaign activity to business outcomes, including lead quality, sales and revenue.'],
  ['Optimization', 'Use evidence to refine audiences, creative, bids and the funnel. Keep a record of what changed and why.'],
  ['Scale', 'Increase investment around validated combinations while watching efficiency, margins and capacity.'],
] as const

const metrics = [
  ['CTR', 'Click-Through Rate', 'Ad clicks relative to impressions. A signal of relevance, not proof of sales.'],
  ['CPC', 'Cost Per Click', 'Spend divided by clicks. Read alongside the quality of the traffic.'],
  ['CPM', 'Cost Per 1,000 Impressions', 'The cost of reaching an audience at a given placement.'],
  ['CPA', 'Cost Per Acquisition', 'Spend per defined acquisition. Agree on what counts as an acquisition first.'],
  ['CPL', 'Cost Per Lead', 'Spend per enquiry. Compare with qualification and sales conversion.'],
  ['CAC', 'Customer Acquisition Cost', 'Acquisition costs per new customer, using an agreed scope of marketing and sales costs.'],
  ['CVR', 'Conversion Rate', 'The share of visits or interactions that complete the agreed action.'],
  ['ROAS', 'Return on Ad Spend', 'Attributed revenue divided by ad spend. Revenue return is not the same as profit.'],
  ['AOV', 'Average Order Value', 'Revenue per order. Helps assess offer structure and acquisition economics.'],
  ['LTV', 'Customer Lifetime Value', 'Customer value over time, with the time horizon and margin basis clearly defined.'],
  ['MER', 'Marketing Efficiency Ratio', 'Total revenue divided by total marketing spend for the agreed period.'],
  ['Frequency', 'Repeat exposure', 'How often people see an ad. Read with response and signs of fatigue.'],
  ['Impression Share', 'Available search visibility', 'Impressions received relative to eligible impressions in supported campaigns.'],
  ['Revenue', 'Business outcome', 'Reconcile reported sales with the business, accounting for returns and attribution.'],
] as const

const tests = [
  ['Audience', 'Who receives the campaign?', 'Compare meaningful intent or customer segments.'],
  ['Creative', 'What earns attention?', 'Compare visual ideas and formats against the same goal.'],
  ['Message', 'Which angle creates interest?', 'Test customer problems, benefits and objections.'],
  ['Offer', 'What creates urgency or value?', 'Test the proposition without losing sight of margin.'],
  ['Landing Experience', 'What reduces friction?', 'Compare clarity, forms and the route to conversion.'],
  ['Bidding', 'How should media spend compete?', 'Evaluate strategies against verified conversion signals.'],
  ['Budget', 'Where can spend increase efficiently?', 'Test increments while watching marginal acquisition costs.'],
] as const

const process = [
  ['Discovery', 'Understand your business model, customer, margins, goals and existing data.'],
  ['Audit', 'Review ads, analytics, funnel, creative and tracking. Identify gaps before adding spend.'],
  ['Strategy', 'Define channels, audience, offers, creative requirements, budget and the KPIs we will judge together.'],
  ['Launch', 'Build campaigns and tracking, verify conversions and begin controlled testing.'],
  ['Optimize', 'Review outcomes, remove inefficiencies and develop the next set of tests.'],
  ['Scale', 'Increase investment around validated combinations, with regular checks on quality and profitability.'],
] as const

const faqs = [
  ['What is performance marketing?', 'Performance marketing connects paid advertising to measurable actions such as qualified leads, purchases or sign-ups. Our performance marketing services bring strategy, creative, media, landing pages and measurement into one acquisition system.'],
  ['Which advertising platforms do you manage?', 'We plan and manage Meta, Google and LinkedIn campaigns. The channel mix follows your audience, offer and commercial objective rather than a fixed package. App promotion is scoped around the app, platform and measurement setup.'],
  ['How much should a business spend on paid ads?', 'A useful budget depends on your margins, acquisition target, expected conversion costs and the data needed to test. We agree a test budget and review points with you. Media spend, creative production and management scope are discussed separately.'],
  ['How long does it take to see results?', 'Campaigns can begin generating activity after launch, but dependable conclusions take sufficient conversion data and time. The sales cycle, tracking readiness, creative and budget all affect the timeline. We establish review milestones before launch.'],
  ['What is ROAS?', 'Return on ad spend is attributed advertising revenue divided by advertising spend for a defined period. It helps compare campaign efficiency, but does not include every business cost or prove incremental revenue.'],
  ['What is a good ROAS?', 'There is no universal target. We work backwards from margin, fulfilment costs, returns, repeat purchases and acquisition goals to define a sustainable target for your business.'],
  ['Do you create the campaign creatives too?', 'Yes. Photography, videography, motion, graphics, copy and performance insights can be planned together. We agree the formats, production scope and refresh cadence for your campaigns.'],
  ['Do you create landing pages?', 'Yes. We can plan, design and build campaign landing pages, or improve an existing experience with your team. The scope can include messaging, mobile usability, forms, speed and conversion tracking.'],
  ['Do you manage Meta Ads?', 'Yes. We manage Facebook and Instagram campaigns across appropriate objectives, including awareness, lead generation, purchases, catalogue sales and remarketing.'],
  ['Do you manage Google Ads?', 'Yes. Our PPC management can cover Search, Display, Shopping, YouTube, Performance Max and remarketing, based on your goals and eligibility.'],
  ['Can you improve existing campaigns?', 'Yes. We start with an audit of the account, tracking, creative, audience and landing experience. Changes are prioritized around the biggest evidence-backed opportunities.'],
  ['How do you track conversions?', 'We define the conversion actions first, then configure and verify the appropriate analytics, platform events and source tracking. GA4, Google Tag Manager, Meta Pixel, Conversions API and CRM feedback may form part of the setup.'],
  ['Do you provide reports?', 'Yes. Reports connect spend, conversions and relevant business outcomes to the decisions we made, the lessons learned and the next actions. We agree the reporting cadence and measures with you.'],
  ['Can you work with our internal marketing team?', 'Yes. We can work alongside your marketing, creative, development and sales teams, with agreed responsibilities and a shared testing plan.'],
  ['Do you manage ecommerce campaigns?', 'Yes. Campaigns can include product feeds, catalogue ads, Shopping, Performance Max, acquisition and remarketing. We review ROAS alongside margins, MER, customer acquisition and repeat purchases.'],
  ['Do you generate B2B leads?', 'We build B2B lead generation campaigns around relevant search intent, professional audiences, offers and landing pages. We assess qualified leads and pipeline progression alongside lead volume.'],
  ['Do you handle remarketing?', 'Yes. We plan relevant follow-up for eligible website visitors, viewers, engagers, customers and lead audiences, with exclusions and frequency controls where supported.'],
  ['Do you guarantee results?', 'No. We can influence performance through strategy, creative, testing and optimization, but advertising outcomes should not be guaranteed. Demand, competition, budgets, offers, platform changes and your sales process all affect results.'],
] as const

function Section({ number, label, title, children, className = '', id }: { number: string; label: string; title?: string; children: ReactNode; className?: string; id?: string }) {
  const sectionId = id ?? `pm-section-${number}`
  return <section id={sectionId} className={`pm-section ${className}`} aria-labelledby={`${sectionId}-title`} tabIndex={-1}>
    <div className="pm-container">
      <p className="pm-label">{label}</p>
      {title ? <h2 id={`${sectionId}-title`}>{title}</h2> : <h2 id={`${sectionId}-title`} className="sr-only">{label}</h2>}
      {children}
    </div>
  </section>
}

function Words({ items }: { items: string[] }) {
  return <ul className="pm-words">{items.map(item => <li key={item}>{item}</li>)}</ul>
}

function Flow({ items, className = '' }: { items: string[]; className?: string }) {
  return <ol className={`pm-flow ${className}`}>{items.map((item, index) => <li key={item}><span className="pm-step-number">{String(index + 1).padStart(2, '0')}</span><span>{item}</span>{index < items.length - 1 ? <span className="pm-flow-arrow" aria-hidden="true">→</span> : className === 'pm-loop' && <span className="pm-flow-arrow" aria-hidden="true">↶</span>}</li>)}</ol>
}

function CampaignField() {
  return <div className="pm-campaign-field" role="img" aria-label="Conceptual campaign paths connecting attention, intent and conversion. No performance data is represented.">
    <div className="pm-field-top"></div>
    <svg viewBox="0 0 600 390" fill="none" aria-hidden="true">
      <g className="pm-field-grid" stroke="currentColor">{[80, 160, 240, 320].map(y => <path key={y} d={`M0 ${y}H600`} />)}{[100, 200, 300, 400, 500].map(x => <path key={x} d={`M${x} 0V390`} />)}</g>
      <g className="pm-field-paths" strokeWidth="1.5">
        <path d="M0 310C110 310 120 90 260 90S390 260 600 60" />
        <path d="M0 340C100 340 180 210 290 210S420 80 600 60" />
        <path d="M0 180C140 180 140 320 280 320S390 60 600 60" />
      </g>
      <g fill="currentColor"><circle cx="260" cy="90" r="5" /><circle cx="290" cy="210" r="5" /><circle cx="280" cy="320" r="5" /><circle className="pm-conversion-dot" cx="540" cy="78" r="9" /></g>
    </svg>
    <div className="pm-field-label pm-field-label-a">01 / Attention<span>Meta · YouTube</span></div>
    <div className="pm-field-label pm-field-label-b">02 / Intent<span>Search · LinkedIn</span></div>
    <div className="pm-field-label pm-field-label-c">03 / Action<span>Landing · Conversion</span></div>
  </div>
}

function CreativeLab() {
  const [hook, setHook] = useState(0)
  const [visual, setVisual] = useState(0)
  const [offer, setOffer] = useState(0)
  const [audience, setAudience] = useState(0)
  const groups = [
    { name: 'Hook', labels: ['Hook A', 'Hook B', 'Hook C'], value: hook, set: setHook },
    { name: 'Visual', labels: ['Visual A', 'Visual B'], value: visual, set: setVisual },
    { name: 'Offer', labels: ['Offer A', 'Offer B'], value: offer, set: setOffer },
    { name: 'Audience', labels: ['Audience 01', 'Audience 02'], value: audience, set: setAudience },
  ]
  return <div className="pm-creative-lab">
    <div className="pm-creative-preview">
      <img src={visual === 0 ? productImage : portraitImage} alt={visual === 0 ? 'Studio product photograph of a white pump bottle' : 'Lifestyle campaign photograph of a woman with a coconut water can'} width="720" height="900" loading="lazy" />
      <div className="pm-creative-copy"><span>Illustrative creative study</span><h3>{['Make the everyday feel considered.', 'A small change. A better ritual.', 'Designed for your daily rhythm.'][hook]}</h3><p>{offer === 0 ? 'Explore the collection' : 'Find your everyday essential'} <span aria-hidden="true">↗</span></p></div>
    </div>
    <div className="pm-test-selector"><p className="pm-label">Choose a test combination</p>{groups.map(group => <fieldset key={group.name}><legend>{group.name}</legend><div>{group.labels.map((label, index) => <button key={label} type="button" aria-pressed={group.value === index} onClick={() => group.set(index)}>{label}</button>)}</div></fieldset>)}
      <p className="pm-variant" aria-live="polite">Selected: H{hook + 1} / V{visual + 1} / O{offer + 1} / A{audience + 1}</p>
      <p className="pm-small">A planning illustration, not a live ad or campaign result. In practice, we isolate a hypothesis and keep the comparison fair. Audience changes delivery; it does not change the visual.</p>
    </div>
  </div>
}

function LandingComparison() {
  const [improved, setImproved] = useState(true)
  return <div className="pm-landing-study">
    <div className="pm-comparison-controls" role="group" aria-label="Landing page comparison"><button type="button" aria-pressed={!improved} onClick={() => setImproved(false)}>Before / Friction</button><button type="button" aria-pressed={improved} onClick={() => setImproved(true)}>After / Clarity</button></div>
    <div className={`pm-wireframe ${improved ? 'is-improved' : ''}`} aria-live="polite">
      <div className="pm-browser-bar"><span aria-hidden="true">● ● ●</span><span>Landing experience / Concept study</span></div>
      <div className="pm-wireframe-body"><span className="pm-label">{improved ? 'One audience. One offer.' : 'Too many directions.'}</span><h3>{improved ? 'Find the right solution for your business.' : 'Welcome to our website.'}</h3><p>{improved ? 'A clear promise that matches the ad, with the next step visible and easy to understand.' : 'General messaging, competing links and a form that asks for more than it needs.'}</p>
        <div className="pm-wireframe-action">{improved ? 'Discuss your needs ↗' : 'Learn more / Browse / Sign up'}</div>
        <div className="pm-wireframe-lines" aria-hidden="true"><span /><span /><span />{!improved && <><span /><span /><span /></>}</div>
        <div className="pm-wireframe-note">{improved ? 'Relevant proof · Short form · Clear next step' : 'Hidden action · Long form · Unclear value'}</div>
      </div>
    </div>
    <p className="pm-small">Illustrative structure. Actual changes are tested against conversion quality and business outcomes.</p>
  </div>
}

export default function PerformanceMarketingPage() {
  const rootRef = useRef<HTMLElement>(null)
  const { hash, key } = useLocation()

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!hash) {
        window.scrollTo({ top: 0, behavior: 'instant' })
        return
      }
      const target = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('section[id]') ?? [])
        .find(section => `#${section.id}` === hash)
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, key])

  useEffect(() => {
    const previousTitle = document.title
    const title = 'Performance Marketing Agency | BrandWorks'
    const description = 'BrandWorks connects paid media, Meta Ads, Google Ads, campaign strategy, conversion optimization and analytics to measurable business growth.'
    const url = `${window.location.origin}/services/performance-marketing`
    setDocumentTitle(title)
    setMetaTag('name', 'description', description)
    setMetaTag('property', 'og:title', title)
    setMetaTag('property', 'og:description', description)
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:url', url)
    setMetaTag('name', 'twitter:card', 'summary')
    setMetaTag('name', 'twitter:title', title)
    setMetaTag('name', 'twitter:description', description)
    setLinkTag('canonical', url)
    return () => {
      if (document.title === title) document.title = previousTitle
      removeMetaTag('name', 'description')
      for (const key of ['og:title', 'og:description', 'og:type', 'og:url']) removeMetaTag('property', key)
      for (const key of ['twitter:card', 'twitter:title', 'twitter:description']) removeMetaTag('name', key)
      removeLinkTag('canonical')
    }
  }, [])

  useGSAP(() => {
    const root = rootRef.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-pm-reveal]', root).forEach(element => {
        gsap.from(element, { opacity: 0, y: 24, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } })
      })
      gsap.from('.pm-field-paths path', { strokeDasharray: 1000, strokeDashoffset: 1000, duration: 1.8, stagger: 0.12, ease: 'power2.out' })
      gsap.from('.pm-loop li', {
        opacity: 0.35, y: 8, stagger: 0.15, duration: 0.5,
        scrollTrigger: { trigger: '.pm-loop', start: 'top 85%', once: true },
      })
    })
    media.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
      const field = root.querySelector<HTMLElement>('.pm-campaign-field')
      const drawing = field?.querySelector('svg')
      if (!field || !drawing) return
      const moveX = gsap.quickTo(drawing, 'x', { duration: 0.7, ease: 'power2.out' })
      const moveY = gsap.quickTo(drawing, 'y', { duration: 0.7, ease: 'power2.out' })
      const move = (event: PointerEvent) => {
        const bounds = field.getBoundingClientRect()
        moveX(((event.clientX - bounds.left) / bounds.width - 0.5) * 14)
        moveY(((event.clientY - bounds.top) / bounds.height - 0.5) * 14)
      }
      const reset = () => { moveX(0); moveY(0) }
      field.addEventListener('pointermove', move)
      field.addEventListener('pointerleave', reset)
      return () => {
        field.removeEventListener('pointermove', move)
        field.removeEventListener('pointerleave', reset)
      }
    })
    const steps = gsap.utils.toArray<HTMLElement>('[data-pm-stage]', root)
    const activate = (step: HTMLElement) => {
      steps.forEach(item => item.classList.toggle('is-active', item === step))
      const label = root.querySelector('[data-pm-active-stage]')
      if (label) label.textContent = step.dataset.pmStage ?? 'Research'
    }
    steps.forEach(step => {
      ScrollTrigger.create({ trigger: step, start: 'top 55%', end: 'bottom 55%', onEnter: () => activate(step), onEnterBack: () => activate(step) })
    })
    return () => media.revert()
  }, { scope: rootRef })

  return <main ref={rootRef} className="pm-page font-secondary">
    <section className="pm-hero pm-container" aria-labelledby="pm-title">
      <div><h1 id="pm-title">Media spend should create momentum, not just impressions.</h1><p className="pm-lead">We combine paid media, creative, data and conversion strategy to turn advertising budgets into measurable business growth.</p><div className="pm-actions"><Link to="/contact" className="pm-button">Discuss Your Growth <span aria-hidden="true">↗</span></Link><Link to="#pm-approach" className="pm-text-link">Explore Our Approach <span aria-hidden="true">↓</span></Link></div><p className="pm-hero-signature">BrandWorks / Strategy + Design + Technology</p></div>
      <CampaignField />
    </section>

    <Section number="02" label="The perspective" title="Performance marketing is not about spending more. It is about learning faster." className="pm-intro">
      <div className="pm-split"><p className="pm-lead">An ad is only one part of the decision.</p><div><p>Performance comes from the relationship between strategy, audience, offer, creative, landing experience and tracking. Testing tells us what to change. Optimization turns those lessons into a more effective acquisition system.</p><p>As a performance marketing agency, we connect the work before the click with what happens after it. Every investment needs a purpose. Every result needs context.</p></div></div>
    </Section>

    <Section number="03" label="What we manage" title="A connected scope. A clear responsibility.">
      <ol className="pm-service-index">
        {capabilities.map((item, index) => (
          <li key={item}>
            <Link to={`#pm-section-${capabilitySections[index]}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{item}</span>
              <span className="pm-index-arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ol>
    </Section>

    <Section number="04" label="Channels" title="Choose the channel for the job.">
      <div className="pm-channel pm-channel-meta"><div><span className="pm-label">Discovery / Facebook + Instagram</span><h3>Meta Ads</h3><p>Introduce an offer in the feed, build interest and reconnect with people who already know you. Creative and audience strategy are planned together.</p></div><Words items={['Awareness', 'Traffic', 'Leads', 'Purchases', 'Remarketing', 'Catalogue sales', 'Lookalike audiences', 'Custom audiences']} /></div>
      <div className="pm-channel pm-channel-google"><div className="pm-search-concept"><span className="pm-label">The moment of intent</span><p>“A solution to my problem”<span aria-hidden="true">↗</span></p></div><div><h3>Google Ads</h3><p>Capture active demand with Search and Shopping. Use Display, YouTube and remarketing to support the wider journey. Performance Max connects eligible inventory around defined conversion goals and useful creative assets.</p><Words items={['Search', 'Display', 'Shopping', 'YouTube', 'Performance Max', 'Remarketing']} /></div></div>
      <div className="pm-channel pm-channel-linkedin"><h3>LinkedIn Ads</h3><div><p>Reach professional audiences with a proposition that respects a longer buying process. Build B2B lead generation around the role, organization and buying context.</p><Words items={['Decision-makers', 'Account targeting', 'Professional audiences', 'B2B leads']} /></div><span className="pm-channel-mark" aria-hidden="true">Business<br />to business.</span></div>
      <p className="pm-channel-note">For app promotion, we connect the campaign objective to installs and meaningful in-app actions. Platform choice, deep links and measurement are scoped around the app and its customer journey.</p>
    </Section>

    <Section number="05" label="The performance system" title="One campaign. Multiple systems working together." className="pm-dark pm-system" id="pm-system">
      <div className="pm-system-layout"><div className="pm-system-aside"><div className="pm-system-orbit" aria-hidden="true"><span /><span /><span /><strong data-pm-active-stage>Research</strong></div><p>Creative, media and technology move together. A weak link affects everything that follows.</p><Link to="/contact" className="pm-text-link">Build your system <span aria-hidden="true">↗</span></Link></div>
        <ol className="pm-system-steps">{stages.map(([title, copy],) => <li key={title} data-pm-stage={title}><span></span><div><h3>{title}</h3><p>{copy}</p></div><span className="pm-stage-marker" aria-hidden="true" /></li>)}</ol>
      </div>
    </Section>

    <Section number="06" label="Creative performance" title="Media buying cannot rescue weak creative." className="pm-creative">
      <div className="pm-split"><p className="pm-lead">The creative is part of the strategy.</p><p>Photography, videography, motion, graphics and copy work together to make the offer understood. We use hooks, formats and performance insights to build the next creative brief, rather than endlessly adjusting the same ad.</p></div>
      <CreativeLab />
      <Words items={['Static ads', 'Video ads', 'UGC-style creatives', 'Carousels', 'Product-focused ads', 'Founder-led content', 'Motion ads']} />
    </Section>

    <Section number="07" label="Audience strategy" title="The right message still needs the right audience.">
      <div className="pm-audience-layout"><div className="pm-audience-art" role="img" aria-label="Audience layers: market reach, intent signals, first-party data and warm audiences"><div><span>Market reach</span><div><span>Intent signals</span><div><span>First-party data</span><div><span>Warm<br />audiences</span></div></div></div></div></div><div><p>We separate discovery from intent and follow-up. Segments reflect what people need, what they have done and where they are in the decision.</p><Words items={['Broad targeting', 'Interest targeting', 'Keyword intent', 'First-party data', 'Website visitors', 'Customer lists', 'Lookalike audiences', 'Retargeting audiences', 'High-intent segments', 'B2B job-title / company targeting', 'Geographic targeting', 'Device targeting', 'Funnel-stage segmentation']} /><p className="pm-small">Targeting choices depend on the platform, campaign objective and available audience data.</p></div></div>
    </Section>

    <Section number="08" label="Campaign funnel" title="Different moments. Different measures.">
      <div className="pm-funnel">{[
        ['Awareness', 'Introduce the brand or the problem.', 'Reach · CPM · Video Views · Engagement'],
        ['Consideration', 'Build interest and give people a reason to explore.', 'CTR · CPC · Landing Page Views · Engagement Quality'],
        ['Conversion', 'Turn intent into a meaningful business action.', 'Leads · Sales · CPA · Conversion Rate · ROAS'],
        ['Retention / Remarketing', 'Reconnect with warm audiences and support repeat value.', 'Repeat Purchases · Revenue · Frequency · Customer Value'],
      ].map(([title, copy, kpis], index) => <div key={title}><span className="pm-step-number">0{index + 1}</span><h3>{title}</h3><p>{copy}</p><span className="pm-funnel-bar" style={{ width: `${100 - index * 17}%` }} aria-hidden="true" /><p className="pm-small">{kpis}</p></div>)}</div>
    </Section>

    <Section number="09" label="Landing page optimization" title="Clicks do not create revenue. Conversions do.">
      <div className="pm-split pm-landing-layout"><div><p>Performance does not stop at the advertisement. The landing page should answer the question the ad creates, make the next step obvious and work well on the device in someone’s hand.</p><Words items={['Page speed', 'Message match', 'Headline clarity', 'Mobile responsiveness', 'Visual hierarchy', 'CTA placement', 'Forms', 'Trust indicators', 'Friction reduction', 'Product positioning', 'Checkout flow', 'Lead qualification', 'A/B testing']} /></div><LandingComparison /></div>
    </Section>

    <Section number="10" label="Tracking & analytics" title="Good optimization starts with reliable data." className="pm-tracking">
      <p className="pm-measure">Define the action. Verify the signal. Connect it to the business.</p><Flow items={['Ad Click', 'Landing Page', 'Product / Form Interaction', 'Conversion', 'Analytics', 'Ad Platform', 'Optimization']} />
      <div className="pm-split"><p>We plan events and custom conversions, verify them through the journey and connect lead-source or ecommerce data where applicable. UTM conventions keep campaign sources legible. CRM feedback helps distinguish an enquiry from a customer.</p><div><Words items={['GA4', 'Google Tag Manager', 'Meta Pixel', 'Conversions API', 'Google Ads Conversion Tracking', 'UTM tracking', 'Events', 'Custom conversions', 'Attribution', 'CRM tracking', 'Lead-source tracking', 'Ecommerce events', 'Server-side tracking when required']} /><p className="pm-small">We account for consent, event deduplication and attribution differences. Platform reporting and business records are reconciled rather than treated as identical.</p></div></div>
    </Section>

    <Section number="11" label="KPIs we watch" title="The number matters. So does its meaning.">
      <p className="pm-measure">The right KPI depends on the business model and campaign objective. We agree definitions before comparing results.</p><dl className="pm-metrics">{metrics.map(([name, full, copy]) => <div key={name}><dt>{name}</dt><dd><strong>{full}</strong><p>{copy}</p></dd></div>)}</dl>
      <div className="pm-commercial-note"><h3>Efficiency has to survive the economics.</h3><p>ROAS helps assess attributed revenue. CPA measures the agreed action. CAC connects acquisition costs to new customers. We read them alongside revenue, margin, cash flow and customer value before recommending more spend.</p></div>
    </Section>

    <Section number="12" label="Testing framework" title="Performance comes from structured experimentation.">
      <ol className="pm-testing-list">{tests.map(([title, question, copy], index) => <li key={title}><span className="pm-label">Test 0{index + 1}</span><h3>{title}</h3><div><strong>{question}</strong><p>{copy}</p></div></li>)}</ol><p className="pm-learning-line">Hypothesis <span aria-hidden="true">→</span> Controlled test <span aria-hidden="true">→</span> Enough evidence <span aria-hidden="true">→</span> Next campaign cycle</p><p className="pm-small">We define the primary measure, comparison and review window before launch. A short-term fluctuation is not automatically a winning test.</p>
    </Section>

    <Section number="13" label="Retargeting" title="Not every customer converts on the first visit.">
      <p className="pm-measure">Follow-up should move the conversation forward: answer an objection, show relevant proof or make it easier to return. Exclude converted audiences where appropriate and watch frequency.</p><Flow items={['First Impression', 'Website Visit', 'Product / Service Interest', 'Exit', 'Retargeting', 'Return', 'Conversion']} /><Words items={['Website visitors', 'Product viewers', 'Cart abandoners', 'Video viewers', 'Social engagers', 'Form visitors', 'Previous customers', 'Lead database', 'High-intent users']} />
    </Section>

    <Section number="14" label="Ecommerce performance" title="Acquire the customer. Understand the value." className="pm-commerce">
      <div className="pm-split"><p className="pm-lead">A purchase is a signal.<br />A profitable customer is the goal.</p><div><p>Connect product campaigns, catalogue ads, Shopping and Performance Max to accurate feeds and a clear offer. Use dynamic remarketing and cart-abandonment campaigns to reconnect with product interest.</p><p>We plan creative testing, seasonal campaigns and offer strategy around acquisition and repeat purchase. AOV, ROAS and MER are reviewed with margins and returns, so a revenue increase is assessed in business terms.</p><Words items={['Product feed optimization', 'Customer acquisition', 'Repeat purchase', 'Cart abandonment', 'Seasonal campaigns', 'Creative testing']} /></div></div>
    </Section>

    <Section number="15" label="Lead generation" title="A cheap lead is not automatically a good lead.">
      <div className="pm-split"><div><p>For service businesses, the question is what happens after the form. We connect Search, Meta lead generation and LinkedIn campaigns with qualification, CRM handoff and remarketing.</p><p>Landing forms, WhatsApp and call conversions are used where they fit the buying journey. Lead-source tracking and sales feedback help optimize toward cost per qualified lead and eventual customers.</p></div><div className="pm-lead-path"><span>Enquiry</span><span aria-hidden="true">↓</span><span>Qualified lead</span><span aria-hidden="true">↓</span><span>Sales conversation</span><span aria-hidden="true">↓</span><strong>Customer</strong><p className="pm-small">Track quality through the handoff.</p></div></div>
    </Section>

    <Section number="16" label="B2B performance marketing" title="Work with the buying cycle, not against it.">
      <div className="pm-split"><p>High-intent search, LinkedIn decision-maker targeting and account-based audiences need an offer appropriate to the stage of the conversation. A lead magnet, case study or consultation can create a useful next step before a sale is realistic.</p><div><Words items={['High-intent search', 'Decision-maker targeting', 'Account-based targeting', 'LinkedIn', 'Lead magnets', 'Case study promotion', 'Demo / consultation campaigns', 'Remarketing', 'Lead nurturing']} /><p className="pm-small">Long conversion cycles require a shared view of lead quality, pipeline progression and sales follow-up.</p></div></div>
    </Section>

    <Section number="17" label="SEO + paid media" title="Paid media captures demand. SEO compounds it." className="pm-seo">
      <div className="pm-split"><p>Paid campaign data can reveal converting keywords, strong landing pages, audience language, useful offers and market intent. Those lessons can inform organic content and the pages you build next.</p><div><p>SEO develops a longer-term source of discovery and can reduce dependence on paid acquisition. We share insights between both disciplines instead of treating them as separate plans.</p><Link to="/services/seo" className="pm-text-link">Explore BrandWorks SEO <span aria-hidden="true">↗</span></Link></div></div>
    </Section>

    <Section number="18" label="Optimization cycle" title="A campaign is a starting point." className="pm-dark pm-cycle">
      <p className="pm-measure">Optimization is continuous. Campaigns should evolve as the data changes.</p><Flow items={['Launch', 'Measure', 'Analyse', 'Test', 'Improve', 'Scale', 'Repeat']} className="pm-loop" /><p className="pm-small">Scaling follows evidence: increase budgets in controlled steps, monitor marginal CPA and ROAS, and check that sales, stock or service capacity can support the demand.</p>
    </Section>

    <Section number="19" label="Reporting" title="Reports should explain decisions, not decorate spreadsheets.">
      <div className="pm-report"><div className="pm-report-heading"><span>BrandWorks / Performance review</span><span>Report structure</span></div><div className="pm-report-row"><span>01 / Outcomes</span><p>Campaign spend, conversions, CPA, CPL, revenue and ROAS, using the agreed definitions and attribution context.</p></div><div className="pm-report-row"><span>02 / What changed</span><p>Channel comparison, creative performance, audience performance, funnel health and landing-page performance.</p></div><div className="pm-report-row"><span>03 / What happens next</span><p>Decisions, next actions, tests planned and the budget implications. Each recommendation connects to an observation.</p></div><div className="pm-report-foot">Clear measures. Shared context. A useful next decision.</div></div>
    </Section>

    <Section number="20" label="Why campaigns underperform" title="Media buying is only one part of the system.">
      <ul className="pm-failure-list">{['Weak offer', 'Poor creative', 'Wrong objective', 'Broad messaging', 'Bad landing experience', 'Slow page speed', 'Incorrect tracking', 'Insufficient data', 'Audience fatigue', 'No retargeting', 'Premature scaling', 'Poor lead quality', 'Disconnected sales process', 'No testing framework'].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul><p className="pm-measure">We diagnose the full journey before deciding that a higher budget or a different bidding strategy is the answer.</p>
    </Section>

    <Section number="21" label="Our approach" title="A clear engagement. A shared growth plan." id="pm-approach">
      <ol className="pm-engagement">{process.map(([title, copy], index) => <li key={title}><span className="pm-step-number">0{index + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol><p className="pm-small">We agree scope, account access, creative responsibilities, reporting cadence and success measures before launch.</p>
    </Section>

    <Section number="22" label="Business models" title="Built around how your business grows.">
      <p className="pm-measure">Performance marketing can be structured for different buying cycles and business models. The channel mix, conversion definition and creative approach are scoped to your business.</p><Words items={['E-commerce', 'Real Estate', 'Hospitality', 'Healthcare', 'Education', 'Fashion', 'Beauty', 'SaaS', 'Professional Services', 'B2B', 'Local Businesses', 'Consumer Brands']} />
    </Section>

    <Section number="23" label="FAQs" title="Before we start, a few useful answers." className="pm-faq">
      <div className="pm-faq-list">{faqs.map(([question, answer]) => <details key={question} name="pm-faq"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </Section>

    <Section number="24" label="Build a more measurable growth system" title="Spend with a reason. Scale with evidence." className="pm-final">
      <p className="pm-lead" data-pm-reveal>Let’s build a performance strategy around the numbers that actually matter to your business.</p><div className="pm-actions"><Link to="/contact" className="pm-button">Discuss Your Growth <span aria-hidden="true">↗</span></Link><Link to="/contact" className="pm-text-link">Contact BrandWorks <span aria-hidden="true">↗</span></Link></div><p className="pm-final-signature">Strategy + Design + Technology</p>
    </Section>
  </main>
}
