import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '@iconify/react'
import { FadeUp } from './FadeUp'
import { matches } from './lib/scrollMotion'
import photo1 from './Photo/Photo1.jpg'
import photo2 from './Photo/Photo2.jpg'
import photo3 from './Photo/Photo3.jpg'

type Category = {
  image: string
  label: string
  alt?: string
}

const categories: Category[] = [
  { image: photo1, label: 'Brand Strategy' },
  { image: photo2, label: 'Content & Creative' },
  { image: photo3, label: 'Social Media & Marketing' },
  {
    image:
      'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2011_56_00%20AM.png',
    label: 'PR & Founder Reputation',
    alt: 'Editorial founder portrait representing PR and founder reputation management',
  },
  {
    image:
      'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_05_00%20PM.png',
    label: 'Videography',
    alt: 'Professional filmmaker operating a cinema camera',
  },
  {
    image:
      'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2012_08_33%20PM.png',
    label: 'Performance & SEO Marketing',
    alt: 'Marketing strategist reviewing SEO and performance analytics',
  },
]

const CARD_COUNT = categories.length
const STEP = 360 / CARD_COUNT

const VISIBLE_ANGLE = 88
const FADE_ANGLE = 76

const DESKTOP_GAP = 16
const TABLET_GAP = 12

const DESKTOP_QUERY = '(min-width: 1024px)'
const MOBILE_QUERY = '(max-width: 700px)'

const DEFAULT_PERSPECTIVE = 1200

const AUTO_SPEED = 12
const HOVER_SPEED_SCALE = 0.25
const SPEED_EASE = 2.4

const DEG_PER_PX = 0.18

const MAX_MOMENTUM = 120
const FRICTION = 3.7
const SNAP_RATE = 6.3
const DRAG_THRESHOLD = 6

const normalizeAngle = (angle: number) =>
  (((angle % 360) + 540) % 360) - 180

function radiusForGap(
  cardWidth: number,
  gap: number,
  perspective: number,
) {
  const h = cardWidth / 2
  const theta = STEP * (Math.PI / 180)
  const s = Math.sin(theta)
  const c = Math.cos(theta)
  const edge = h + gap

  return (
    (edge * (perspective - h * s) + h * c * perspective) /
    (s * perspective - edge * (1 - c))
  )
}

type CardVisual = {
  transform: string
  opacity: number
  filter: string
  visible: boolean
  titleOpacity: number
}

function placeCard(angle: number, radius: number): CardVisual {
  const normalized = normalizeAngle(angle)

  const visible = Math.abs(normalized) <= VISIBLE_ANGLE

  const radians = normalized * (Math.PI / 180)

  const x = radius * Math.sin(radians)

  const z = -radius * (1 - Math.cos(radians))

  const depth = Math.min(
    Math.abs(normalized) / VISIBLE_ANGLE,
    1,
  )

  const edgeFade = Math.min(
    Math.max(
      (VISIBLE_ANGLE - Math.abs(normalized)) /
        (VISIBLE_ANGLE - FADE_ANGLE),
      0,
    ),
    1,
  )

  return {
    transform: `translate3d(calc(-50% + ${x.toFixed(
      2,
    )}px), -50%, ${z.toFixed(
      2,
    )}px) rotateY(${normalized.toFixed(2)}deg)`,

    opacity: (1 - depth * 0.38) * edgeFade,

    filter:
      depth < 0.001
        ? 'none'
        : `brightness(${(1 - depth * 0.18).toFixed(3)})`,

    visible,

    titleOpacity: Math.max(
      0,
      1 - Math.abs(normalized) / 40,
    ),
  }
}

function useMobile() {
  const [mobile, setMobile] = useState(() =>
    matches(MOBILE_QUERY),
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mql = window.matchMedia(MOBILE_QUERY)

    const onChange = () => {
      setMobile(mql.matches)
    }

    mql.addEventListener('change', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return mobile
}

type Engine = {
  stageRef: React.RefObject<HTMLDivElement | null>
  setCardRef: (
    index: number,
  ) => (el: HTMLLIElement | null) => void
  goTo: (index: number) => void
  step: (direction: 1 | -1) => void
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void
  consumedDrag: () => boolean
}

function useReel(
  enabled: boolean,
  animate: boolean,
): Engine {
  const stageRef = useRef<HTMLDivElement>(null)

  const cardsRef = useRef<
    (HTMLLIElement | null)[]
  >([])

  const phase = useRef(0)
  const momentum = useRef(0)

  const target = useRef<number | null>(null)

  const speedScale = useRef(1)

  const radius = useRef(0)

  const dragging = useRef(false)
  const dragMoved = useRef(0)

  const lastX = useRef(0)

  const lastMoveAt = useRef(0)

  const velocity = useRef(0)

  const hovering = useRef(false)

  const endDrag = useRef<
    (() => void) | null
  >(null)

  const layout = useCallback(() => {
    const cards = cardsRef.current

    for (let i = 0; i < cards.length; i += 1) {
      const el = cards[i]

      if (!el) continue

      const visual = placeCard(
        i * STEP + phase.current,
        radius.current,
      )

      if (!visual.visible) {
        el.style.visibility = 'hidden'
        el.style.pointerEvents = 'none'
        continue
      }

      el.style.visibility = 'visible'
      el.style.pointerEvents = 'auto'

      el.style.transform = visual.transform

      el.style.opacity = String(
        visual.opacity,
      )

      el.style.filter = visual.filter

      const overlay =
        el.querySelector<HTMLElement>(
          '[data-card-overlay]',
        )

      if (overlay) {
        overlay.style.opacity = String(
          visual.titleOpacity,
        )
      }
    }
  }, [])

  const measure = useCallback(() => {
    const card =
      cardsRef.current.find(Boolean)

    const stage = stageRef.current

    const perspective = stage
      ? parseFloat(
          getComputedStyle(stage).perspective,
        )
      : Number.NaN

    const gap = matches(DESKTOP_QUERY)
      ? DESKTOP_GAP
      : TABLET_GAP

    radius.current = radiusForGap(
      card?.offsetWidth ?? 0,
      gap,
      Number.isFinite(perspective) &&
        perspective > 0
        ? perspective
        : DEFAULT_PERSPECTIVE,
    )

    layout()
  }, [layout])

  const goTo = useCallback(
    (index: number) => {
      const delta = normalizeAngle(
        -index * STEP - phase.current,
      )

      target.current =
        phase.current + delta

      momentum.current = 0
    },
    [],
  )

  const step = useCallback(
    (direction: 1 | -1) => {
      const from =
        target.current ?? phase.current

      target.current =
        from - direction * STEP

      momentum.current = 0
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return

    measure()

    window.addEventListener(
      'resize',
      measure,
    )

    return () => {
      window.removeEventListener(
        'resize',
        measure,
      )
    }
  }, [enabled, measure])

  useEffect(() => {
    if (!enabled) return

    const stage = stageRef.current

    if (!stage) return

    let frame = 0
    let last = 0
    let onScreen = true
    let lastPhase = Number.NaN

    const observer =
      typeof IntersectionObserver ===
      'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              onScreen =
                entry.isIntersecting

              if (!onScreen) {
                last = 0
              }
            },
            {
              rootMargin: '120px',
            },
          )

    observer?.observe(stage)

    const onEnter = () => {
      hovering.current = true
    }

    const onLeave = () => {
      hovering.current = false
    }

    const onVisibility = () => {
      last = 0
    }

    const tick = (now: number) => {
      frame =
        requestAnimationFrame(tick)

      if (
        document.hidden ||
        !onScreen
      ) {
        last = 0
        return
      }

      if (!last) {
        last = now
        layout()
        return
      }

      const dt = Math.min(
        (now - last) / 1000,
        0.05,
      )

      last = now

      if (target.current !== null) {
        const diff =
          target.current -
          phase.current

        if (Math.abs(diff) < 0.05) {
          phase.current =
            target.current

          target.current = null
        } else {
          phase.current +=
            diff *
            (1 -
              Math.exp(
                -SNAP_RATE * dt,
              ))
        }
      } else if (!dragging.current) {
        if (momentum.current !== 0) {
          phase.current +=
            momentum.current * dt

          momentum.current *=
            Math.exp(-FRICTION * dt)

          if (
            Math.abs(
              momentum.current,
            ) < 1
          ) {
            momentum.current = 0
          }
        } else if (animate) {
          const wanted =
            hovering.current
              ? HOVER_SPEED_SCALE
              : 1

          speedScale.current +=
            (wanted -
              speedScale.current) *
            Math.min(
              1,
              dt * SPEED_EASE,
            )

          phase.current -=
            AUTO_SPEED *
            speedScale.current *
            dt
        }
      }

      if (
        phase.current > 360 ||
        phase.current < -360
      ) {
        const wrapped =
          phase.current % 360

        if (
          target.current !== null
        ) {
          target.current +=
            wrapped -
            phase.current
        }

        phase.current = wrapped
      }

      if (
        phase.current === lastPhase
      ) {
        return
      }

      lastPhase = phase.current

      layout()
    }

    stage.addEventListener(
      'pointerenter',
      onEnter,
    )

    stage.addEventListener(
      'pointerleave',
      onLeave,
    )

    document.addEventListener(
      'visibilitychange',
      onVisibility,
    )

    frame =
      requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)

      observer?.disconnect()

      stage.removeEventListener(
        'pointerenter',
        onEnter,
      )

      stage.removeEventListener(
        'pointerleave',
        onLeave,
      )

      document.removeEventListener(
        'visibilitychange',
        onVisibility,
      )
    }
  }, [
    enabled,
    animate,
    layout,
  ])

  const onPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        !enabled ||
        event.button !== 0
      ) {
        return
      }

      const stage =
        event.currentTarget

      stage.setPointerCapture(
        event.pointerId,
      )

      stage.dataset.dragging =
        'true'

      dragging.current = true

      dragMoved.current = 0

      lastX.current =
        event.clientX

      lastMoveAt.current =
        performance.now()

      velocity.current = 0

      target.current = null

      momentum.current = 0

      const onMove = (
        moveEvent: PointerEvent,
      ) => {
        if (
          moveEvent.pointerId !==
          event.pointerId
        ) {
          return
        }

        const now =
          performance.now()

        const dx =
          moveEvent.clientX -
          lastX.current

        const dt = Math.max(
          (now -
            lastMoveAt.current) /
            1000,
          0.001,
        )

        lastX.current =
          moveEvent.clientX

        lastMoveAt.current = now

        dragMoved.current +=
          Math.abs(dx)

        const degrees =
          dx * DEG_PER_PX

        phase.current += degrees

        velocity.current =
          degrees / dt
      }

      const onUp = (
        upEvent: PointerEvent,
      ) => {
        if (
          upEvent.pointerId !==
          event.pointerId
        ) {
          return
        }

        dragging.current = false

        stage.dataset.dragging =
          'false'

        momentum.current = Math.max(
          -MAX_MOMENTUM,
          Math.min(
            MAX_MOMENTUM,
            velocity.current,
          ),
        )

        if (
          performance.now() -
            lastMoveAt.current >
          120
        ) {
          momentum.current = 0
        }

        speedScale.current = 0

        if (
          stage.hasPointerCapture(
            upEvent.pointerId,
          )
        ) {
          stage.releasePointerCapture(
            upEvent.pointerId,
          )
        }

        detach()
      }

      const detach = () => {
        endDrag.current = null

        stage.removeEventListener(
          'pointermove',
          onMove,
        )

        stage.removeEventListener(
          'pointerup',
          onUp,
        )

        stage.removeEventListener(
          'pointercancel',
          onUp,
        )
      }

      endDrag.current = detach

      stage.addEventListener(
        'pointermove',
        onMove,
      )

      stage.addEventListener(
        'pointerup',
        onUp,
      )

      stage.addEventListener(
        'pointercancel',
        onUp,
      )
    },
    [enabled],
  )

  useEffect(
    () => () =>
      endDrag.current?.(),
    [],
  )

  const consumedDrag =
    useCallback(
      () =>
        dragMoved.current >
        DRAG_THRESHOLD,
      [],
    )

  const setCardRef =
    useCallback(
      (index: number) =>
        (
          el: HTMLLIElement | null,
        ) => {
          cardsRef.current[index] =
            el
        },
      [],
    )

  return {
    stageRef,
    setCardRef,
    goTo,
    step,
    onPointerDown,
    consumedDrag,
  }
}

function Services() {
  const mobile = useMobile()

  const reduce =
    useReducedMotion()

  const spatial = !mobile

  const {
    stageRef,
    setCardRef,
    goTo,
    step,
    onPointerDown,
    consumedDrag,
  } = useReel(
    spatial,
    !reduce,
  )

  const dragCursorRef =
    useRef<HTMLDivElement>(null)

  const dragCursorInnerRef =
    useRef<HTMLDivElement>(null)

  const moveDragCursor = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      !spatial ||
      event.pointerType !== 'mouse'
    ) {
      return
    }

    const cursor =
      dragCursorRef.current

    if (!cursor) return

    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
    cursor.style.opacity = '1'
  }

  const showDragCursor = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== 'mouse'
    ) {
      return
    }

    moveDragCursor(event)

    if (
      dragCursorRef.current
    ) {
      dragCursorRef.current.style.opacity =
        '1'
    }
  }

  const hideDragCursor = () => {
    if (
      dragCursorRef.current
    ) {
      dragCursorRef.current.style.opacity =
        '0'
    }

    if (
      dragCursorInnerRef.current
    ) {
      dragCursorInnerRef.current.style.transform =
        'scale(1)'
    }
  }

  const pressDragCursor = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== 'mouse'
    ) {
      return
    }

    if (
      dragCursorInnerRef.current
    ) {
      dragCursorInnerRef.current.style.transform =
        'scale(0.88)'
    }
  }

  const releaseDragCursor = () => {
    if (
      dragCursorInnerRef.current
    ) {
      dragCursorInnerRef.current.style.transform =
        'scale(1)'
    }
  }

  const onKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (!spatial) return

    if (
      event.key === 'ArrowRight'
    ) {
      event.preventDefault()

      step(1)
    } else if (
      event.key === 'ArrowLeft'
    ) {
      event.preventDefault()

      step(-1)
    }
  }

  return (
    <section className="relative w-full overflow-x-clip bg-white py-12 text-[#111] sm:py-14 min-[701px]:py-16 lg:py-20 xl:py-24">
      {/* CUSTOM DRAG CURSOR */}
      {spatial && (
        <div
          ref={dragCursorRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[100] opacity-0 will-change-transform"
          style={{
            transform:
              'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
            transition:
              'opacity 160ms ease',
          }}
        >
          <div
            ref={dragCursorInnerRef}
            className="flex items-center gap-2 rounded-full bg-[#111] px-3.5 py-2.5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out"
          >
            <Icon
              icon="lucide:move-horizontal"
              className="h-[14px] w-[14px]"
            />

            <span className="font-secondary text-[9px] font-medium uppercase tracking-[0.14em]">
              Drag
            </span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="mx-auto flex w-full max-w-[760px] flex-col items-center px-[18px] text-center sm:px-6">
        <FadeUp
          as="h2"
          className="site-display max-w-full font-primary text-neutral-900"
          delay={0.05}
          duration={0.7}
          y={20}
        >
          What we do
        </FadeUp>

        <FadeUp
          as="p"
          className="site-copy mt-3 w-full max-w-[430px] px-1 text-center font-secondary text-[14px] leading-[1.5] text-neutral-600 sm:px-0 sm:text-[15px] min-[701px]:max-w-[460px] min-[701px]:text-[16px]"
          delay={0.12}
          duration={0.7}
          y={20}
        >
          Bringing strategy,
          creativity and execution
          together to build brands
          that grow.
        </FadeUp>
      </header>

      {/* CAROUSEL */}
      <motion.div
        className="relative mx-auto mt-8 w-full sm:mt-10 min-[701px]:mt-11 lg:mt-12 xl:mt-14"
        initial={
          reduce
            ? false
            : {
                opacity: 0,
                y: 36,
              }
        }
        whileInView={
          reduce
            ? undefined
            : {
                opacity: 1,
                y: 0,
              }
        }
        viewport={{
          once: true,
          amount: 0.15,
        }}
        transition={{
          duration: 0.85,
          delay: 0.08,
          ease: [
            0.16,
            1,
            0.3,
            1,
          ],
        }}
      >
        <div className="relative w-full">
          {/* PREVIOUS */}
          {spatial && (
            <button
              type="button"
              onClick={() =>
                step(-1)
              }
              aria-label="Show previous service"
              className="group absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/15 bg-white text-black transition-all duration-300 hover:border-black hover:bg-black hover:text-white active:scale-95 sm:left-4 sm:h-11 sm:w-11 md:left-5 lg:left-7 lg:h-12 lg:w-12 xl:left-9"
            >
              <Icon
                icon="lucide:arrow-left"
                className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-[2px] lg:h-[18px] lg:w-[18px]"
              />
            </button>
          )}

          {/* REEL */}
          <div
            ref={stageRef}
            className="services-stage services-stage--drag"
            onPointerEnter={
              showDragCursor
            }
            onPointerMove={
              moveDragCursor
            }
            onPointerLeave={
              hideDragCursor
            }
            onPointerDown={(
              event,
            ) => {
              pressDragCursor(
                event,
              )

              if (spatial) {
                onPointerDown(
                  event,
                )
              }
            }}
            onPointerUp={
              releaseDragCursor
            }
            onPointerCancel={() => {
              releaseDragCursor()
              hideDragCursor()
            }}
            onKeyDown={onKeyDown}
            tabIndex={
              spatial ? 0 : -1
            }
            role="group"
            aria-roledescription="carousel"
            aria-label="BrandWorks services"
          >
            <ul className="services-ring">
              {categories.map(
                (
                  category,
                  index,
                ) => (
                  <li
                    key={
                      category.label
                    }
                    ref={
                      spatial
                        ? setCardRef(
                            index,
                          )
                        : undefined
                    }
                    className="service-card"
                    onClick={() => {
                      if (
                        !spatial ||
                        consumedDrag()
                      ) {
                        return
                      }

                      goTo(index)
                    }}
                  >
                    <img
                      src={
                        category.image
                      }
                      alt={
                        category.alt ??
                        category.label
                      }
                      loading={
                        index === 0
                          ? 'eager'
                          : 'lazy'
                      }
                      draggable={
                        false
                      }
                    />

                    <div
                      className="service-card__overlay"
                      data-card-overlay
                    >
                      <span className="px-4 text-center font-primary text-[14px] font-medium leading-[1.2] tracking-[-0.02em] text-white sm:text-[15px] min-[701px]:text-[16px] lg:text-[18px]">
                        {
                          category.label
                        }
                      </span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* NEXT */}
          {spatial && (
            <button
              type="button"
              onClick={() =>
                step(1)
              }
              aria-label="Show next service"
              className="group absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/15 bg-white text-black transition-all duration-300 hover:border-black hover:bg-black hover:text-white active:scale-95 sm:right-4 sm:h-11 sm:w-11 md:right-5 lg:right-7 lg:h-12 lg:w-12 xl:right-9"
            >
              <Icon
                icon="lucide:arrow-right"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[2px] lg:h-[18px] lg:w-[18px]"
              />
            </button>
          )}
        </div>
      </motion.div>

      {/* CTA */}
      {/* <motion.div
        className="mx-auto mt-9 flex w-full max-w-[1280px] justify-center px-[18px] sm:mt-10 sm:px-6 min-[701px]:mt-12 lg:mt-14"
        initial={
          reduce
            ? false
            : {
                opacity: 0,
                y: 20,
              }
        }
        whileInView={
          reduce
            ? undefined
            : {
                opacity: 1,
                y: 0,
              }
        }
        viewport={{
          once: true,
          amount: 0.7,
        }}
        transition={{
          duration: 0.7,
          ease: [
            0.16,
            1,
            0.3,
            1,
          ],
        }}
      >
        <a
          href="#work"
          className="group relative flex h-[52px] min-w-[210px] items-center justify-between overflow-hidden rounded-full border border-black/20 bg-white pl-6 pr-2 text-[#111] transition-colors duration-500 sm:h-[56px] sm:min-w-[230px]"
        >
          <span className="absolute inset-y-0 right-0 w-0 bg-[#111] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />

          <span className="relative z-10 font-secondary text-[12px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 group-hover:text-white sm:text-[13px]">
            View selected work
          </span>

          <span className="relative z-10 ml-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#111] text-white transition-all duration-500 group-hover:bg-white group-hover:text-[#111] sm:h-[42px] sm:w-[42px]">
            <Icon
              icon="lucide:arrow-up-right"
              className="h-[16px] w-[16px] transition-transform duration-500 group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
            />
          </span>
        </a>
      </motion.div> */}

      {/* Hide native cursor only for real mouse / trackpad devices */}
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .services-stage--drag {
            cursor: none;
          }

          .services-stage--drag * {
            cursor: none;
          }
        }
      `}</style>
    </section>
  )
}

export default Services