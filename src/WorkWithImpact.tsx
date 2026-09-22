import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import photo4 from './Photo/Photo4.png'
import photo5 from './Photo/Photo5.png'
import photo6 from './Photo/Photo6.png'
import photo7 from './Photo/Photo7.png'
import photo8 from './Photo/Photo8.png'
import { clamp01, lerp, matches, phase, sample, smoothstep, write } from './lib/scrollMotion'

const projects = [
  { image: photo4, label: 'Aerolink', index: '01/06', fixedWidth: 629 },
  { image: photo5, label: 'Riaaj Vintage', index: '02/06', fixedWidth: 629 },
  { image: photo6, label: 'Mr.Rework', index: '03/06', wide: true, fixedWidth: 1282 },
  { image: photo7, label: 'Delhi-6', index: '04/06', fixedWidth: 629 },
  { image: photo8, label: 'Nexa Solutions', index: '05/06', fixedWidth: 629 },
]

type Project = (typeof projects)[number]
const COUNT = projects.length

// ---------------------------------------------------------------------------
// Mode: desktop/tablet get the 3D canvas, phones a lighter one-at-a-time
// variant, reduced motion the original static grid. Only one is rendered.
// ---------------------------------------------------------------------------

type Mode = 'canvas' | 'mobile' | 'static'

const CANVAS_QUERY = '(min-width: 768px)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function currentMode(): Mode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'static'
  if (matches(REDUCED_MOTION)) return 'static'
  return matches(CANVAS_QUERY) ? 'canvas' : 'mobile'
}

function useMode() {
  const [mode, setMode] = useState<Mode>(currentMode)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const queries = [CANVAS_QUERY, REDUCED_MOTION].map((q) => window.matchMedia(q))
    const onChange = () => setMode(currentMode())
    queries.forEach((q) => q.addEventListener('change', onChange))
    return () => queries.forEach((q) => q.removeEventListener('change', onChange))
  }, [])

  return mode
}

type Pose = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  s: number
  o: number
  clipX: number
  clipY: number
}

function mix(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a
  if (t >= 1) return b
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    s: lerp(a.s, b.s, t),
    o: lerp(a.o, b.o, t),
    clipX: lerp(a.clipX, b.clipX, t),
    clipY: lerp(a.clipY, b.clipY, t),
  }
}

// ---------------------------------------------------------------------------
// Cylinder profiles: each row is a value at distance 0, 1, 2, 3+ from the
// centre. x is a fraction of viewport width; rotation turns each card's
// outer edge away from the camera, like boards set around a gentle
// cylinder seen from outside.
// ---------------------------------------------------------------------------

type Profile = {
  x: readonly number[]
  z: readonly number[]
  ry: readonly number[]
  s: readonly number[]
  o: readonly number[]
}

const DESKTOP_PROFILE: Profile = {
  x: [0, 0.5, 0.88, 1.2],
  z: [320, 120, -160, -420],
  ry: [0, 26, 38, 48],
  s: [1, 0.86, 0.76, 0.68],
  o: [1, 1, 0.9, 0],
}

const MOBILE_PROFILE: Profile = {
  x: [0, 0.8, 1.45, 2],
  z: [0, -60, -150, -240],
  ry: [0, 12, 14, 14],
  s: [1, 0.9, 0.82, 0.76],
  o: [1, 0.9, 0.4, 0],
}

// Small per-project vertical offsets (px) that appear as a card leaves the
// centre — keeps the wall editorial rather than a perfectly level row.
const Y_OFFSET = [0, -26, 20, -16, 28, -12]

// Scroll choreography (normalised pinned progress 0 → 1).
const SEQ = {
  openStart: 0.12,
  openEnd: 0.22,
  exploreEnd: 0.45,
  convergeEnd: 0.55,
  titleIn: [0.53, 0.6] as const,
  titleOut: [0.62, 0.67] as const,
  expand: [0.62, 0.7] as const,
  continueStart: 0.7,
  continueEnd: 0.94,
  browse: [0.86, 0.93] as const,
}

/** Where the virtual camera is (fractional project index) at progress p. */
function activeAt(p: number) {
  const mid = Math.min(2, COUNT - 1)
  const pre = mid * 0.8
  if (p < SEQ.openEnd) return 0
  if (p < SEQ.exploreEnd) return lerp(0, pre, (p - SEQ.openEnd) / (SEQ.exploreEnd - SEQ.openEnd))
  if (p < SEQ.convergeEnd) return lerp(pre, mid, phase(p, SEQ.exploreEnd, SEQ.convergeEnd))
  if (p < SEQ.continueStart) return mid
  // Ease out so the last project settles rather than stopping dead.
  const t = clamp01((p - SEQ.continueStart) / (SEQ.continueEnd - SEQ.continueStart))
  return lerp(mid, COUNT - 1, 1 - (1 - t) * (1 - t))
}

const COLLAGE_SCALE = 0.32
const COLLAGE_GAP = 14

// ---------------------------------------------------------------------------
// Shared markup — identical copy and styling to the original section.
// ---------------------------------------------------------------------------

function Kicker() {
  return (
    <div className="flex items-center gap-2 text-neutral-500">
      <span className="site-kicker whitespace-nowrap">Featured Work</span>
      <span
        aria-hidden="true"
        className="-translate-y-2 flex h-[14px] w-[14px] items-center justify-center rounded-[1000px] border-[1.5px] border-neutral-500 text-[7px] leading-none font-medium opacity-100"
      >
        W
      </span>
    </div>
  )
}

const HEADING_CLASS = 'site-display max-w-full text-neutral-900'
const COPY_CLASS = 'site-copy mt-5 w-[540px] max-w-full text-center text-neutral-600'
const COPY =
  'A selection of projects created to build stronger brands, meaningful experiences and measurable results.'

function BrowseLink({ className = '' }: { className?: string }) {
  return (
    <div
      className={`site-kicker flex flex-wrap items-center justify-center gap-2 text-center text-neutral-500 ${className}`}
    >
      Browse our latest projects
      <span aria-hidden="true">&rarr;</span>
      <a href="#" className="font-semibold text-neutral-900 underline underline-offset-4">
        View all work
      </a>
    </div>
  )
}

/**
 * A project as a shallow physical board: two neutral back planes a
 * couple of px behind the face give it an edge that only shows when the
 * card turns. The face clips the media (overflow hidden) and carries the
 * original gradient, number and name.
 */
function ProjectBoard({ project, thick }: { project: Project; thick: boolean }) {
  return (
    <div
      data-card
      className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]"
      style={{
        width: 'var(--cw)',
        height: 'var(--ch)',
        marginLeft: 'calc(var(--cw) / -2)',
        marginTop: 'calc(var(--ch) / -2)',
      }}
    >
      {thick && (
        <>
          <div
            data-edge
            aria-hidden="true"
            className="absolute inset-0 rounded-[8px] bg-neutral-300"
            style={{ transform: 'translateZ(-3px)' }}
          />
          <div
            data-edge
            aria-hidden="true"
            className="absolute inset-0 rounded-[8px] bg-neutral-200"
            style={{ transform: 'translateZ(-1.5px)' }}
          />
        </>
      )}
      <div data-face className="absolute inset-0 overflow-hidden rounded-[8px] bg-neutral-100">
        <img
          data-media
          src={project.image}
          alt={project.label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full scale-110 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        <span
          data-index
          className="absolute top-4 right-4 origin-top-right text-sm font-medium tracking-wide text-white"
        >
          {project.index}
        </span>
        <span
          data-label
          className="absolute bottom-4 left-4 origin-bottom-left text-[20px] font-semibold tracking-[-0.02em] text-white uppercase"
        >
          {project.label}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scroll-driven 3D canvas (desktop/tablet, and the lighter phone variant).
// One requestAnimationFrame loop reads the (Lenis-smoothed) scroll
// position, eases its own copy of it, and writes transforms straight to
// the DOM — no React state changes while scrolling.
// ---------------------------------------------------------------------------

type Els = {
  card: HTMLElement
  face: HTMLElement
  edges: HTMLElement[]
  media: HTMLElement
  index: HTMLElement
  label: HTMLElement
  cache: Record<string, string>
}

function useCanvasLoop(
  desktop: boolean,
  runwayRef: RefObject<HTMLDivElement | null>,
  sectionRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const runway = runwayRef.current
    const section = sectionRef.current
    if (!runway || !section) return

    const q = (sel: string) => section.querySelector<HTMLElement>(sel)
    const frame = q('[data-frame]')
    const stage = q('[data-stage]')
    const world = q('[data-world]')
    const title = q('[data-title]')
    const kicker = q('[data-intro-kicker]')
    const heading = q('[data-intro-heading]')
    const copy = q('[data-intro-copy]')
    const intro = q('[data-intro]')
    const browse = q('[data-browse]')
    const els: Els[] = Array.from(section.querySelectorAll<HTMLElement>('[data-card]')).map((card) => ({
      card,
      face: card.querySelector<HTMLElement>('[data-face]')!,
      edges: Array.from(card.querySelectorAll<HTMLElement>('[data-edge]')),
      media: card.querySelector<HTMLElement>('[data-media]')!,
      index: card.querySelector<HTMLElement>('[data-index]')!,
      label: card.querySelector<HTMLElement>('[data-label]')!,
      cache: {},
    }))
    const shared: Record<string, string> = {}
    const profile = desktop ? DESKTOP_PROFILE : MOBILE_PROFILE
    const fineMouse = desktop && matches('(hover: hover) and (pointer: fine)')

    // ---- Layout metrics (re-read only on resize / font load) ----
    const m = { vw: 0, vh: 0, cw: 0, ch: 0, introBottom: 0 }
    let gridPoses: Pose[] = []

    // The original layout: a 1282px two-column grid 56px under the
    // intro, 580px-tall cards, 03 spanning both columns. Each board is
    // scaled and clipped (clip-path, never width/height) to match it.
    const computeGridPoses = () => {
      const gridW = Math.min(1282, m.vw - 32)
      const colW = (gridW - 24) / 2
      const left = (m.vw - gridW) / 2
      const top = m.introBottom + 56
      const H = 580
      let row = 0
      let col = 0
      return projects.map((project): Pose => {
        if (project.wide && col === 1) {
          row++
          col = 0
        }
        const w = project.wide ? Math.min(project.fixedWidth, gridW) : Math.min(project.fixedWidth, colW)
        const x = left + col * (colW + 24) + w / 2 - m.vw / 2
        const y = top + row * (H + 24) + H / 2 - m.vh / 2
        const aspect = w / H
        let clipX = 0
        let clipY = 0
        let s: number
        if (aspect < m.cw / m.ch) {
          clipX = (m.cw - m.ch * aspect) / 2
          s = H / m.ch
        } else {
          clipY = (m.ch - m.cw / aspect) / 2
          s = w / m.cw
        }
        if (project.wide || col === 1) {
          row++
          col = 0
        } else col++
        return { x, y, z: 0, rx: 0, ry: 0, s, o: 1, clipX, clipY }
      })
    }

    const measure = () => {
      m.vw = section.clientWidth
      m.vh = section.clientHeight
      if (desktop) {
        // The centre board sits 320px towards the camera (×~1.3 through
        // the 1350px perspective), so this base size reads as ~54% of the
        // viewport wide and at most ~65vh tall on screen.
        m.cw = Math.min(m.vw * 0.42, m.vh * 0.5 * 1.55, 760)
        m.ch = m.cw / 1.55
      } else {
        const stageH = stage?.clientHeight ?? m.vh * 0.5
        m.ch = Math.min((m.vw * 0.78) / (629 / 580), stageH * 0.92)
        m.cw = m.ch * (629 / 580)
      }
      section.style.setProperty('--cw', `${m.cw}px`)
      section.style.setProperty('--ch', `${m.ch}px`)
      section.style.setProperty('--collage-h', `${2 * m.ch * COLLAGE_SCALE + COLLAGE_GAP}px`)
      m.introBottom = intro ? intro.offsetTop + intro.offsetHeight : 0
      if (desktop) gridPoses = computeGridPoses()
      for (const e of els) e.cache = {}
      for (const key of Object.keys(shared)) delete shared[key]
    }

    const cylinderPose = (i: number, active: number): Pose => {
      const offset = i - active
      const d = Math.abs(offset)
      const sign = offset < 0 ? -1 : 1
      return {
        x: sign * sample(profile.x, d) * m.vw,
        y: (desktop ? Y_OFFSET[i % Y_OFFSET.length] : 0) * smoothstep(Math.min(d, 1)),
        z: sample(profile.z, d),
        rx: 0,
        ry: sign * sample(profile.ry, d),
        s: sample(profile.s, d),
        o: sample(profile.o, d),
        clipX: 0,
        clipY: 0,
      }
    }

    // Compact flat collage: two centred rows.
    const collagePose = (i: number): Pose => {
      const perRow = Math.ceil(COUNT / 2)
      const row = Math.floor(i / perRow)
      const inRow = row === 0 ? perRow : COUNT - perRow
      const col = i % perRow
      const w = m.cw * COLLAGE_SCALE
      const h = m.ch * COLLAGE_SCALE
      return {
        x: (col - (inRow - 1) / 2) * (w + COLLAGE_GAP),
        y: (row - 0.5) * (h + COLLAGE_GAP),
        z: 0,
        rx: 0,
        ry: 0,
        s: COLLAGE_SCALE,
        o: 1,
        clipX: 0,
        clipY: 0,
      }
    }

    // ---- Input state ----
    let target = 0
    let current = 0
    let initialised = false
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 }
    let imagesPrimed = false
    // The section after Work: sibling of Work's wrapper (the runway's
    // parent). Read from the DOM, since the parent's own ref is not
    // attached yet when this child effect runs.
    const after = runway.parentElement?.nextElementSibling
    const next = after instanceof HTMLElement ? after : null
    let nextState = ''

    const onPointer = (ev: PointerEvent) => {
      mouse.tx = (ev.clientX / window.innerWidth) * 2 - 1
      mouse.ty = (ev.clientY / window.innerHeight) * 2 - 1
    }
    const resetPointer = () => {
      mouse.tx = 0
      mouse.ty = 0
    }
    if (fineMouse) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.documentElement.addEventListener('mouseleave', resetPointer)
      window.addEventListener('blur', resetPointer)
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(section)
    if (intro) ro?.observe(intro)
    let alive = true
    document.fonts?.ready.then(() => alive && measure())

    let raf = 0
    let last = performance.now()

    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      const dt = Math.min(64, now - last)
      last = now
      // Frame-rate independent damping (~0.08 per 60fps frame).
      const k = 1 - Math.pow(1 - 0.08, dt / 16.67)

      const rect = runway.getBoundingClientRect()
      const travel = rect.height - m.vh
      target = travel > 0 ? clamp01(-rect.top / travel) : 0
      if (!initialised) {
        current = target
        initialised = true
      }

      // Next section rises in as the runway ends. Based on the runway's
      // bottom, so it never reads back the transform written here.
      if (next) {
        const r = clamp01((m.vh - rect.bottom) / (m.vh * 0.6))
        const state = r >= 1 ? 'done' : r.toFixed(4)
        if (state !== nextState) {
          nextState = state
          next.style.transform = r >= 1 ? '' : `translate3d(0, ${((1 - r) * 8).toFixed(3)}vh, 0)`
          next.style.opacity = r >= 1 ? '' : `${(0.5 + 0.5 * r).toFixed(3)}`
        }
      }

      // Far away: stop doing work and drop the compositor hints.
      const near = rect.bottom > -m.vh && rect.top < m.vh * 2
      if (!near) {
        if (shared.wc !== 'auto') {
          shared.wc = 'auto'
          for (const e of els) e.card.style.willChange = 'auto'
        }
        current = target
        return
      }
      if (!imagesPrimed) {
        // Boards far along the wall would otherwise lazy-load mid-transition.
        imagesPrimed = true
        section.querySelectorAll<HTMLImageElement>('img[data-media]').forEach((img) => {
          img.loading = 'eager'
        })
      }
      if (shared.wc !== 'transform') {
        shared.wc = 'transform'
        for (const e of els) e.card.style.willChange = 'transform'
      }

      current += (target - current) * k
      if (Math.abs(target - current) < 0.00005) current = target
      mouse.x += (mouse.tx - mouse.x) * 0.08
      mouse.y += (mouse.ty - mouse.y) * 0.08

      const p = current
      const open = desktop ? phase(p, SEQ.openStart, SEQ.openEnd) : 1
      const active = desktop ? activeAt(p) : clamp01(p / 0.92) * (COUNT - 1)
      const converge = desktop ? phase(p, SEQ.exploreEnd, SEQ.convergeEnd) : 0
      const expand = desktop ? phase(p, SEQ.expand[0], SEQ.expand[1]) : 0
      const collage = converge * (1 - expand)
      const exit = desktop ? phase(p, SEQ.continueEnd, 1) : 0

      if (desktop) {
        // Intro recedes: eyebrow + copy slightly before the heading.
        const early = phase(p, 0.1, 0.17)
        const head = phase(p, SEQ.openStart, 0.2)
        if (kicker) write(kicker, shared, 'k', 'opacity', (1 - early).toFixed(3))
        if (copy) {
          write(copy, shared, 'c', 'opacity', (1 - early).toFixed(3))
          write(copy, shared, 'ct', 'transform', `translate3d(0, ${(-12 * early).toFixed(1)}px, 0)`)
        }
        if (heading) {
          write(heading, shared, 'h', 'opacity', (1 - head).toFixed(3))
          write(
            heading,
            shared,
            'ht',
            'transform',
            `translate3d(0, ${(-20 * head).toFixed(1)}px, 0) scale(${(1 - 0.06 * head).toFixed(4)})`,
          )
        }
        if (intro) write(intro, shared, 'iv', 'visibility', head >= 1 ? 'hidden' : 'visible')

        // Clip window opens into the scene, then closes a touch at the exit.
        if (frame) {
          const gridW = Math.min(1282, m.vw - 32)
          const side0 = Math.max(0, Math.min(m.vw * 0.05, (m.vw - gridW) / 2 - 12))
          const topPct = lerp(8, 0, open) + 4 * exit
          const botPct = lerp(2, 0, open) + 4 * exit
          const sidePx = lerp(side0, 0, open) + m.vw * 0.03 * exit
          const radius = lerp(20, 0, open) + 20 * exit
          write(
            frame,
            shared,
            'clip',
            'clip-path',
            `inset(${topPct.toFixed(2)}% ${sidePx.toFixed(1)}px ${botPct.toFixed(2)}% ${sidePx.toFixed(1)}px round ${radius.toFixed(1)}px)`,
          )
        }
        if (stage) write(stage, shared, 'persp', 'perspective', `${lerp(1000, 1350, open).toFixed(0)}px`)
        if (world) {
          write(
            world,
            shared,
            'world',
            'transform',
            `translate3d(0, ${(-4 * exit).toFixed(3)}vh, 0) scale(${(1 - 0.04 * exit).toFixed(4)})`,
          )
        }

        // Typographic moment behind the collage.
        if (title) {
          const tin = phase(p, SEQ.titleIn[0], SEQ.titleIn[1])
          const tout = phase(p, SEQ.titleOut[0], SEQ.titleOut[1])
          const v = tin * (1 - tout)
          write(title, shared, 'to', 'opacity', v.toFixed(3))
          write(title, shared, 'tv', 'visibility', v <= 0.001 ? 'hidden' : 'visible')
          write(title, shared, 'tf', 'filter', v >= 0.999 ? 'none' : `blur(${(8 * (1 - v)).toFixed(2)}px)`)
          write(title, shared, 'tt', 'transform', `translate3d(0, ${(30 * (1 - tin) - 20 * tout).toFixed(1)}px, 0)`)
        }

        if (browse) {
          const b = phase(p, SEQ.browse[0], SEQ.browse[1])
          write(browse, shared, 'bo', 'opacity', b.toFixed(3))
          write(browse, shared, 'bv', 'visibility', b <= 0.001 ? 'hidden' : 'visible')
        }
      }

      for (let i = 0; i < els.length; i++) {
        const e = els[i]
        let pose = cylinderPose(i, active)
        if (desktop && open < 1 && gridPoses[i]) pose = mix(gridPoses[i], pose, open)
        if (collage > 0) pose = mix(pose, collagePose(i), collage)

        const offset = i - active
        // Only the board nearest the camera gets the full interaction.
        const centre = Math.max(0, 1 - Math.abs(offset)) * (1 - collage) * open
        let { rx, ry } = pose
        if (fineMouse) {
          ry += mouse.x * 5 * centre
          rx += -mouse.y * 4 * centre
        }
        rx *= 1 - exit
        ry *= 1 - exit

        const hidden = pose.o <= 0.01
        write(e.card, e.cache, 'v', 'visibility', hidden ? 'hidden' : 'visible')
        if (hidden) continue
        write(
          e.card,
          e.cache,
          't',
          'transform',
          `translate3d(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px, ${pose.z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${pose.s.toFixed(4)})`,
        )
        write(e.card, e.cache, 'o', 'opacity', pose.o >= 0.999 ? '1' : pose.o.toFixed(3))

        const clip =
          pose.clipX > 0.1 || pose.clipY > 0.1
            ? `inset(${pose.clipY.toFixed(1)}px ${pose.clipX.toFixed(1)}px round ${(8 / pose.s).toFixed(1)}px)`
            : 'none'
        write(e.face, e.cache, 'fc', 'clip-path', clip)
        for (let j = 0; j < e.edges.length; j++) write(e.edges[j], e.cache, `ec${j}`, 'clip-path', clip)

        // Media drifts against the card's travel (≤ ~4%, inside its 110% cover).
        const drift = Math.max(-1.4, Math.min(1.4, offset)) * (desktop ? 3 : 1.5) * (1 - collage)
        write(e.media, e.cache, 'm', 'transform', `translate3d(${(-drift).toFixed(2)}%, 0, 0) scale(1.1)`)

        // Number + name stay on the visible corners (through the grid
        // clip) at a steady size, trailing the board by a few px.
        const cs = desktop ? lerp(1 / pose.s, 1, open) : 1
        const trail = Math.max(-1, Math.min(1, offset)) * (desktop ? 10 : 4)
        write(
          e.index,
          e.cache,
          'i',
          'transform',
          `translate3d(${(-pose.clipX + trail).toFixed(1)}px, ${pose.clipY.toFixed(1)}px, 0) scale(${cs.toFixed(4)})`,
        )
        write(
          e.label,
          e.cache,
          'l',
          'transform',
          `translate3d(${(pose.clipX + trail).toFixed(1)}px, ${(-pose.clipY).toFixed(1)}px, 0) scale(${cs.toFixed(4)})`,
        )
      }
    }

    // First pose synchronously, so boards never paint unplaced.
    render(performance.now())

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
      if (fineMouse) {
        window.removeEventListener('pointermove', onPointer)
        document.documentElement.removeEventListener('mouseleave', resetPointer)
        window.removeEventListener('blur', resetPointer)
      }
      if (next) {
        next.style.transform = ''
        next.style.opacity = ''
      }
    }
  }, [desktop, runwayRef, sectionRef])
}

const GIANT_CLASS =
  'site-display block whitespace-nowrap text-neutral-900'

function WorkCanvas() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  useCanvasLoop(true, runwayRef, sectionRef)

  return (
    // Runway: its height is the pinned scroll distance (shorter on tablets).
    <div ref={runwayRef} className="relative h-[450vh] lg:h-[600vh]">
      <section
        ref={sectionRef}
        aria-labelledby="featured-work-heading"
        className="sticky top-0 h-screen overflow-hidden bg-white"
      >
        {/* Typographic moment behind the collage. Decorative — the real
           heading is the H2 in the intro. */}
        <div
          data-title
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-0 flex flex-col items-center justify-center opacity-0"
        >
          <span className={GIANT_CLASS}>Work</span>
          <span className="block" style={{ height: 'calc(var(--collage-h) + 56px)' }} />
          <span className={GIANT_CLASS}>With impact</span>
        </div>

        {/* Clip window → perspective stage → world (exit scale) → boards. */}
        <div data-frame className="absolute inset-0 z-10">
          <div data-stage className="absolute inset-0" style={{ perspective: '1000px' }}>
            <div data-world className="absolute inset-0 [transform-style:preserve-3d]">
              {projects.map((project) => (
                <ProjectBoard key={project.label} project={project} thick />
              ))}
            </div>
          </div>
        </div>

        <div
          data-intro
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-16 text-center sm:pt-20"
        >
          <div data-intro-kicker>
            <Kicker />
          </div>
          <h2 data-intro-heading id="featured-work-heading" className={`${HEADING_CLASS} mt-4`}>
            Work with impact
          </h2>
          <p data-intro-copy className={COPY_CLASS}>
            {COPY}
          </p>
        </div>

        <div data-browse className="invisible absolute inset-x-0 bottom-[6vh] z-20 px-4 opacity-0">
          <BrowseLink />
        </div>
      </section>
    </div>
  )
}

function WorkMobile() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  useCanvasLoop(false, runwayRef, sectionRef)

  return (
    // Short runway (~60vh of scroll per project) on native touch scrolling.
    <div ref={runwayRef} className="relative" style={{ height: `${100 + (COUNT - 1) * 60}vh` }}>
      <section
        ref={sectionRef}
        aria-labelledby="featured-work-heading"
        className="sticky top-0 flex h-screen flex-col items-center overflow-hidden bg-white pt-16 pb-10 text-center"
      >
        <div data-intro className="flex w-full flex-col items-center px-4">
          <Kicker />
          <h2 id="featured-work-heading" className={`${HEADING_CLASS} mt-4`}>
            Work with impact
          </h2>
          <p className={COPY_CLASS}>{COPY}</p>
        </div>

        <div data-stage className="relative mt-8 w-full flex-1" style={{ perspective: '1100px' }}>
          <div data-world className="absolute inset-0 [transform-style:preserve-3d]">
            {projects.map((project) => (
              <ProjectBoard key={project.label} project={project} thick={false} />
            ))}
          </div>
        </div>

        <BrowseLink className="mt-6 px-4" />
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reduced motion: the original section, unchanged.
// ---------------------------------------------------------------------------

function WorkStatic() {
  return (
    <section
      aria-labelledby="featured-work-heading"
      className="flex flex-col items-center bg-white px-4 pt-16 pb-20 text-center sm:pt-20 sm:pb-28"
    >
      <Kicker />
      <h2 id="featured-work-heading" className={`${HEADING_CLASS} mt-4`}>
        Work with impact
      </h2>
      <p className={COPY_CLASS}>{COPY}</p>

      <div className="mt-14 grid w-[1282px] max-w-full grid-cols-1 gap-[24px] opacity-100 sm:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.label}
            style={project.fixedWidth ? { width: `${project.fixedWidth}px` } : undefined}
            className={`relative h-[580px] max-w-full overflow-hidden rounded-[8px] ${
              project.fixedWidth ? '' : 'w-full'
            } ${project.wide ? 'sm:col-span-2' : ''}`}
          >
            <img
              src={project.image}
              alt={project.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-[8px] object-cover opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
            <span className="absolute top-4 right-4 text-sm font-medium tracking-wide text-white">
              {project.index}
            </span>
            <span className="absolute bottom-4 left-4 text-[20px] font-semibold tracking-[-0.02em] text-white uppercase">
              {project.label}
            </span>
          </div>
        ))}
      </div>

      <BrowseLink className="mt-10 w-[1282px] max-w-full" />
    </section>
  )
}

function Work() {
  const mode = useMode()

  // The wrapper's next sibling is the section after Work, which the
  // canvas eases in as the pinned sequence ends.
  return (
    <div>
      {mode === 'canvas' ? (
        <WorkCanvas key="canvas" />
      ) : mode === 'mobile' ? (
        <WorkMobile key="mobile" />
      ) : (
        <WorkStatic />
      )}
    </div>
  )
}

export default Work
