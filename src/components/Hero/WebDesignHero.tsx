import { useEffect, useRef } from 'react'
import './WebDesignHero.css'
/*
 * Web Design & Development: a light, interactive studio scene.
 *
 * A browser (hero columns 1–7) shows a finished mock client site; its top
 * bar holds the site switcher and three device icons (desktop / tablet /
 * phone) that resize the browser so the site reflows. Two live panels
 * overlap it: Interface (the H1's size and typeface) on its right edge and
 * Development (the component's code) on its bottom-left corner. Panels can
 * be dragged by their title bar; positions reset when the slide returns.
 *
 * Layout guard (fitZone): the whole visual zone scales from its top-left so
 * nothing in it enters the headline / subtext / tabs box plus a 32px safe
 * margin, the Development panel stays 40px above the hero's bottom, and the
 * panel never covers the mock CTA (it moves lower instead). It runs on every
 * resize, so every breakpoint is checked.
 *
 * Whenever the slide comes up, two cursors run a short (~3s) film sized to
 * the hero's 4s autoplay: BrandWorks clicks the mock CTA, then selects the
 * H1 and the Interface values count up while Dev updates the code. Any
 * interaction stops it; it replays 3s after the pointer leaves. Reduced
 * motion shows the finished design, still.
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
const FADE_MS = 450
// The layout guard's margins (px): around the hero copy, under the
// Development panel, and between the panel and the mock CTA.
const SAFE = 32
const BOTTOM_GAP = 40
const CTA_GAP = 12

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function siteHTML(s: Site) {
  return (
    `<div class="s-nav"><b class="s-logo">${s.logo}</b><span class="s-links">${s.links.map((l) => `<i>${l}</i>`).join('')}</span><span class="s-btn">${s.btn}</span></div>` +
    `<div class="s-hero"><div class="s-copy"><small class="s-eye">${s.eye}</small><span class="s-h1">${s.h1}</span><p class="s-p">${s.p}</p><span class="s-cta">${s.cta} →</span></div><div class="s-img"></div></div>` +
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

type Box = { l: number; t: number; r: number; b: number }

/** An element's layout box inside an ancestor, ignoring transforms (the
 *  zone's scale, parallax, the hero layers' cross-fade). */
function boxIn(el: HTMLElement, ancestor: HTMLElement): Box {
  let x = 0, y = 0
  let n: HTMLElement | null = el
  while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null }
  return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }
}

const ARROW = 'M2 2 2 21.6 6.9 17.1 10.1 24.7 13.5 23.3 10.4 15.9 17.2 15.9Z'

function WebDesignHero({ active, playing, reducedMotion }: { active: boolean; playing: boolean; reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Read by the running film without re-creating it.
  const runRef = useRef(false)
  const activateRef = useRef<() => void>(() => undefined)
  const wasActive = useRef(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const $ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = root) => ctx.querySelector<T>(sel)!
    const $$ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = root) => Array.from(ctx.querySelectorAll<T>(sel))
    const ac = new AbortController()
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
      el.addEventListener(type, fn, { signal: ac.signal })

    const hero = root.closest<HTMLElement>('.hero')
    const stage = $('.web-hero__stage'), zone = $('.wd-zone'), rig = $('.wd-rig'), browser = $('.wd-browser'), vp = $('.wd-viewport')
    const url = $('.wd-url__text'), lines = $('.wd-lines'), aa = $('.wd-aa'), code = $('.wd-card--code'), type = $('.wd-card--type')
    const curD = $('[data-cursor="design"]'), curV = $('[data-cursor="dev"]'), dots = $('.wd-sites')
    const kv: Record<string, HTMLElement> = {}
    $$('.wd-kv b').forEach((b) => { kv[b.dataset.k!] = b })
    const range = $<HTMLInputElement>('.wd-range'), devBtns = $$<HTMLButtonElement>('.wd-device-btn')
    const panels = $$('.wd-card')

    // The site on show; an outgoing one fades out beside it while switching.
    let site: HTMLElement | null = null
    let siteIx = 0, size = 48, touched = false, hovering = false, gen = 1, motionIx = 0, fontIx = 0
    let idleT: number | undefined, deviceT: number | undefined
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id); return id }
    const compact = () => window.matchMedia('(max-width: 1023px)').matches
    const inSite = (sel: string) => site!.querySelector<HTMLElement>(sel)!

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

    /* ---- layout guard ---- */
    function fitZone() {
      if (!hero || compact()) {
        stage.style.removeProperty('--wd-fit'); code.style.removeProperty('--wd-push')
        return
      }
      // 1. The Development panel sits below the mock's logo, H1, text, CTA
      // and image (rig px, unscaled): only the bottom strip goes under it.
      code.style.setProperty('--wd-push', '0px')
      const panel = boxIn(code, rig)
      const push = Math.max(0, ...['.s-logo', '.s-h1', '.s-p', '.s-cta', '.s-img'].map((sel) => {
        const el = inSite(sel)
        if (!el?.offsetWidth) return 0
        const b = boxIn(el, rig)
        return b.l < panel.r && b.r > panel.l ? Math.ceil(b.b + CTA_GAP - panel.t) : 0
      }))
      code.style.setProperty('--wd-push', `${push}px`)

      // 2. The largest scale, from the breakpoint's, that keeps everything
      // clear of the copy and the panel above the hero's bottom.
      const base = parseFloat(getComputedStyle(stage).getPropertyValue('--wd-scale')) || 1
      const origin = boxIn(stage, hero), rigBox = boxIn(rig, stage)
      const items = [rigBox, ...[type, code].map((p) => {
        const b = boxIn(p, rig)
        return { l: rigBox.l + b.l, t: rigBox.t + b.t, r: rigBox.l + b.r, b: rigBox.t + b.b }
      })]
      const codeB = items[2].b
      const text = ['.hero-caption__pane[data-id="web"] .hero-title', '.hero-caption__pane[data-id="web"] .hero-description', '.hero-switcher-wrap']
        .map((sel) => hero.querySelector<HTMLElement>(sel)).filter((el): el is HTMLElement => !!el)
        .map((el) => boxIn(el, hero))
      const safe = text.length ? {
        l: Math.min(...text.map((b) => b.l)) - SAFE, t: Math.min(...text.map((b) => b.t)) - SAFE,
        r: Math.max(...text.map((b) => b.r)) + SAFE, b: Math.max(...text.map((b) => b.b)) + SAFE,
      } : null
      const clear = (s: number) => items.every((it) => {
        const l = origin.l + it.l * s, t = origin.t + it.t * s, r = origin.l + it.r * s, b = origin.t + it.b * s
        const hits = !!safe && l < safe.r && r > safe.l && t < safe.b && b > safe.t
        return !hits && l >= 0 && r <= hero.offsetWidth
      }) && origin.t + codeB * s <= hero.offsetHeight - BOTTOM_GAP
      let s = base
      while (s > 0.1 && !clear(s)) s = Math.round((s - 0.01) * 100) / 100
      if (!clear(s)) console.warn('[WebDesignHero] the visual zone cannot clear the hero copy at this size')
      stage.style.setProperty('--wd-fit', String(s))
    }
    let fitFrame = 0
    const queueFit = () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitZone) }

    /* ---- state setters ---- */
    const setDevice = (k: string) => {
      const d = DEVICES.find((x) => x.k === k) ?? DEVICES[0]
      if (browser.dataset.device === d.device) return
      browser.dataset.device = d.device
      devBtns.forEach((b) => { const on = b.dataset.k === k; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)) })
      // The mock reflows as the browser finishes resizing.
      window.clearTimeout(deviceT); deviceT = later(queueFit, 750)
    }
    const setCodeLine = (i: number, html: string) => {
      const ln = lines.children[i] as HTMLElement | undefined
      if (!ln) return
      ln.innerHTML = html; flash(ln)
    }
    const setSize = (n: number, flashIt = true) => {
      size = Math.round(n)
      kv.size.textContent = String(size); range.value = String(size)
      inSite('.s-h1').style.setProperty('--h1', `${size * 2.8 / 48}em`)
      setCodeLine(3, codeLines(SITES[siteIx], size)[3])
      if (flashIt) flash(kv.size)
    }
    const setTrack = (t: number) => { kv.track.textContent = `${Math.round(t)}%` }
    const setMotion = (m: string) => { site!.dataset.motion = m; setCodeLine(4, codeLines(SITES[siteIx], size, m)[4]) }
    const fillCode = () => {
      lines.innerHTML = ''
      codeLines(SITES[siteIx], size, MOTIONS[motionIx]).forEach((l, i) => {
        const d = document.createElement('div'); d.innerHTML = l; if (LMAP[i]) d.dataset.t = LMAP[i]; lines.appendChild(d)
      })
    }

    // Cross-fades the outgoing site out and the new one in (opacity + 8px).
    const loadSite = (ix: number, fade: boolean) => {
      siteIx = ix
      const s = SITES[ix], old = site
      site = document.createElement('div')
      site.className = 'wd-site'
      site.innerHTML = siteHTML(s)
      Object.keys(s.vars).forEach((k) => site!.style.setProperty(k, s.vars[k]))
      site.dataset.motion = 'considered'
      vp.appendChild(site)
      if (old && fade && !reducedMotion) {
        site.classList.add('is-entering'); void site.offsetWidth; site.classList.remove('is-entering')
        old.classList.add('is-leaving'); later(() => old.remove(), FADE_MS + 20)
      } else old?.remove()

      url.textContent = s.url; aa.style.fontFamily = s.aa
      fontIx = 0; motionIx = 0
      setTrack(-4); kv.lead.textContent = '0.92'
      setSize(48, false); fillCode()
      $$('button', dots).forEach((b, k) => { b.classList.toggle('is-on', k === ix); b.setAttribute('aria-pressed', String(k === ix)) })
      queueFit()
    }

    // Positions in the zone (the cursors' parent), undoing its scale.
    const pt = (el: Element, fx = 0.5, fy = 0.5): [number, number] => {
      const r = el.getBoundingClientRect(), z = zone.getBoundingClientRect(), k = z.width / zone.offsetWidth || 1
      return [(r.left - z.left + r.width * fx) / k, (r.top - z.top + r.height * fy) / k]
    }
    const move = (c: HTMLElement, p: [number, number], ms: number) => { c.style.transitionDuration = `${ms}ms`; c.style.transform = `translate(${p[0]}px,${p[1]}px)` }
    const ripple = (p: [number, number]) => {
      const r = document.createElement('span'); r.className = 'wd-ripple'; r.style.left = `${p[0]}px`; r.style.top = `${p[1]}px`
      zone.appendChild(r); later(() => r.remove(), 700)
    }
    const resetPanels = () => panels.forEach((p) => { p.style.removeProperty('--dx'); p.style.removeProperty('--dy') })

    /* ---- interactions ---- */
    dots.innerHTML = SITES.map((s) => `<button type="button" style="--c:${s.dot}" aria-label="Show ${s.logo}" aria-pressed="false"></button>`).join('')
    $$('button', dots).forEach((b, k) => on(b, 'click', () => { touch(); if (k !== siteIx) loadSite(k, true) }))
    devBtns.forEach((b) => on(b, 'click', () => { touch(); setDevice(b.dataset.k!) }))
    on(range, 'input', () => { touch(); setSize(+range.value) })
    on(aa, 'click', () => {
      touch(); fontIx = (fontIx + 1) % FONTS.length
      site!.style.setProperty('--h1F', FONTS[fontIx] ?? SITES[siteIx].vars['--h1F'])
      aa.style.fontFamily = FONT_FAMILIES[fontIx] ?? SITES[siteIx].aa
      flash(aa)
    })
    const clearPeek = () => $$('.is-peek', vp).forEach((x) => x.classList.remove('is-peek'))
    on(lines, 'mouseover', (e) => {
      const d = (e.target as Element).closest<HTMLElement>('[data-t]'); clearPeek()
      if (!d) return
      const sel = ({ logo: '.s-logo', h1: '.s-h1', img: '.s-img' } as Record<string, string>)[d.dataset.t!]
      site!.querySelector(sel)?.classList.add('is-peek')
    })
    on(lines, 'mouseleave', clearPeek)
    on(lines, 'click', (e) => {
      if (!(e.target as Element).closest('[data-t="img"]')) return
      touch(); motionIx = (motionIx + 1) % MOTIONS.length; setMotion(MOTIONS[motionIx])
    })

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
        const k = zone.getBoundingClientRect().width / zone.offsetWidth || 1
        p.style.setProperty('--dx', `${ox + (e.clientX - sx) / k}px`); p.style.setProperty('--dy', `${oy + (e.clientY - sy) / k}px`)
      })
      const end = () => p.classList.remove('is-dragging')
      on(h, 'pointerup', end); on(h, 'pointercancel', end)
    })

    // Parallax: panels about ±10px one way, the browser about ±5px the other.
    on(rig, 'pointerenter', () => { hovering = true })
    on(stage, 'pointermove', (e) => {
      if (reducedMotion || e.pointerType !== 'mouse') return
      const r = rig.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width - 0.5, my = (e.clientY - r.top) / r.height - 0.5
      const cx = Math.max(-0.5, Math.min(0.5, mx)), cy = Math.max(-0.5, Math.min(0.5, my))
      browser.style.setProperty('--px', `${-cx * 10}px`); browser.style.setProperty('--py', `${-cy * 10}px`)
      panels.forEach((p) => { p.style.setProperty('--px', `${cx * 20}px`); p.style.setProperty('--py', `${cy * 20}px`) })
    })
    on(rig, 'pointerleave', () => {
      hovering = false
      ;[browser, ...panels].forEach((p) => { p.style.setProperty('--px', '0px'); p.style.setProperty('--py', '0px') })
      if (touched) {
        window.clearTimeout(idleT)
        idleT = later(() => { touched = false; if (runRef.current) restart(false) }, RESTART_MS)
      }
    })

    // Every size the hero takes is checked by the guard.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(queueFit) : null
    if (hero) ro?.observe(hero)
    const caption = hero?.querySelector<HTMLElement>('.hero-content')
    if (caption) ro?.observe(caption)
    void document.fonts?.ready.then(() => { if (!ac.signal.aborted) queueFit() })

    loadSite(0, false)
    // Undone on cleanup: the injected sites and ripples, and the activation,
    // so a re-run (Strict Mode, Fast Refresh) starts the film again.
    const teardown = () => {
      gen++; ac.abort(); ro?.disconnect(); cancelAnimationFrame(fitFrame)
      window.clearTimeout(idleT); timers.forEach(clearTimeout)
      vp.replaceChildren(); $$('.wd-ripple').forEach((r) => r.remove())
      wasActive.current = false
    }
    if (reducedMotion) return teardown

    /* ---- the short film (~3s) ---- */
    async function demo(g: number, nextSite: boolean) {
      const alive = () => { if (g !== gen || ac.signal.aborted) throw 0 }
      const held = () => hovering || touched || !runRef.current || document.hidden
      const wait = async (ms: number) => {
        // Counts real time, not ticks: only time spent held is added back.
        let left = ms, last = performance.now()
        while (left > 0) {
          await sleep(Math.min(50, left)); alive()
          const now = performance.now()
          if (held()) { while (held()) { await sleep(120); alive() } last = performance.now() } else { left -= now - last; last = now }
        }
      }
      try {
        setDevice('1')
        if (nextSite) loadSite((siteIx + 1) % SITES.length, true)
        setSize(48, false); setTrack(-4)
        $$('.is-selected', vp).forEach((x) => x.classList.remove('is-selected'))
        await sleep(60); alive()

        if (compact()) {
          // Phones and tablets: the browser steps through the devices.
          for (const k of ['.36', '.62', '1']) { await wait(700); setDevice(k) }
          return
        }

        move(curD, pt(rig, 0.9, 1.04), 0); move(curV, pt(code, 1.04, 0.2), 0)
        curD.classList.add('is-on'); curV.classList.add('is-on')
        await wait(FADE_MS)

        // 1. BrandWorks glides to the CTA and clicks it.
        const cta = pt(inSite('.s-cta'), 0.62, 0.62)
        move(curD, cta, 600); await wait(630)
        ripple(cta); await wait(260)

        // 2. It selects the H1; Interface counts up (the slider moving with
        // it) while Dev updates the code.
        const h1 = inSite('.s-h1')
        move(curD, pt(h1, 0.98, 0.95), 420); await wait(440)
        h1.classList.add('is-selected')
        move(curV, pt(lines.children[3], 0.62, 0.55), 420)
        void tween(-4, -2, 650, setTrack).then(() => flash(kv.track))
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
      touched = false; resetPanels(); queueFit()
      curD.classList.remove('is-on'); curV.classList.remove('is-on')
      restart(true)
    }

    return teardown
  }, [reducedMotion])

  // Each time the slide comes up: panels home, next site, the film from the top.
  useEffect(() => {
    runRef.current = active && playing
    if (active && !wasActive.current) activateRef.current()
    wasActive.current = active
  }, [active, playing])

  return (
    <div ref={rootRef} className="web-hero">
      <div className="wd-paper" aria-hidden="true">
        <div className="wd-paper__dots" />
      </div>

      <div className="web-hero__stage">
        {/* The visual zone: scaled as one from its top-left (fitZone). */}
        <div className="wd-zone">
          <div className="wd-rig" data-hero-hold>
            <div className="wd-glow" aria-hidden="true" />

            <div className="wd-browser" data-device="desktop">
              <div className="wd-chrome">
                <span className="wd-dots"><i /><i /><i /></span>
                <span className="wd-url"><span className="wd-url__lock" aria-hidden="true" /><span className="wd-url__text">soko-bakery.com</span></span>
                <span className="wd-sites" />
                <span className="wd-devices">
                  {DEVICES.map((d) => (
                    <button key={d.k} type="button" data-k={d.k} className={`wd-device-btn ${d.k === '1' ? 'is-on' : ''}`} aria-pressed={d.k === '1'} aria-label={`Preview at ${d.bp}px (${d.device})`} title={`${d.bp}`}>
                      <span className={`wd-device wd-device--${d.device}`} />
                    </button>
                  ))}
                </span>
              </div>
              <div className="wd-viewport" />
            </div>

            {/* The panels float nearer than the browser: they travel further with the pointer. */}
            <div className="wd-depth">
              <div className="wd-card wd-card--type">
                <div className="wd-card__head wd-drag"><span>Interface</span><span className="wd-mono">H1</span></div>
                <button type="button" className="wd-aa" title="Click to try another typeface">Aa</button>
                <div className="wd-kv wd-mono">Size <b data-k="size">48</b></div>
                <input className="wd-range" type="range" min="40" max="64" step="1" defaultValue="48" aria-label="Heading size" />
                <div className="wd-kv wd-mono">Track <b data-k="track">-4%</b></div>
                <div className="wd-kv wd-mono">Lead <b data-k="lead">0.92</b></div>
              </div>

              <div className="wd-card wd-card--code">
                <div className="wd-card__head wd-drag"><span>Development</span><span className="wd-mono">hero.tsx</span></div>
                <div className="wd-lines wd-mono" />
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
    </div>
  )
}

export default WebDesignHero
