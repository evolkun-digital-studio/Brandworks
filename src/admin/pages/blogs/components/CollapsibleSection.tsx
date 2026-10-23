import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  icon?: LucideIcon
  meta?: string
  children: ReactNode
}

/** A disclosure group: the title is always visible, the detail one tap deeper. */
function CollapsibleSection({ title, description, defaultOpen = false, icon: Icon, meta, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className="admin-group">
      <button type="button" className="admin-group__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        {Icon && <Icon size={16} strokeWidth={1.7} className="flex-none text-a-ink-2" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-semibold">{title}</span>
        {meta && <span className="text-xs text-a-ink-3">{meta}</span>}
        <ChevronRight size={15} strokeWidth={2} className={`flex-none text-a-ink-3 transition-transform duration-200 ease-a-spring ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="admin-group__body">
          {description && <p className="-mt-1 text-xs leading-snug text-a-ink-2">{description}</p>}
          {children}
        </div>
      )}
    </section>
  )
}

export default CollapsibleSection
