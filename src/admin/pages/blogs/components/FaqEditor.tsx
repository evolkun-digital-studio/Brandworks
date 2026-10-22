import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import type { FaqItem } from '../../../api/blogTypes'

const MAX_FAQ_ITEMS = 20
const QUESTION_MAX = 300
const ANSWER_MAX = 2000

interface FaqEditorProps {
  items: FaqItem[]
  onChange: (next: FaqItem[]) => void
}

/** Question/answer pairs, stored as data rather than embedded in the article body. */
function FaqEditor({ items, onChange }: FaqEditorProps) {
  const update = (index: number, patch: Partial<FaqItem>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">Questions</span>
        <span className="text-xs tabular-nums text-a-ink-3">{items.length}/{MAX_FAQ_ITEMS}</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-a-lg bg-a-fill p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-a-ink-2">Question {index + 1}</span>
              <div className="flex items-center">
                <button type="button" className="admin-icon-button size-6" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp size={13} aria-hidden="true" /></button>
                <button type="button" className="admin-icon-button size-6" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown size={13} aria-hidden="true" /></button>
                <button type="button" className="admin-icon-button size-6" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove question"><X size={13} aria-hidden="true" /></button>
              </div>
            </div>
            <input type="text" className="admin-input" value={item.question} onChange={(event) => update(index, { question: event.target.value })} maxLength={QUESTION_MAX} placeholder="Question" aria-label={`Question ${index + 1}`} />
            <textarea className="admin-textarea mt-2" rows={3} value={item.answer} onChange={(event) => update(index, { answer: event.target.value })} maxLength={ANSWER_MAX} placeholder="Answer" aria-label={`Answer ${index + 1}`} />
          </div>
        ))}
      </div>
      <button type="button" className="admin-link mt-2" disabled={items.length >= MAX_FAQ_ITEMS} onClick={() => onChange([...items, { question: '', answer: '' }])}>
        <Plus size={13} aria-hidden="true" /> Add question
      </button>
    </div>
  )
}

export default FaqEditor
