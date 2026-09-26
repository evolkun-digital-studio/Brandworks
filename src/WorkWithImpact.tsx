import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { RefObject } from 'react'



import photo4 from './Photo/Photo4.png'

import photo5 from './Photo/Photo5.png'

import photo6 from './Photo/Photo6.png'

import photo7 from './Photo/Photo7.png'

import photo8 from './Photo/Photo8.png'



import {

  clamp01,

  lerp,

  matches,

  phase,

  sample,

  smoothstep,

  write,

} from './lib/scrollMotion'



const projects = [

  { image: photo4, label: 'Aerolink', fixedWidth: 629 },

  { image: photo5, label: 'Riaaj Vintage', fixedWidth: 629 },

  { image: photo6, label: 'Mr.Rework', wide: true, fixedWidth: 1282 },

  { image: photo7, label: 'Delhi-6', fixedWidth: 629 },

  { image: photo8, label: 'Nexa Solutions', fixedWidth: 629 },

]



type Project = (typeof projects)[number]

const COUNT = projects.length



type Mode = 'canvas' | 'mobile' | 'static'

type CanvasBand = 'tablet' | 'laptop' | 'desktop' | 'wide'



const CANVAS_QUERY = '(min-width: 768px) and (min-height: 520px)'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'



function currentMode(): Mode {

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {

    return 'static'

  }



  if (matches(REDUCED_MOTION)) return 'static'

  return matches(CANVAS_QUERY) ? 'canvas' : 'mobile'

}



function useMode() {

  const [mode, setMode] = useState<Mode>(currentMode)



  useEffect(() => {

    if (typeof window.matchMedia !== 'function') return



    const queries = [CANVAS_QUERY, REDUCED_MOTION].map((query) =>

      window.matchMedia(query),

    )



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



const TABLET_PROFILE: Profile = {

  x: [0, 0.58, 1.0, 1.32],

  z: [180, 55, -105, -260],

  ry: [0, 15, 23, 30],

  s: [1, 0.9, 0.82, 0.75],

  o: [1, 1, 0.76, 0],

}



const LAPTOP_PROFILE: Profile = {

  x: [0, 0.54, 0.94, 1.25],

  z: [245, 90, -145, -330],

  ry: [0, 21, 31, 40],

  s: [1, 0.88, 0.79, 0.7],

  o: [1, 1, 0.86, 0],

}



const DESKTOP_PROFILE: Profile = {

  x: [0, 0.5, 0.88, 1.2],

  z: [320, 120, -160, -420],

  ry: [0, 26, 38, 48],

  s: [1, 0.86, 0.76, 0.68],

  o: [1, 1, 0.9, 0],

}



const WIDE_PROFILE: Profile = {

  x: [0, 0.47, 0.82, 1.12],

  z: [365, 145, -185, -470],

  ry: [0, 28, 40, 50],

  s: [1, 0.85, 0.74, 0.66],

  o: [1, 1, 0.9, 0],

}



const MOBILE_PROFILE: Profile = {

  x: [0, 0.82, 1.45, 2],

  z: [0, -55, -145, -235],

  ry: [0, 10, 13, 14],

  s: [1, 0.9, 0.82, 0.76],

  o: [1, 0.9, 0.4, 0],

}



const Y_OFFSET = [0, -26, 20, -16, 28, -12]



const SEQ = {

  openStart: 0.075,

  openEnd: 0.165,

  scrollEnd: 0.675,

  lastHoldEnd: 0.745,

  convergeEnd: 0.855,

  titleIn: [0.79, 0.89] as const,

  exitStart: 0.975,

}



function getCanvasBand(width: number): CanvasBand {

  if (width < 900) return 'tablet'

  if (width < 1200) return 'laptop'

  if (width < 1600) return 'desktop'

  return 'wide'

}



function getProfile(band: CanvasBand): Profile {

  if (band === 'tablet') return TABLET_PROFILE

  if (band === 'laptop') return LAPTOP_PROFILE

  if (band === 'wide') return WIDE_PROFILE

  return DESKTOP_PROFILE

}



function activeAt(p: number) {

  if (p <= SEQ.openEnd) return 0



  if (p < SEQ.scrollEnd) {

    const raw = clamp01((p - SEQ.openEnd) / (SEQ.scrollEnd - SEQ.openEnd))

    const eased = smoothstep(raw)

    return lerp(0, COUNT - 1, eased)

  }



  return COUNT - 1

}



const HEADING_CLASS =

  'site-display max-w-full font-primary text-[clamp(42px,6vw,78px)] font-medium leading-[0.92] tracking-[-0.05em] text-neutral-900'



const COPY_CLASS =

  'site-copy mt-4 w-[560px] max-w-[90vw] text-center font-secondary text-[13px] leading-[1.5] text-neutral-600 sm:mt-5 sm:text-[14px] lg:text-[15px]'



const COPY =

  'Photography, motion, film, design and digital work from different parts of BRANDWORKS.'



const GIANT_CLASS =

  'block whitespace-nowrap font-primary text-[clamp(38px,4vw,68px)] font-normal leading-[0.95] tracking-[-0.045em] text-neutral-900'



function BrowseLink({ className = '' }: { className?: string }) {

  return (

    <div

      className={`site-kicker flex flex-wrap items-center justify-center gap-2 text-center text-neutral-500 ${className}`}

    >

      More from the studio

      <span aria-hidden="true">&rarr;</span>

      <a

        href="#"

        className="font-semibold text-neutral-900 underline underline-offset-4"

      >

        Explore more

      </a>

    </div>

  )

}



function ProjectBoard({ project, thick }: { project: Project; thick: boolean }) {

  return (

    <div

      data-card

      className="absolute left-1/2 top-1/2 [backface-visibility:hidden] [transform-style:preserve-3d]"

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

            className="absolute inset-0 rounded-[8px] bg-neutral-300 [backface-visibility:hidden]"

            style={{ transform: 'translateZ(-3px)' }}

          />

          <div

            data-edge

            aria-hidden="true"

            className="absolute inset-0 rounded-[8px] bg-neutral-200 [backface-visibility:hidden]"

            style={{ transform: 'translateZ(-1.5px)' }}

          />

        </>

      )}



      <div

        data-face

        className="absolute inset-0 overflow-hidden rounded-[8px] bg-neutral-100 [backface-visibility:hidden]"

      >

        <img

          data-media

          src={project.image}

          alt={project.label}

          loading="lazy"

          decoding="async"

          className="absolute inset-0 h-full w-full scale-110 object-cover [backface-visibility:hidden] will-change-transform"

        />



        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />



        <span

          data-label

          className="absolute bottom-3 left-3 origin-bottom-left text-[14px] font-semibold uppercase tracking-[-0.02em] text-white sm:bottom-4 sm:left-4 sm:text-[16px] lg:text-[18px] xl:text-[20px]"

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



    const els: Els[] = Array.from(

      section.querySelectorAll<HTMLElement>('[data-card]'),

    ).map((card) => ({

      card,

      face: card.querySelector<HTMLElement>('[data-face]')!,

      edges: Array.from(card.querySelectorAll<HTMLElement>('[data-edge]')),

      media: card.querySelector<HTMLElement>('[data-media]')!,

      label: card.querySelector<HTMLElement>('[data-label]')!,

      cache: {},

    }))



    const shared: Record<string, string> = {}

    const fineMouse =

      desktop && matches('(hover: hover) and (pointer: fine)')



    const m = {

      vw: 0,

      vh: 0,

      cw: 0,

      ch: 0,

      introBottom: 0,

      band: 'desktop' as CanvasBand,

      collageScale: 0.32,

      collageGap: 16,

      gridGap: 24,

      gridHeight: 580,

      gridMax: 1282,

    }



    let gridPoses: Pose[] = []



    const updateResponsiveMetrics = () => {

      if (!desktop) return



      m.band = getCanvasBand(m.vw)



      if (m.band === 'tablet') {

        m.cw = Math.min(m.vw * 0.58, m.vh * 0.47 * 1.55, 560)

        m.ch = m.cw / 1.55

        m.collageScale = 0.28

        m.collageGap = 10

        m.gridGap = 14

        m.gridHeight = Math.max(380, Math.min(500, m.vh * 0.56))

        m.gridMax = 920

        return

      }



      if (m.band === 'laptop') {

        m.cw = Math.min(m.vw * 0.47, m.vh * 0.49 * 1.55, 650)

        m.ch = m.cw / 1.55

        m.collageScale = 0.3

        m.collageGap = 12

        m.gridGap = 18

        m.gridHeight = Math.max(430, Math.min(540, m.vh * 0.6))

        m.gridMax = 1100

        return

      }



      if (m.band === 'wide') {

        m.cw = Math.min(m.vw * 0.38, m.vh * 0.54 * 1.55, 820)

        m.ch = m.cw / 1.55

        m.collageScale = 0.34

        m.collageGap = 20

        m.gridGap = 28

        m.gridHeight = Math.max(520, Math.min(620, m.vh * 0.64))

        m.gridMax = 1440

        return

      }



      m.cw = Math.min(m.vw * 0.42, m.vh * 0.51 * 1.55, 760)

      m.ch = m.cw / 1.55

      m.collageScale = 0.32

      m.collageGap = 16

      m.gridGap = 24

      m.gridHeight = Math.max(480, Math.min(580, m.vh * 0.62))

      m.gridMax = 1282

    }



    const computeGridPoses = () => {

      const outerGutter =

        m.band === 'tablet' ? 20 : m.band === 'laptop' ? 28 : 40

      const gridW = Math.min(m.gridMax, m.vw - outerGutter * 2)

      const colW = (gridW - m.gridGap) / 2

      const left = (m.vw - gridW) / 2

      const top = m.introBottom +

        (m.band === 'tablet' ? 28 : m.band === 'laptop' ? 40 : 54)

      const H = m.gridHeight



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



        const x = left + col * (colW + m.gridGap) + w / 2 - m.vw / 2

        const y = top + row * (H + m.gridGap) + H / 2 - m.vh / 2

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

        updateResponsiveMetrics()

      } else {

        const stageH = stage?.clientHeight ?? m.vh * 0.5

        const maxWidth = Math.min(m.vw * 0.82, 560)



        m.ch = Math.min(maxWidth / (629 / 580), stageH * 0.88)

        m.cw = m.ch * (629 / 580)

        m.collageScale = 0.32

        m.collageGap = 12

      }



      section.style.setProperty('--cw', `${m.cw}px`)

      section.style.setProperty('--ch', `${m.ch}px`)

      section.style.setProperty(

        '--collage-h',

        `${2 * m.ch * m.collageScale + m.collageGap}px`,

      )



      m.introBottom = intro ? intro.offsetTop + intro.offsetHeight : 0



      if (desktop) {

        gridPoses = computeGridPoses()

      }



      for (const e of els) e.cache = {}

      for (const key of Object.keys(shared)) delete shared[key]

    }



    const cylinderPose = (i: number, active: number): Pose => {

      const offset = i - active

      const d = Math.abs(offset)

      const sign = offset < 0 ? -1 : 1

      const profile = desktop ? getProfile(m.band) : MOBILE_PROFILE

      const yScale =

        !desktop || m.band === 'tablet'

          ? 0.55

          : m.band === 'laptop'

            ? 0.78

            : 1



      return {

        x: sign * sample(profile.x, d) * m.vw,

        y:

          (desktop ? Y_OFFSET[i % Y_OFFSET.length] * yScale : 0) *

          smoothstep(Math.min(d, 1)),

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

      const w = m.cw * m.collageScale

      const h = m.ch * m.collageScale



      return {

        x: (col - (inRow - 1) / 2) * (w + m.collageGap),

        y: (row - 0.5) * (h + m.collageGap),

        z: 0,

        rx: 0,

        ry: 0,

        s: m.collageScale,

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

      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null



    ro?.observe(section)

    if (intro) ro?.observe(intro)



    let alive = true



    document.fonts?.ready.then(() => {

      if (alive) measure()

    })



    let raf = 0

    let last = performance.now()



    const render = (now: number) => {

      raf = requestAnimationFrame(render)



      const dt = Math.min(48, now - last)

      last = now



      // Frame-rate independent follow. Snappier than the old 0.08 damping,

      // but still smooth enough to hide wheel/trackpad stepping.

      const baseFollow = desktop ? 0.115 : 0.15

      const follow = 1 - Math.pow(1 - baseFollow, dt / 16.67)

      const pointerFollow = 1 - Math.pow(1 - 0.085, dt / 16.67)



      const rect = runway.getBoundingClientRect()

      const travel = rect.height - m.vh

      target = travel > 0 ? clamp01(-rect.top / travel) : 0



      if (!initialised) {

        current = target

        initialised = true

      }



      if (next) {

        const raw = clamp01((m.vh - rect.bottom) / (m.vh * 0.72))

        const eased = smoothstep(raw)

        const state = raw >= 1 ? 'done' : eased.toFixed(4)



        if (state !== nextState) {

          nextState = state



          next.style.transform =

            raw >= 1

              ? ''

              : `translate3d(0, ${((1 - eased) * 5.5).toFixed(3)}vh, 0)`



          next.style.opacity =

            raw >= 1 ? '' : `${(0.7 + 0.3 * eased).toFixed(3)}`

        }

      }



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

        imagesPrimed = true



        section

          .querySelectorAll<HTMLImageElement>('img[data-media]')

          .forEach((img) => {

            img.loading = 'eager'

          })

      }



      if (shared.wc !== 'transform') {

        shared.wc = 'transform'

        for (const e of els) e.card.style.willChange = 'transform, opacity'

      }



      current += (target - current) * follow



      if (Math.abs(target - current) < 0.00004) {

        current = target

      }



      mouse.x += (mouse.tx - mouse.x) * pointerFollow

      mouse.y += (mouse.ty - mouse.y) * pointerFollow



      const p = current



      const open = desktop

        ? smoothstep(phase(p, SEQ.openStart, SEQ.openEnd))

        : 1



      const active = desktop ? activeAt(p) : clamp01(p / 0.92) * (COUNT - 1)



      const converge = desktop

        ? smoothstep(phase(p, SEQ.lastHoldEnd, SEQ.convergeEnd))

        : 0



      const collage = converge



      const exit = desktop

        ? smoothstep(phase(p, SEQ.exitStart, 1))

        : 0



      if (desktop) {

        const early = smoothstep(phase(p, 0.065, 0.14))

        const head = smoothstep(phase(p, SEQ.openStart, SEQ.openEnd))



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

            `translate3d(0, ${(-10 * early).toFixed(1)}px, 0)`,

          )

        }



        if (heading) {

          write(heading, shared, 'h', 'opacity', (1 - head).toFixed(3))

          write(

            heading,

            shared,

            'ht',

            'transform',

            `translate3d(0, ${(-16 * head).toFixed(1)}px, 0) scale(${(

              1 -

              0.045 * head

            ).toFixed(4)})`,

          )

        }



        if (intro) {

          write(

            intro,

            shared,

            'iv',

            'visibility',

            head >= 0.999 ? 'hidden' : 'visible',

          )

        }



        if (frame) {

          const outerGutter =

            m.band === 'tablet' ? 20 : m.band === 'laptop' ? 28 : 40

          const gridW = Math.min(m.gridMax, m.vw - outerGutter * 2)

          const side0 = Math.max(

            0,

            Math.min(m.vw * 0.05, (m.vw - gridW) / 2 - 10),

          )



          const topPct = lerp(7, 0, open) + 2.2 * exit

          const botPct = lerp(2, 0, open) + 2.2 * exit

          const sidePx = lerp(side0, 0, open) + m.vw * 0.014 * exit

          const radius = lerp(18, 0, open) + 14 * exit



          write(

            frame,

            shared,

            'clip',

            'clip-path',

            `inset(${topPct.toFixed(2)}% ${sidePx.toFixed(1)}px ${botPct.toFixed(2)}% ${sidePx.toFixed(1)}px round ${radius.toFixed(1)}px)`,

          )

        }



        if (stage) {

          const basePerspective =

            m.band === 'tablet' ? 1150 : m.band === 'laptop' ? 1100 : 1000

          const endPerspective =

            m.band === 'tablet' ? 1420 : m.band === 'laptop' ? 1380 : 1350



          write(

            stage,

            shared,

            'persp',

            'perspective',

            `${lerp(basePerspective, endPerspective, open).toFixed(0)}px`,

          )

        }



        if (world) {

          write(

            world,

            shared,

            'world',

            'transform',

            `translate3d(0, ${(-2.2 * exit).toFixed(3)}vh, 0) scale(${(

              1 -

              0.018 * exit

            ).toFixed(4)})`,

          )

        }



        if (title) {

          const tin = smoothstep(phase(p, SEQ.titleIn[0], SEQ.titleIn[1]))

          const v = tin * (1 - exit)



          write(title, shared, 'to', 'opacity', v.toFixed(3))

          write(

            title,

            shared,

            'tv',

            'visibility',

            v <= 0.001 ? 'hidden' : 'visible',

          )

          write(

            title,

            shared,

            'tf',

            'filter',

            v >= 0.999 ? 'none' : `blur(${(4 * (1 - v)).toFixed(2)}px)`,

          )

          write(

            title,

            shared,

            'tt',

            'transform',

            `translate3d(0, ${(18 * (1 - tin) - 7 * exit).toFixed(1)}px, 0)`,

          )

        }

      }



      for (let i = 0; i < els.length; i++) {

        const e = els[i]

        let pose = cylinderPose(i, active)



        if (desktop && open < 1 && gridPoses[i]) {

          pose = mix(gridPoses[i], pose, open)

        }



        if (collage > 0) {

          pose = mix(pose, collagePose(i), collage)

        }



        const offset = i - active

        const centre =

          Math.max(0, 1 - Math.abs(offset)) * (1 - collage) * open



        let { rx, ry } = pose



        if (fineMouse) {

          const mouseScale =

            m.band === 'tablet' ? 0.45 : m.band === 'laptop' ? 0.7 : 1

          ry += mouse.x * 4.2 * centre * mouseScale

          rx += -mouse.y * 3.2 * centre * mouseScale

        }



        rx *= 1 - exit

        ry *= 1 - exit



        const hidden = pose.o <= 0.01



        write(

          e.card,

          e.cache,

          'v',

          'visibility',

          hidden ? 'hidden' : 'visible',

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

          pose.o >= 0.999 ? '1' : pose.o.toFixed(3),

        )



        const clip =

          pose.clipX > 0.1 || pose.clipY > 0.1

            ? `inset(${pose.clipY.toFixed(1)}px ${pose.clipX.toFixed(1)}px round ${(8 / pose.s).toFixed(1)}px)`

            : 'none'



        write(e.face, e.cache, 'fc', 'clip-path', clip)



        for (let j = 0; j < e.edges.length; j++) {

          write(e.edges[j], e.cache, `ec${j}`, 'clip-path', clip)

        }



        const driftStrength =

          !desktop || m.band === 'tablet'

            ? 1.3

            : m.band === 'laptop'

              ? 2.1

              : 2.7



        const drift =

          Math.max(-1.4, Math.min(1.4, offset)) *

          driftStrength *

          (1 - collage)



        write(

          e.media,

          e.cache,

          'm',

          'transform',

          `translate3d(${(-drift).toFixed(2)}%, 0, 0) scale(1.1)`,

        )



        const cs = desktop ? lerp(1 / pose.s, 1, open) : 1



        const trailStrength =

          !desktop || m.band === 'tablet'

            ? 4

            : m.band === 'laptop'

              ? 7

              : 9



        const trail =

          Math.max(-1, Math.min(1, offset)) *

          trailStrength *

          (1 - collage)



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

    <div

      ref={runwayRef}

      className="relative h-[540svh] min-[900px]:h-[590svh] lg:h-[620svh] xl:h-[660svh] 2xl:h-[700svh]"

    >

      <section

        ref={sectionRef}

        aria-labelledby="featured-work-heading"

        className="sticky top-0 h-svh min-h-[560px] overflow-hidden bg-white"

      >

        <div

          data-title

          aria-hidden="true"

          className="pointer-events-none invisible absolute inset-0 z-0 flex flex-col items-center justify-center px-4 text-center opacity-0"

        >

          <span className={GIANT_CLASS}>Across the</span>



          <span

            className="block"

            style={{

              height: 'calc(var(--collage-h) + clamp(34px,4vw,56px))',

            }}

          />



          <span className={GIANT_CLASS}>studio.</span>

        </div>



        <div data-frame className="absolute inset-0 z-10 will-change-[clip-path]">

          <div

            data-stage

            className="absolute inset-0 [contain:layout_paint_style]"

            style={{ perspective: '1000px' }}

          >

            <div

              data-world

              className="absolute inset-0 [backface-visibility:hidden] [transform-style:preserve-3d] will-change-transform"

            >

              {projects.map((project) => (

                <ProjectBoard key={project.label} project={project} thick />

              ))}

            </div>

          </div>

        </div>



        <div

          data-intro

          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-[clamp(38px,7vh,96px)] text-center sm:px-6"

        >

          <div data-intro-kicker />



          <h2

            data-intro-heading

            id="featured-work-heading"

            className={`${HEADING_CLASS} mt-2 sm:mt-3 lg:mt-4`}

          >

            Across the studio.

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

        height: `${110 + (COUNT - 1) * 68}svh`,

      }}

    >

      <section

        ref={sectionRef}

        aria-labelledby="featured-work-heading"

        className="sticky top-0 flex h-svh min-h-[540px] flex-col items-center overflow-hidden bg-white pb-[max(20px,env(safe-area-inset-bottom))] pt-[clamp(34px,7vh,64px)] text-center"

      >

        <div data-intro className="flex w-full flex-col items-center px-4 sm:px-6">

          <h2

            id="featured-work-heading"

            className={`${HEADING_CLASS} mt-1 max-w-[92vw] text-[clamp(38px,11vw,62px)]`}

          >

            Across the studio.

          </h2>



          <p className={`${COPY_CLASS} max-w-[88vw] text-[12px] sm:text-[13px]`}>

            {COPY}

          </p>

        </div>



        <div

          data-stage

          className="relative mt-[clamp(18px,4vh,32px)] w-full flex-1 [contain:layout_paint_style]"

          style={{ perspective: '1100px' }}

        >

          <div

            data-world

            className="absolute inset-0 [backface-visibility:hidden] [transform-style:preserve-3d] will-change-transform"

          >

            {projects.map((project) => (

              <ProjectBoard key={project.label} project={project} thick={false} />

            ))}

          </div>

        </div>



        <BrowseLink className="mt-4 px-4 pb-2 text-[11px] sm:mt-5 sm:text-[12px]" />

      </section>

    </div>

  )

}



function WorkStatic() {

  return (

    <section

      aria-labelledby="featured-work-heading"

      className="flex flex-col items-center bg-white px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-18 lg:px-8 lg:pb-28 lg:pt-20"

    >

      <h2

        id="featured-work-heading"

        className={`${HEADING_CLASS} mt-2 max-w-[95vw]`}

      >

        Across the studio.

      </h2>



      <p className={COPY_CLASS}>{COPY}</p>



      <div className="mt-10 grid w-full max-w-[1282px] grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:mt-14 lg:gap-6">

        {projects.map((project) => (

          <div

            key={project.label}

            className={`relative aspect-[629/580] w-full overflow-hidden rounded-[8px] ${

              project.wide ? 'sm:col-span-2 sm:aspect-[1282/580]' : ''

            }`}

          >

            <img

              src={project.image}

              alt={project.label}

              loading="lazy"

              decoding="async"

              className="h-full w-full rounded-[8px] object-cover"

            />



            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />



            <span className="absolute bottom-3 left-3 text-[14px] font-semibold uppercase tracking-[-0.02em] text-white sm:bottom-4 sm:left-4 sm:text-[16px] lg:text-[20px]">

              {project.label}

            </span>

          </div>

        ))}

      </div>



      <BrowseLink className="mt-8 w-full max-w-[1282px] text-[12px] sm:mt-10 sm:text-[13px]" />

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
