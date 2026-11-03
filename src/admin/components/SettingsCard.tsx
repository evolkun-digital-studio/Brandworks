import type { FormEvent, ReactNode } from 'react'

/** A titled group of settings with its own save action in the footer. */
function SettingsCard({ title, description, children, footer, onSubmit }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onSubmit?: (event: FormEvent) => void }) {
  const body = (
    <>
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.016em]">{title}</h2>
        {description && <p className="mt-0.5 max-w-[60ch] text-[13px] leading-snug text-a-ink-2">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-3 border-t border-a-line bg-a-surface-2 px-6 py-3.5">{footer}</div>}
    </>
  )
  return onSubmit
    ? <form className="admin-card overflow-hidden" onSubmit={onSubmit}>{body}</form>
    : <section className="admin-card overflow-hidden">{body}</section>
}

export default SettingsCard
