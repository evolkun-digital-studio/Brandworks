import type { KeyboardEvent, PointerEvent } from 'react'

interface FocalPointPickerProps {
  src: string
  alt: string
  x: number
  y: number
  onChange: (x: number, y: number) => void
}

const clamp = (value: number) => Math.min(1, Math.max(0, Math.round(value * 1000) / 1000))

/**
 * Click, drag or use the arrow keys to mark the part of the image that must
 * stay in view when the site crops it. Values are fractions (0–1) and the
 * site applies them as object-position.
 */
function FocalPointPicker({ src, alt, x, y, onChange }: FocalPointPickerProps) {
  function fromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    onChange(clamp((event.clientX - rect.left) / rect.width), clamp((event.clientY - rect.top) / rect.height))
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.02
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    onChange(clamp(x + move[0]), clamp(y + move[1]))
  }

  return (
    <div className="grid gap-2">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Focal point"
        aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
        aria-valuenow={Math.round(x * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative cursor-crosshair touch-none overflow-hidden rounded-a-md bg-a-fill outline-offset-2 select-none focus-visible:outline-2 focus-visible:outline-a-accent"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); fromPointer(event) }}
        onPointerMove={(event) => { if (event.buttons) fromPointer(event) }}
        onKeyDown={onKeyDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview the optimizer can't fetch */}
        <img src={src} alt={alt} draggable={false} className="block max-h-[320px] w-full object-contain" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.35)]"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      </div>
      <p className="text-xs text-a-ink-2">Click the most important part of the image. It stays in view when the site crops it. Arrow keys nudge it.</p>
    </div>
  )
}

export default FocalPointPicker
