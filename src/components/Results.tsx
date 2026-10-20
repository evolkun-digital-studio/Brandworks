'use client'

import Image from 'next/image'
import { motion, useInView } from 'motion/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { KeyboardEvent, WheelEvent } from 'react'
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

type CardPose = {
  x: number
  y: number
  width: number
  height: number
  rotate: number
  opacity: number
  scale: number
  zIndex: number
  pointerEvents: 'auto' | 'none'
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

function circularOffset(index: number, activeIndex: number) {
  return ((index - activeIndex + 2 + CARD_COUNT) % CARD_COUNT) - 2
}

function getCardPose(offset: number, viewportWidth: number): CardPose {
  const direction = Math.sign(offset)
  const distance = Math.abs(offset)

  if (viewportWidth >= 1024) {
    const stageScale = Math.min(1, Math.max(0.57, (viewportWidth - 48) / 1700))
    if (distance === 0) {
      return {
        x: 0,
        y: 0,
        width: 440 * stageScale,
        height: 540 * stageScale,
        rotate: 0,
        opacity: 1,
        scale: 1,
        zIndex: 30,
        pointerEvents: 'auto',
      }
    }
    if (distance === 1) {
      return {
        x: direction * 300 * stageScale,
        y: 95 * stageScale,
        width: 390 * stageScale,
        height: 430 * stageScale,
        rotate: direction * 1.5,
        opacity: 1,
        scale: 1,
        zIndex: 20,
        pointerEvents: 'auto',
      }
    }
    return {
      x: direction * 470 * stageScale,
      y: 145 * stageScale,
      width: 310 * stageScale,
      height: 350 * stageScale,
      rotate: direction * 1.5,
      opacity: 0.55,
      scale: 1,
      zIndex: 10,
      pointerEvents: 'auto',
    }
  }

  if (viewportWidth >= 768) {
    const centerWidth = Math.min(520, viewportWidth * 0.62)
    const centerHeight = centerWidth * 1.16
    if (distance === 0) {
      return {
        x: 0,
        y: 0,
        width: centerWidth,
        height: centerHeight,
        rotate: 0,
        opacity: 1,
        scale: 1,
        zIndex: 30,
        pointerEvents: 'auto',
      }
    }
    if (distance === 1) {
      return {
        x: direction * centerWidth * 0.75,
        y: 48,
        width: centerWidth * 0.88,
        height: centerHeight * 0.79,
        rotate: direction * 1.5,
        opacity: 0.9,
        scale: 1,
        zIndex: 20,
        pointerEvents: 'auto',
      }
    }
    return {
      x: direction * centerWidth * 1.23,
      y: 80,
      width: centerWidth * 0.75,
      height: centerHeight * 0.64,
      rotate: direction * 1.5,
      opacity: 0,
      scale: 1,
      zIndex: 10,
      pointerEvents: 'none',
    }
  }

  const centerWidth = Math.min(380, viewportWidth * 0.8)
  const centerHeight = centerWidth * 1.24
  if (distance === 0) {
    return {
      x: 0,
      y: 0,
      width: centerWidth,
      height: centerHeight,
      rotate: 0,
      opacity: 1,
      scale: 1,
      zIndex: 30,
      pointerEvents: 'auto',
    }
  }
  if (distance === 1) {
    return {
      x: direction * centerWidth * 0.88,
      y: 22,
      width: centerWidth * 0.92,
      height: centerHeight * 0.9,
      rotate: direction * 1.25,
      opacity: 0.84,
      scale: 1,
      zIndex: 20,
      pointerEvents: 'auto',
    }
  }
  return {
    x: direction * centerWidth * 1.55,
    y: 44,
    width: centerWidth * 0.8,
    height: centerHeight * 0.76,
    rotate: direction * 1.25,
    opacity: 0,
    scale: 1,
    zIndex: 10,
    pointerEvents: 'none',
  }
}

function getStageHeight(viewportWidth: number) {
  if (viewportWidth >= 1024) {
    const scale = Math.min(1, Math.max(0.57, (viewportWidth - 48) / 1700))
    return 570 * scale
  }
  if (viewportWidth >= 768) {
    const width = Math.min(520, viewportWidth * 0.62)
    return width * 1.16 + 34
  }
  const width = Math.min(380, viewportWidth * 0.8)
  return width * 1.24 + 30
}

export default function Results() {
  const viewportWidth = useViewportWidth()
  const reduceMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const dragDistanceRef = useRef(0)
  const wheelLockedRef = useRef(false)
  const wheelUnlockRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusAfterChangeRef = useRef(false)
  const isInView = useInView(sectionRef, { once: true, amount: 0.28 })
  const [activeIndex, setActiveIndex] = useState(INITIAL_INDEX)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)

  const stageHeight = getStageHeight(viewportWidth)
  const entered = isInView || reduceMotion

  const selectIndex = useCallback((index: number, focus = false) => {
    focusAfterChangeRef.current = focus
    setActiveIndex(((index % CARD_COUNT) + CARD_COUNT) % CARD_COUNT)
  }, [])

  const advance = useCallback((direction: -1 | 1, focus = false) => {
    focusAfterChangeRef.current = focus
    setActiveIndex((current) => (current + direction + CARD_COUNT) % CARD_COUNT)
  }, [])

  useEffect(() => {
    if (!focusAfterChangeRef.current) return
    focusAfterChangeRef.current = false
    cardRefs.current[activeIndex]?.focus({ preventScroll: true })
  }, [activeIndex])

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden)
    onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (
      reduceMotion ||
      !entered ||
      !isPageVisible ||
      isHovered ||
      isFocused ||
      isDragging
    ) {
      return
    }
    const timer = window.setInterval(() => advance(1), 5000)
    return () => window.clearInterval(timer)
  }, [advance, entered, isDragging, isFocused, isHovered, isPageVisible, reduceMotion])

  useEffect(() => {
    return () => {
      if (wheelUnlockRef.current) clearTimeout(wheelUnlockRef.current)
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    advance(event.key === 'ArrowRight' ? 1 : -1, true)
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (
      Math.abs(event.deltaX) < 24 ||
      Math.abs(event.deltaX) <= Math.abs(event.deltaY) ||
      wheelLockedRef.current
    ) {
      return
    }
    event.preventDefault()
    wheelLockedRef.current = true
    advance(event.deltaX > 0 ? 1 : -1)
    wheelUnlockRef.current = setTimeout(() => {
      wheelLockedRef.current = false
    }, 650)
  }

  return (
    <section
      ref={sectionRef}
      className="measure"
      aria-labelledby="measure-heading"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false)
      }}
      onKeyDown={handleKeyDown}
    >
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
        className="measure__stage"
        style={{ height: stageHeight }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Brand performance metrics"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragStart={() => {
          dragDistanceRef.current = 0
          setIsDragging(true)
        }}
        onDrag={(_, info) => {
          dragDistanceRef.current = Math.max(
            dragDistanceRef.current,
            Math.abs(info.offset.x),
          )
        }}
        onDragEnd={(_, info) => {
          const threshold = viewportWidth < 768 ? 44 : 70
          const velocityThreshold = 520
          if (
            Math.abs(info.offset.x) >= threshold ||
            Math.abs(info.velocity.x) >= velocityThreshold
          ) {
            advance(info.offset.x < 0 || info.velocity.x < -velocityThreshold ? 1 : -1)
          }
          setIsDragging(false)
        }}
        onWheel={handleWheel}
      >
        {metrics.map((metric, index) => {
          const offset = circularOffset(index, activeIndex)
          const pose = getCardPose(offset, viewportWidth)
          const distance = Math.abs(offset)
          const entranceDelay = distance === 0 ? 0.12 : distance === 1 ? 0.22 : 0.3
          const entranceDuration = distance === 0 ? 0.8 : distance === 1 ? 0.95 : 1.1
          const initialX = pose.x + (offset === 0 ? 0 : -Math.sign(offset) * 42)

          return (
            <motion.div
              key={metric.title}
              className="measure__card-anchor"
              animate={{ x: pose.x, y: pose.y }}
              initial={reduceMotion ? false : { x: initialX, y: pose.y + 34 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 135, damping: 23, mass: 0.9 }
              }
              style={{ zIndex: pose.zIndex }}
            >
              <motion.div
                className="measure__card-center"
                initial={
                  reduceMotion
                    ? false
                    : { width: pose.width, height: pose.height }
                }
                animate={{ width: pose.width, height: pose.height }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 135, damping: 23, mass: 0.9 }
                }
              >
                <motion.button
                  ref={(node) => {
                    cardRefs.current[index] = node
                  }}
                  type="button"
                  className="measure__card"
                  aria-label={`${metric.title}${offset === 0 ? ', current metric' : ''}`}
                  aria-current={offset === 0 ? 'true' : undefined}
                  tabIndex={offset === 0 ? 0 : -1}
                  onClick={() => {
                    if (dragDistanceRef.current > 8) {
                      dragDistanceRef.current = 0
                      return
                    }
                    selectIndex(index)
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : {
                          rotate: pose.rotate,
                          opacity: 0,
                          scale: offset === 0 ? 0.92 : 0.96,
                        }
                  }
                  animate={
                    entered
                      ? {
                          rotate: pose.rotate,
                          opacity: pose.opacity,
                          scale: pose.scale,
                        }
                      : {
                          rotate: pose.rotate,
                          opacity: 0,
                          scale: offset === 0 ? 0.92 : 0.96,
                        }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : entered
                        ? {
                            type: 'spring',
                            stiffness: 135,
                            damping: 23,
                            mass: 0.9,
                            opacity: {
                              duration: entranceDuration,
                              delay: entranceDelay,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          }
                        : { duration: 0 }
                  }
                  style={{ pointerEvents: pose.pointerEvents }}
                >
                  <Image
                    src={metric.image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 80vw, (max-width: 1023px) 62vw, 440px"
                    className="measure__image"
                    priority={index === INITIAL_INDEX}
                  />
                  <span className="measure__shade" aria-hidden="true" />
                  <span className="measure__label">{metric.title}</span>
                </motion.button>
              </motion.div>
            </motion.div>
          )
        })}
      </motion.div>

      <p className="measure__announcement" aria-live="polite">
        {metrics[activeIndex].title}, metric {activeIndex + 1} of {CARD_COUNT}
      </p>
    </section>
  )
}
