'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * The Contact page's form language — page frame, type, fields, chips and
 * buttons — shared so other forms (the project planner) look like part of it.
 * Change a value here and both pages follow.
 */

export const EASE = [0.22, 1, 0.36, 1] as const

/* -------------------------------------------------------------------------- */
/*  Class tokens                                                              */
/* -------------------------------------------------------------------------- */

export const formPage = 'min-h-screen overflow-x-clip bg-white text-[#111] antialiased'
export const formSection = 'mx-auto w-full max-w-[1720px] px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-28 lg:pt-40 xl:px-16'
export const formDisplayHeading = 'font-(--font-primary) text-[clamp(44px,5.6vw,92px)] font-normal leading-[0.92] tracking-[-0.045em]'
export const formStepHeading = 'font-(--font-primary) text-[clamp(28px,3vw,44px)] leading-[1] tracking-[-0.03em]'
export const formBody = 'text-[16px] leading-[1.65] text-black/60'
export const formHint = 'text-[14px] text-black/50'
export const formEyebrow = 'text-[11px] font-medium uppercase tracking-[0.14em] text-black/40'
export const formFootnote = 'text-[12px] leading-[1.6] text-black/45'
export const formDivider = 'border-black/15'
export const formInput = 'w-full bg-transparent text-[18px] tracking-[-0.015em] text-black outline-none placeholder:text-black/25'
export const formTextarea = 'w-full resize-none bg-transparent text-[20px] leading-[1.5] tracking-[-0.02em] text-black outline-none placeholder:text-black/25'
export const formFooter = 'mt-10 flex items-center justify-between gap-4 border-t border-black/15 pt-8'
// The same row without the hairline, for the planner, where the field's own
// underline already closes the question. Spacing is unchanged.
export const formFooterPlain = 'mt-10 flex items-center justify-between gap-4 pt-8'
// One-screen variants for long option steps: header clearance only (the
// header is 64px at an 18/20px offset), a smaller heading, tighter footer.
export const formSectionFit = 'mx-auto flex min-h-dvh w-full max-w-[1720px] flex-col px-5 pb-4 pt-[88px] sm:px-8 sm:pb-8 sm:pt-[104px] lg:px-12 xl:px-16'
export const formStepHeadingCompact = 'font-(--font-primary) text-[clamp(28px,3vw,40px)] leading-[1] tracking-[-0.03em]'
export const formFooterCompact = 'mt-2 flex items-center justify-between gap-4 pt-3 sm:mt-7 sm:pt-6'
export const formSmallButton = 'relative h-9 shrink-0 overflow-hidden rounded-full border border-black/15 px-4 text-[12px] transition-colors hover:border-black'
export const formTextLink = 'border-b border-black/40 pb-1 text-[13px] transition-colors hover:border-black'
export const formChipFocus = 'outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2'

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <label htmlFor={htmlFor} className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">
        {children}
      </label>
      {hint && <span className="text-[12px] text-black/35">{hint}</span>}
    </div>
  )
}

export function ErrorText({ children }: { children?: string | null }) {
  return (
    <AnimatePresence>
      {children && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-3 text-[12px] text-[#c4302b]"
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export function Chip({
  active,
  onClick,
  children,
  role = 'checkbox',
  hint,
  dim,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  role?: 'checkbox' | 'radio'
  /** Extra description, read out and shown on hover. */
  hint?: string
  /** Fades the chip when a "pick up to N" group is full. */
  dim?: boolean
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={active}
      aria-description={hint}
      title={hint}
      onClick={onClick}
      className={`group relative inline-flex min-h-[46px] items-center gap-3 overflow-hidden rounded-full border px-5 text-[14px] tracking-[-0.01em] transition-colors duration-300 ${formChipFocus} ${
        active ? 'border-black text-black' : 'border-black/15 text-black/70 hover:border-black/50 hover:text-black'
      } ${dim ? 'opacity-50' : ''}`}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-[#ccff00]"
        initial={false}
        animate={{ scaleX: active ? 1 : 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      />
      <span className="relative">{children}</span>
      <span className="relative grid size-4 place-items-center">
        <motion.svg viewBox="0 0 16 16" className="size-4" initial={false} animate={{ rotate: active ? 45 : 0 }} transition={{ duration: 0.35, ease: EASE }} aria-hidden="true">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" />
        </motion.svg>
      </span>
    </button>
  )
}

/** The underlined field frame: a hairline that draws in black on focus. */
export function FieldLine({ children, error, className = 'pb-4' }: { children: ReactNode; error?: string | null; className?: string }) {
  return (
    <div className={`group relative border-b border-black/15 ${className}`}>
      {children}
      <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-x-100" />
      <ErrorText>{error}</ErrorText>
    </div>
  )
}

export function TextField({
  label,
  name,
  id = name,
  type = 'text',
  placeholder,
  autoComplete,
  value,
  onChange,
  error,
  optional,
  maxLength,
}: {
  label: string
  name: string
  id?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  value: string
  onChange: (v: string) => void
  error?: string
  optional?: boolean
  maxLength?: number
}) {
  return (
    <FieldLine error={error} className="pb-4 pt-7">
      <Label htmlFor={id} hint={optional ? 'Optional' : undefined}>{label}</Label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        className={formInput}
      />
    </FieldLine>
  )
}

/** The black pill with the arrow disc; the hover wipes it lime. */
export function PillButton({
  children,
  labelKey,
  type = 'button',
  onClick,
  disabled,
  busy,
}: {
  children: ReactNode
  /** Changing it rolls the label, e.g. per step. */
  labelKey?: string
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className="group relative inline-flex min-h-10 items-center gap-4 overflow-hidden rounded-full bg-[#111] pl-5 pr-1 text-white transition-colors duration-300 disabled:opacity-50"
    >
      <span className="absolute inset-0 origin-bottom scale-y-0 bg-[#ccff00] transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100" aria-hidden="true" />
      <span className="relative text-[14px] font-medium tracking-[-0.01em] transition-colors duration-300 group-hover:text-black">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={labelKey}
            className="block"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {children}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="relative grid size-8 place-items-center rounded-full bg-white text-black transition-transform duration-500 group-hover:rotate-45">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path d="M6 18 18 6M9 6h9v9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
    </button>
  )
}

/** The quiet secondary action ("← Back"); `hidden` keeps its space. */
export function BackButton({ onClick, hidden, children = '← Back' }: { onClick: () => void; hidden?: boolean; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[13px] text-black/55 transition-opacity hover:text-black ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden || undefined}
    >
      {children}
    </button>
  )
}

/** Contact's step progress bar: a 2px track that fills left to right. */
export function ProgressBar({ value }: { value: number }) {
  return (
    <span className="block h-[2px] w-full overflow-hidden bg-black/10">
      <motion.span
        className="block h-full origin-left bg-black"
        initial={false}
        animate={{ scaleX: Math.max(0, Math.min(1, value)) }}
        transition={{ duration: 0.6, ease: EASE }}
      />
    </span>
  )
}
