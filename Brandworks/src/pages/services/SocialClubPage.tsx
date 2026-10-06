import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '@fontsource/anton/latin-400.css'
import SocialFAQ from '../../components/social/SocialFAQ'
import SocialContact from '../../components/social/SocialContact'
import { clubData, clubImages } from '../../data/socialClub'
import './SocialClubPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const DESKTOP = '(min-width: 900px) and (prefers-reduced-motion: no-preference)'

/** Splits a headline into masked lines so each can rise on its own. */
function Mask({ lines, className = '' }: { lines: string[]; className?: string }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className={`sc-mask ${className}`}><span data-rise>{line}</span></span>
      ))}
    </>
  )
}

function Header() {
  return (
    <header className="sc-header">
      <button type="button" className="sc-round" aria-label="Menu"><span /><span /><span /></button>
      <Link to="/contact" className="sc-round" aria-label="Contact us">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /></svg>
      </Link>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Opening: hero -> statement -> team, one pinned stage             */
/* ------------------------------------------------------------------ */
function Opening() {
  const root = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(DESKTOP, () => {
      gsap.from('.sc-word i', { yPercent: 70, autoAlpha: 0, stagger: 0.04, duration: 1.1, ease: 'power4.out' })
      gsap.from('.sc-hero__title [data-rise]', { yPercent: 110, stagger: 0.08, duration: 1, delay: 0.4, ease: 'power4.out' })
      gsap.from('.sc-card', { yPercent: 14, autoAlpha: 0, stagger: 0.1, duration: 1.1, delay: 0.2, ease: 'power3.out' })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: '+=520%', pin: '.sc-stage', scrub: 0.9, anticipatePin: 1 },
      })
      // hero leaves, background turns pink, the side cards tuck behind the centre one
      tl.to('.sc-word', { yPercent: -120, duration: 1 }, 0)
        .to('.sc-hero__title, .sc-case', { yPercent: 130, duration: 1 }, 0)
        .to('.sc-card--l', { xPercent: 118, rotate: 0, duration: 1 }, 0)
        .to('.sc-card--r', { xPercent: -118, rotate: 0, duration: 1 }, 0)
        .to('.sc-bubble', { autoAlpha: 0, scale: 0.6, duration: 0.5 }, 0)
        .to('.sc-stage', { backgroundColor: '#cb2486', duration: 1 }, 0.4)
        // "We are the current / you are history"
        .fromTo('.sc-say--l', { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1 }, 1)
        .fromTo('.sc-say--r', { yPercent: 160, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1 }, 1.2)
        .to('.sc-say--l', { yPercent: -140, autoAlpha: 0, duration: 1 }, 2.6)
        .to('.sc-say--r', { yPercent: -170, autoAlpha: 0, duration: 1 }, 2.7)
        // cream chapter: electrify
        .to('.sc-stage', { backgroundColor: '#fff5f3', duration: 1 }, 2.7)
        .to('.sc-card--l', { xPercent: 8, rotate: -4, duration: 1 }, 3.2)
        .to('.sc-card--r', { xPercent: -8, rotate: 4, duration: 1 }, 3.2)
        .fromTo('.sc-electric--l', { yPercent: 120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1 }, 3.3)
        .fromTo('.sc-electric--r', { yPercent: 160, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1 }, 3.5)
        .to({}, { duration: 1.2 })
        // hand-off to the project chapter
        .to('.sc-electric--l, .sc-electric--r', { yPercent: -120, autoAlpha: 0, duration: 1 }, 5.5)
        .to('.sc-stage', { backgroundColor: '#2f89b4', duration: 1 }, 5.5)
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="sc-opening" aria-label="Social media agency">
      <div className="sc-stage">
        <div className="sc-word" aria-hidden="true">
          {clubData.wordmark.split('').map((c, i) => <i key={i}>{c}</i>)}
        </div>
        <div className="sc-cards">
          <div className="sc-card sc-card--l"><img src={clubImages.left} alt="" /></div>
          <div className="sc-card sc-card--r"><img src={clubImages.right} alt="" /></div>
          <div className="sc-card sc-card--c"><img src={clubImages.center} alt="" /></div>
          <span className="sc-bubble sc-bubble--l" aria-hidden="true">💻 ⚡ 🎧</span>
          <span className="sc-bubble sc-bubble--c" aria-hidden="true">⚡</span>
          <span className="sc-bubble sc-bubble--r" aria-hidden="true">🎬 ⚡ 📣</span>
        </div>
        <div className="sc-hero__copy">
          <p>{clubData.hero.label}</p>
          <h1 className="sc-hero__title">
            <Mask lines={[clubData.hero.line1]} className="is-pink" />
            <Mask lines={[clubData.hero.line2]} className="is-soft" />
          </h1>
        </div>
        <aside className="sc-case">
          <img src={clubImages.caseThumb} alt="" />
          <div>
            <small>{clubData.caseOfMonth.label}</small>
            <strong>{clubData.caseOfMonth.title}</strong>
            <ul>{clubData.caseOfMonth.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            <Link to="/work">See the case</Link>
          </div>
        </aside>

        <div className="sc-say sc-say--l">{clubData.statement.left}</div>
        <div className="sc-say sc-say--r">{clubData.statement.right}</div>

        <div className="sc-electric sc-electric--l">
          <h2><Mask lines={clubData.electric.title} /></h2>
        </div>
        <div className="sc-electric sc-electric--r">
          <strong>{clubData.electric.lead}</strong>
          <p>{clubData.electric.copy}</p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Projects: pinned title + horizontally travelling cards           */
/* ------------------------------------------------------------------ */
function Projects() {
  const root = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(DESKTOP, () => {
      const track = el.querySelector<HTMLElement>('.sc-track')!
      const dist = () => track.scrollWidth - window.innerWidth * 0.62
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${dist() + window.innerHeight}`, pin: '.sc-projects__stage', scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1 },
      })
      tl.to(track, { x: () => -dist(), duration: 3 }, 0.2)
        .to('.sc-projects__stage', { backgroundColor: '#b3bdc3', duration: 0.6 }, 0.4)
        .to('.sc-projects__stage', { backgroundColor: '#424524', duration: 0.6 }, 1.2)
        .to('.sc-projects__stage', { backgroundColor: '#dc9e06', duration: 0.6 }, 2.2)
        .to('.sc-projects__stage', { backgroundColor: '#e993bc', duration: 0.6 }, 3)
        .from('.sc-projects__title [data-rise]', { yPercent: 110, stagger: 0.1, duration: 0.5 }, 0)
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="sc-projects" id="club-projects" aria-label="Projects">
      <div className="sc-projects__stage">
        <h2 className="sc-projects__title"><Mask lines={clubData.projects.title} /></h2>
        <div className="sc-track">
          {clubData.projects.items.map((p, i) => (
            <article key={p.title} className="sc-project">
              <img src={clubImages.projects[i % clubImages.projects.length]} alt="" loading="lazy" />
              <h3>{p.title}</h3>
              <ul>{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            </article>
          ))}
          <Link to="/work" className="sc-project sc-project--more"><h3>More projects?</h3><span>Explore</span></Link>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Expertise: three areas, the active one lights up                 */
/* ------------------------------------------------------------------ */
function Expertise() {
  const root = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(DESKTOP, () => {
      const items = gsap.utils.toArray<HTMLElement>('.sc-area', el)
      const photos = gsap.utils.toArray<HTMLElement>('.sc-expertise__photo', el)
      gsap.set(items.slice(1), { opacity: 0.35 })
      gsap.set(photos.slice(1), { yPercent: 105 })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: '+=260%', pin: '.sc-expertise__stage', scrub: 0.8, anticipatePin: 1 },
      })
      items.forEach((item, i) => {
        if (i === 0) return
        tl.to(items[i - 1], { opacity: 0.35, duration: 0.5 }, i)
          .to(item, { opacity: 1, duration: 0.5 }, i)
          .to(photos[i], { yPercent: 0, duration: 1 }, i - 0.2)
          .to(`.sc-area:nth-child(${i + 1}) .sc-area__tags`, { height: 'auto', duration: 0.5 }, i)
          .to(`.sc-area:nth-child(${i}) .sc-area__tags`, { height: 0, duration: 0.5 }, i)
      })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="sc-expertise" aria-label="Expertise">
      <div className="sc-expertise__stage">
        <div className="sc-expertise__left">
          <h2><Mask lines={clubData.expertise.title} /></h2>
          <p>{clubData.expertise.copy}</p>
        </div>
        <div className="sc-expertise__photos">
          {clubImages.expertise.map((src) => <div key={src} className="sc-expertise__photo"><img src={src} alt="" loading="lazy" /></div>)}
        </div>
        <div className="sc-expertise__right">
          {clubData.expertise.areas.map((a, i) => (
            <div key={a.title} className="sc-area">
              <h3>{a.title}</h3>
              <div className="sc-area__tags" style={i === 0 ? { height: 'auto' } : undefined}>
                <ul>{a.tags.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Process: 01-05 cards stack up over one another                   */
/* ------------------------------------------------------------------ */
function Process() {
  const root = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(DESKTOP, () => {
      const cards = gsap.utils.toArray<HTMLElement>('.sc-step', el)
      gsap.set(cards.slice(1), { yPercent: 120, rotate: (i) => (i % 2 ? 3 : -3) })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: '+=420%', pin: '.sc-process__stage', scrub: 0.8, anticipatePin: 1 },
      })
      cards.slice(1).forEach((card, i) => {
        tl.to(card, { yPercent: 0, rotate: 0, duration: 1 }, i)
          .to(cards[i], { scale: 0.94, y: -14, duration: 1 }, i)
      })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="sc-process" aria-label="Method and process">
      <div className="sc-process__stage">
        <h2 className="sc-process__title"><Mask lines={clubData.process.title} /></h2>
        <div className="sc-process__deck">
          {clubData.process.steps.map(([n, title, copy], i) => (
            <article key={n} className={`sc-step ${i % 2 ? 'is-green' : 'is-pink'}`}>
              <h3>{title}</h3>
              <strong>{n}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <div className="sc-process__copy">
          <strong>{clubData.process.lead}</strong>
          <p>{clubData.process.copy}</p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Why choose us: oversized title, three green cards tumble in      */
/* ------------------------------------------------------------------ */
function Why() {
  const root = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(DESKTOP, () => {
      gsap.from('.sc-why__title [data-rise]', { yPercent: 110, stagger: 0.1, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 60%' } })
      gsap.from('.sc-why__card', {
        yPercent: 120, rotate: (i) => [-8, 4, 8][i] ?? 0, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 20%', end: 'center center', scrub: 0.8 },
      })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="sc-why" aria-labelledby="sc-why-title">
      <h2 id="sc-why-title" className="sc-why__title"><Mask lines={clubData.why.title} /></h2>
      <div className="sc-why__cards">
        {clubData.why.cards.map(([title, copy]) => (
          <article key={title} className="sc-why__card"><h3>{title}</h3><p>{copy}</p></article>
        ))}
      </div>
    </section>
  )
}

export default function SocialClubPage() {
  return (
    <main className="sc-page">
      <Header />
      <Opening />
      <Projects />
      <Expertise />
      <Process />
      <Why />
      <SocialFAQ />
      <SocialContact />
    </main>
  )
}
