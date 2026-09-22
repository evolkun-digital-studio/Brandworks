import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FadeUp } from './FadeUp'
import { matches } from './lib/scrollMotion'
import photo1 from './Photo/Photo1.jpg'
import photo2 from './Photo/Photo2.jpg'
import photo3 from './Photo/Photo3.jpg'

type Category = {
  image: string
  label: string
  /** Only where the picture needs describing beyond its own title. */
  alt?: string
}

const categories: Category[] = [
  { image: photo1, label: 'Brand Strategy' },
  { image: photo2, label: 'Content & Creative' },
  { image: photo3, label: 'Social Media & Marketing' },
  {
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2011_56_00%20AM.png',
    label: 'PR & Founder Reputation',
    alt: 'Editorial founder portrait representing PR and founder reputation management',
  },
  {
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_05_00%20PM.png',
    label: 'Videography',
    alt: 'Professional filmmaker operating a cinema camera',
  },
  {
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_08_33%20PM.png',
    label: 'Performance & SEO Marketing',
    alt: 'Marketing strategist reviewing SEO and performance analytics',
  },
]

// ---------------------------------------------------------------------------
// Ring geometry
//
// Six services fill the cylinder on their own, so the reel is the array
// itself — no cloned copies, and nothing on the ring that assistive tech
// has to be told to ignore.
// ---------------------------------------------------------------------------

const CARD_COUNT = categories.length
const STEP = 360 / CARD_COUNT

/** Half the arc the camera is allowed to see; beyond this a card is culled. */
const VISIBLE_ANGLE = 88
/**
 * Depth opacity bottoms out at 0.62, so culling alone would blink a card
 * out while it is still visible. The last stretch of the arc fades to
 * nothing instead. The cards actually being read sit at 0° and ±60°,
 * well inside this, so the specified falloff is what you see; only the
 * outermost sliver is different.
 */
const FADE_ANGLE = 76
/**
 * The on-screen gap between the centre card's edge and its neighbour's
 * near edge, once the neighbour is projected through the stage's
 * perspective. The radius is solved from this (see `radiusForGap`), so the
 * gap holds as the responsive card — `clamp(280px, 30vw, 510px)` — grows
 * and shrinks. Mobile is a flat flex row and takes its gap from CSS.
 */
const DESKTOP_GAP = 16
const TABLET_GAP = 12
const DESKTOP_QUERY = '(min-width: 1024px)'
/** Fallback if the stage's computed perspective can't be read. */
const DEFAULT_PERSPECTIVE = 1200
/** Degrees per second of unattended drift. */
const AUTO_SPEED = 12
/** What the drift is scaled to while a pointer rests on the stage. */
const HOVER_SPEED_SCALE = 0.25
/** How fast that scale is eased, so interaction ends in a glide, not a jolt. */
const SPEED_EASE = 2.4
const DEG_PER_PX = 0.18
/** Ceiling on flick momentum, in deg/s — the reel can never run away. */
const MAX_MOMENTUM = 120
/**
 * Friction and the snap below are written as per-second rates, not the
 * brief's per-frame factors: `momentum *= 0.94` and `phase += diff * 0.08`
 * mean different speeds on a 60Hz and a 144Hz screen, which the same
 * brief rules out. These rates reproduce those factors exactly at 60fps
 * and hold that speed everywhere else.
 */
const FRICTION = 3.7
const SNAP_RATE = 6.3
/** Pointer travel past which a drag is a drag, not a click on a card. */
const DRAG_THRESHOLD = 6
const MOBILE_QUERY = '(max-width: 700px)'

/** Folds any angle into [-180, 180), where 0 is facing the camera. */
const normalizeAngle = (angle: number) => (((angle % 360) + 540) % 360) - 180

/**
 * The ring radius at which a card at ±STEP projects `gap` px clear of the
 * centre card. The neighbour's near edge sits at
 * (R·sinθ − h·cosθ, −R(1 − cosθ) + h·sinθ), and projects to x·p / (p − z);
 * setting that equal to h + gap and solving for R gives this.
 */
function radiusForGap(cardWidth: number, gap: number, perspective: number) {
  const h = cardWidth / 2
  const theta = STEP * (Math.PI / 180)
  const s = Math.sin(theta)
  const c = Math.cos(theta)
  const edge = h + gap
  return (edge * (perspective - h * s) + h * c * perspective) / (s * perspective - edge * (1 - c))
}

type CardVisual = {
  transform: string
  opacity: number
  filter: string
  visible: boolean
  /** The title fades in only as its card squares up to the camera. */
  titleOpacity: number
}

/** Where a card sits on the cylinder, and how the depth reads on it. */
function placeCard(angle: number, radius: number): CardVisual {
  const normalized = normalizeAngle(angle)
  const visible = Math.abs(normalized) <= VISIBLE_ANGLE

  const radians = normalized * (Math.PI / 180)
  const x = radius * Math.sin(radians)
  // Negated against the brief's formula: with the camera at +z, the
  // centre card has to be the near one and the flanks have to fall
  // away, which is what the sign flip buys.
  const z = -radius * (1 - Math.cos(radians))

  const depth = Math.min(Math.abs(normalized) / VISIBLE_ANGLE, 1)
  const edgeFade = Math.min(Math.max((VISIBLE_ANGLE - Math.abs(normalized)) / (VISIBLE_ANGLE - FADE_ANGLE), 0), 1)

  return {
    transform: `translate3d(calc(-50% + ${x.toFixed(2)}px), -50%, ${z.toFixed(2)}px) rotateY(${normalized.toFixed(2)}deg)`,
    opacity: (1 - depth * 0.38) * edgeFade,
    filter: depth < 0.001 ? 'none' : `brightness(${(1 - depth * 0.18).toFixed(3)})`,
    visible,
    // Tied to the 60° spacing: a title is solid on the card facing the
    // camera and gone by the time its neighbour takes over, with both
    // showing faintly through the handover rather than neither.
    titleOpacity: Math.max(0, 1 - Math.abs(normalized) / 40),
  }
}

function useMobile() {
  const [mobile, setMobile] = useState(() => matches(MOBILE_QUERY))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return mobile
}

// ---------------------------------------------------------------------------
// The reel engine: one requestAnimationFrame loop owns `phase`, and
// writes each card's transform straight to the DOM. React never
// re-renders while the ring turns.
// ---------------------------------------------------------------------------

type Engine = {
  stageRef: React.RefObject<HTMLDivElement | null>
  setCardRef: (index: number) => (el: HTMLLIElement | null) => void
  goTo: (index: number) => void
  step: (direction: 1 | -1) => void
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  consumedDrag: () => boolean
}

function useReel(enabled: boolean, animate: boolean): Engine {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLLIElement | null)[]>([])

  const phase = useRef(0)
  const momentum = useRef(0)
  /** Set while easing to a chosen card; null means free-running. */
  const target = useRef<number | null>(null)
  const speedScale = useRef(1)
  const radius = useRef(0)

  const dragging = useRef(false)
  const dragMoved = useRef(0)
  const lastX = useRef(0)
  const lastMoveAt = useRef(0)
  const velocity = useRef(0)
  const hovering = useRef(false)
  /** Detaches an in-flight drag's listeners — called on release, and on unmount. */
  const endDrag = useRef<(() => void) | null>(null)

  /** Pushes the current phase onto every card. */
  const layout = useCallback(() => {
    const cards = cardsRef.current
    for (let i = 0; i < cards.length; i += 1) {
      const el = cards[i]
      if (!el) continue
      const visual = placeCard(i * STEP + phase.current, radius.current)
      if (!visual.visible) {
        el.style.visibility = 'hidden'
        el.style.pointerEvents = 'none'
        continue
      }
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'
      el.style.transform = visual.transform
      el.style.opacity = String(visual.opacity)
      el.style.filter = visual.filter
      const overlay = el.querySelector<HTMLElement>('[data-card-overlay]')
      if (overlay) overlay.style.opacity = String(visual.titleOpacity)
    }
  }, [])

  const measure = useCallback(() => {
    const card = cardsRef.current.find(Boolean)
    const stage = stageRef.current
    const perspective = stage ? parseFloat(getComputedStyle(stage).perspective) : Number.NaN
    const gap = matches(DESKTOP_QUERY) ? DESKTOP_GAP : TABLET_GAP
    radius.current = radiusForGap(
      card?.offsetWidth ?? 0,
      gap,
      Number.isFinite(perspective) && perspective > 0 ? perspective : DEFAULT_PERSPECTIVE,
    )
    layout()
  }, [layout])

  /** Eases to whichever phase brings `index` to the front, by the short way round. */
  const goTo = useCallback((index: number) => {
    const delta = normalizeAngle(-index * STEP - phase.current)
    target.current = phase.current + delta
    momentum.current = 0
  }, [])

  const step = useCallback((direction: 1 | -1) => {
    const from = target.current ?? phase.current
    target.current = from - direction * STEP
    momentum.current = 0
  }, [])

  // Geometry: measured from the rendered card, re-measured on resize.
  useEffect(() => {
    if (!enabled) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [enabled, measure])

  // The loop itself.
  useEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return

    let frame = 0
    let last = 0
    let onScreen = true
    let lastPhase = Number.NaN

    // A reel nobody can see has no reason to turn. Without this the
    // loop would keep the main thread busy for the whole visit, from
    // whichever other section the visitor is actually reading.
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              onScreen = entry.isIntersecting
              if (!onScreen) last = 0
            },
            { rootMargin: '120px' },
          )
    observer?.observe(stage)

    const onEnter = () => {
      hovering.current = true
    }
    const onLeave = () => {
      hovering.current = false
    }
    // A tab that comes back must not be handed the whole time it spent
    // hidden as one enormous delta.
    const onVisibility = () => {
      last = 0
    }

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (document.hidden || !onScreen) {
        last = 0
        return
      }
      if (!last) {
        last = now
        layout()
        return
      }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (target.current !== null) {
        const diff = target.current - phase.current
        if (Math.abs(diff) < 0.05) {
          phase.current = target.current
          target.current = null
        } else {
          phase.current += diff * (1 - Math.exp(-SNAP_RATE * dt))
        }
      } else if (!dragging.current) {
        if (momentum.current !== 0) {
          phase.current += momentum.current * dt
          momentum.current *= Math.exp(-FRICTION * dt)
          if (Math.abs(momentum.current) < 1) momentum.current = 0
        } else if (animate) {
          const wanted = hovering.current ? HOVER_SPEED_SCALE : 1
          speedScale.current += (wanted - speedScale.current) * Math.min(1, dt * SPEED_EASE)
          phase.current -= AUTO_SPEED * speedScale.current * dt
        }
      }

      // Keeps the accumulator small over a long session; the ring is
      // periodic, so this is invisible.
      if (phase.current > 360 || phase.current < -360) {
        const wrapped = phase.current % 360
        if (target.current !== null) target.current += wrapped - phase.current
        phase.current = wrapped
      }

      // Under reduced motion the ring holds still between button
      // presses; there is no point repainting an unchanged frame.
      if (phase.current === lastPhase) return
      lastPhase = phase.current
      layout()
    }

    stage.addEventListener('pointerenter', onEnter)
    stage.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      stage.removeEventListener('pointerenter', onEnter)
      stage.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, animate, layout])

  // Drag. Move/up live on the element that captured the pointer, so a
  // release outside the window still ends the gesture.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return
      const stage = event.currentTarget
      stage.setPointerCapture(event.pointerId)
      stage.dataset.dragging = 'true'
      dragging.current = true
      dragMoved.current = 0
      lastX.current = event.clientX
      lastMoveAt.current = performance.now()
      velocity.current = 0
      target.current = null
      momentum.current = 0

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return
        const now = performance.now()
        const dx = moveEvent.clientX - lastX.current
        const dt = Math.max((now - lastMoveAt.current) / 1000, 0.001)
        lastX.current = moveEvent.clientX
        lastMoveAt.current = now
        dragMoved.current += Math.abs(dx)
        const degrees = dx * DEG_PER_PX
        phase.current += degrees
        velocity.current = degrees / dt
      }

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== event.pointerId) return
        dragging.current = false
        stage.dataset.dragging = 'false'
        momentum.current = Math.max(-MAX_MOMENTUM, Math.min(MAX_MOMENTUM, velocity.current))
        // A flick that ended a while ago shouldn't still throw the ring.
        if (performance.now() - lastMoveAt.current > 120) momentum.current = 0
        speedScale.current = 0
        if (stage.hasPointerCapture(upEvent.pointerId)) stage.releasePointerCapture(upEvent.pointerId)
        detach()
      }

      const detach = () => {
        endDrag.current = null
        stage.removeEventListener('pointermove', onMove)
        stage.removeEventListener('pointerup', onUp)
        stage.removeEventListener('pointercancel', onUp)
      }

      endDrag.current = detach
      stage.addEventListener('pointermove', onMove)
      stage.addEventListener('pointerup', onUp)
      stage.addEventListener('pointercancel', onUp)
    },
    [enabled],
  )

  useEffect(() => () => endDrag.current?.(), [])

  /** True when the pointer travelled far enough that the click was a drag. */
  const consumedDrag = useCallback(() => dragMoved.current > DRAG_THRESHOLD, [])

  const setCardRef = useCallback(
    (index: number) => (el: HTMLLIElement | null) => {
      cardsRef.current[index] = el
    },
    [],
  )

  return { stageRef, setCardRef, goTo, step, onPointerDown, consumedDrag }
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function Services() {
  const mobile = useMobile()
  const reduce = useReducedMotion()
  const spatial = !mobile
  const { stageRef, setCardRef, goTo, step, onPointerDown, consumedDrag } = useReel(spatial, !reduce)


  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!spatial) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    }
  }

  return (
    <section className="relative w-full overflow-hidden bg-white pt-20 pb-16 text-[#111] min-[701px]:min-h-screen min-[701px]:pt-[clamp(90px,9vw,150px)] min-[701px]:pb-20">
      <header className="mx-auto flex max-w-[760px] flex-col items-center px-[18px] text-center min-[701px]:px-6">
        <FadeUp className="flex items-center gap-2 text-neutral-500" duration={0.75} y={28}>
          <span className="site-kicker flex items-center justify-center">
            Services
          </span>
          <span
            aria-hidden="true"
            className="-translate-y-2 flex h-[14px] w-[14px] items-center justify-center rounded-[1000px] border-[1.5px] border-neutral-500 text-[7px] leading-none font-medium opacity-100"
          >
            S
          </span>
        </FadeUp>

        <FadeUp
          as="h2"
          className="site-display mt-[22px] max-w-full text-neutral-900"
          delay={0.1}
          duration={0.75}
          y={28}
        >
          What we do
        </FadeUp>

        <FadeUp
          as="p"
          className="site-copy mt-6 w-[440px] max-w-full text-center text-neutral-600"
          delay={0.2}
          duration={0.75}
          y={28}
        >
          Bringing strategy, creativity and execution together to build brands
          that grow.
        </FadeUp>
      </header>

      {/* The entrance lives here; the ring's own transforms live on the
         cards inside, so the two never write to the same element. */}
      <motion.div
        className="mt-16 min-[701px]:mt-[76px]"
        initial={reduce ? false : { opacity: 0, y: 70, scale: 0.97 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 1.1, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          ref={stageRef}
          className="services-stage"
          onPointerDown={spatial ? onPointerDown : undefined}
          onKeyDown={onKeyDown}
          tabIndex={spatial ? 0 : -1}
          role="group"
          aria-roledescription="carousel"
          aria-label="BrandWorks services"
        >
          <ul className="services-ring">
            {categories.map((category, index) => {
              return (
                <li
                  key={category.label}
                  ref={spatial ? setCardRef(index) : undefined}
                  className="service-card"
                  onClick={() => {
                    if (!spatial || consumedDrag()) return
                    goTo(index)
                  }}
                >
                  {/* Rendered immediately below the Hero, still within (or
                     very near) the first viewport on most screen sizes — so,
                     unlike every other homepage image, the front card is
                     kept eager rather than lazy-loaded (Phase 10, Part 2):
                     it's a plausible LCP candidate, and lazy-loading it
                     risks delaying LCP rather than improving it. `decoding`
                     is deliberately left unset for the same reason (Part 3:
                     don't force async decoding on a possible LCP image).
                     The five cards behind it are not on screen at first
                     paint, so those do lazy-load. */}
                  <img
                    src={category.image}
                    alt={category.alt ?? category.label}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                  <div className="service-card__overlay" data-card-overlay>
                    <span className="text-[18px] leading-[1.25] font-medium tracking-[-0.01em] text-white uppercase">
                      {category.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {spatial && (
          <div className="site-kicker mx-auto mt-10 flex w-[1283px] max-w-full items-center justify-between px-6 text-neutral-500">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Show the previous service"
              className="group flex items-center gap-3 text-neutral-900 transition-colors hover:text-neutral-500"
            >
              <span aria-hidden="true" className="block h-px w-8 bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-12" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Show the next service"
              className="group flex items-center gap-3 text-neutral-900 transition-colors hover:text-neutral-500"
            >
              Next
              <span aria-hidden="true" className="block h-px w-8 bg-current transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-12" />
            </button>
          </div>
        )}
      </motion.div>

      <div className="site-kicker mx-auto mt-12 flex w-[1283px] max-w-full flex-wrap items-center justify-center gap-2 px-[18px] text-center text-neutral-500">
        Discover the work behind the brands
        <span aria-hidden="true">&rarr;</span>
        <a
          href="#"
          className="text-neutral-900 underline underline-offset-4"
        >
          View all work
        </a>
      </div>
    </section>
  )
}

export default Services
