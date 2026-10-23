import { Plus, X } from 'lucide-react'
import type { CustomMetaTag } from '../../../api/blogTypes'

const MAX_ITEMS = 20
const NAME_MAX = 100
const CONTENT_MAX = 1000

interface CustomMetaTagsEditorProps {
  items: CustomMetaTag[]
  onChange: (next: CustomMetaTag[]) => void
}

/** Raw name/content meta tag pairs — plain text only, never rendered as HTML. */
function CustomMetaTagsEditor({ items, onChange }: CustomMetaTagsEditorProps) {
  const update = (index: number, patch: Partial<CustomMetaTag>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">Meta tags</span>
        <span className="text-xs tabular-nums text-a-ink-3">{items.length}/{MAX_ITEMS}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <input type="text" className="admin-input w-[38%]" value={item.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="name" maxLength={NAME_MAX} aria-label={`Meta tag ${index + 1} name`} />
            <input type="text" className="admin-input" value={item.content} onChange={(event) => update(index, { content: event.target.value })} placeholder="content" maxLength={CONTENT_MAX} aria-label={`Meta tag ${index + 1} content`} />
            <button type="button" className="admin-icon-button size-7" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove meta tag"><X size={14} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
      <button type="button" className="admin-link mt-2" disabled={items.length >= MAX_ITEMS} onClick={() => onChange([...items, { name: '', content: '' }])}>
        <Plus size={13} aria-hidden="true" /> Add meta tag
      </button>
    </div>
  )
}

export default CustomMetaTagsEditor
