import type { CustomMetaTag } from '../../../api/blogTypes'

const MAX_ITEMS = 20
const NAME_MAX = 100
const CONTENT_MAX = 1000

interface CustomMetaTagsEditorProps {
  items: CustomMetaTag[]
  onChange: (next: CustomMetaTag[]) => void
}

/** Add/remove editor for raw name/content meta tag pairs — plain text only, never rendered as HTML. */
function CustomMetaTagsEditor({ items, onChange }: CustomMetaTagsEditorProps) {
  function updateAt(index: number, patch: Partial<CustomMetaTag>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...items, { name: '', content: '' }])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-neutral-900">Custom meta tags</span>
        <span className="text-[12px] text-neutral-400">
          {items.length}/{MAX_ITEMS}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateAt(index, { name: e.target.value })}
              placeholder="name"
              maxLength={NAME_MAX}
              className="w-[160px] shrink-0 rounded-[8px] border border-neutral-300 px-3 py-2 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
            <input
              type="text"
              value={item.content}
              onChange={(e) => updateAt(index, { content: e.target.value })}
              placeholder="content"
              maxLength={CONTENT_MAX}
              className="w-full rounded-[8px] border border-neutral-300 px-3 py-2 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove meta tag"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= MAX_ITEMS}
        className="w-fit rounded-[6px] border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
      >
        + Add meta tag
      </button>
    </div>
  )
}

export default CustomMetaTagsEditor
