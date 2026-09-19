import { useState } from 'react'
import type { KeyboardEvent } from 'react'

interface TagInputProps {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  maxItems?: number
  /** Per-entry character cap, enforced natively as you type — mirrors the backend's own per-item limit. */
  maxItemLength?: number
  helpText?: string
}

/**
 * Lightweight chip input — no tag-management library. Reused for
 * every short-string-array field in the editor (tags, secondary
 * keywords, entity "about"/"mentioned entities"), each just a
 * different label/placeholder/max. Enter or comma commits the current
 * text as a chip; duplicates (case-insensitive) are silently ignored
 * rather than added twice, matching the backend's own dedupe rule.
 */
function TagInput({
  label,
  values,
  onChange,
  placeholder,
  maxItems,
  maxItemLength,
  helpText,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const inputId = `taginput-${label.replace(/\s+/g, '-').toLowerCase()}`

  function commitDraft() {
    const value = draft.trim()
    setDraft('')
    if (!value) return
    if (maxItems && values.length >= maxItems) return
    const alreadyPresent = values.some((v) => v.toLowerCase() === value.toLowerCase())
    if (alreadyPresent) return
    onChange([...values, value])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commitDraft()
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[14px] font-medium text-neutral-900">
        {label}
      </label>

      <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-[10px] border border-neutral-300 px-3 py-2 focus-within:border-neutral-500">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="flex items-center gap-1 rounded-[4px] bg-neutral-100 py-1 pr-1 pl-2.5 text-[13px] text-neutral-800"
          >
            {value}
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={`Remove ${value}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={values.length === 0 ? placeholder : undefined}
          maxLength={maxItemLength}
          className="min-w-[120px] flex-1 border-0 py-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
      </div>

      <p className="text-[12px] text-neutral-500">
        {helpText ?? 'Press Enter or comma to add.'}
        {maxItems && ` (${values.length}/${maxItems})`}
      </p>
    </div>
  )
}

export default TagInput
