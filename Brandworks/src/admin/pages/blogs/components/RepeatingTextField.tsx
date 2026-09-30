interface RepeatingTextFieldProps {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  maxItems?: number
  maxItemLength?: number
}

/**
 * Simple add/remove/reorder list of full-length text entries — used
 * for Key Takeaways, where each entry is a full sentence (up to 300
 * characters) and a chip UI (see TagInput.tsx) wouldn't fit well.
 */
function RepeatingTextField({
  label,
  values,
  onChange,
  placeholder,
  maxItems,
  maxItemLength,
}: RepeatingTextFieldProps) {
  function updateAt(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)))
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  function moveAt(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= values.length) return
    const next = [...values]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function addItem() {
    onChange([...values, ''])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-neutral-900">{label}</span>
        {maxItems && (
          <span className="text-[12px] text-neutral-400">
            {values.length}/{maxItems}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-2.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveAt(index, -1)}
                aria-label="Move up"
                className="flex h-4 w-4 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M12 6l-8 8h16z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={index === values.length - 1}
                onClick={() => moveAt(index, 1)}
                aria-label="Move down"
                className="flex h-4 w-4 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M12 18l8-8H4z" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => updateAt(index, e.target.value)}
              placeholder={placeholder}
              maxLength={maxItemLength}
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove"
              className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={Boolean(maxItems) && values.length >= (maxItems as number)}
        className="w-fit rounded-[6px] border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  )
}

export default RepeatingTextField
