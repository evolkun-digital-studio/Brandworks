'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './GraphicMotionSection.css'

// Brand tiles for card 02: the real logos (public/images/brands, 400px wide)
// plus Old Flame as a text tile until its logo is ready. Five tiles are
// narrower than the card on tablet and mobile, so the set is listed twice
// (LOGOS); the track then renders LOGOS twice in JSX (not by script), so the
// marquee's -50% loop is seamless.
type Brand = {
  style: CSSProperties
  /** Intrinsic size of the file, so the logo keeps its proportions. */
  logo?: { src: string; alt: string; width: number; height: number }
  /** Per-logo size tweak, so wide wordmarks and the stacked Soko mark read at a similar size. */
  fit?: CSSProperties
  content?: ReactNode
}

const BRANDS: Brand[] = [
  // The thin chrome wordmark washes out on pink; deep plum with a soft brand-pink glow lets the silver read.
  { style: { background: 'radial-gradient(circle at 50% 50%, rgba(224,35,127,.35) 0%, rgba(224,35,127,0) 65%), #2B0A1F' }, logo: { src: '/images/brands/jellystar-logo.png', alt: 'jellystar Clothing logo', width: 400, height: 109 }, fit: { maxWidth: '86%', maxHeight: '64%' } },
  // The FALK mark is solid black, so its tile is brand lime rather than #111.
  { style: { background: '#C8F31D' }, logo: { src: '/images/brands/falk-logo.png', alt: 'FALK Gym Wear logo', width: 400, height: 80 }, fit: { maxWidth: '86%' } },
  { style: { background: '#F6E7D3' }, logo: { src: '/images/brands/soko-logo.png', alt: 'Soko Café & Bakery logo', width: 400, height: 301 }, fit: { maxHeight: '50%' } },
  // The Softly file is its cream script on brand green, so the tile is that green.
  { style: { background: '#A8C199' }, logo: { src: '/images/brands/softly-logo.png', alt: 'Softly Skincare logo', width: 400, height: 88 }, fit: { maxWidth: '92%' } },
  { style: { background: '#2A0E0A', color: '#FF7A3D', font: "400 22px 'Abril Fatface',serif" }, content: <span>Old Flame</span> },
]
const LOGOS = [...BRANDS, ...BRANDS]

const SWATCHES = ['#1E86D6', '#C8F31D', '#EC3D8C', '#2E8B3A']

const STEPS: [string, string][] = [
  ['Colourway: ocean blue', '#1E86D6'],
  ['Colourway: brand lime', '#C8F31D'],
  ['Colourway: hot pink', '#EC3D8C'],
  ['Colourway: forest green', '#2E8B3A'],
]

const TYPE_LINES = ['Brand mark for a coffee studio', 'Identity kit for a streetwear label', 'Wordmark for a fintech app']
const HEADS = ['Launch week', 'Festive campaign', 'Brand refresh']
const OUTS = [
  'Scene 1: logo resolves from brand shapes, 2s. Scene 2: product hero with kinetic headline, 4s.',
  'Cutdowns: 6s bumper for YouTube, 9:16 reel for Instagram, looping GIF for display.',
  'Assets: animated end card, lower-thirds and caption styles that match the brand system.',
]

/** One bottle drawing, used before and after the background wipe in card 04. */
function Product({ defs = false }: { defs?: boolean }) {
  return (
    <svg className="prod" viewBox="0 0 120 170">
      <rect x="47" y="6" width="26" height="22" rx="4" fill="#2b2b2b" />
      <rect x="40" y="26" width="40" height="12" rx="3" fill="#c9a24a" />
      <rect x="14" y="36" width="92" height="130" rx="22" fill="#f4efe6" />
      <rect x="14" y="36" width="92" height="130" rx="22" fill="url(#bwgmGlass)" />
      <rect x="24" y="80" width="72" height="44" rx="6" fill="#111" />
      <text x="60" y="100" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing=".5" fill="#C8F31D" fontFamily="Figtree,sans-serif">SOFTLY</text>
      <text x="60" y="114" textAnchor="middle" fontSize="8" fontWeight="500" letterSpacing="1.2" fill="#ffffff" fontFamily="Figtree,sans-serif">SKINCARE</text>
      {defs && (
        <defs>
          <linearGradient id="bwgmGlass" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".0" />
            <stop offset=".2" stopColor="#fff" stopOpacity=".7" />
            <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
    </svg>
  )
}

/**
 * Graphic & Motion — a five-card bento of animated service previews. Cards
 * fade up as they enter the viewport and only animate while on screen; the
 * typing loops stop on unmount, so StrictMode's double effect never runs
 * two copies. Reduced motion shows each card's first frame, static.
 */
export default function GraphicMotionSection() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cancelled = false
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        fn()
      }, ms)
      timers.add(id)
    }
    // Resolves after `ms`, or never once cancelled, so a stopped loop just ends.
    const wait = (ms: number) => new Promise<void>((resolve) => later(() => { if (!cancelled) resolve() }, ms))

    // Reveal + play only when on screen.
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.bwgm-card'))
    const vis = new WeakMap<Element, boolean>()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        vis.set(e.target, e.isIntersecting)
        e.target.classList.toggle('is-play', e.isIntersecting)
        if (e.isIntersecting && !e.target.classList.contains('is-in')) {
          const idx = cards.indexOf(e.target as HTMLElement)
          later(() => e.target.classList.add('is-in'), (idx % 2) * 140)
        }
      })
    }, { threshold: 0.15 })
    cards.forEach((c) => io.observe(c))

    const whenVisible = (c: Element) => new Promise<void>((resolve) => {
      const chk = () => { if (cancelled) return; if (vis.get(c)) resolve(); else later(chk, 300) }
      chk()
    })
    const type = async (el: HTMLElement, str: string, speed = 45) => {
      el.textContent = ''
      for (let i = 0; i < str.length; i++) { el.textContent += str[i]; await wait(speed) }
    }
    const erase = async (el: HTMLElement, speed = 18) => {
      while (el.textContent?.length) { el.textContent = el.textContent.slice(0, -1); await wait(speed) }
    }

    const ed = root.querySelector<HTMLElement>('.bwgm-edit')!
    const sw = ed.querySelectorAll<HTMLElement>('.bwgm-swatches i')

    if (reduce) {
      root.querySelectorAll<HTMLElement>('[data-bwgm-type] .txt').forEach((e) => { e.textContent = JSON.parse(e.parentElement!.dataset.bwgmType!)[0] })
      root.querySelectorAll<HTMLElement>('[data-bwgm-head]').forEach((e) => { e.textContent = JSON.parse(e.dataset.bwgmHead!)[0] })
      root.querySelectorAll<HTMLElement>('[data-bwgm-out]').forEach((e) => { e.textContent = JSON.parse(e.dataset.bwgmOut!)[0] })
      ed.classList.add('ask'); ed.querySelector('.txt')!.textContent = STEPS[0][0]; ed.style.setProperty('--bag', STEPS[0][1]); sw[0].classList.add('on')
      return () => { cancelled = true; io.disconnect(); timers.forEach(clearTimeout) }
    }

    // Brand-asset prompt loop.
    root.querySelectorAll<HTMLElement>('[data-bwgm-type]').forEach((box) => {
      const lines: string[] = JSON.parse(box.dataset.bwgmType!)
      const txt = box.querySelector<HTMLElement>('.txt')!, go = box.querySelector<HTMLElement>('.bwgm-go')!, card = box.closest('.bwgm-card')!
      let i = 0
      void (async () => { while (!cancelled) { await whenVisible(card)
        await type(txt, lines[i % lines.length], 55); await wait(500)
        go.classList.add('press'); await wait(180); go.classList.remove('press')
        await wait(1900); await erase(txt); await wait(350); i++ } })()
    })

    // Visual-system recolour loop.
    {
      const card = ed.closest('.bwgm-card')!, txt = ed.querySelector<HTMLElement>('.txt')!, go = ed.querySelector<HTMLElement>('.bwgm-go')!
      let i = 0
      void (async () => { while (!cancelled) { await whenVisible(card)
        ed.classList.remove('done'); await wait(400)
        ed.classList.add('paint'); await wait(1300)
        ed.classList.add('ask'); await type(txt, STEPS[i][0], 55); await wait(350)
        go.classList.add('press'); await wait(200); go.classList.remove('press')
        ed.style.setProperty('--bag', STEPS[i][1]); ed.classList.add('done')
        sw.forEach((s, k) => s.classList.toggle('on', k === i))
        await wait(700); ed.classList.remove('ask'); await wait(2400)
        ed.classList.remove('paint'); txt.textContent = ''; i = (i + 1) % STEPS.length } })()
    }

    // Storyboard loop.
    {
      const head = root.querySelector<HTMLElement>('[data-bwgm-head]')!, out = root.querySelector<HTMLElement>('[data-bwgm-out]')!, card = head.closest('.bwgm-card')!
      const heads: string[] = JSON.parse(head.dataset.bwgmHead!), outs: string[] = JSON.parse(out.dataset.bwgmOut!)
      let i = 0
      void (async () => { while (!cancelled) { await whenVisible(card)
        await type(head, heads[i % heads.length], 70); await wait(250)
        await type(out, outs[i % outs.length], 22); await wait(2600)
        await erase(out, 6); await erase(head, 25); await wait(300); i++ } })()
    }

    return () => {
      cancelled = true
      io.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <section ref={rootRef} className="bwgm" id="graphic-motion" aria-labelledby="bwgm-title">
      <div className="bwgm-wrap">
        <header className="bwgm-head">
          <h2 id="bwgm-title" className="section-heading capitalize">Graphic &amp; Motion</h2>
          <p className="section-description bwgm-lede text-lg leading-7">Visual systems built to communicate, move and stay memorable — from campaign graphics to motion-led content.</p>
        </header>

        <div className="bwgm-grid">
          {/* A: Visual systems */}
          <article className="bwgm-card bwgm-card--ink bwgm-a">
            <h3>Visual systems that flex with every format</h3>
            <p className="bwgm-desc">One core design language, adapted into colourways, sizes and variations without losing consistency.</p>
            <div className="bwgm-stage bwgm-edit" aria-hidden="true">
              <div className="bwgm-swatches">
                {SWATCHES.map((c) => <i key={c} style={{ background: c }} />)}
              </div>
              <svg viewBox="0 0 440 400">
                <path d="M560 30 C480 60 400 80 330 92" fill="none" stroke="#3a3a40" strokeWidth="84" strokeLinecap="round" />
                <path d="M560 14 C480 44 400 62 336 72" fill="none" stroke="#55555c" strokeWidth="22" strokeLinecap="round" opacity=".55" />
                <path d="M330 92 C300 98 276 102 256 106" fill="none" stroke="#C98B66" strokeWidth="40" strokeLinecap="round" />
                <path d="M240 96 C252 92 262 100 258 116 C254 128 238 128 232 118" fill="#B87A57" />
                <path className="bwgm-handle" d="M104 214 C110 150 180 104 240 108 C300 112 334 160 342 210" fill="none" strokeWidth="15" strokeLinecap="round" />
                <path className="bwgm-bag" d="M100 210 C160 252 286 252 345 205 C378 280 350 352 282 372 C212 392 140 376 112 336 C82 294 84 246 100 210Z" />
                <path d="M120 250 C180 280 270 280 330 248" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="10" strokeLinecap="round" />
                <path d="M130 330 C190 362 270 360 320 330" fill="none" stroke="#000" strokeOpacity=".14" strokeWidth="18" strokeLinecap="round" />
                <path className="bwgm-brush" d="M120 160 C150 120 200 100 240 112 M100 232 C170 200 270 196 345 222 M96 284 C180 262 280 262 360 284 M110 336 C190 360 270 358 340 330" />
              </svg>
              <div className="bwgm-prompt"><span className="txt" /><span className="bwgm-go">✦ Apply</span></div>
            </div>
          </article>

          {/* B: Brand assets */}
          <article className="bwgm-card bwgm-card--lav bwgm-b">
            <h3>Brand assets that stay memorable</h3>
            <p className="bwgm-desc">Logos, marks and identity kits designed to be recognised at a glance.</p>
            <div className="bwgm-stage bwgm-logos" aria-hidden="true">
              <div className="bwgm-prompt" data-bwgm-type={JSON.stringify(TYPE_LINES)}>
                <span className="txt" /><span className="bwgm-go">✦ Design</span>
              </div>
              <div className="bwgm-track" data-bwgm-dup>
                {[...LOGOS, ...LOGOS].map((brand, i) => (
                  <div key={i} className={brand.logo ? 'bwgm-logo bwgm-logo--img' : 'bwgm-logo'} style={brand.style}>
                    {brand.logo ? <Image {...brand.logo} sizes="120px" style={brand.fit} /> : brand.content}
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* C: Animation */}
          <article className="bwgm-card bwgm-card--lime bwgm-c">
            <h3>Animation that brings brands to life</h3>
            <p className="bwgm-desc">Logo stings, kinetic type and animated explainers that make your identity move.</p>
            <div className="bwgm-stage bwgm-motion" aria-hidden="true">
              <div className="bwgm-screen">
                <span className="bwgm-shape" />
                <div className="bwgm-word" data-bwgm-letters>
                  {'MOVE'.split('').map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.07}s` }}>{c}</span>)}
                </div>
              </div>
              <div className="bwgm-tl">
                <div className="bwgm-trk"><b style={{ left: '4%', width: '62%', background: '#E3FF7A' }} /><em style={{ left: '4%' }} /><em style={{ left: '35%' }} /><em style={{ left: '66%' }} /></div>
                <div className="bwgm-trk"><b style={{ left: '20%', width: '58%', background: '#FFC7AE' }} /><em style={{ left: '20%' }} /><em style={{ left: '78%' }} /></div>
                <div className="bwgm-trk"><b style={{ left: '10%', width: '80%', background: '#D9C6FF' }} /><em style={{ left: '10%' }} /><em style={{ left: '50%' }} /><em style={{ left: '90%' }} /></div>
                <span className="bwgm-head-line" />
              </div>
            </div>
          </article>

          {/* D: Campaign graphics */}
          <article className="bwgm-card bwgm-card--paper bwgm-d">
            <h3>Campaign graphics that stop the scroll</h3>
            <p className="bwgm-desc">Key visuals, ads and launch creatives that carry one clear message across every placement.</p>
            <div className="bwgm-stage bwgm-swap" aria-hidden="true">
              <div className="lyr before">
                <Product defs />
              </div>
              <div className="lyr after">
                <Product />
                <span className="bwgm-spark" style={{ left: '18%', top: '30%' }} />
                <span className="bwgm-spark" style={{ left: '10%', top: '62%', width: 14, height: 14, animationDelay: '.6s' }} />
                <span className="bwgm-spark" style={{ right: '14%', top: '38%', width: 16, height: 16, animationDelay: '1.1s' }} />
              </div>
              <span className="line" />
            </div>
          </article>

          {/* E: Motion-led content */}
          <article className="bwgm-card bwgm-card--violet bwgm-e">
            <h3>Motion-led content for every channel</h3>
            <p className="bwgm-desc">Story-first content plans and assets built for feeds, stories, video and screens.</p>
            <div className="bwgm-stage bwgm-write" aria-hidden="true">
              <div className="bwgm-doc">
                <span className="intro">One campaign idea, cut into motion-led pieces for every channel…</span>
                <div className="big" data-bwgm-head={JSON.stringify(HEADS)} />
                <span className="hl">Hero film → reels, stories &amp; display cuts</span>
                <div className="bwgm-chips"><span>16:9</span><span>9:16</span><span>1:1</span><span>6s bumper</span></div>
              </div>
              <div className="bwgm-pop">
                <small><span style={{ color: '#5B2EE0' }}>✦</span> Storyboard</small>
                <div className="out" data-bwgm-out={JSON.stringify(OUTS)} />
                <div className="bwgm-frames"><i /><i /><i /><i /></div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
