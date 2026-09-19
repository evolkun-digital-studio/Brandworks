import type { FaqItem } from '../../../api/blogTypes'

const MAX_FAQ_ITEMS = 20
const QUESTION_MAX = 300
const ANSWER_MAX = 2000

interface FaqEditorProps {
  items: FaqItem[]
  onChange: (next: FaqItem[]) => void
}

/**
 * Add/remove/reorder editor for structured FAQ entries — stored as
 * data (question/answer pairs), not embedded in Markdown, so a future
 * phase can render both a visible FAQ section and FAQ structured data
 * from the same source (Phase 6 spec, section 10).
 */
function FaqEditor({ items, onChange }: FaqEditorProps) {
  function updateAt(index: number, patch: Partial<FaqItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function moveAt(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function addItem() {
    onChange([...items, { question: '', answer: '' }])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-neutral-900">FAQ items</span>
        <span className="text-[12px] text-neutral-400">
          {items.length}/{MAX_FAQ_ITEMS}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-[10px] border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wide text-neutral-500">
                FAQ {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveAt(index, -1)}
                  aria-label="Move up"
                  className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveAt(index, 1)}
                  aria-label="Move down"
                  className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label="Remove FAQ item"
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-neutral-700">Question</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => updateAt(index, { question: e.target.value })}
                  maxLength={QUESTION_MAX}
                  className="w-full rounded-[8px] border border-neutral-300 px-3 py-2 text-[14px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-neutral-700">Answer</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => updateAt(index, { answer: e.target.value })}
                  maxLength={ANSWER_MAX}
                  rows={3}
                  className="w-full resize-y rounded-[8px] border border-neutral-300 px-3 py-2 text-[14px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= MAX_FAQ_ITEMS}
        className="w-fit rounded-[6px] border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
      >
        + Add FAQ
      </button>
    </div>
  )
}

export default FaqEditor
