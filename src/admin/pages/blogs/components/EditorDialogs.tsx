import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Check, Monitor, Rocket, Smartphone, Tablet, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownRehypePlugins } from '../../../../blog/lib/markdownConfig'
import AdminButton from '../../../components/AdminButton'
import AdminIconButton from '../../../components/AdminIconButton'
import { isLikelyUrl } from '../lib/editorForm'
import type { FormState } from '../lib/editorForm'
import type { AnalysisResult } from '../lib/blogAnalyzer'

/** Closes on Escape, keeps focus inside, and gives focus back afterwards. */
function useDialogFocus(onClose: () => void, initial?: React.RefObject<HTMLElement | null>) {
  const surface = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(initial?.current ?? surface.current?.querySelector<HTMLElement>('button, [href], input'))?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !surface.current) return
      const focusable = Array.from(surface.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onClose, initial])

  return surface
}

/* ------------------------------------------------------------------------ */

interface PublishSheetProps {
  analysis: AnalysisResult
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
  onSchedule: () => void
}

/** A last look before an article goes live. Suggestions only — never a gate. */
export function PublishSheet({ analysis, busy, onConfirm, onCancel, onSchedule }: PublishSheetProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const surface = useDialogFocus(onCancel, confirmRef)
  const items = analysis.checklist.flatMap((section) => section.items.map((item) => ({ ...item, section: section.section })))
  const issues = items.filter((item) => item.status === 'fail' || item.status === 'warning')
  const passed = items.filter((item) => item.status === 'pass').length

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section ref={surface} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-[13px] bg-a-accent-soft text-a-accent"><Rocket size={20} strokeWidth={1.8} aria-hidden="true" /></span>
          <div>
            <h2 id="publish-title" className="text-[19px] font-bold tracking-[-0.02em]">Ready to publish?</h2>
            <p className="mt-0.5 text-[13px] text-a-ink-2">
              {issues.length === 0 ? 'Everything we check looks good.' : `${passed} checks passed, ${issues.length} could be better. These are suggestions — you can still publish.`}
            </p>
          </div>
        </div>

        {issues.length > 0 && (
          <ul className="m-0 flex max-h-56 list-none flex-col gap-0.5 overflow-y-auto rounded-a-lg bg-a-fill p-2">
            {issues.slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 rounded-a-sm px-2 py-1.5">
                <AlertTriangle size={14} strokeWidth={2.2} className={`mt-0.5 flex-none ${item.status === 'fail' ? 'text-a-danger' : 'text-a-warning'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug font-medium">{item.label}</p>
                  <p className="text-xs leading-snug text-a-ink-2">{item.message}</p>
                </div>
              </li>
            ))}
            {issues.length > 8 && <li className="px-2 py-1 text-xs text-a-ink-2">…and {issues.length - 8} more in the SEO tab.</li>}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="admin-link" onClick={onSchedule}>Schedule for later instead</button>
          <div className="admin-modal__actions">
            <AdminButton onClick={onCancel}>Keep editing</AdminButton>
            <AdminButton ref={confirmRef} variant="primary" disabled={busy} onClick={onConfirm} icon={<Check size={14} aria-hidden="true" />}>
              {busy ? 'Publishing…' : 'Publish now'}
            </AdminButton>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

type Device = 'desktop' | 'tablet' | 'phone'

const DEVICES: Array<{ id: Device; label: string; width: string; icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', width: '100%', icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { id: 'phone', label: 'Phone', width: '390px', icon: Smartphone },
]

export function PreviewDialog({ form, readingMinutes, onClose }: { form: FormState; readingMinutes: number; onClose: () => void }) {
  const [device, setDevice] = useState<Device>('desktop')
  const surface = useDialogFocus(onClose)
  const width = DEVICES.find((item) => item.id === device)?.width ?? '100%'
  const byline = [form.authorName || 'Editorial team', readingMinutes ? `${readingMinutes} min read` : null].filter(Boolean).join(' · ')

  return (
    <div className="admin-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <section ref={surface} className="admin-preview__surface">
        <header className="admin-preview__bar">
          <h2 id="preview-title" className="text-[15px] font-semibold tracking-[-0.014em]">Preview</h2>
          <div className="admin-segmented-control" role="group" aria-label="Preview size">
            {DEVICES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={device === id} onClick={() => setDevice(id)}>
                <Icon size={14} className="mr-1.5 inline -translate-y-px" aria-hidden="true" />
                <span className="max-sm:sr-only">{label}</span>
              </button>
            ))}
          </div>
          <AdminIconButton label="Close preview" onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </header>
        <div className="admin-preview__stage">
          <article className="admin-preview__page" style={{ width }}>
            {isLikelyUrl(form.coverImage) && <img src={form.coverImage} alt={form.coverImageAlt || ''} className="aspect-[16/7] max-h-[440px] w-full object-cover" />}
            <div className="admin-preview__article">
              {form.category && <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-a-accent uppercase">{form.category}</p>}
              <h1 className="text-[clamp(28px,5vw,44px)] leading-[1.08] font-bold tracking-[-0.035em]">{form.title || 'Untitled article'}</h1>
              {form.excerpt && <p className="mt-4 text-[19px] leading-snug text-a-ink-2">{form.excerpt}</p>}
              <p className="mt-5 text-[13px] text-a-ink-2">{byline}</p>
              <div className="markdown-rich-content mt-8 text-[17px] leading-[1.75]">
                {form.content.trim()
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins}>{form.content}</ReactMarkdown>
                  : <p className="text-a-ink-3">Nothing to preview yet.</p>}
              </div>
              {form.keyTakeaways.filter(Boolean).length > 0 && (
                <aside className="mt-10 rounded-a-lg bg-a-fill p-5">
                  <h3 className="mb-2 text-[15px] font-semibold">Key takeaways</h3>
                  <ul className="m-0 list-disc pl-5 text-[15px] leading-relaxed">
                    {form.keyTakeaways.filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </aside>
              )}
              {form.faq.length > 0 && (
                <section className="mt-10">
                  <h3 className="mb-3 text-[19px] font-bold tracking-[-0.02em]">Frequently asked</h3>
                  {form.faq.map((item, index) => (
                    <details key={index} className="border-t border-a-line py-3">
                      <summary className="cursor-pointer text-[15px] font-semibold">{item.question || 'Question'}</summary>
                      <p className="mt-2 text-[15px] leading-relaxed text-a-ink-2">{item.answer}</p>
                    </details>
                  ))}
                </section>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

interface ShortcutGroup { title: string; items: Array<[string, string[]]> }

export function ShortcutsSheet({ isApple, onClose }: { isApple: boolean; onClose: () => void }) {
  const surface = useDialogFocus(onClose)
  const mod = isApple ? '⌘' : 'Ctrl'
  const shift = isApple ? '⇧' : 'Shift'
  const groups: ShortcutGroup[] = [
    {
      title: 'Document',
      items: [
        ['Save', [mod, 'S']],
        ['Preview', [mod, shift, 'P']],
        ['Focus mode', [mod, shift, 'F']],
        ['Toggle side panel', [mod, '\\']],
        ['Quick search', [mod, 'K']],
        ['Show shortcuts', [mod, '/']],
      ],
    },
    {
      title: 'Formatting',
      items: [
        ['Bold', [mod, 'B']],
        ['Italic', [mod, 'I']],
        ['Underline', [mod, 'U']],
        ['Undo', [mod, 'Z']],
        ['Redo', [mod, shift, 'Z']],
      ],
    },
    {
      title: 'Writing',
      items: [
        ['Insert a block', ['/']],
        ['Heading 1–4', ['#', '…', '####', 'Space']],
        ['Bulleted list', ['-', 'Space']],
        ['Numbered list', ['1.', 'Space']],
        ['Quote', ['>', 'Space']],
        ['Nest a list item', ['Tab']],
        ['Link selected text', [mod, 'V', '(paste a URL)']],
      ],
    },
  ]

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={surface} className="admin-modal admin-modal--wide" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div className="admin-modal__header">
          <div>
            <h2 id="shortcuts-title">Keyboard shortcuts</h2>
            <p>Everything you can do without lifting your hands.</p>
          </div>
          <AdminIconButton label="Close" onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold text-a-ink-3">{group.title}</h3>
              <ul className="m-0 flex list-none flex-col p-0">
                {group.items.map(([label, keys]): ReactNode => (
                  <li key={label} className="flex items-center justify-between gap-3 py-1.5 text-[13px] [&+&]:border-t [&+&]:border-a-line">
                    <span>{label}</span>
                    <span className="flex gap-1">{keys.map((key, index) => <kbd key={`${key}-${index}`}>{key}</kbd>)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
