import { useState } from 'react'
import type { ReactNode } from 'react'

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
    <div className="rounded-[12px] border border-neutral-200 bg-white p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[16px] font-semibold text-neutral-900">{title}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {description && <p className="mt-1 text-[13px] text-neutral-500">{description}</p>}

      {open && <div className="mt-5 flex flex-col gap-5">{children}</div>}
    </div>
  )
}

export default CollapsibleSection
