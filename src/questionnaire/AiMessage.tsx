'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

type Props = {
  text: string | null
  /** A small label inside the bubble ("BrandWorks suggests", "From the data"). */
  label?: string
  className?: string
  /**
   * Set for a message streamed from the model: the text grows as tokens
   * arrive and is shown exactly as received (no simulated typing); true while
   * more is coming. Leave undefined for a finished text, which types in.
   */
  streaming?: boolean
  /** 17px text, for the uspReply interstitial where the bubble is the whole screen. */
  large?: boolean
}

/**
 * One message from the BrandWorks assistant: a soft grey bubble with a tiny
 * lime dot. Before any text it shows three thinking dots. `aria-live`
 * announces only the finished message, once.
 */
export default function AiMessage({ text, label, className = '', streaming, large = false }: Props) {
  const reduce = useReducedMotion()
  const live = streaming !== undefined
  const [typed, setTyped] = useState(reduce || live ? text ?? '' : '')

  useEffect(() => {
    if (live) return
    if (!text) { setTyped(''); return }
    if (reduce) { setTyped(text); return }
    let i = 0
    setTyped('')
    const id = window.setInterval(() => {
      i += Math.max(1, Math.round(text.length / 90))
      setTyped(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 16)
    return () => window.clearInterval(id)
  }, [text, reduce, live])

  const shown = live ? text ?? '' : typed
  const finished = text && !(live && streaming) ? text : ''

  return (
    <div className={`flex gap-2.5 rounded-[14px] bg-(--q-bubble) px-3.5 py-3 ${className}`}>
      <span aria-hidden="true" className="mt-[7px] size-2 shrink-0 rounded-full bg-(--q-accent) ring-1 ring-black/15" />
      <div className="min-w-0 flex-1">
        {label && <span className="mb-0.5 block text-[12px] font-semibold text-(--q-muted)">{label}</span>}
        <p className="sr-only" aria-live="polite">{finished}</p>
        {text ? (
          <p aria-hidden="true" className={`m-0 leading-[1.55] text-(--q-ink) ${large ? 'text-[17px]' : 'text-[15px]'}`}>
            {shown}
          </p>
        ) : (
          <span className="inline-flex h-[22px] items-center gap-1" aria-label="Thinking">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 rounded-full bg-black/35 motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
