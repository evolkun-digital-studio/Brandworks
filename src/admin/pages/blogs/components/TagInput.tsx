import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  maxItems?: number
  /** Per-entry character cap, enforced as you type — mirrors the backend limit. */
  maxItemLength?: number
  helpText?: string
  suggestions?: string[]
}

/**
 * Chip input. Enter or comma commits the current text as a chip; duplicates
 * (case-insensitive) are ignored, matching the backend's own dedupe rule.
 */
function TagInput({ label, values, onChange, placeholder, maxItems, maxItemLength, helpText, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const listId = `${inputId}-list`

  function commit(raw = draft) {
    const value = raw.trim()
    setDraft('')
    if (!value) return
    if (maxItems && values.length >= maxItems) return
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) return
    onChange([...values, value])
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-semibold">{label}</label>
        {maxItems ? <span className="text-xs tabular-nums text-a-ink-3">{values.length}/{maxItems}</span> : null}
      </div>
      <div className="admin-chips">
        {values.map((value, index) => (
          <span key={`${value}-${index}`} className="admin-chip">
            {value}
            <button type="button" onClick={() => onChange(values.filter((_, i) => i !== index))} aria-label={`Remove ${value}`}>
              <X size={11} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          list={suggestions.length ? listId : undefined}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit()}
          placeholder={values.length === 0 ? placeholder : 'Add another'}
          maxLength={maxItemLength}
        />
        {suggestions.length > 0 && <datalist id={listId}>{suggestions.map((item) => <option key={item} value={item} />)}</datalist>}
      </div>
      <p className="admin-form-helper mt-1.5">{helpText ?? 'Press Return to add.'}</p>
    </div>
  )
}

export default TagInput
