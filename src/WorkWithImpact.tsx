import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import photo4 from './Photo/Photo4.png'
import photo5 from './Photo/Photo5.png'
import photo6 from './Photo/Photo6.png'
import photo7 from './Photo/Photo7.png'
import photo8 from './Photo/Photo8.png'
import { clamp01, lerp, matches, phase, sample, smoothstep, write } from './lib/scrollMotion'

const projects = [
  { image: photo4, label: 'Aerolink',   fixedWidth: 629 },
  { image: photo5, label: 'Riaaj Vintage', fixedWidth: 629 },
  { image: photo6, label: 'Mr.Rework',  wide: true, fixedWidth: 1282 },
  { image: photo7, label: 'Delhi-6', fixedWidth: 629 },
  { image: photo8, label: 'Nexa Solutions',fixedWidth: 629 },
]

type Project = (typeof projects)[number]
const COUNT = projects.length

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

    const queries = [CANVAS_QUERY, REDUCED_MOTION].map((query) => window.matchMedia(query))
    const onChange = () => setMode(currentMode())

    queries.forEach((query) => query.addEventListener('change', onChange))

    return () => {
      queries.forEach((query) => query.removeEventListener('change', onChange))
    }
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

const Y_OFFSET = [0, -26, 20, -16, 28, -12]

const SEQ = {
  openStart: 0.08,
  openEnd: 0.16,
  scrollEnd: 0.68,
  lastHoldEnd: 0.74,
  convergeEnd: 0.84,
  titleIn: [0.79, 0.88] as const,
  exitStart: 0.98,
}

function activeAt(p: number) {
  if (p <= SEQ.openEnd) return 0

  if (p < SEQ.scrollEnd) {
    const t = clamp01((p - SEQ.openEnd) / (SEQ.scrollEnd - SEQ.openEnd))
    return lerp(0, COUNT - 1, t)
  }

  return COUNT - 1
}

const COLLAGE_SCALE = 0.32
const COLLAGE_GAP = 16

const HEADING_CLASS = 'site-display max-w-full font-primary text-neutral-900'
const COPY_CLASS = 'site-copy mt-5 w-[540px] max-w-full text-center font-secondary text-neutral-600'
const COPY =
  'A selection of projects created to build stronger brands, meaningful experiences and measurable results.'

const GIANT_CLASS =
  'block whitespace-nowrap font-primary text-[clamp(42px,4vw,64px)] font-normal leading-[0.95] tracking-[-0.045em] text-neutral-900'

function BrowseLink({ className = '' }: { className?: string }) {
  return (
    <div className={`site-kicker flex flex-wrap items-center justify-center gap-2 text-center text-neutral-500 ${className}`}>
      Browse our latest projects
      <span aria-hidden="true">&rarr;</span>
      <a href="#" className="font-semibold text-neutral-900 underline underline-offset-4">
        View all work
      </a>
    </div>
  )
}

function ProjectBoard({ project, thick }: { project: Project; thick: boolean }) {
  return (
    <div
      data-card
      className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
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
          data-label
          className="absolute bottom-4 left-4 origin-bottom-left text-[20px] font-semibold uppercase tracking-[-0.02em] text-white"
        >
          {project.label}
        </span>
      </div>
    </div>
  )
}

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

    const q = (selector: string) => section.querySelector<HTMLElement>(selector)

    const frame = q('[data-frame]')
    const stage = q('[data-stage]')
    const world = q('[data-world]')
    const title = q('[data-title]')
    const kicker = q('[data-intro-kicker]')
    const heading = q('[data-intro-heading]')
    const copy = q('[data-intro-copy]')
    const intro = q('[data-intro]')

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

    const m = {
      vw: 0,
      vh: 0,
      cw: 0,
      ch: 0,
      introBottom: 0,
    }

    let gridPoses: Pose[] = []

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

        const w = project.wide
          ? Math.min(project.fixedWidth, gridW)
          : Math.min(project.fixedWidth, colW)

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
        } else {
          col++
        }

        return {
          x,
          y,
          z: 0,
          rx: 0,
          ry: 0,
          s,
          o: 1,
          clipX,
          clipY,
        }
      })
    }

    const measure = () => {
      m.vw = section.clientWidth
      m.vh = section.clientHeight

      if (desktop) {
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

      if (desktop) {
        gridPoses = computeGridPoses()
      }

      for (const e of els) {
        e.cache = {}
      }

      for (const key of Object.keys(shared)) {
        delete shared[key]
      }
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

    let target = 0
    let current = 0
    let initialised = false
    let imagesPrimed = false

    const mouse = {
      tx: 0,
      ty: 0,
      x: 0,
      y: 0,
    }

    const after = runway.parentElement?.nextElementSibling
    const next = after instanceof HTMLElement ? after : null

    let nextState = ''

    const onPointer = (event: PointerEvent) => {
      mouse.tx = (event.clientX / window.innerWidth) * 2 - 1
      mouse.ty = (event.clientY / window.innerHeight) * 2 - 1
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

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null

    ro?.observe(section)

    if (intro) {
      ro?.observe(intro)
    }

    let alive = true

    document.fonts?.ready.then(() => {
      if (alive) {
        measure()
      }
    })

    let raf = 0
    let last = performance.now()

    const render = (now: number) => {
      raf = requestAnimationFrame(render)

      const dt = Math.min(64, now - last)
      last = now

      const k = 1 - Math.pow(1 - 0.08, dt / 16.67)

      const rect = runway.getBoundingClientRect()
      const travel = rect.height - m.vh

      target = travel > 0 ? clamp01(-rect.top / travel) : 0

      if (!initialised) {
        current = target
        initialised = true
      }

      if (next) {
        const r = clamp01((m.vh - rect.bottom) / (m.vh * 0.6))
        const state = r >= 1 ? 'done' : r.toFixed(4)

        if (state !== nextState) {
          nextState = state

          next.style.transform =
            r >= 1
              ? ''
              : `translate3d(0, ${((1 - r) * 8).toFixed(3)}vh, 0)`

          next.style.opacity =
            r >= 1
              ? ''
              : `${(0.5 + 0.5 * r).toFixed(3)}`
        }
      }

      const near = rect.bottom > -m.vh && rect.top < m.vh * 2

      if (!near) {
        if (shared.wc !== 'auto') {
          shared.wc = 'auto'

          for (const e of els) {
            e.card.style.willChange = 'auto'
          }
        }

        current = target
        return
      }

      if (!imagesPrimed) {
        imagesPrimed = true

        section.querySelectorAll<HTMLImageElement>('img[data-media]').forEach((img) => {
          img.loading = 'eager'
        })
      }

      if (shared.wc !== 'transform') {
        shared.wc = 'transform'

        for (const e of els) {
          e.card.style.willChange = 'transform'
        }
      }

      current += (target - current) * k

      if (Math.abs(target - current) < 0.00005) {
        current = target
      }

      mouse.x += (mouse.tx - mouse.x) * 0.08
      mouse.y += (mouse.ty - mouse.y) * 0.08

      const p = current

      const open = desktop
        ? phase(p, SEQ.openStart, SEQ.openEnd)
        : 1

      const active = desktop
        ? activeAt(p)
        : clamp01(p / 0.92) * (COUNT - 1)

      const converge = desktop
        ? phase(p, SEQ.lastHoldEnd, SEQ.convergeEnd)
        : 0

      const collage = converge

      const exit = desktop
        ? phase(p, SEQ.exitStart, 1)
        : 0

      if (desktop) {
        const early = phase(p, 0.07, 0.14)
        const head = phase(p, SEQ.openStart, SEQ.openEnd)

        if (kicker) {
          write(kicker, shared, 'k', 'opacity', (1 - early).toFixed(3))
        }

        if (copy) {
          write(copy, shared, 'c', 'opacity', (1 - early).toFixed(3))

          write(
            copy,
            shared,
            'ct',
            'transform',
            `translate3d(0, ${(-12 * early).toFixed(1)}px, 0)`,
          )
        }

        if (heading) {
          write(heading, shared, 'h', 'opacity', (1 - head).toFixed(3))

          write(
            heading,
            shared,
            'ht',
            'transform',
            `translate3d(0, ${(-20 * head).toFixed(1)}px, 0) scale(${(
              1 -
              0.06 * head
            ).toFixed(4)})`,
          )
        }

        if (intro) {
          write(
            intro,
            shared,
            'iv',
            'visibility',
            head >= 1 ? 'hidden' : 'visible',
          )
        }

        if (frame) {
          const gridW = Math.min(1282, m.vw - 32)

          const side0 = Math.max(
            0,
            Math.min(
              m.vw * 0.05,
              (m.vw - gridW) / 2 - 12,
            ),
          )

          const topPct = lerp(8, 0, open) + 3 * exit
          const botPct = lerp(2, 0, open) + 3 * exit
          const sidePx = lerp(side0, 0, open) + m.vw * 0.02 * exit
          const radius = lerp(20, 0, open) + 18 * exit

          write(
            frame,
            shared,
            'clip',
            'clip-path',
            `inset(${topPct.toFixed(2)}% ${sidePx.toFixed(1)}px ${botPct.toFixed(2)}% ${sidePx.toFixed(1)}px round ${radius.toFixed(1)}px)`,
          )
        }

        if (stage) {
          write(
            stage,
            shared,
            'persp',
            'perspective',
            `${lerp(1000, 1350, open).toFixed(0)}px`,
          )
        }

        if (world) {
          write(
            world,
            shared,
            'world',
            'transform',
            `translate3d(0, ${(-3 * exit).toFixed(3)}vh, 0) scale(${(
              1 -
              0.025 * exit
            ).toFixed(4)})`,
          )
        }

        if (title) {
          const tin = phase(
            p,
            SEQ.titleIn[0],
            SEQ.titleIn[1],
          )

          const v = tin * (1 - exit)

          write(
            title,
            shared,
            'to',
            'opacity',
            v.toFixed(3),
          )

          write(
            title,
            shared,
            'tv',
            'visibility',
            v <= 0.001
              ? 'hidden'
              : 'visible',
          )

          write(
            title,
            shared,
            'tf',
            'filter',
            v >= 0.999
              ? 'none'
              : `blur(${(6 * (1 - v)).toFixed(2)}px)`,
          )

          write(
            title,
            shared,
            'tt',
            'transform',
            `translate3d(0, ${(22 * (1 - tin) - 10 * exit).toFixed(1)}px, 0)`,
          )
        }
      }

      for (let i = 0; i < els.length; i++) {
        const e = els[i]

        let pose = cylinderPose(i, active)

        if (desktop && open < 1 && gridPoses[i]) {
          pose = mix(
            gridPoses[i],
            pose,
            open,
          )
        }

        if (collage > 0) {
          pose = mix(
            pose,
            collagePose(i),
            collage,
          )
        }

        const offset = i - active

        const centre =
          Math.max(
            0,
            1 - Math.abs(offset),
          ) *
          (1 - collage) *
          open

        let { rx, ry } = pose

        if (fineMouse) {
          ry += mouse.x * 5 * centre
          rx += -mouse.y * 4 * centre
        }

        rx *= 1 - exit
        ry *= 1 - exit

        const hidden = pose.o <= 0.01

        write(
          e.card,
          e.cache,
          'v',
          'visibility',
          hidden
            ? 'hidden'
            : 'visible',
        )

        if (hidden) continue

        write(
          e.card,
          e.cache,
          't',
          'transform',
          `translate3d(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px, ${pose.z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${pose.s.toFixed(4)})`,
        )

        write(
          e.card,
          e.cache,
          'o',
          'opacity',
          pose.o >= 0.999
            ? '1'
            : pose.o.toFixed(3),
        )

        const clip =
          pose.clipX > 0.1 ||
          pose.clipY > 0.1
            ? `inset(${pose.clipY.toFixed(1)}px ${pose.clipX.toFixed(1)}px round ${(8 / pose.s).toFixed(1)}px)`
            : 'none'

        write(
          e.face,
          e.cache,
          'fc',
          'clip-path',
          clip,
        )

        for (let j = 0; j < e.edges.length; j++) {
          write(
            e.edges[j],
            e.cache,
            `ec${j}`,
            'clip-path',
            clip,
          )
        }

        const drift =
          Math.max(
            -1.4,
            Math.min(1.4, offset),
          ) *
          (desktop ? 3 : 1.5) *
          (1 - collage)

        write(
          e.media,
          e.cache,
          'm',
          'transform',
          `translate3d(${(-drift).toFixed(2)}%, 0, 0) scale(1.1)`,
        )

        const cs = desktop
          ? lerp(
              1 / pose.s,
              1,
              open,
            )
          : 1

        const trail =
          Math.max(
            -1,
            Math.min(1, offset),
          ) *
          (desktop ? 10 : 4) *
          (1 - collage)

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

function WorkCanvas() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useCanvasLoop(true, runwayRef, sectionRef)

  return (
    <div ref={runwayRef} className="relative h-[500vh] lg:h-[650vh]">
      <section
        ref={sectionRef}
        aria-labelledby="featured-work-heading"
        className="sticky top-0 h-screen overflow-hidden bg-white"
      >
        <div
          data-title
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-0 z-0 flex flex-col items-center justify-center opacity-0"
        >
          <span className={GIANT_CLASS}>Work</span>

          <span
            className="block"
            style={{
              height: 'calc(var(--collage-h) + 52px)',
            }}
          />

          <span className={GIANT_CLASS}>With impact</span>
        </div>

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
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-16 text-center sm:pt-20 lg:pt-24"
        >
          <div data-intro-kicker />

          <h2
            data-intro-heading
            id="featured-work-heading"
            className={`${HEADING_CLASS} mt-4`}
          >
            Work with impact
          </h2>

          <p data-intro-copy className={COPY_CLASS}>
            {COPY}
          </p>
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
    <div
      ref={runwayRef}
      className="relative"
      style={{
        height: `${100 + (COUNT - 1) * 60}vh`,
      }}
    >
      <section
        ref={sectionRef}
        aria-labelledby="featured-work-heading"
        className="sticky top-0 flex h-screen flex-col items-center overflow-hidden bg-white pb-10 pt-14 text-center sm:pt-16"
      >
        <div data-intro className="flex w-full flex-col items-center px-4">
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

function WorkStatic() {
  return (
    <section
      aria-labelledby="featured-work-heading"
      className="flex flex-col items-center bg-white px-4 pb-20 pt-16 text-center sm:pb-28 sm:pt-20"
    >
      <h2 id="featured-work-heading" className={`${HEADING_CLASS} mt-4`}>
        Work with impact
      </h2>

      <p className={COPY_CLASS}>{COPY}</p>

      <div className="mt-14 grid w-[1282px] max-w-full grid-cols-1 gap-6 opacity-100 sm:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.label}
            style={project.fixedWidth ? { width: `${project.fixedWidth}px` } : undefined}
            className={`relative h-[420px] max-w-full overflow-hidden rounded-[8px] sm:h-[500px] lg:h-[580px] ${
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
            <span className="absolute bottom-4 left-4 text-[16px] font-semibold uppercase tracking-[-0.02em] text-white sm:text-[18px] lg:text-[20px]">
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
