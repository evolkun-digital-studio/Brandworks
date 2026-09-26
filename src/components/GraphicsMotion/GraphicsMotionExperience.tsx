import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'

import {
  GRAPHICS_PROJECTS,
  GRAPHICS_SECTION,
} from '../../data/graphicsMotion'

import { matches } from '../../lib/scrollMotion'

import './GraphicsMotion.css'

gsap.registerPlugin(ScrollTrigger)

const TOTAL = GRAPHICS_PROJECTS.length

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Arrow navigation movement.
 */
const STEP = {
  duration: 0.9,
  ease: 'power3.inOut',
}

/**
 * Mouse drag release movement.
 */
const GLIDE = {
  duration: 0.8,
  ease: 'power3.out',
}

const THROW = 260

type Drag = {
  pointerId: number
  startX: number
  startLeft: number
  lastX: number
  lastTime: number
  velocity: number
  moved: boolean
}

/* =========================================================
   ARROW ICON
========================================================= */

function Arrow({
  direction,
}: {
  direction: 'prev' | 'next'
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'prev' ? (
        <>
          <line
            x1="19"
            y1="12"
            x2="5"
            y2="12"
          />

          <polyline points="11 6 5 12 11 18" />
        </>
      ) : (
        <>
          <line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
          />

          <polyline points="13 6 19 12 13 18" />
        </>
      )}
    </svg>
  )
}

/* =========================================================
   GRAPHICS & MOTION
========================================================= */

function GraphicsMotionExperience() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const dragRef = useRef<Drag | null>(null)

  const suppressClickRef = useRef(false)

  const targetRef = useRef<number | null>(null)

  const reduceMotion = Boolean(
    useReducedMotion(),
  )

  const [active, setActive] = useState(0)

  const [atStart, setAtStart] =
    useState(true)

  const [atEnd, setAtEnd] =
    useState(false)

  /* =======================================================
     GEOMETRY
  ======================================================= */

  const cardsOf = (
    scroller: HTMLElement,
  ) =>
    Array.from(
      scroller.querySelectorAll<HTMLElement>(
        '[data-gm-card]',
      ),
    )

  /**
   * Get the scrollLeft position necessary
   * to align card `i` with the gallery inset.
   */
  const leftFor = useCallback(
    (
      scroller: HTMLElement,
      i: number,
    ) => {
      const card = cardsOf(scroller)[i]

      if (!card) return 0

      const inset =
        parseFloat(
          getComputedStyle(scroller)
            .paddingLeft,
        ) || 0

      const max =
        scroller.scrollWidth -
        scroller.clientWidth

      return Math.min(
        Math.max(
          card.offsetLeft - inset,
          0,
        ),
        max,
      )
    },
    [],
  )

  /**
   * Find nearest project based
   * on horizontal scroll position.
   */
  const nearestTo = useCallback(
    (
      scroller: HTMLElement,
      left: number,
    ) => {
      let best = 0
      let bestDistance = Infinity

      for (
        let i = 0;
        i < TOTAL;
        i++
      ) {
        const distance = Math.abs(
          leftFor(scroller, i) -
            left,
        )

        if (
          distance <
          bestDistance - 1
        ) {
          best = i
          bestDistance = distance
        }
      }

      return best
    },
    [leftFor],
  )

  /**
   * Synchronise controls with
   * native horizontal scroll.
   */
  const sync = useCallback(() => {
    const scroller =
      scrollerRef.current

    if (!scroller) return

    const left =
      scroller.scrollLeft

    const max =
      scroller.scrollWidth -
      scroller.clientWidth

    setAtStart(left <= 2)

    setAtEnd(
      left >= max - 2,
    )

    setActive(
      targetRef.current ??
        nearestTo(
          scroller,
          left,
        ),
    )
  }, [nearestTo])

  /* =======================================================
     MOVEMENT
  ======================================================= */

  const glideTo = useCallback(
    (
      index: number,
      motion: {
        duration: number
        ease: string
      } = STEP,
    ) => {
      const scroller =
        scrollerRef.current

      if (!scroller) return

      const i = Math.min(
        Math.max(index, 0),
        TOTAL - 1,
      )

      const left = leftFor(
        scroller,
        i,
      )

      gsap.killTweensOf(
        scroller,
      )

      if (reduceMotion) {
        scroller.scrollLeft =
          left

        return
      }

      /*
       * Native touch scrolling.
       */
      if (
        matches(
          '(pointer: coarse)',
        )
      ) {
        scroller.scrollTo({
          left,
          behavior: 'smooth',
        })

        return
      }

      targetRef.current = i

      setActive(i)

      gsap.to(scroller, {
        scrollLeft: left,

        ...motion,

        onComplete: () => {
          targetRef.current =
            null

          sync()
        },
      })
    },
    [
      leftFor,
      reduceMotion,
      sync,
    ],
  )

  const step = (
    delta: number,
  ) => {
    glideTo(
      (targetRef.current ??
        active) + delta,
    )
  }

  const stopGlide = () => {
    const scroller =
      scrollerRef.current

    if (scroller) {
      gsap.killTweensOf(
        scroller,
      )
    }

    targetRef.current = null
  }

  /* =======================================================
     RESIZE
  ======================================================= */

  useEffect(() => {
    sync()

    window.addEventListener(
      'resize',
      sync,
    )

    return () =>
      window.removeEventListener(
        'resize',
        sync,
      )
  }, [sync])

  /* =======================================================
     DESKTOP MOUSE DRAG
  ======================================================= */

  const onPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      e.pointerType !== 'mouse' ||
      e.button !== 0
    ) {
      return
    }

    suppressClickRef.current =
      false

    stopGlide()

    const now =
      performance.now()

    dragRef.current = {
      pointerId: e.pointerId,

      startX: e.clientX,

      startLeft:
        e.currentTarget
          .scrollLeft,

      lastX: e.clientX,

      lastTime: now,

      velocity: 0,

      moved: false,
    }
  }

  const onPointerMove = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current

    if (
      !drag ||
      drag.pointerId !==
        e.pointerId
    ) {
      return
    }

    const scroller =
      e.currentTarget

    const dx =
      e.clientX -
      drag.startX

    if (!drag.moved) {
      if (
        Math.abs(dx) < 5
      ) {
        return
      }

      drag.moved = true

      scroller.setPointerCapture(
        e.pointerId,
      )

      scroller.classList.add(
        'is-dragging',
      )
    }

    const now =
      performance.now()

    const dt = Math.max(
      now -
        drag.lastTime,
      1,
    )

    drag.velocity =
      drag.velocity * 0.6 +
      ((e.clientX -
        drag.lastX) /
        dt) *
        0.4

    drag.lastX = e.clientX

    drag.lastTime = now

    scroller.scrollLeft =
      drag.startLeft - dx
  }

  const endDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current

    if (
      !drag ||
      drag.pointerId !==
        e.pointerId
    ) {
      return
    }

    dragRef.current = null

    const scroller =
      e.currentTarget

    if (!drag.moved) return

    scroller.classList.remove(
      'is-dragging',
    )

    if (
      scroller.hasPointerCapture(
        e.pointerId,
      )
    ) {
      scroller.releasePointerCapture(
        e.pointerId,
      )
    }

    suppressClickRef.current =
      true

    const thrown =
      scroller.scrollLeft -
      drag.velocity *
        THROW

    glideTo(
      nearestTo(
        scroller,
        thrown,
      ),
      GLIDE,
    )
  }

  /* =======================================================
     CARD INTERACTION
  ======================================================= */

  const onCardClick = (
    i: number,
  ) => {
    if (
      suppressClickRef.current
    ) {
      suppressClickRef.current =
        false

      return
    }

    glideTo(i)
  }

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const onKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      e.key ===
      'ArrowRight'
    ) {
      e.preventDefault()

      step(1)
    } else if (
      e.key ===
      'ArrowLeft'
    ) {
      e.preventDefault()

      step(-1)
    }
  }

  /* =======================================================
     CUSTOM VIEW CURSOR
  ======================================================= */

  useEffect(() => {
    const section =
      sectionRef.current

    const cursor =
      cursorRef.current

    if (
      !section ||
      !cursor ||
      !matches(
        '(hover: hover) and (pointer: fine)',
      )
    ) {
      return
    }

    section.classList.add(
      'has-view-cursor',
    )

    const follow =
      reduceMotion
        ? 0.01
        : 0.35

    const toX = gsap.quickTo(
      cursor,
      'x',
      {
        duration: follow,
        ease: 'power3.out',
      },
    )

    const toY = gsap.quickTo(
      cursor,
      'y',
      {
        duration: follow,
        ease: 'power3.out',
      },
    )

    let visible = false

    const show = (
      next: boolean,
    ) => {
      if (
        next === visible
      ) {
        return
      }

      visible = next

      cursor.classList.toggle(
        'is-visible',
        next,
      )
    }

    const onMove = (
      e: PointerEvent,
    ) => {
      if (
        e.pointerType !==
        'mouse'
      ) {
        return
      }

      const overCard =
        e.target instanceof
          Element &&
        e.target.closest(
          '[data-gm-card]',
        ) !== null

      if (
        overCard &&
        !visible
      ) {
        gsap.set(cursor, {
          x: e.clientX,
          y: e.clientY,
        })
      }

      toX(e.clientX)
      toY(e.clientY)

      show(overCard)
    }

    const hide = () =>
      show(false)

    section.addEventListener(
      'pointermove',
      onMove,
    )

    section.addEventListener(
      'pointerleave',
      hide,
    )

    window.addEventListener(
      'scroll',
      hide,
      {
        passive: true,
      },
    )

    return () => {
      section.classList.remove(
        'has-view-cursor',
      )

      section.removeEventListener(
        'pointermove',
        onMove,
      )

      section.removeEventListener(
        'pointerleave',
        hide,
      )

      window.removeEventListener(
        'scroll',
        hide,
      )
    }
  }, [reduceMotion])

  /* =======================================================
     ENTRANCE ANIMATION
  ======================================================= */

  useGSAP(
    () => {
      const mm =
        gsap.matchMedia()

      mm.add(
        '(prefers-reduced-motion: no-preference)',

        () => {
          gsap
            .timeline({
              defaults: {
                ease: 'power3.out',
              },

              scrollTrigger: {
                trigger:
                  sectionRef.current,

                start:
                  'top 72%',

                once: true,
              },
            })

            .from(
              '[data-gm-label]',
              {
                autoAlpha: 0,
                y: 12,
                duration: 0.6,
              },
            )

            .from(
              '[data-gm-heading-line]',
              {
                yPercent: 105,
                duration: 0.95,
                ease: 'power4.out',
              },
              '-=0.35',
            )

            .from(
              '[data-gm-description]',
              {
                autoAlpha: 0,
                y: 16,
                duration: 0.8,
              },
              '-=0.6',
            )

            .from(
              '[data-gm-controls]',
              {
                autoAlpha: 0,
                y: 10,
                duration: 0.6,
              },
              '-=0.35',
            )

            .from(
              '[data-gm-track]',
              {
                y: 40,
                duration: 1.1,
              },
              '-=0.55',
            )

            .from(
              '[data-gm-card-inner]',
              {
                autoAlpha: 0,
                duration: 0.9,
                stagger: 0.08,
                ease: 'power2.out',
              },
              '<',
            )
        },
      )

      return () =>
        mm.revert()
    },

    {
      scope: sectionRef,
    },
  )

  const shown = atEnd
    ? TOTAL
    : active + 1

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <section
      ref={sectionRef}
      id="graphics-motion"
      aria-labelledby="graphics-motion-heading"
      className="gm-section"
    >
      {/* =============================
          INTRO
      ============================== */}

      <div className="section-container gm-head">
        <div className="gm-intro"> 

          <h2
            id="graphics-motion-heading"
            className="section-heading gm-heading"
          >
            <span className="gm-mask">
              <span
                data-gm-heading-line
                className="gm-heading__line"
              >
                {
                  GRAPHICS_SECTION.heading
                }
              </span>
            </span>
          </h2>

          <p
            data-gm-description
            className="section-description gm-description"
          >
            {
              GRAPHICS_SECTION.description
            }
          </p>
        </div>
      </div>

      {/* =============================
          NAVIGATION
          Now directly above gallery
      ============================== */}

      <div
        data-gm-controls
        className="gm-gallery-controls"
      >
        <div className="gm-controls">
         

          <button
            type="button"
            className="gm-arrow"
            onClick={() =>
              step(-1)
            }
            disabled={atStart}
            aria-label="Previous project"
          >
            <Arrow direction="prev" />
          </button>

          <button
            type="button"
            className="gm-arrow"
            onClick={() =>
              step(1)
            }
            disabled={atEnd}
            aria-label="Next project"
          >
            <Arrow direction="next" />
          </button>
        </div>
      </div>

      {/* =============================
          HORIZONTAL GALLERY
      ============================== */}

      <div
        ref={scrollerRef}
        data-gm-track
        data-lenis-prevent-horizontal
        className="gm-track"
        role="region"
        aria-roledescription="carousel"
        aria-label="Graphic and motion projects"
        tabIndex={0}
        onScroll={() => {
          if (
            targetRef.current ===
            null
          ) {
            sync()
          }
        }}
        onKeyDown={onKeyDown}
        onPointerDown={
          onPointerDown
        }
        onPointerMove={
          onPointerMove
        }
        onPointerUp={endDrag}
        onPointerCancel={
          endDrag
        }
        onWheel={stopGlide}
        onTouchStart={stopGlide}
      >
        {GRAPHICS_PROJECTS.map(
          (project, i) => (
            <article
              key={project.id}
              data-gm-card
              className={`gm-card ${
                i === active
                  ? 'is-active'
                  : ''
              }`}
              style={
                {
                  '--gm-ratio': `${project.width} / ${project.height}`,
                } as CSSProperties
              }
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${TOTAL}: ${project.category}`}
              tabIndex={0}
              onClick={() =>
                onCardClick(i)
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  'Enter'
                ) {
                  glideTo(i)
                }
              }}
            >
              <div
                data-gm-card-inner
                className="gm-card__inner"
              >
                <div className="gm-card__media">
                  <img
                    src={
                      project.image
                    }
                    srcSet={
                      project.srcSet
                    }
                    sizes="
                      (max-width: 639px) 84vw,
                      (max-width: 1023px) 70vw,
                      60vw
                    "
                    width={
                      project.width
                    }
                    height={
                      project.height
                    }
                    alt={project.alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="gm-card__img"
                  />
                </div>

                <div
                  className="gm-card__shade"
                  aria-hidden="true"
                />

                <div className="gm-card__info">
                  <h3 className="gm-mask">
                    <span className="gm-line gm-card__title">
                      {
                        project.title
                      }
                    </span>
                  </h3>
                </div>
              </div>
            </article>
          ),
        )}
      </div>

      {/* =============================
          CUSTOM CURSOR
      ============================== */}

      <div
        ref={cursorRef}
        className="gm-cursor"
        aria-hidden="true"
      >
        <span className="gm-cursor__dot">
          View
        </span>
      </div>
    </section>
  )
}

export default GraphicsMotionExperience