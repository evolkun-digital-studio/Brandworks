'use client'

import Image from 'next/image'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import type { MotionValue } from 'motion/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'
import { mediaUrl } from '../lib/media'
import './Results.css'

const metrics = [
  { title: 'Reputation', image: mediaUrl('Reputation.jpg') },
  { title: 'Performance', image: mediaUrl('performance.jpg') },
  { title: 'Visibility', image: mediaUrl('Visibility.jpg') },
  { title: 'Engagement', image: mediaUrl('enga.webp') },
  { title: 'Search', image: mediaUrl('search.jpg') },
] as const

const CARD_COUNT = metrics.length
const INITIAL_INDEX = 2
// The ring renders each metric twice so the wrap seam (|d| = SLOT_COUNT / 2)
// always sits well beyond the visible stack and cards never pop.
const COPIES = 2
const SLOT_COUNT = CARD_COUNT * COPIES
// Past this many cards from zero, progress is folded back by whole turns.
const RECENTRE_BEYOND = CARD_COUNT * 10

// When true, page scroll also moves the wheel while the section passes
// through the viewport (blended with drag). Never pins or hijacks scroll.
const SCROLL_LINKED = false

// When true, the stack advances one card every AUTO_LOOP_MS while in view,
// pausing on hover, focus, drag, a hidden tab and reduced motion.
const AUTO_LOOP = false
const AUTO_LOOP_MS = 3500

const SNAP_SPRING = { type: 'spring', stiffness: 160, damping: 24, mass: 0.9 } as const
const MOMENTUM_PROJECTION = 0.25 // seconds of velocity projected on release
const DRAG_THRESHOLD_PX = 6
const WHEEL_SNAP_DELAY_MS = 140
const CARD_ASPECT = 1.1 // height / width

// The stack's geometry depends only on each card's offset d from the front,
// never on velocity or dragging, so it can't spread while moving.
const FAN_DEG_PER_CARD = 4
const MAX_FAN_DEG = 10
const SINK_PX_PER_CARD = 10
const SCALE_PER_CARD = 0.13
const SCALE_DEPTH_LIMIT = 2.5
const BRIGHTNESS_PER_CARD = 0.08
const DEPTH_BLUR_FROM = 0.5
const DEPTH_BLUR_FULL_AT = 2
const MAX_DEPTH_BLUR = 3
const MAX_MOTION_BLUR = 2
const VISIBLE_WITHIN = 2
const FADED_AT = 2.6

type Breakpoint = 'desktop' | 'tablet' | 'mobile'

type StackLayout = {
  breakpoint: Breakpoint
  cardWidth: number
  cardHeight: number
  spacing: number
}

function getLayout(viewportWidth: number): StackLayout {
  const breakpoint: Breakpoint =
    viewportWidth >= 1024 ? 'desktop' : viewportWidth >= 768 ? 'tablet' : 'mobile'
  const cardWidth =
    breakpoint === 'desktop'
      ? 300
      : breakpoint === 'tablet'
        ? 240
        : Math.min(220, Math.round(viewportWidth * 0.58))
  return {
    breakpoint,
    cardWidth,
    cardHeight: Math.round(cardWidth * CARD_ASPECT),
    // Neighbours overlap the front card by roughly 58–62%.
    spacing: cardWidth * (breakpoint === 'mobile' ? 0.38 : 0.42),
  }
}

function subscribeToViewport(callback: () => void) {
  window.addEventListener('resize', callback, { passive: true })
  return () => window.removeEventListener('resize', callback)
}

function getViewportWidth() {
  return window.innerWidth
}

function getServerViewportWidth() {
  return 1440
}

function useViewportWidth() {
  return useSyncExternalStore(
    subscribeToViewport,
    getViewportWidth,
    getServerViewportWidth,
  )
}

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getServerReducedMotion() {
  return false
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  )
}

function wrap(value: number, min: number, max: number) {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}

const mod = (value: number, size: number) => ((value % size) + size) % size

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// Offset of a rendered slot from the front of the stack, in cards.
const slotOffset = (slot: number, position: number) =>
  wrap(slot - position, -SLOT_COUNT / 2, SLOT_COUNT / 2)

// For each metric, the copy nearest the front — the only one exposed to
// assistive tech and the tab order.
function getPrimarySlots(position: number) {
  const primary = new Set<number>()
  for (let metric = 0; metric < CARD_COUNT; metric++) {
    let best = metric
    for (let slot = metric + CARD_COUNT; slot < SLOT_COUNT; slot += CARD_COUNT) {
      if (Math.abs(slotOffset(slot, position)) < Math.abs(slotOffset(best, position))) {
        best = slot
      }
    }
    primary.add(best)
  }
  return primary
}

type CardProps = {
  slot: number
  metric: (typeof metrics)[number]
  progress: MotionValue<number>
  motionBlur: MotionValue<number>
  layout: StackLayout
  reduceMotion: boolean
  isActive: boolean
  isPrimary: boolean
  buttonRef: (node: HTMLButtonElement | null) => void
  onSelect: (slot: number) => void
}

function StackCard({
  slot,
  metric,
  progress,
  motionBlur,
  layout,
  reduceMotion,
  isActive,
  isPrimary,
  buttonRef,
  onSelect,
}: CardProps) {
  const offset = useTransform(progress, (p) => slotOffset(slot, p))
  const x = useTransform(offset, (d) => d * layout.spacing)
  const y = useTransform(offset, (d) => Math.abs(d) * SINK_PX_PER_CARD)
  const rotate = useTransform(offset, (d) =>
    clamp(d * FAN_DEG_PER_CARD, -MAX_FAN_DEG, MAX_FAN_DEG),
  )
  const scale = useTransform(
    offset,
    (d) => 1 - SCALE_PER_CARD * Math.min(Math.abs(d), SCALE_DEPTH_LIMIT),
  )
  // Fade out past the visible stack rather than popping; fully gone well
  // before the wrap seam.
  const opacity = useTransform(offset, (d) =>
    clamp((FADED_AT - Math.abs(d)) / (FADED_AT - VISIBLE_WITHIN), 0, 1),
  )
  const zIndex = useTransform(offset, (d) => 100 - Math.round(Math.abs(d) * 10))
  const pointerEvents = useTransform(offset, (d) =>
    Math.abs(d) > VISIBLE_WITHIN ? 'none' : 'auto',
  )
  const filter = useTransform([offset, motionBlur], ([d, extra]: number[]) => {
    const distance = Math.abs(d)
    const brightness = `brightness(${(1 - BRIGHTNESS_PER_CARD * distance).toFixed(3)})`
    if (reduceMotion) return brightness
    const depth =
      MAX_DEPTH_BLUR *
      clamp((distance - DEPTH_BLUR_FROM) / (DEPTH_BLUR_FULL_AT - DEPTH_BLUR_FROM), 0, 1)
    const blur = depth + extra
    return blur < 0.05 ? brightness : `blur(${blur.toFixed(2)}px) ${brightness}`
  })
  const nearInitial = Math.abs(slotOffset(slot, INITIAL_INDEX)) <= 1

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={`measure__card${isActive ? ' is-active' : ''}`}
      aria-label={isPrimary ? `${metric.title}${isActive ? ', current' : ''}` : undefined}
      aria-current={isPrimary && isActive ? 'true' : undefined}
      aria-hidden={isPrimary ? undefined : true}
      inert={!isPrimary}
      tabIndex={isPrimary && isActive ? 0 : -1}
      onClick={() => onSelect(slot)}
      style={{
        width: layout.cardWidth,
        height: layout.cardHeight,
        x,
        y,
        rotate,
        scale,
        opacity,
        zIndex,
        pointerEvents,
        filter,
      }}
    >
      <Image
        src={metric.image}
        alt={`${metric.title} — what we measure`}
        fill
        draggable={false}
        sizes="(max-width: 767px) 58vw, (max-width: 1023px) 240px, 300px"
        className="measure__image"
        loading={nearInitial ? 'eager' : 'lazy'}
      />
      <span className="measure__shade" aria-hidden="true" />
      <span className="measure__label" aria-hidden="true">
        {metric.title}
      </span>
    </motion.button>
  )
}

// Only mounted when SCROLL_LINKED is on, so the scroll listener costs
// nothing by default.
function ScrollLink({
  sectionRef,
  progress,
  isDraggingRef,
}: {
  sectionRef: RefObject<HTMLElement | null>
  progress: MotionValue<number>
  isDraggingRef: RefObject<boolean>
}) {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const lastRef = useRef<number | null>(null)
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const last = lastRef.current
    lastRef.current = value
    if (last === null || isDraggingRef.current) return
    // Add the scroll delta to the current position, so drag and scroll blend.
    progress.set(progress.get() + (value - last) * (CARD_COUNT - 1))
  })
  return null
}

export default function Results() {
  const viewportWidth = useViewportWidth()
  const reduceMotion = usePrefersReducedMotion()
  const layout = getLayout(viewportWidth)
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const isInView = useInView(sectionRef, { once: true, amount: 0.28 })
  const isInViewNow = useInView(sectionRef, { amount: 0.28 })
  // The slot the stack is settling on, kept within [0, SLOT_COUNT).
  const [activeSlot, setActiveSlot] = useState(INITIAL_INDEX)
  const activeIndex = activeSlot % CARD_COUNT
  const primarySlots = useMemo(() => getPrimarySlots(activeSlot), [activeSlot])
  const [isDragging, setIsDragging] = useState(false)

  const progress = useMotionValue(INITIAL_INDEX)
  const velocity = useVelocity(progress)
  const motionBlurTarget = useTransform(velocity, (v) =>
    reduceMotion ? 0 : Math.min(MAX_MOTION_BLUR, Math.abs(v) * 0.35),
  )
  const motionBlur = useSpring(motionBlurTarget, { stiffness: 320, damping: 32 })

  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startProgress: 0,
    moved: 0,
    active: false,
  })
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const wheelRawRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Where the stack is heading, so rapid key presses chain from the target
  // rather than from a mid-spring position.
  const targetRef = useRef(INITIAL_INDEX)
  const focusPendingRef = useRef(false)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)

  // Latest values for the native wheel listener, without re-binding it.
  const layoutRef = useRef(layout)
  const reduceMotionRef = useRef(reduceMotion)
  useEffect(() => {
    layoutRef.current = layout
    reduceMotionRef.current = reduceMotion
  })

  const entered = isInView || reduceMotion

  // Fold progress back by whole turns once settled, so it never drifts into
  // float imprecision. The wrapped layout is identical, and jump() zeroes
  // the velocity so motion blur doesn't flash.
  const recentre = useCallback(
    (index: number) => {
      if (Math.abs(index) <= RECENTRE_BEYOND) return
      const centred = mod(index, SLOT_COUNT)
      progress.jump(centred)
      if (targetRef.current === index) targetRef.current = centred
    },
    [progress],
  )

  const settleTo = useCallback(
    (target: number, withVelocity = progress.getVelocity()) => {
      const index = Math.round(target)
      targetRef.current = index
      // Committed once per settle, never per frame: drives aria-current, the
      // live region and which copy of each metric is exposed.
      setActiveSlot(mod(index, SLOT_COUNT))
      if (reduceMotionRef.current) {
        progress.stop()
        progress.jump(index)
        recentre(index)
        return
      }
      animate(progress, index, {
        ...SNAP_SPRING,
        velocity: withVelocity,
        onComplete: () => recentre(index),
      })
    },
    [progress, recentre],
  )

  const goTo = useCallback(
    (index: number, focus = false) => {
      if (focus) focusPendingRef.current = true
      settleTo(index)
    },
    [settleTo],
  )

  // Focus the newly active copy once it is exposed (it may have been inert a
  // render ago), and rescue focus from a copy that just went inert.
  useEffect(() => {
    const focusedSlot = cardRefs.current.findIndex(
      (node) => node !== null && node === document.activeElement,
    )
    const stranded = focusedSlot !== -1 && !primarySlots.has(focusedSlot)
    if (focusPendingRef.current || stranded) {
      focusPendingRef.current = false
      cardRefs.current[activeSlot]?.focus({ preventScroll: true })
    }
  }, [activeSlot, primarySlots])

  useEffect(() => {
    if (!AUTO_LOOP || reduceMotion || !isInViewNow) return
    const timer = setInterval(() => {
      if (
        document.hidden ||
        hoveredRef.current ||
        focusedRef.current ||
        isDraggingRef.current ||
        wheelRawRef.current !== null
      ) {
        return
      }
      settleTo(targetRef.current + 1, 0)
    }, AUTO_LOOP_MS)
    return () => clearInterval(timer)
  }, [isInViewNow, reduceMotion, settleTo])

  // Horizontal trackpad swipes. Native, non-passive listener so the
  // horizontal gesture can be claimed; vertical wheel events are left
  // completely alone for Lenis and the page.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      event.stopPropagation()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1
      const { spacing } = layoutRef.current
      progress.stop()
      if (wheelRawRef.current === null) wheelRawRef.current = progress.get()
      wheelRawRef.current += (event.deltaX * unit) / spacing
      if (reduceMotionRef.current) {
        const index = Math.round(wheelRawRef.current)
        if (index !== progress.get()) progress.jump(index)
      } else {
        progress.set(wheelRawRef.current)
      }
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(() => {
        wheelRawRef.current = null
        settleTo(progress.get(), 0)
      }, WHEEL_SNAP_DELAY_MS)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', onWheel)
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    }
  }, [progress, settleTo])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    progress.stop()
    suppressClickRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startProgress: progress.get(),
      moved: 0,
      active: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy))
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return
      drag.active = true
      isDraggingRef.current = true
      suppressClickRef.current = true
      setIsDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    // The whole stack slides as one unit; cards pass behind each other.
    const next = drag.startProgress - dx / layout.spacing
    if (reduceMotion) {
      const index = Math.round(next)
      if (index !== progress.get()) progress.jump(index)
    } else {
      progress.set(next)
    }
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return
    drag.pointerId = -1
    if (!drag.active) return
    drag.active = false
    isDraggingRef.current = false
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (reduceMotion) {
      settleTo(progress.get(), 0)
      return
    }
    const v = progress.getVelocity()
    settleTo(progress.get() + v * MOMENTUM_PROJECTION, v)
  }

  const handleSelect = (slot: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    // Move by the card's wrapped offset: always the short way round.
    const current = progress.get()
    goTo(current + slotOffset(slot, current))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const fromCard = event.target !== event.currentTarget
    const current = targetRef.current
    // Shortest signed number of steps from the current metric to another.
    const stepsTo = (metric: number) =>
      Math.round(wrap(metric - mod(current, CARD_COUNT), -CARD_COUNT / 2, CARD_COUNT / 2))
    let target: number
    if (event.key === 'ArrowLeft') target = current - 1
    else if (event.key === 'ArrowRight') target = current + 1
    else if (event.key === 'Home') target = current + stepsTo(0)
    else if (event.key === 'End') target = current + stepsTo(CARD_COUNT - 1)
    else return
    event.preventDefault()
    goTo(target, fromCard)
  }

  return (
    <section ref={sectionRef} className="measure" aria-labelledby="measure-heading">
      {SCROLL_LINKED && (
        <ScrollLink
          sectionRef={sectionRef}
          progress={progress}
          isDraggingRef={isDraggingRef}
        />
      )}
      <motion.h2
        id="measure-heading"
        className="measure__heading site-display"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        What we measure.
      </motion.h2>

      <motion.div
        ref={stageRef}
        className={`measure__stage${isDragging ? ' is-dragging' : ''}`}
        style={{ height: layout.cardHeight + 2 * VISIBLE_WITHIN * SINK_PX_PER_CARD + 40 }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Brand performance metrics"
        tabIndex={0}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => {
          hoveredRef.current = true
        }}
        onPointerLeave={() => {
          hoveredRef.current = false
        }}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) focusedRef.current = false
        }}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          const metric = metrics[slot % CARD_COUNT]
          const copy = Math.floor(slot / CARD_COUNT)
          return (
            <StackCard
              // Remount on breakpoint / motion-preference change so the
              // transforms pick up the new stack constants.
              key={`${metric.title}-${copy}-${layout.breakpoint}-${reduceMotion ? 'r' : 'm'}`}
              slot={slot}
              metric={metric}
              progress={progress}
              motionBlur={motionBlur}
              layout={layout}
              reduceMotion={reduceMotion}
              isActive={slot === activeSlot}
              isPrimary={primarySlots.has(slot)}
              buttonRef={(node) => {
                cardRefs.current[slot] = node
              }}
              onSelect={handleSelect}
            />
          )
        })}
      </motion.div>

      <p className="measure__announcement" aria-live="polite">
        {metrics[activeIndex].title}, {activeIndex + 1} of {CARD_COUNT}
      </p>
    </section>
  )
}
