'use client'

import type { ReactNode } from 'react'
import { FieldLine, TextField, formHint, formInput, formSmallButton, formTextarea } from '../components/ContactForm/ContactForm'
import type { Option } from './flow'
import { useSpeech } from './useSpeech'

export { EASE } from '../components/ContactForm/ContactForm'
export const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const focusRing = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

/* -------------------------------------------------------------------------- */
/*  Option tiles: every option step is an even grid of equal tiles            */
/* -------------------------------------------------------------------------- */

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Selected: brand lime with a single 1px #111 edge. The focus outline shows
// for keyboard users only (:focus-visible), never after a mouse click.
const tile = 'relative flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[12px] border px-4 py-2 text-left text-[14px] font-medium leading-[1.25] text-[#111] outline-none transition-[background-color,border-color] duration-150 sm:min-h-12 sm:px-5 sm:text-[15px]'
const tileIdle = 'border-[#E5E5E5] bg-white hover:border-[#111] hover:bg-[#FAFAFA]'
const tileActive = 'border-[#111] bg-(--color-bw-lime)'
const tileFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]'
const tileFocusWithin = 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#111]'

// Labels longer than this get a phone row each; shorter ones pair up and may wrap to two lines.
const LONG_LABEL = 26

/**
 * Columns by option count: 2 and 4 options make two columns (one row, or
 * 2 × 2); 3 and 5+ make three from 1024px. 640–1023px tops out at two.
 * A short last row stays left-aligned at full tile width (plain grid flow).
 */
function gridColumns(options: Option[]) {
  const phone = options.some((o) => o.label.length > LONG_LABEL) ? 'grid-cols-1' : 'grid-cols-2'
  const wide = options.length === 2 || options.length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return `${phone} ${wide}`
}

export function OptionTiles({
  name,
  options,
  selected,
  onToggle,
  multi = false,
  label,
}: {
  name: string
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  multi?: boolean
  label: string
}) {
  const grid = `grid auto-rows-fr gap-[10px] ${gridColumns(options)}`

  // Multi-select: toggle buttons.
  if (multi) {
    return (
      <div role="group" aria-label={label} className={grid}>
        {options.map((option) => {
          const active = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              title={option.hint}
              onClick={() => onToggle(option.value)}
              className={`${tile} ${tileFocus} ${active ? tileActive : tileIdle}`}
            >
              <span className="min-w-0">{option.label}</span>
              {active && <CheckIcon />}
            </button>
          )
        })}
      </div>
    )
  }

  // Single-select: native radios, so arrow keys move between them.
  return (
    <div role="radiogroup" aria-label={label} className={grid}>
      {options.map((option) => {
        const active = selected.includes(option.value)
        const id = `${name}-${option.value}`
        return (
          <label
            key={option.value}
            htmlFor={id}
            title={option.hint}
            className={`${tile} ${tileFocusWithin} ${active ? tileActive : tileIdle}`}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              title={option.hint}
              onChange={() => onToggle(option.value)}
              className="sr-only"
            />
            <span className="min-w-0">{option.label}</span>
            {active && <CheckIcon />}
          </label>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Text inputs: the Contact page's underlined fields                         */
/* -------------------------------------------------------------------------- */

export function BigInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  autoComplete,
  inputMode,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  autoComplete?: string
  inputMode?: 'url' | 'email' | 'tel' | 'text'
  invalid?: boolean
}) {
  return (
    <FieldLine>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete ?? 'off'}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={formInput}
      />
    </FieldLine>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden="true">
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
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  voice?: boolean
  invalid?: boolean
}) {
  const speech = useSpeech((text) => {
    if (!text) return
    const joined = value.trim() ? `${value.trim()} ${text}` : text
    onChange(joined.slice(0, maxLength))
  })
  const showMic = voice && speech.supported
  const count = value.length > maxLength * 0.7 ? `${value.length} / ${maxLength}` : ''

  return (
    <FieldLine className="pb-7">
      <textarea
        id={id}
        rows={5}
        value={speech.listening && speech.interim ? `${value}${value ? ' ' : ''}${speech.interim}` : value}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={speech.listening}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={formTextarea}
      />
      {(showMic || count) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          {showMic ? (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              aria-pressed={speech.listening}
              className={`${formSmallButton} inline-flex items-center gap-1.5 ${speech.listening ? 'border-black bg-[#ccff00]' : ''}`}
            >
              <MicIcon />
              {speech.listening ? 'Listening… tap to stop' : 'Speak instead'}
            </button>
          ) : <span />}
          <span className="text-[12px] tabular-nums text-black/35">{count}</span>
        </div>
      )}
      {speech.error && <p role="alert" className="mt-3 text-[12px] text-[#c4302b]">{speech.error}</p>}
    </FieldLine>
  )
}

/* -------------------------------------------------------------------------- */
/*  Contact                                                                   */
/* -------------------------------------------------------------------------- */

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
      <TextField label="Your name" name="contactName" id="q-contactName" value={values.contactName} onChange={(v) => onChange('contactName', v)} placeholder="Your name" autoComplete="name" maxLength={160} />
      <TextField label="Email" name="contactEmail" id="q-contactEmail" type="email" value={values.contactEmail} onChange={(v) => onChange('contactEmail', v)} placeholder="you@brand.com" autoComplete="email" maxLength={160} />
      <TextField label="Phone / WhatsApp" name="contactPhone" id="q-contactPhone" type="tel" value={values.contactPhone} onChange={(v) => onChange('contactPhone', v)} placeholder="+91 98765 43210" autoComplete="tel" maxLength={160} optional />
      {askWebsite && (
        <TextField label="Current website" name="contactWebsite" id="q-contactWebsite" type="url" value={values.contactWebsite} onChange={(v) => onChange('contactWebsite', v)} placeholder="yourbrand.com" autoComplete="url" maxLength={300} optional />
      )}
    </div>
  )
}

export function Helper({ children }: { children: ReactNode }) {
  return <p className={`m-0 mt-3 ${formHint}`}>{children}</p>
}
