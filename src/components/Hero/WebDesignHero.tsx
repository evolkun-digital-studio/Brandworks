import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Code, Lightbulb, PenTool, Rocket, type LucideIcon } from 'lucide-react'
import './WebDesignHero.css'

/*
 * Web Design & Development: a light, interactive studio scene.
 *
 * A browser (top-centre) holds a mock client site, built twice from the
 * same markup — a pale violet blueprint and the finished design — with a
 * lime sweep revealing one over the other. Around it, live panels:
 * Responsive (device widths), Interface (the H1's size and typeface),
 * Development (the component's code) and a Lighthouse card. Every panel
 * can be dragged by its title bar; positions reset when the slide returns.
 *
 * Whenever the slide comes up, two cursors run a short (~3.5s) film sized to
 * the hero's 4s autoplay: BrandWorks clicks the mock CTA, the design sweeps
 * in, it selects the H1 and the Interface values count up while Dev updates
 * the code. Any interaction stops it; it replays 3s after the pointer
 * leaves. Reduced motion shows the finished design, still.
 */

type Site = {
  url: string
  logo: string
  links: string[]
  btn: string
  eye: string
  h1: string
  p: string
  cta: string
  foot: string[]
  vars: Record<string, string>
  code: string
  title: string
  aa: string
  /** Site-switcher dot colour. */
  dot: string
}

// Client sites shown in the browser. Swap these for real work later.
const SITES: Site[] = [
  {
    url: 'soko-bakery.com', logo: 'Soko', links: ['Menu', 'Story', 'Visit'], btn: 'Order', eye: 'Café & Bakery · Since 2019',
    h1: 'Fresh bakes,<br>slow mornings.', p: 'Sourdough, pastries and coffee made by hand every morning.', cta: 'Explore the menu', foot: ['Breads', 'Pastries', 'Coffee'],
    vars: {
      '--bg': '#F6EBDD', '--fg': '#3B2414', '--acc': '#3B2414', '--accFg': '#F6EBDD',
      '--img': 'radial-gradient(circle at 35% 40%,#F2C07A 0 18%,transparent 19%),radial-gradient(circle at 65% 62%,#E3A55A 0 22%,transparent 23%),linear-gradient(160deg,#E7B98A,#C8692F)',
      '--h1F': '600 28px Fraunces,serif', '--logoF': '400 15px Pacifico,cursive',
    },
    code: 'Soko Café', title: 'Fresh bakes daily', aa: 'Fraunces,serif', dot: '#C8692F',
  },
  {
    url: 'falkgymwear.com', logo: 'FALK', links: ['Shop', 'Train', 'Drops'], btn: 'Cart (0)', eye: 'Gym wear · Drop 07',
    h1: 'TRAIN<br>LOUDER.', p: 'Performance gear cut for heavy days and long sessions.', cta: 'Shop the drop', foot: ['Tees', 'Shorts', 'Layers'],
    vars: {
      '--bg': '#0F0F0F', '--fg': '#ffffff', '--acc': '#C8F31D', '--accFg': '#0b0b0b',
      '--img': 'repeating-linear-gradient(-45deg,#1b1b1b 0 14px,#232323 14px 28px),#1b1b1b',
      '--h1F': 'italic 800 28px Figtree,sans-serif', '--logoF': 'italic 800 15px Figtree,sans-serif',
    },
    code: 'FALK', title: 'Train louder', aa: 'Figtree,sans-serif', dot: '#111111',
  },
  {
    url: 'jellystar.store', logo: 'jellystar', links: ['New in', 'Shop', 'About'], btn: 'Bag', eye: 'Clothing · SS26',
    h1: 'Wear the<br>sparkle.', p: 'Playful everyday pieces in colours that refuse to be quiet.', cta: 'Shop new in', foot: ['Dresses', 'Tops', 'Sets'],
    vars: {
      '--bg': '#FFE3F1', '--fg': '#3A0D25', '--acc': '#E0237F', '--accFg': '#ffffff',
      '--img': 'radial-gradient(circle at 30% 35%,#FF9BCB 0 20%,transparent 21%),radial-gradient(circle at 70% 65%,#FFD84D 0 16%,transparent 17%),linear-gradient(160deg,#FFB8DA,#E0237F)',
      '--h1F': '400 28px Righteous,sans-serif', '--logoF': '400 15px Righteous,sans-serif',
    },
    code: 'jellystar', title: 'Wear the sparkle', aa: 'Righteous,sans-serif', dot: '#E0237F',
  },
]

// Placeholder audit scores until real ones are supplied. Soft hyphens let
// the long labels break inside their narrow columns.
const AUDIT = [
  { label: 'Perfor­mance', score: 98 },
  { label: 'Accessi­bility', score: 100 },
  { label: 'Best practices', score: 100 },
  { label: 'SEO', score: 100 },
]
const RING = 2 * Math.PI * 15

// Which page element each code line points at (by line index).
const LMAP = ['', 'logo', 'h1', 'h1', 'img', '']
const MOTIONS = ['considered', 'playful', 'still']
// Heading typefaces "Aa" cycles through (null = the site's own).
const FONTS: (string | null)[] = [null, '500 28px Figtree,sans-serif', '600 28px Fraunces,serif', '500 28px ui-monospace,monospace', '400 28px Righteous,sans-serif']
const FONT_FAMILIES: (string | null)[] = [null, 'Figtree,sans-serif', 'Fraunces,serif', 'ui-monospace,monospace', 'Righteous,sans-serif']
const DEVICES = [
  { k: '1', bp: '1440', device: 'desktop' },
  { k: '.62', bp: '834', device: 'tablet' },
  { k: '.36', bp: '390', device: 'phone' },
]
const RESTART_MS = 3000

// Process cards in the empty column left of the browser, light and dark alternating.
const PROCESS: { title: string; text: string; Icon: LucideIcon; dark: boolean }[] = [
  { title: 'Strategy', text: 'Ideas that create real impact.', Icon: Lightbulb, dark: false },
  { title: 'Design', text: 'Clear, intentional and human.', Icon: PenTool, dark: true },
  { title: 'Build', text: 'Scalable digital experiences.', Icon: Code, dark: false },
  { title: 'Launch', text: 'Products people love to use.', Icon: Rocket, dark: true },
]

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function siteHTML(s: Site) {
  return (
    `<div class="s-nav"><b class="s-logo" data-l="logo">${s.logo}</b><span class="s-links" data-l="nav">${s.links.map((l) => `<i>${l}</i>`).join('')}</span><span class="s-btn">${s.btn}</span></div>` +
    `<div class="s-hero"><div class="s-copy"><small class="s-eye">${s.eye}</small><span class="s-h1" data-l="h1 · 48 / 0.92">${s.h1}</span><p class="s-p" data-l="body">${s.p}</p><span class="s-cta" data-l="cta">${s.cta} →</span></div><div class="s-img" data-l="image"></div></div>` +
    `<div class="s-foot">${s.foot.map((f) => `<i>${f}</i>`).join('')}</div>`
  )
}

function codeLines(s: Site, size: number, motion = 'considered') {
  return [
    '<span class="k">&lt;Hero</span>',
    `  <span class="a">brand</span>=<span class="s">"${s.code}"</span>`,
    `  <span class="a">title</span>=<span class="s">"${s.title}"</span>`,
    `  <span class="a">size</span>={<span class="n">${size}</span>}`,
    `  <span class="a">motion</span>=<span class="s">"${motion}"</span>`,
    '<span class="k">/&gt;</span>',
  ]
}

const ARROW = 'M2 2 2 21.6 6.9 17.1 10.1 24.7 13.5 23.3 10.4 15.9 17.2 15.9Z'

function WebDesignHero({ active, playing, reducedMotion }: { active: boolean; playing: boolean; reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Read by the running film without re-creating it.
  const runRef = useRef(false)
  const activateRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const $ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = root) => ctx.querySelector<T>(sel)!
    const $$ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = root) => Array.from(ctx.querySelectorAll<T>(sel))
    const ac = new AbortController()
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
      el.addEventListener(type, fn, { signal: ac.signal })

    const stage = $('.web-hero__stage'), rig = $('.wd-rig'), browser = $('.wd-browser'), vp = $('.wd-viewport')
    const wire = $('.wd-wire'), design = $('.wd-design'), url = $('.wd-url__text'), lines = $('.wd-lines'), aa = $('.wd-aa')
    const curD = $('[data-cursor="design"]'), curV = $('[data-cursor="dev"]'), dots = $('.wd-sites')
    const kv: Record<string, HTMLElement> = {}
    $$('.wd-kv b').forEach((b) => { kv[b.dataset.k!] = b })
    const range = $<HTMLInputElement>('.wd-range'), devBtns = $$<HTMLButtonElement>('.wd-device-btn'), bpLabel = $('.wd-card--resp .wd-bp')
    const lhUrl = $('.wd-lh__url'), rings = $$('.wd-ring'), panels = $$('.wd-card')

    let rv = 0, siteIx = 0, size = 48, scrub = false, touched = false, hovering = false, gen = 1, motionIx = 0, fontIx = 0
    let idleT: number | undefined
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
    const compact = () => window.matchMedia('(max-width: 900px)').matches

    const flash = (el: Element) => { el.classList.remove('is-flash'); void (el as HTMLElement).offsetWidth; el.classList.add('is-flash') }
    // Any interaction stops the film; its cursors step aside until it replays.
    const touch = () => {
      touched = true; window.clearTimeout(idleT); gen++
      curD.classList.remove('is-on'); curV.classList.remove('is-on')
    }
    const tween = (from: number, to: number, ms: number, fn: (v: number) => void) => new Promise<void>((resolve) => {
      if (reducedMotion) { fn(to); resolve(); return }
      const t0 = performance.now()
      const f = (now: number) => {
        const k = Math.min((now - t0) / ms, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
        fn(from + (to - from) * e)
        if (k < 1 && !ac.signal.aborted) requestAnimationFrame(f); else resolve()
      }
      requestAnimationFrame(f)
    })

    /* ---- state setters ---- */
    const setDevice = (k: string) => {
      const d = DEVICES.find((x) => x.k === k) ?? DEVICES[0]
      browser.dataset.device = d.device
      devBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.k === k))
      bpLabel.textContent = d.bp
    }
    const setRv = (v: number, line = true) => {
      rv = v; vp.style.setProperty('--rv', `${v}%`); vp.style.setProperty('--sw', line && v > 0.5 && v < 99.5 ? '1' : '0')
    }
    const setCodeLine = (i: number, html: string) => {
      const ln = lines.children[i] as HTMLElement | undefined
      if (!ln) return
      ln.innerHTML = html; flash(ln)
    }
    const setSize = (n: number, flashIt = true) => {
      size = Math.round(n)
      kv.size.textContent = String(size); range.value = String(size)
      $$('.s-h1').forEach((h) => h.style.setProperty('--h1', `${size * 28 / 48}px`))
      $$('.s-h1', wire).forEach((h) => { h.dataset.l = `h1 · ${size} / 0.92` })
      setCodeLine(3, codeLines(SITES[siteIx], size)[3])
      if (flashIt) flash(kv.size)
    }
    const setTrack = (t: number) => { kv.track.textContent = `${Math.round(t)}%`; flash(kv.track) }
    const setMotion = (m: string) => { design.dataset.motion = m; setCodeLine(4, codeLines(SITES[siteIx], size, m)[4]) }
    const fillCode = () => {
      lines.innerHTML = ''
      codeLines(SITES[siteIx], size, MOTIONS[motionIx]).forEach((l, i) => {
        const d = document.createElement('div'); d.innerHTML = l; if (LMAP[i]) d.dataset.t = LMAP[i]; lines.appendChild(d)
      })
    }

    // Lighthouse: the rings fill and the scores count up.
    const runAudit = () => {
      lhUrl.textContent = SITES[siteIx].url
      rings.forEach((ring, i) => {
        const arc = ring.querySelector<SVGCircleElement>('.wd-ring__arc')!, num = ring.querySelector('b')!
        const target = AUDIT[i].score
        void tween(0, target, 1100 + i * 120, (v) => {
          arc.style.strokeDashoffset = String(RING * (1 - v / 100)); num.textContent = String(Math.round(v))
        })
      })
    }

    const loadSite = (ix: number) => {
      siteIx = ix
      const s = SITES[ix]
      ;[wire, design].forEach((el) => {
        el.innerHTML = siteHTML(s)
        Object.keys(s.vars).forEach((k) => { if (el === design || k.endsWith('F')) el.style.setProperty(k, s.vars[k]) })
      })
      url.textContent = s.url; aa.style.fontFamily = s.aa
      design.style.removeProperty('--h1F'); design.style.setProperty('--h1F', s.vars['--h1F'])
      fontIx = 0; motionIx = 0; design.dataset.motion = 'considered'
      kv.track.textContent = '-4%'; kv.lead.textContent = '0.92'
      setSize(48, false); fillCode()
      $$('button', dots).forEach((b, k) => b.classList.toggle('is-on', k === ix))
      runAudit()
    }

    // Positions relative to the stage (the cursors' parent).
    const pt = (el: Element, fx = 0.5, fy = 0.5): [number, number] => {
      const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect()
      return [r.left - s.left + r.width * fx, r.top - s.top + r.height * fy]
    }
    const move = (c: HTMLElement, p: [number, number], ms: number) => { c.style.transitionDuration = `${ms}ms`; c.style.transform = `translate(${p[0]}px,${p[1]}px)` }
    const ripple = (p: [number, number]) => {
      const r = document.createElement('span'); r.className = 'wd-ripple'; r.style.left = `${p[0]}px`; r.style.top = `${p[1]}px`
      stage.appendChild(r); later(() => r.remove(), 700)
    }
    const resetPanels = () => panels.forEach((p) => { p.style.removeProperty('--dx'); p.style.removeProperty('--dy') })

    /* ---- interactions ---- */
    dots.innerHTML = SITES.map((s) => `<button type="button" style="--c:${s.dot}" aria-label="Show ${s.logo}"></button>`).join('')
    $$('button', dots).forEach((b, k) => on(b, 'click', async () => {
      touch(); await tween(rv, 0, 280, (v) => setRv(v)); loadSite(k); await tween(0, 100, 650, (v) => setRv(v))
    }))
    devBtns.forEach((b) => on(b, 'click', () => { touch(); setDevice(b.dataset.k!) }))
    on(range, 'input', () => { touch(); setSize(+range.value) })
    on(aa, 'click', () => {
      touch(); fontIx = (fontIx + 1) % FONTS.length
      design.style.setProperty('--h1F', FONTS[fontIx] ?? SITES[siteIx].vars['--h1F'])
      aa.style.fontFamily = FONT_FAMILIES[fontIx] ?? SITES[siteIx].aa
      flash(aa)
    })
    const clearPeek = () => $$('.is-peek', design).forEach((x) => x.classList.remove('is-peek'))
    on(lines, 'mouseover', (e) => {
      const d = (e.target as Element).closest<HTMLElement>('[data-t]'); clearPeek()
      if (!d) return
      const sel = ({ logo: '.s-logo', h1: '.s-h1', img: '.s-img' } as Record<string, string>)[d.dataset.t!]
      design.querySelector(sel)?.classList.add('is-peek')
      if (rv < 50) setRv(100)
    })
    on(lines, 'mouseleave', clearPeek)
    on(lines, 'click', (e) => {
      if (!(e.target as Element).closest('[data-t="img"]')) return
      touch(); motionIx = (motionIx + 1) % MOTIONS.length; setMotion(MOTIONS[motionIx]); if (rv < 50) setRv(100)
    })
    on($<HTMLButtonElement>('.wd-lh__run'), 'click', () => { touch(); runAudit() })

    // Drag any panel by its title bar.
    $$('.wd-drag').forEach((h) => {
      const p = h.closest<HTMLElement>('.wd-card')!
      let sx = 0, sy = 0, ox = 0, oy = 0
      on(h, 'pointerdown', (e) => {
        touch(); p.classList.add('is-dragging'); h.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY
        ox = parseFloat(p.style.getPropertyValue('--dx')) || 0; oy = parseFloat(p.style.getPropertyValue('--dy')) || 0
      })
      on(h, 'pointermove', (e) => {
        if (!p.classList.contains('is-dragging')) return
        p.style.setProperty('--dx', `${ox + e.clientX - sx}px`); p.style.setProperty('--dy', `${oy + e.clientY - sy}px`)
      })
      const end = () => p.classList.remove('is-dragging')
      on(h, 'pointerup', end); on(h, 'pointercancel', end)
    })

    // Parallax: panels about ±9px one way, the browser about ±4px the other.
    on(rig, 'pointerenter', () => { hovering = true })
    on(stage, 'pointermove', (e) => {
      if (reducedMotion || e.pointerType !== 'mouse') return
      const r = rig.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width - 0.5, my = (e.clientY - r.top) / r.height - 0.5
      const cx = Math.max(-0.5, Math.min(0.5, mx)), cy = Math.max(-0.5, Math.min(0.5, my))
      browser.style.setProperty('--px', `${-cx * 8}px`); browser.style.setProperty('--py', `${-cy * 8}px`)
      panels.forEach((p) => { p.style.setProperty('--px', `${cx * 18}px`); p.style.setProperty('--py', `${cy * 18}px`) })
    })
    on(rig, 'pointerleave', () => {
      hovering = false
      ;[browser, ...panels].forEach((p) => { p.style.setProperty('--px', '0px'); p.style.setProperty('--py', '0px') })
      if (touched) {
        window.clearTimeout(idleT)
        idleT = later(() => { touched = false; if (runRef.current) restart(false) }, RESTART_MS)
      }
    })

    // The pointer across the browser drags the sweep: compare structure and design.
    on(vp, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = vp.getBoundingClientRect(); scrub = true; touch()
      setRv(Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)))
    })
    on(vp, 'pointerleave', () => { scrub = false })

    loadSite(0)
    if (reducedMotion) {
      setRv(100, false)
      return () => { ac.abort(); timers.forEach(clearTimeout) }
    }

    /* ---- the short film (~3.5s) ---- */
    async function demo(g: number, nextSite: boolean) {
      const alive = () => { if (g !== gen || ac.signal.aborted) throw 0 }
      const held = () => hovering || scrub || touched || !runRef.current || document.hidden
      const wait = async (ms: number) => {
        let left = ms
        while (left > 0) {
          await sleep(50); alive()
          if (held()) { while (held()) { await sleep(120); alive() } } else left -= 50
        }
      }
      try {
        setDevice('1')
        if (nextSite) loadSite((siteIx + 1) % SITES.length)
        setRv(0); setSize(48, false); kv.track.textContent = '-4%'
        $$('.is-selected', design).forEach((x) => x.classList.remove('is-selected'))
        await sleep(60); alive()

        if (compact()) {
          // Phones and tablets: the sweep, then the browser steps through devices.
          await wait(250)
          await tween(0, 100, 1000, (v) => setRv(v)); alive()
          for (const k of ['.36', '.62', '1']) { await wait(650); setDevice(k) }
          return
        }

        const rest = pt(rig, 0.98, 1.04)
        move(curD, rest, 0); move(curV, pt($('.wd-card--code'), 1.06, 0.2), 0)
        curD.classList.add('is-on'); curV.classList.add('is-on')
        await wait(60)

        // 1. BrandWorks glides to the CTA and clicks: the design sweeps in.
        const cta = pt($('.s-cta', wire), 0.62, 0.62)
        move(curD, cta, 650); await wait(680)
        ripple(cta); await wait(90)
        await tween(0, 100, 950, (v) => setRv(v)); alive()

        // 2. It selects the H1; Interface counts up while Dev updates the code.
        const h1 = $('.s-h1', design)
        move(curD, pt(h1, 0.98, 0.95), 420); await wait(440)
        h1.classList.add('is-selected')
        move(curV, pt(lines.children[3], 0.62, 0.55), 420)
        void tween(-4, -2, 650, (v) => { kv.track.textContent = `${Math.round(v)}%` }).then(() => flash(kv.track))
        await tween(48, 56, 650, (v) => setSize(v, false)); alive()
        flash(kv.size)
        await wait(450)
        h1.classList.remove('is-selected')
      } catch (e) {
        if (e !== 0) console.error(e)
      }
    }

    function restart(nextSite: boolean) { gen++; void demo(gen, nextSite) }
    activateRef.current = () => {
      touched = false; scrub = false; resetPanels(); setRv(0)
      curD.classList.remove('is-on'); curV.classList.remove('is-on')
      restart(true)
    }

    return () => {
      gen++
      ac.abort()
      window.clearTimeout(idleT)
      timers.forEach(clearTimeout)
    }
  }, [reducedMotion])

  // Fit the process column at its natural size into whichever space is larger:
  // the full stage height left of the code card, or the full width left of the
  // browser above the code card (short stages park the code card in the column).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stage = root.querySelector<HTMLElement>('.web-hero__stage')!
    const list = root.querySelector<HTMLElement>('.wd-process')!
    const rig = root.querySelector<HTMLElement>('.wd-rig')!
    const code = root.querySelector<HTMLElement>('.wd-card--code')!
    const GAP = 28
    const fit = () => {
      if (window.matchMedia('(max-width: 1023px)').matches || !code.offsetParent) {
        list.style.removeProperty('--fit'); list.style.removeProperty('--ptop'); return
      }
      const w = list.offsetWidth, h = list.offsetHeight, sh = stage.clientHeight
      const codeL = rig.offsetLeft + code.offsetLeft, codeT = rig.offsetTop + code.offsetTop
      const beside = Math.min(1, (codeL - GAP) / w, sh / h)
      const above = Math.min(1, (rig.offsetLeft - GAP) / w, (codeT - GAP) / h)
      const k = Math.max(0, beside, above)
      const room = beside >= above ? sh : codeT - GAP
      list.style.setProperty('--fit', String(k))
      list.style.setProperty('--ptop', `${Math.max(0, (room - h * k) / 2)}px`)
    }
    const ro = new ResizeObserver(fit)
    ro.observe(stage); ro.observe(list)
    fit()
    return () => ro.disconnect()
  }, [])

  // Each time the slide comes up: panels home, next site, the film from the top.
  const wasActive = useRef(false)
  useEffect(() => {
    runRef.current = active && playing
    if (active && !wasActive.current) activateRef.current()
    wasActive.current = active
  }, [active, playing])

  return (
    <div ref={rootRef} className="web-hero">
      <div className="wd-paper" aria-hidden="true">
        <div className="wd-paper__dots" />
        <div className="wd-glow wd-glow--lime" />
        <div className="wd-glow wd-glow--lav" />
      </div>

      <div className="web-hero__stage">
        <ol className="wd-process" aria-label="Our process">
          {PROCESS.map(({ title, text, Icon, dark }, i) => (
            <motion.li
              key={title}
              className={`wd-step ${dark ? 'wd-step--dark' : ''}`}
              initial={false}
              animate={active || reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: active ? 0.15 + i * 0.1 : 0, ease: [0.22, 1, 0.36, 1] }}
              whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.25 } }}
            >
              <span className="wd-step__icon" aria-hidden="true"><Icon size={19} strokeWidth={1.75} /></span>
              <span className="wd-step__body">
                <span className="wd-step__title">{title}</span>
                <span className="wd-step__text">{text}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <div className="wd-rig" data-hero-hold>

          <div className="wd-browser" data-device="desktop">
            <div className="wd-chrome">
              <span className="wd-dots"><i /><i /><i /></span>
              <span className="wd-url"><span className="wd-url__lock" aria-hidden="true" /><span className="wd-url__text">soko-bakery.com</span></span>
              <span className="wd-sites" />
            </div>
            <div className="wd-viewport">
              <div className="wd-site wd-wire" aria-hidden="true" />
              <div className="wd-site wd-design" />
              <span className="wd-sweep" aria-hidden="true" />
              <span className="wd-sweep-tag wd-sweep-tag--s" aria-hidden="true">Structure</span>
              <span className="wd-sweep-tag wd-sweep-tag--d" aria-hidden="true">Design</span>
            </div>
          </div>

          {/* The panels float nearer than the browser: they travel further with the pointer. */}
          <div className="wd-depth">
            <div className="wd-card wd-card--code">
              <div className="wd-card__head wd-drag"><span>Development</span><span className="wd-mono">hero.tsx</span></div>
              <div className="wd-lines wd-mono" />
            </div>

            <div className="wd-card wd-card--type">
              <div className="wd-card__head wd-drag"><span>Interface</span><span className="wd-mono">H1</span></div>
              <button type="button" className="wd-aa" title="Click to try another typeface">Aa</button>
              <div className="wd-kv wd-mono">Size <b data-k="size">48</b></div>
              <input className="wd-range" type="range" min="40" max="64" step="1" defaultValue="48" aria-label="Heading size" />
              <div className="wd-kv wd-mono">Track <b data-k="track">-4%</b></div>
              <div className="wd-kv wd-mono">Lead <b data-k="lead">0.92</b></div>
            </div>

            <div className="wd-card wd-card--resp">
              <div className="wd-card__head wd-drag"><span>Responsive</span><span className="wd-mono wd-bp">1440</span></div>
              <div className="wd-devices">
                {DEVICES.map((d) => (
                  <button key={d.k} type="button" data-k={d.k} className={`wd-device-btn ${d.k === '1' ? 'is-on' : ''}`} aria-label={`Preview at ${d.bp}px`}>
                    <span className={`wd-device wd-device--${d.device}`} />
                    <span className="wd-mono">{d.bp}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="wd-card wd-card--lh">
              <div className="wd-card__head wd-drag"><span>Lighthouse</span><span className="wd-mono wd-lh__url">soko-bakery.com</span></div>
              <div className="wd-lh__rings">
                {AUDIT.map((a) => (
                  <div key={a.label} className="wd-ring">
                    <svg viewBox="0 0 36 36" aria-hidden="true">
                      <circle className="wd-ring__track" cx="18" cy="18" r="15" />
                      <circle className="wd-ring__arc" cx="18" cy="18" r="15" strokeDasharray={RING} strokeDashoffset={RING} />
                    </svg>
                    <b className="wd-mono">0</b>
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="wd-lh__run">↻ Run audit</button>
            </div>
          </div>
        </div>

        <div className="wd-cursor" data-cursor="design" aria-hidden="true">
          <svg className="wd-cursor__arrow" viewBox="0 0 24 28"><path d={ARROW} /></svg>
          <span className="wd-cursor__tag">BrandWorks</span>
        </div>
        <div className="wd-cursor wd-cursor--dev" data-cursor="dev" aria-hidden="true">
          <svg className="wd-cursor__arrow" viewBox="0 0 24 28"><path d={ARROW} /></svg>
          <span className="wd-cursor__tag">Dev</span>
        </div>
      </div>
    </div>
  )
}

export default WebDesignHero
