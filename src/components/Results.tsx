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
const MAX_INDEX = CARD_COUNT - 1
const INITIAL_INDEX = 2

// When true, page scroll also moves the wheel while the section passes
// through the viewport (blended with drag). Never pins or hijacks scroll.
const SCROLL_LINKED = false

const SNAP_SPRING = { type: 'spring', stiffness: 140, damping: 22, mass: 0.9 } as const
const MOMENTUM_PROJECTION = 0.25 // seconds of velocity projected on release
const RUBBER_BAND = 0.3 // speed beyond the first/last card
const DRAG_THRESHOLD_PX = 6
const WHEEL_SNAP_DELAY_MS = 140
const CARD_ASPECT = 1.1 // height / width
const HIDDEN_BEYOND = 3.2

type Breakpoint = 'desktop' | 'tablet' | 'mobile'

type WheelLayout = {
  breakpoint: Breakpoint
  cardWidth: number
  cardHeight: number
  spacing: number
  stepDeg: number
  radius: number
  maxDepthBlur: number
}

function getLayout(viewportWidth: number): WheelLayout {
  const breakpoint: Breakpoint =
    viewportWidth >= 1024 ? 'desktop' : viewportWidth >= 768 ? 'tablet' : 'mobile'
  const cardWidth =
    breakpoint === 'desktop'
      ? 300
      : breakpoint === 'tablet'
        ? 240
        : Math.min(240, Math.round(viewportWidth * 0.62))
  const mobile = breakpoint === 'mobile'
  return {
    breakpoint,
    cardWidth,
    cardHeight: Math.round(cardWidth * CARD_ASPECT),
    spacing: cardWidth * 0.72,
    stepDeg: mobile ? 12 : 9,
    radius: mobile ? 900 : 1400,
    // Lighter depth of field on phones, where filter: blur costs the most.
    maxDepthBlur: mobile ? 3 : 6,
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

const clampIndex = (value: number) => Math.min(MAX_INDEX, Math.max(0, value))

// Raw (finger) position → displayed position, with resistance past the ends.
function rubberBand(raw: number) {
  if (raw < 0) return raw * RUBBER_BAND
  if (raw > MAX_INDEX) return MAX_INDEX + (raw - MAX_INDEX) * RUBBER_BAND
  return raw
}

function unRubberBand(shown: number) {
  if (shown < 0) return shown / RUBBER_BAND
  if (shown > MAX_INDEX) return MAX_INDEX + (shown - MAX_INDEX) / RUBBER_BAND
  return shown
}

type CardProps = {
  index: number
  metric: (typeof metrics)[number]
  progress: MotionValue<number>
  motionBlur: MotionValue<number>
  layout: WheelLayout
  reduceMotion: boolean
  isActive: boolean
  buttonRef: (node: HTMLButtonElement | null) => void
  onSelect: (index: number) => void
}

function WheelCard({
  index,
  metric,
  progress,
  motionBlur,
  layout,
  reduceMotion,
  isActive,
  buttonRef,
  onSelect,
}: CardProps) {
  const { radius, stepDeg, maxDepthBlur } = layout
  const offset = useTransform(progress, (p) => index - p)
  const angle = useTransform(offset, (d) => d * stepDeg)
  const x = useTransform(angle, (a) => radius * Math.sin((a * Math.PI) / 180))
  const y = useTransform(angle, (a) => radius * (1 - Math.cos((a * Math.PI) / 180)))
  const rotate = useTransform(angle, (a) => a * 0.9)
  const rotateY = useTransform(offset, (d) => Math.max(-24, Math.min(24, -d * 6)))
  const scale = useTransform(offset, (d) => Math.max(0.62, 1 - 0.14 * Math.abs(d)))
  const opacity = useTransform(offset, (d) => {
    const distance = Math.abs(d)
    // Fade out over the last 0.3 cards rather than popping at the cutoff.
    const edge = Math.min(1, Math.max(0, (HIDDEN_BEYOND - distance) / 0.3))
    return Math.max(0.25, 1 - 0.22 * distance) * edge
  })
  const zIndex = useTransform(offset, (d) => 100 - Math.round(Math.abs(d) * 10))
  const pointerEvents = useTransform(offset, (d) =>
    Math.abs(d) > HIDDEN_BEYOND ? 'none' : 'auto',
  )
  const filter = useTransform([offset, motionBlur], ([d, extra]: number[]) => {
    if (reduceMotion) return 'none'
    const depth = Math.min(maxDepthBlur, 2.2 * Math.max(0, Math.abs(d) - 0.4))
    const blur = depth + extra
    return blur < 0.05 ? 'none' : `blur(${blur.toFixed(2)}px)`
  })
  const nearInitial = Math.abs(index - INITIAL_INDEX) <= 1

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className="measure__card"
      aria-label={`${metric.title}${isActive ? ', current' : ''}`}
      aria-current={isActive ? 'true' : undefined}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onSelect(index)}
      style={{
        width: layout.cardWidth,
        height: layout.cardHeight,
        x,
        y,
        rotate,
        rotateY,
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
        sizes="(max-width: 767px) 62vw, (max-width: 1023px) 240px, 300px"
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
    progress.set(clampIndex(progress.get() + (value - last) * MAX_INDEX))
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
  const [activeIndex, setActiveIndex] = useState(INITIAL_INDEX)
  const [isDragging, setIsDragging] = useState(false)

  const progress = useMotionValue(INITIAL_INDEX)
  const velocity = useVelocity(progress)
  const motionBlurTarget = useTransform(velocity, (v) =>
    reduceMotion ? 0 : Math.min(3, Math.abs(v) * 0.35),
  )
  const motionBlur = useSpring(motionBlurTarget, { stiffness: 320, damping: 32 })

  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startRaw: 0,
    moved: 0,
    active: false,
  })
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const wheelRawRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Latest values for the native wheel listener, without re-binding it.
  const layoutRef = useRef(layout)
  const reduceMotionRef = useRef(reduceMotion)
  useEffect(() => {
    layoutRef.current = layout
    reduceMotionRef.current = reduceMotion
  })

  const entered = isInView || reduceMotion

  const settleTo = useCallback(
    (target: number, withVelocity = progress.getVelocity()) => {
      const index = clampIndex(Math.round(target))
      if (reduceMotionRef.current) {
        progress.stop()
        progress.set(index)
        setActiveIndex(index)
        return
      }
      animate(progress, index, {
        ...SNAP_SPRING,
        velocity: withVelocity,
        onComplete: () => setActiveIndex(index),
      })
    },
    [progress],
  )

  const goTo = useCallback(
    (index: number, focus = false) => {
      const target = clampIndex(index)
      if (focus) cardRefs.current[target]?.focus({ preventScroll: true })
      settleTo(target)
    },
    [settleTo],
  )

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
      if (wheelRawRef.current === null) wheelRawRef.current = unRubberBand(progress.get())
      wheelRawRef.current += (event.deltaX * unit) / spacing
      if (reduceMotionRef.current) {
        wheelRawRef.current = Math.min(MAX_INDEX + 0.49, Math.max(-0.49, wheelRawRef.current))
        const index = clampIndex(Math.round(wheelRawRef.current))
        if (index !== progress.get()) {
          progress.set(index)
          setActiveIndex(index)
        }
      } else {
        progress.set(rubberBand(wheelRawRef.current))
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
      startRaw: unRubberBand(progress.get()),
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
    const raw = drag.startRaw - dx / layout.spacing
    if (reduceMotion) {
      const index = clampIndex(Math.round(raw))
      if (index !== progress.get()) progress.set(index)
    } else {
      progress.set(rubberBand(raw))
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

  const handleSelect = (index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    goTo(index)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const fromCard = event.target !== event.currentTarget
    const current = clampIndex(Math.round(progress.get()))
    let target: number
    if (event.key === 'ArrowLeft') target = current - 1
    else if (event.key === 'ArrowRight') target = current + 1
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = MAX_INDEX
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
        style={{ height: Math.round(layout.cardHeight * 1.25) }}
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
        onKeyDown={handleKeyDown}
      >
        {metrics.map((metric, index) => (
          <WheelCard
            // Remount on breakpoint / motion-preference change so the
            // transforms pick up the new arc constants.
            key={`${metric.title}-${layout.breakpoint}-${reduceMotion ? 'r' : 'm'}`}
            index={index}
            metric={metric}
            progress={progress}
            motionBlur={motionBlur}
            layout={layout}
            reduceMotion={reduceMotion}
            isActive={index === activeIndex}
            buttonRef={(node) => {
              cardRefs.current[index] = node
            }}
            onSelect={handleSelect}
          />
        ))}
      </motion.div>

      <p className="measure__announcement" aria-live="polite">
        {metrics[activeIndex].title}, {activeIndex + 1} of {CARD_COUNT}
      </p>
    </section>
  )
}
