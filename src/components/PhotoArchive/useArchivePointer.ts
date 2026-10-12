import { useEffect, useRef, type RefObject } from 'react'

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

export type ArchiveField = {
  /** Raw pointer over the window, -1..1 (y up). */
  pointer: { x: number; y: number }
  /** Pointer after the first smoothing pass; the camera and planes follow this. */
  smooth: { x: number; y: number }
  /** Where the field's top-left should sit, px; `moved` is the travel since pointerdown. */
  drag: { x: number; y: number; active: boolean; moved: number }
  /** Allowed field offsets, so no empty edge can ever show. */
  bounds: Bounds
  /** Tile ids. */
  hovered: string | null
  opened: string | null
  /** Pointer inside the hovered frame, -1..1. */
  tilt: { x: number; y: number }
}

/** Below this travel a press counts as a click, not a drag. */
export const CLICK_TOLERANCE = 6
const THROW = 160

export const clampTo = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useArchivePointer(target: RefObject<HTMLElement | null>) {
  const field = useRef<ArchiveField>({
    pointer: { x: 0, y: 0 },
    smooth: { x: 0, y: 0 },
    drag: { x: 0, y: 0, active: false, moved: 0 },
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    hovered: null,
    opened: null,
    tilt: { x: 0, y: 0 },
  })

  useEffect(() => {
    const element = target.current
    if (!element) return
    const state = field.current
    let origin = { x: 0, y: 0, dragX: 0, dragY: 0 }
    let last = { x: 0, y: 0, time: 0 }
    let velocity = { x: 0, y: 0 }
    const place = (x: number, y: number) => {
      const { minX, maxX, minY, maxY } = state.bounds
      state.drag.x = clampTo(x, minX, maxX)
      state.drag.y = clampTo(y, minY, maxY)
    }

    const move = (event: PointerEvent) => {
      state.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      state.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1)
      if (!state.drag.active) return
      const elapsed = Math.max(1, event.timeStamp - last.time)
      velocity = { x: (event.clientX - last.x) / elapsed, y: (event.clientY - last.y) / elapsed }
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      state.drag.moved = Math.max(state.drag.moved, Math.hypot(event.clientX - origin.x, event.clientY - origin.y))
      if (state.drag.moved < CLICK_TOLERANCE) return
      element.classList.add('is-dragging')
      place(origin.dragX + event.clientX - origin.x, origin.dragY + event.clientY - origin.y)
    }
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget === null) state.pointer.x = state.pointer.y = 0
    }
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      event.preventDefault()
      origin = { x: event.clientX, y: event.clientY, dragX: state.drag.x, dragY: state.drag.y }
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      velocity = { x: 0, y: 0 }
      state.drag.active = true
      state.drag.moved = 0
    }
    const up = (event: Event) => {
      if (!state.drag.active) return
      state.drag.active = false
      element.classList.remove('is-dragging')
      // Carry the release speed on; a pause before letting go throws nothing.
      if (state.drag.moved >= CLICK_TOLERANCE && event.timeStamp - last.time < 80) {
        place(state.drag.x + velocity.x * THROW, state.drag.y + velocity.y * THROW)
      }
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerout', leave)
    element.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', leave)
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      element.classList.remove('is-dragging')
    }
  }, [target])

  return field
}
