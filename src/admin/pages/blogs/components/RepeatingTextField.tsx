import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'

interface RepeatingTextFieldProps {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  maxItems?: number
  maxItemLength?: number
}

/** A list of full-sentence entries (key takeaways) you can add to, reorder and remove. */
function RepeatingTextField({ label, values, onChange, placeholder, maxItems, maxItemLength }: RepeatingTextFieldProps) {
  const update = (index: number, value: string) => onChange(values.map((current, i) => (i === index ? value : current)))
  const remove = (index: number) => onChange(values.filter((_, i) => i !== index))
  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= values.length) return
    const next = [...values]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        {maxItems ? <span className="text-xs tabular-nums text-a-ink-3">{values.length}/{maxItems}</span> : null}
      </div>
      <div className="flex flex-col gap-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-1">
            <input
              type="text"
              className="admin-input"
              value={value}
              onChange={(event) => update(index, event.target.value)}
              placeholder={placeholder}
              maxLength={maxItemLength}
              aria-label={`${label} ${index + 1}`}
            />
            <button type="button" className="admin-icon-button size-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp size={14} aria-hidden="true" /></button>
            <button type="button" className="admin-icon-button size-7" disabled={index === values.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown size={14} aria-hidden="true" /></button>
            <button type="button" className="admin-icon-button size-7" onClick={() => remove(index)} aria-label="Remove"><X size={14} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
      <button type="button" className="admin-link mt-2" disabled={Boolean(maxItems) && values.length >= (maxItems as number)} onClick={() => onChange([...values, ''])}>
        <Plus size={13} aria-hidden="true" /> Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

export default RepeatingTextField
