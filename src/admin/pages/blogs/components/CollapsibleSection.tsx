import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  description?: string
  /** Closed by default — keeps the editor from feeling overwhelming; see BlogEditor.tsx. */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Generalizes the collapsible "SEO (optional)" pattern already used
 * in BlogEditor.tsx before Phase 6 — one implementation instead of
 * repeating the same open/close toggle for every new section.
 */
function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="admin-editor-section !p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[40px] w-full items-center justify-between text-left"
      >
        <span className="text-[15px] font-bold tracking-[-0.02em] text-neutral-900">{title}</span>
        <ChevronDown size={17} className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {description && <p className="mt-1 text-[13px] text-neutral-500">{description}</p>}

      {open && <div className="mt-5 flex flex-col gap-5">{children}</div>}
    </div>
  )
}

export default CollapsibleSection
