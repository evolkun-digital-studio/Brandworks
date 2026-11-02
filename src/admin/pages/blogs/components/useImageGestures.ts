import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { MIN_IMAGE_WIDTH } from '../../../../blog/lib/articleImage'
import { computeDropGap, DRAGGING_ATTRIBUTE, isSamePosition, scrollParent, setImageWidth, syncFigureStyle } from '../lib/imageBlocks'

const LONG_PRESS_MS = 350
const MOUSE_THRESHOLD = 5
const TOUCH_SLOP = 10
const EDGE_ZONE = 80
const MAX_SCROLL_PER_FRAME = 18

export interface DropLine {
  top: number
  left: number
  width: number
}

interface GestureStart {
  x: number
  y: number
  pointerId: number
  pointerType: string
}

/**
 * Moves images with pointer events rather than HTML drag and drop: the same code
 * then covers mouse, trackpad and touch, and the browser never gets the chance to
 * do its own contenteditable drop, which copies nodes and splits paragraphs.
 */
export function useImageDrag(surfaceRef: RefObject<HTMLElement | null>, enabled: boolean, onDrop: (unit: HTMLElement, before: Node | null) => void) {
  const [dragging, setDragging] = useState<{ src: string } | null>(null)
  const [dropLine, setDropLine] = useState<DropLine | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)
  const stopRef = useRef<(() => void) | null>(null)
  const suppressClickRef = useRef(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => { onDropRef.current = onDrop })

  useEffect(() => () => stopRef.current?.(), [])

  // Registered up front and non-passive: a listener added mid-touch can't stop the page scrolling.
  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface || !enabled) return
    const block = (event: TouchEvent) => { if (activeRef.current) event.preventDefault() }
    surface.addEventListener('touchmove', block, { passive: false })
    return () => surface.removeEventListener('touchmove', block)
  }, [enabled, surfaceRef])

  /** `fromHandle` starts straight away on touch; the image itself waits for a long press, so it can still scroll. */
  const arm = useCallback((start: GestureStart, unit: HTMLElement, fromHandle: boolean) => {
    stopRef.current?.()
    const surface = surfaceRef.current
    if (!surface) return

    const isTouch = start.pointerType === 'touch'
    let active = false
    let x = start.x
    let y = start.y
    let frame = 0
    let pressTimer = 0
    let gap: ReturnType<typeof computeDropGap> | null = null
    let scroller: HTMLElement | null = null

    const moveGhost = () => {
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${x + 12}px, ${y + 12}px)`
    }

    const tick = () => {
      if (!scroller) return
      const isRoot = scroller === document.documentElement
      const rect = isRoot ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect()
      let delta = 0
      if (y < rect.top + EDGE_ZONE) delta = -MAX_SCROLL_PER_FRAME * Math.min(1, (rect.top + EDGE_ZONE - y) / EDGE_ZONE)
      else if (y > rect.bottom - EDGE_ZONE) delta = MAX_SCROLL_PER_FRAME * Math.min(1, (y - (rect.bottom - EDGE_ZONE)) / EDGE_ZONE)
      // The canvas uses smooth scrolling, which would lag behind the pointer here.
      if (delta) scroller.scrollBy({ top: delta, behavior: 'instant' })

      gap = computeDropGap(surface, y, unit)
      const same = isSamePosition(unit, surface, gap.before)
      const next = same ? null : { top: gap.top, left: gap.left, width: gap.width }
      setDropLine((current) => (current?.top === next?.top && current?.left === next?.left && current?.width === next?.width ? current : next))
      frame = requestAnimationFrame(tick)
    }

    const begin = () => {
      active = true
      activeRef.current = true
      scroller = scrollParent(surface)
      unit.setAttribute(DRAGGING_ATTRIBUTE, '')
      const image = unit.querySelector('img')
      setDragging({ src: image?.currentSrc || image?.getAttribute('src') || '' })
      if (isTouch) navigator.vibrate?.(10)
      requestAnimationFrame(moveGhost)
      tick()
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== start.pointerId) return
      x = event.clientX
      y = event.clientY
      if (active) {
        event.preventDefault()
        moveGhost()
        return
      }
      const distance = Math.hypot(x - start.x, y - start.y)
      if (isTouch && !fromHandle) {
        // Moving before the long press completes means the finger is scrolling.
        if (distance > TOUCH_SLOP) stop(false)
      } else if (distance > MOUSE_THRESHOLD) {
        begin()
      }
    }

    const onUp = (event: PointerEvent) => { if (event.pointerId === start.pointerId) stop(true) }
    const onCancel = (event: PointerEvent) => { if (event.pointerId === start.pointerId) stop(false) }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active) {
        event.preventDefault()
        event.stopPropagation()
        stop(false)
      }
    }
    const onContextMenu = (event: Event) => event.preventDefault()

    function stop(drop: boolean) {
      window.clearTimeout(pressTimer)
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('contextmenu', onContextMenu)
      stopRef.current = null
      if (!active) return

      activeRef.current = false
      unit.removeAttribute(DRAGGING_ATTRIBUTE)
      setDropLine(null)
      setDragging(null)
      // The click that ends this gesture landed wherever the pointer was, not on the image.
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      if (drop && gap && surface && !isSamePosition(unit, surface, gap.before)) onDropRef.current(unit, gap.before)
      else if (drop) onDropRef.current(unit, unit)
    }

    stopRef.current = () => stop(false)
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('contextmenu', onContextMenu)
    if (isTouch && !fromHandle) pressTimer = window.setTimeout(begin, LONG_PRESS_MS)
  }, [surfaceRef])

  const consumeClick = useCallback(() => {
    const suppressed = suppressClickRef.current
    suppressClickRef.current = false
    return suppressed
  }, [])

  return { arm, dragging, dropLine, setDropLine, ghostRef, consumeClick }
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

export interface ResizeLabel {
  x: number
  y: number
  width: number
}

/**
 * Corner resizing. Keeps the image's shape by default; Shift lets the height move
 * freely too, stored as a ratio. Width is always a percentage of the column.
 */
export function useImageResize(onChange: () => void, onCommit: () => void) {
  const [label, setLabel] = useState<ResizeLabel | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const onChangeRef = useRef(onChange)
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onChangeRef.current = onChange
    onCommitRef.current = onCommit
  })
  useEffect(() => () => stopRef.current?.(), [])

  const begin = useCallback((start: GestureStart, figure: HTMLElement, corner: ResizeCorner) => {
    stopRef.current?.()
    const image = figure.querySelector('img')
    const parent = figure.parentElement
    if (!image || !parent) return

    const before = {
      width: figure.getAttribute('data-width'),
      ratio: figure.getAttribute('data-ratio'),
      align: figure.getAttribute('data-align'),
    }
    const styles = getComputedStyle(parent)
    const column = parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
    const box = image.getBoundingClientRect()
    const towardsLeft = corner.includes('w')
    const towardsTop = corner.includes('n')
    // A centred image grows from both sides, so the pointer covers half the change.
    const centred = before.align === 'center' && !figure.hasAttribute('data-wrap')
    const factor = centred ? 2 : 1
    let width = parseInt(before.width ?? '100', 10) || 100
    let ratio = before.ratio
    let changed = false

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== start.pointerId) return
      event.preventDefault()
      const dx = (event.clientX - start.x) * (towardsLeft ? -1 : 1) * factor
      const pixels = Math.min(column, Math.max((column * MIN_IMAGE_WIDTH) / 100, box.width + dx))
      width = Math.max(MIN_IMAGE_WIDTH, Math.min(100, Math.round((pixels / column) * 100)))
      changed = true
      if (event.shiftKey) {
        const dy = (event.clientY - start.y) * (towardsTop ? -1 : 1)
        const height = Math.max(40, box.height + dy)
        ratio = (pixels / height).toFixed(3)
      }
      if (ratio) figure.setAttribute('data-ratio', ratio)
      setImageWidth(figure, width)
      setLabel({ x: event.clientX, y: event.clientY, width })
      onChangeRef.current()
    }

    const restore = () => {
      const put = (name: string, value: string | null) => {
        if (value === null) figure.removeAttribute(name)
        else figure.setAttribute(name, value)
      }
      put('data-width', before.width)
      put('data-ratio', before.ratio)
      put('data-align', before.align)
      syncFigureStyle(figure)
    }

    const stop = (commit: boolean) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown', onKey, true)
      stopRef.current = null
      setLabel(null)
      if (commit && changed) onCommitRef.current()
      else restore()
      onChangeRef.current()
    }
    const onUp = (event: PointerEvent) => { if (event.pointerId === start.pointerId) stop(true) }
    const onCancel = (event: PointerEvent) => { if (event.pointerId === start.pointerId) stop(false) }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        stop(false)
      }
    }

    stopRef.current = () => stop(false)
    setLabel({ x: start.x, y: start.y, width })
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown', onKey, true)
  }, [])

  return { beginResize: begin, resizeLabel: label }
}
