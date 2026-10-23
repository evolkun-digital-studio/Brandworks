import type { ReactNode } from 'react'

/** Character meter shown beside a label. Turns amber near the limit. */
export function Counter({ value, max, soft }: { value: string; max: number; soft?: number }) {
  const length = value.length
  const tone = length > max ? 'text-a-danger' : soft && length > soft ? 'text-a-warning' : 'text-a-ink-3'
  return <span className={`text-xs tabular-nums ${tone}`}>{length}/{max}</span>
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  max?: number
  soft?: number
  placeholder?: string
  hint?: ReactNode
  rows?: number
  type?: string
  list?: string
}

/** Labelled single-line input with an optional character meter. */
export function TextField({ id, label, value, onChange, max, soft, placeholder, hint, type = 'text', list }: Omit<FieldProps, 'rows'>) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold">{label}</label>
        {max ? <Counter value={value} max={max} soft={soft} /> : null}
      </div>
      <input id={id} type={type} list={list} className="admin-input" value={value} placeholder={placeholder} maxLength={max ? max + 20 : undefined} onChange={(event) => onChange(event.target.value)} />
      {hint && <p className="admin-form-helper mt-1.5">{hint}</p>}
    </div>
  )
}

/** Labelled multi-line input with an optional character meter. */
export function TextAreaField({ id, label, value, onChange, max, soft, placeholder, hint, rows = 3 }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold">{label}</label>
        {max ? <Counter value={value} max={max} soft={soft} /> : null}
      </div>
      <textarea id={id} className="admin-textarea" rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint && <p className="admin-form-helper mt-1.5">{hint}</p>}
    </div>
  )
}

export function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (next: string) => void; options: readonly string[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">{label}</label>
      <select id={id} className="admin-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not set</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

/** A row with a label, a short description and an iOS-style switch. */
export function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description?: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-semibold">{label}</span>
        {description && <span className="block text-xs leading-snug text-a-ink-2">{description}</span>}
      </label>
      <span className="admin-switch">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
      </span>
    </div>
  )
}
