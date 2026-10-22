'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

/** The assistant's mark: a lime dot that breathes while it's thinking. */
function Mark({ thinking, compact }: { thinking: boolean; compact: boolean }) {
  return (
    <span className={`relative mt-[3px] grid shrink-0 place-items-center rounded-full bg-[#111] ${compact ? 'size-6' : 'size-7'}`}>
      <span className={`rounded-full bg-bw-lime ${compact ? 'size-2' : 'size-2.5'} ${thinking ? 'motion-safe:animate-pulse' : ''}`} />
    </span>
  )
}

type Props = {
  text: string | null
  label?: string
  className?: string
  /**
   * Set for a message streamed from the model: the text grows as tokens
   * arrive and is shown exactly as received (no simulated typing); true while
   * more is coming. Leave undefined for a finished text, which types in.
   */
  streaming?: boolean
  /** Smaller type, for the one-line reactions above a question. */
  compact?: boolean
}

/**
 * One message from the BrandWorks assistant. Before any text it shows a
 * thinking state. `aria-live` announces only the finished message, once.
 */
export default function AiMessage({ text, label = 'BrandWorks', className = '', streaming, compact = false }: Props) {
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
  const writing = Boolean(text) && (live ? Boolean(streaming) : shown.length < (text?.length ?? 0))
  const finished = text && !(live && streaming) ? text : ''

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: compact ? 6 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`flex ${compact ? 'gap-3' : 'gap-4'} ${className}`}
    >
      <Mark thinking={!text || Boolean(streaming)} compact={compact} />
      <div className="min-w-0 flex-1">
        <span className={`block font-medium uppercase tracking-[0.14em] text-black/45 ${compact ? 'mb-1 text-[10px]' : 'mb-1.5 text-[11px]'}`}>{label}</span>
        <p className="sr-only" aria-live="polite">{finished}</p>
        {text ? (
          <p aria-hidden="true" className={`m-0 max-w-[56ch] tracking-[-0.015em] text-black ${compact ? 'text-[15px] leading-[1.5] sm:text-[16px]' : 'text-[18px] leading-[1.55] sm:text-[20px]'}`}>
            {shown}
            {writing && <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-black/60 motion-safe:animate-pulse" />}
          </p>
        ) : (
          <span className={`inline-flex items-center gap-1.5 ${compact ? 'h-[24px]' : 'h-[30px]'}`} aria-label="Thinking">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-black/40 motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
      </div>
    </motion.div>
  )
}
