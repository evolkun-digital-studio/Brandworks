'use client'

import { useId, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Option } from './flow'
import { OptionVisual } from './visuals'
import { useSpeech } from './useSpeech'

export const EASE = [0.22, 1, 0.36, 1] as const
export const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/* -------------------------------------------------------------------------- */
/*  Option rows (single + multi)                                              */
/* -------------------------------------------------------------------------- */

function KeyBadge({ index, active }: { index: number; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid size-7 shrink-0 place-items-center rounded-md border text-[11px] font-semibold transition-colors duration-300 ${
        active ? 'border-black bg-black text-white' : 'border-black/20 text-black/55 group-hover:border-black/50'
      }`}
    >
      {KEYS[index]}
    </span>
  )
}

function Check({ active, round }: { active: boolean; round: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative ml-auto grid size-5 shrink-0 place-items-center border transition-colors duration-300 ${round ? 'rounded-full' : 'rounded-[5px]'} ${
        active ? 'border-black bg-black' : 'border-black/25'
      }`}
    >
      <motion.svg viewBox="0 0 16 16" className="size-3" initial={false} animate={{ scale: active ? 1 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </span>
  )
}

export function OptionRows({
  options,
  selected,
  onToggle,
  multi = false,
  max,
  label,
}: {
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  multi?: boolean
  max?: number
  label: string
}) {
  const full = multi && max !== undefined && selected.length >= max
  return (
    <div
      role={multi ? 'group' : 'radiogroup'}
      aria-label={label}
      className={`grid grid-cols-1 gap-2.5 ${options.length > 6 ? 'md:grid-cols-2' : ''}`}
    >
      {options.map((option, index) => {
        const active = selected.includes(option.value)
        const dim = full && !active
        return (
          <button
            key={option.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => onToggle(option.value)}
            className={`group relative flex min-h-[58px] w-full items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 text-left outline-none transition-[border-color,opacity] duration-300 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
              active ? 'border-black' : 'border-black/15 hover:border-black/45'
            } ${dim ? 'opacity-45' : ''}`}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 origin-left bg-bw-lime"
              initial={false}
              animate={{ scaleX: active ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            />
            <KeyBadge index={index} active={active} />
            <span className="relative min-w-0 flex-1">
              <span className="block text-[15px] leading-[1.35] tracking-[-0.01em] text-black sm:text-[16px]">{option.label}</span>
              {option.hint && <span className="mt-0.5 block text-[13px] leading-[1.4] text-black/50">{option.hint}</span>}
            </span>
            <Check active={active} round={!multi} />
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Visual cards                                                              */
/* -------------------------------------------------------------------------- */

export function VisualCards({
  options,
  selected,
  onToggle,
  label,
}: {
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {options.map((option, index) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onToggle(option.value)}
            className={`group relative flex flex-col rounded-2xl border p-2.5 text-left outline-none transition-[border-color,box-shadow,transform] duration-300 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 ${
              active ? 'border-black shadow-[0_0_0_1px_#111]' : 'border-black/15 hover:border-black/45'
            }`}
          >
            <span className="block aspect-[16/10] w-full overflow-hidden rounded-xl text-[#111]">
              {option.visual && <OptionVisual visual={option.visual} />}
            </span>
            <span className="flex items-start gap-2.5 px-1.5 pb-1 pt-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium leading-[1.3] tracking-[-0.01em] sm:text-[15px]">{option.label}</span>
                {option.hint && <span className="mt-0.5 block text-[12px] leading-[1.4] text-black/50 sm:text-[13px]">{option.hint}</span>}
              </span>
              <span aria-hidden="true" className="hidden text-[11px] font-semibold text-black/35 sm:block">{KEYS[index]}</span>
            </span>
            <AnimatePresence>
              {active && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="absolute right-4 top-4 grid size-7 place-items-center rounded-full border border-black bg-bw-lime"
                >
                  <svg viewBox="0 0 16 16" className="size-3.5"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Text inputs                                                               */
/* -------------------------------------------------------------------------- */

export function BigInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  maxLength,
  label,
  autoComplete,
  inputMode,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  maxLength?: number
  label: string
  autoComplete?: string
  inputMode?: 'url' | 'email' | 'tel' | 'text'
}) {
  return (
    <div className="group relative border-b border-black/20 pb-3">
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        autoComplete={autoComplete ?? 'off'}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[26px] tracking-[-0.025em] text-black outline-none placeholder:text-black/20 sm:text-[34px]"
      />
      <span className="absolute inset-x-0 -bottom-px h-[2px] origin-left scale-x-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-x-100" />
    </div>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function LongAnswer({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 3000,
  voice,
  autoFocus,
  label,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  voice?: boolean
  autoFocus?: boolean
  label: string
}) {
  const speech = useSpeech((text) => {
    if (!text) return
    const joined = value.trim() ? `${value.trim()} ${text}` : text
    onChange(joined.slice(0, maxLength))
  })
  const showMic = voice && speech.supported

  return (
    <div>
      <div className={`relative rounded-2xl border bg-white transition-colors duration-300 focus-within:border-black ${speech.listening ? 'border-black' : 'border-black/20'}`}>
        <textarea
          id={id}
          aria-label={label}
          rows={5}
          value={speech.listening && speech.interim ? `${value}${value ? ' ' : ''}${speech.interim}` : value}
          autoFocus={autoFocus}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={speech.listening}
          onChange={(e) => onChange(e.target.value)}
          className="block min-h-[168px] w-full resize-y rounded-2xl bg-transparent px-5 pb-16 pt-4 text-[18px] leading-[1.55] tracking-[-0.015em] text-black outline-none placeholder:text-black/25 sm:text-[19px]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 pb-3">
          {showMic ? (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              aria-pressed={speech.listening}
              className={`pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border pl-3 pr-4 text-[13px] transition-colors duration-300 ${
                speech.listening ? 'border-black bg-black text-white' : 'border-black/20 text-black/70 hover:border-black hover:text-black'
              }`}
            >
              {speech.listening ? (
                <span className="relative grid size-[18px] place-items-center">
                  <span className="absolute size-3 rounded-full bg-bw-lime motion-safe:animate-ping" />
                  <span className="relative size-2.5 rounded-full bg-bw-lime" />
                </span>
              ) : <MicIcon />}
              {speech.listening ? 'Listening… tap to stop' : 'Speak instead'}
            </button>
          ) : <span />}
          <span className="text-[12px] tabular-nums text-black/35">{value.length > maxLength * 0.7 ? `${value.length} / ${maxLength}` : ''}</span>
        </div>
      </div>
      {speech.error && <p role="alert" className="mt-3 text-[13px] text-[#c4302b]">{speech.error}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Contact                                                                   */
/* -------------------------------------------------------------------------- */

function SmallField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  optional,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  optional?: boolean
  autoFocus?: boolean
}) {
  const id = useId()
  return (
    <div className="group relative border-b border-black/15 pb-3 pt-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">{label}</label>
        {optional && <span className="text-[12px] text-black/35">Optional</span>}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={type === 'url' ? 300 : 160}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[18px] tracking-[-0.015em] text-black outline-none placeholder:text-black/25"
      />
      <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-x-100" />
    </div>
  )
}

export function ContactFields({
  values,
  onChange,
  askWebsite,
}: {
  values: { contactName: string; contactEmail: string; contactPhone: string; contactWebsite: string }
  onChange: (key: 'contactName' | 'contactEmail' | 'contactPhone' | 'contactWebsite', value: string) => void
  askWebsite: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
      <SmallField label="Your name" value={values.contactName} onChange={(v) => onChange('contactName', v)} placeholder="Your name" autoComplete="name" autoFocus />
      <SmallField label="Email" type="email" value={values.contactEmail} onChange={(v) => onChange('contactEmail', v)} placeholder="you@brand.com" autoComplete="email" />
      <SmallField label="Phone / WhatsApp" type="tel" value={values.contactPhone} onChange={(v) => onChange('contactPhone', v)} placeholder="+91 98765 43210" autoComplete="tel" optional />
      {askWebsite && (
        <SmallField label="Current website" type="url" value={values.contactWebsite} onChange={(v) => onChange('contactWebsite', v)} placeholder="yourbrand.com" autoComplete="url" optional />
      )}
    </div>
  )
}

export function Helper({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-black/55 sm:text-[16px]">{children}</p>
}
