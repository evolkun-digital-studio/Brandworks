'use client'

import { useId, type ReactNode } from 'react'
import type { Option } from './flow'
import { OptionVisual } from './visuals'
import { OPTION_EMOJI } from './emoji'
import AppleEmoji from './AppleEmoji'
import { useSpeech } from './useSpeech'

export const EASE = [0.22, 1, 0.36, 1] as const
export const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const focusRing = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--q-ink)'

/* -------------------------------------------------------------------------- */
/*  Option rows (single + multi)                                              */
/* -------------------------------------------------------------------------- */

/** Radio: a 20px ink circle with a filled dot. Multi: a rounded square with a check. */
function Indicator({ active, round }: { active: boolean; round: boolean }) {
  if (round) {
    return (
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-(--q-ink)">
        {active && <span className="size-2.5 rounded-full bg-(--q-ink)" />}
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-[5px] border-[1.5px] border-(--q-ink) ${active ? 'bg-(--q-ink)' : ''}`}>
      {active && (
        <svg viewBox="0 0 16 16" className="size-3"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
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
    <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className="flex flex-col gap-0.5 max-sm:gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value)
        const dim = full && !active
        return (
          <button
            key={option.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => onToggle(option.value)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,border-color,opacity] duration-150 hover:bg-(--q-tint) max-sm:min-h-[60px] max-sm:rounded-2xl max-sm:border max-sm:shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${focusRing} ${
              active ? 'sm:bg-(--q-tint) max-sm:border-(--q-ink) max-sm:bg-[rgba(206,253,16,0.3)]' : 'max-sm:border-(--q-line) max-sm:bg-white'
            } ${dim ? 'opacity-60' : ''}`}
          >
            {OPTION_EMOJI[option.value] && (
              <span className="inline-flex shrink-0 max-sm:size-10 max-sm:items-center max-sm:justify-center max-sm:rounded-xl max-sm:bg-(--q-bubble)">
                <AppleEmoji emoji={OPTION_EMOJI[option.value]} size={22} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className={`block text-[17px] leading-[1.35] text-(--q-ink) ${active ? 'font-semibold' : 'font-normal'}`}>{option.label}</span>
              {option.hint && <span className="mt-0.5 block text-[13px] leading-[1.4] text-(--q-muted)">{option.hint}</span>}
            </span>
            <Indicator active={active} round={!multi} />
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
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onToggle(option.value)}
            className={`relative flex flex-col rounded-2xl border p-2 text-left transition-[border-color,box-shadow] duration-150 ${focusRing} ${
              active ? 'border-(--q-ink) shadow-[0_0_0_0.5px_var(--q-ink)]' : 'border-(--q-line) hover:border-black/35'
            }`}
          >
            <span className="block aspect-[16/10] w-full overflow-hidden rounded-[10px] text-[#111]">
              {option.visual && <OptionVisual visual={option.visual} />}
            </span>
            <span className="block px-1 pb-1 pt-2.5">
              <span className={`block text-[15px] leading-[1.3] ${active ? 'font-semibold' : 'font-medium'}`}>{option.label}</span>
              {option.hint && <span className="mt-0.5 block text-[12px] leading-[1.4] text-(--q-muted)">{option.hint}</span>}
            </span>
            {active && (
              <span aria-hidden="true" className="absolute right-3.5 top-3.5 grid size-4 place-items-center rounded-full border-[1.5px] border-(--q-ink) bg-white">
                <span className="size-2 rounded-full bg-(--q-ink)" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Text inputs                                                               */
/* -------------------------------------------------------------------------- */

const underline = 'block w-full rounded-none border-0 border-b border-(--q-line) bg-transparent text-(--q-ink) outline-none transition-colors duration-150 placeholder:text-black/40 focus:border-(--q-ink)'

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
      className={`${underline} h-12 text-[18px]`}
    />
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
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
      <div className={`relative rounded-[14px] border bg-white/60 transition-colors duration-150 focus-within:border-(--q-ink) ${speech.listening ? 'border-(--q-ink)' : 'border-(--q-line)'}`}>
        <textarea
          id={id}
          aria-label={label}
          rows={4}
          value={speech.listening && speech.interim ? `${value}${value ? ' ' : ''}${speech.interim}` : value}
          autoFocus={autoFocus}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={speech.listening}
          onChange={(e) => onChange(e.target.value)}
          className="block min-h-[120px] w-full resize-y rounded-[14px] bg-transparent px-4 pb-14 pt-3.5 text-[16px] leading-[1.55] text-(--q-ink) outline-none placeholder:text-black/40"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 pb-2.5">
          {showMic ? (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              aria-pressed={speech.listening}
              className={`pointer-events-auto relative inline-flex h-9 items-center gap-1.5 rounded-full border pl-2.5 pr-3.5 text-[13px] transition-colors duration-150 before:absolute before:-inset-1 before:content-[''] ${focusRing} ${
                speech.listening ? 'border-(--q-ink) bg-(--q-ink) text-white' : 'border-(--q-line) text-(--q-ink) hover:border-(--q-ink)'
              }`}
            >
              {speech.listening ? <span className="mx-1 size-2 rounded-full bg-(--q-accent)" aria-hidden="true" /> : <MicIcon />}
              {speech.listening ? 'Listening… tap to stop' : 'Speak instead'}
            </button>
          ) : <span />}
          <span className="text-[12px] tabular-nums text-(--q-muted)">{value.length > maxLength * 0.7 ? `${value.length} / ${maxLength}` : ''}</span>
        </div>
      </div>
      {speech.error && <p role="alert" className="mt-3 text-[13px] text-(--q-error)">{speech.error}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Contact                                                                   */
/* -------------------------------------------------------------------------- */

function SmallField({
  label,
  emoji,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  optional,
  autoFocus,
}: {
  label: string
  emoji?: string
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
    <div className="pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] font-medium text-(--q-ink)">{emoji && <AppleEmoji emoji={emoji} size={16} className="mr-1.5" />}{label}</label>
        {optional && <span className="text-[13px] italic text-(--q-muted)">optional</span>}
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
        className={`${underline} h-11 text-[17px]`}
      />
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
    <div className="flex flex-col">
      <SmallField label="Your name" emoji="🙂" value={values.contactName} onChange={(v) => onChange('contactName', v)} placeholder="Your name" autoComplete="name" autoFocus />
      <SmallField label="Email" emoji="✉️" type="email" value={values.contactEmail} onChange={(v) => onChange('contactEmail', v)} placeholder="you@brand.com" autoComplete="email" />
      <SmallField label="Phone / WhatsApp" emoji="📱" type="tel" value={values.contactPhone} onChange={(v) => onChange('contactPhone', v)} placeholder="+91 98765 43210" autoComplete="tel" optional />
      {askWebsite && (
        <SmallField label="Current website" emoji="🌐" type="url" value={values.contactWebsite} onChange={(v) => onChange('contactWebsite', v)} placeholder="yourbrand.com" autoComplete="url" optional />
      )}
    </div>
  )
}

export function Helper({ children }: { children: ReactNode }) {
  return <p className="m-0 mt-2 text-[15px] leading-[1.55] text-(--q-muted)">{children}</p>
}
