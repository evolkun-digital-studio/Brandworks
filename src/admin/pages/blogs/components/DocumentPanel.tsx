import { useState } from 'react'
import { CalendarClock, CheckCircle2, ExternalLink, History, Image as ImageIcon, ListTree, MessageSquareWarning, RotateCcw, Tags } from 'lucide-react'
import * as blogApi from '../../../api/blogAdminApi'
import type { AdminBlogRevision } from '../../../api/blogAdminApi'
import type { BlogStatus, ReviewStatus } from '../../../api/blogTypes'
import { ApiError } from '../../../api/client'
import AdminButton from '../../../components/AdminButton'
import AdminStatusBadge from '../../../components/AdminStatusBadge'
import { useConfirm } from '../../../components/ConfirmDialog'
import CollapsibleSection from './CollapsibleSection'
import TagInput from './TagInput'
import { TextField } from './fields'
import {
  CATEGORY_MAX,
  COVER_IMAGE_CAPTION_MAX,
  COVER_IMAGE_DESCRIPTION_MAX,
  COVER_IMAGE_TITLE_MAX,
  EDITOR_NAME_MAX,
  TAGS_MAX_ITEMS,
  TAG_MAX,
  localTimeZoneLabel,
  schedulePresets,
} from '../lib/editorForm'
import type { FormState } from '../lib/editorForm'
import type { AnalysisResult } from '../lib/blogAnalyzer'

type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void

interface DocumentPanelProps {
  id?: string
  form: FormState
  update: Update
  analysis: AnalysisResult
  isEditing: boolean
  isAdmin: boolean
  status: BlogStatus | null
  reviewStatus: ReviewStatus
  reviewNote: string | null
  publishedAt: string | null
  scheduledAt: string | null
  scheduleInput: string
  onScheduleInput: (next: string) => void
  busy: boolean
  scheduling: boolean
  unscheduling: boolean
  onSchedule: () => void
  onUnschedule: () => void
  onReview: (next: ReviewStatus, note?: string | null) => void
  onJumpToHeading: (index: number) => void
  onRestoreRevision: (revision: AdminBlogRevision) => Promise<void>
}

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  draft: 'Not submitted',
  in_review: 'In review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
}

const REVIEW_TONE = { draft: 'neutral', in_review: 'accent', changes_requested: 'warning', approved: 'success' } as const

function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="admin-panel-section">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold tracking-[-0.006em]">{title}</h3>
        {aside}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  )
}

function RevisionHistory({ id, onRestore }: { id?: string; onRestore: (revision: AdminBlogRevision) => Promise<void> }) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revisions, setRevisions] = useState<AdminBlogRevision[]>([])
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  async function load() {
    if (!id || loaded || loading) return
    setLoading(true)
    setError(null)
    try {
      setRevisions((await blogApi.listBlogRevisions(id)).revisions)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load revisions.')
    } finally {
      setLoading(false)
    }
  }

  async function restore(revision: AdminBlogRevision) {
    const ok = await confirm({
      title: 'Restore this version?',
      message: `Your article returns to how it was on ${dateTime(revision.createdAt)}. Publishing status stays as it is.`,
      confirmLabel: 'Restore',
    })
    if (!ok) return
    setRestoring(revision.id)
    try {
      await onRestore(revision)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not restore that version.')
    } finally {
      setRestoring(null)
    }
  }

  async function compare() {
    if (!id || revisions.length < 2) return
    try {
      const { comparison: result } = await blogApi.compareBlogRevisions(id, revisions[0].id, revisions[1].id)
      setComparison(result.changedFields.length ? `Changed: ${result.changedFields.join(', ')}.` : 'No tracked fields changed.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not compare versions.')
    }
  }

  return (
    <div onClick={() => void load()}>
      <CollapsibleSection title="Revision history" icon={History} meta={id ? undefined : 'After first save'}>
        {!id ? (
          <p className="text-xs text-a-ink-2">Every save is kept here, so you can always go back.</p>
        ) : (
          <>
            {loading && <p className="text-xs text-a-ink-2">Loading…</p>}
            {error && <p className="admin-field-error mt-0" role="alert">{error}</p>}
            {loaded && revisions.length === 0 && <p className="text-xs text-a-ink-2">No earlier versions yet.</p>}
            {revisions.length > 1 && (
              <button type="button" className="admin-link self-start" onClick={() => void compare()}>Compare the latest two</button>
            )}
            {comparison && <p className="text-xs text-a-ink-2" role="status">{comparison}</p>}
            <ul className="m-0 flex list-none flex-col p-0">
              {revisions.map((revision) => (
                <li key={revision.id} className="flex items-center justify-between gap-2 py-2 [&+&]:border-t [&+&]:border-a-line">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{dateTime(revision.createdAt)}</p>
                    <p className="truncate text-xs text-a-ink-2">{revision.authorName}</p>
                  </div>
                  <AdminButton size="sm" disabled={restoring !== null} onClick={() => void restore(revision)} icon={<RotateCcw size={12} aria-hidden="true" />}>
                    {restoring === revision.id ? 'Restoring…' : 'Restore'}
                  </AdminButton>
                </li>
              ))}
            </ul>
          </>
        )}
      </CollapsibleSection>
      {dialog}
    </div>
  )
}

function ReviewBlock({ reviewStatus, reviewNote, isAdmin, busy, onReview }: Pick<DocumentPanelProps, 'reviewStatus' | 'reviewNote' | 'isAdmin' | 'busy' | 'onReview'>) {
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')

  return (
    <Section title="Review" aside={<AdminStatusBadge tone={REVIEW_TONE[reviewStatus]}>{REVIEW_LABEL[reviewStatus]}</AdminStatusBadge>}>
      {reviewStatus === 'changes_requested' && reviewNote && (
        <div className="flex gap-2.5 rounded-a bg-a-warning-soft p-3 text-[13px] text-a-warning">
          <MessageSquareWarning size={16} className="mt-px flex-none" aria-hidden="true" />
          <p className="leading-snug">{reviewNote}</p>
        </div>
      )}
      {reviewStatus === 'approved' && (
        <p className="flex items-center gap-2 text-[13px] text-a-success"><CheckCircle2 size={15} aria-hidden="true" /> Approved and ready to publish.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {reviewStatus !== 'in_review' && reviewStatus !== 'approved' && (
          <AdminButton size="sm" disabled={busy} onClick={() => onReview('in_review')}>Request review</AdminButton>
        )}
        {isAdmin && reviewStatus === 'in_review' && (
          <>
            <AdminButton size="sm" variant="primary" disabled={busy} onClick={() => onReview('approved')}>Approve</AdminButton>
            <AdminButton size="sm" disabled={busy} onClick={() => setAsking((value) => !value)}>Request changes</AdminButton>
          </>
        )}
      </div>
      {asking && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onReview('changes_requested', note.trim() || null)
            setAsking(false)
            setNote('')
          }}
        >
          <label htmlFor="review-note" className="sr-only">What needs to change?</label>
          <textarea id="review-note" className="admin-textarea" rows={3} autoFocus placeholder="What needs to change?" value={note} onChange={(event) => setNote(event.target.value)} />
          <AdminButton size="sm" variant="primary" type="submit" className="self-end">Send</AdminButton>
        </form>
      )}
    </Section>
  )
}

function DocumentPanel(props: DocumentPanelProps) {
  const { id, form, update, analysis, isEditing, isAdmin, status, publishedAt, scheduledAt, scheduleInput, onScheduleInput, busy, scheduling, unscheduling } = props
  const presets = schedulePresets()

  return (
    <div>
      <Section
        title="Publishing"
        aside={
          status === 'published'
            ? <AdminStatusBadge tone="success">Published</AdminStatusBadge>
            : scheduledAt
              ? <AdminStatusBadge tone="accent">Scheduled</AdminStatusBadge>
              : <AdminStatusBadge>{status === 'unpublished' ? 'Unpublished' : 'Draft'}</AdminStatusBadge>
        }
      >
        <p className="text-[13px] leading-snug text-a-ink-2">
          {status === 'published'
            ? <>Live{publishedAt ? <> since <b className="font-semibold text-a-ink">{dateTime(publishedAt)}</b></> : null}.</>
            : scheduledAt
              ? <>Goes live on <b className="font-semibold text-a-ink">{dateTime(scheduledAt)}</b>.</>
              : 'Not published yet. Publish now, or choose a time below.'}
        </p>

        {status === 'published' && form.slug && (
          <a className="admin-link self-start" href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
            View on the website <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}

        {status !== 'published' && (
          <div className="flex flex-col gap-2.5 rounded-a-lg bg-a-fill p-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold"><CalendarClock size={15} className="text-a-ink-2" aria-hidden="true" /> Schedule</div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button key={preset.label} type="button" className={`admin-pill ${scheduleInput === preset.value ? 'admin-pill--on' : ''}`} onClick={() => onScheduleInput(preset.value)}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="scheduledAt" className="sr-only">Publish at</label>
              <input id="scheduledAt" type="datetime-local" className="admin-input" value={scheduleInput} onChange={(event) => onScheduleInput(event.target.value)} />
              <p className="admin-form-helper mt-1.5">Your local time ({localTimeZoneLabel}).</p>
            </div>
            {!isAdmin && <p className="text-xs text-a-warning">Only administrators can schedule publishing.</p>}
            <div className="flex flex-wrap gap-2">
              <AdminButton size="sm" variant="primary" disabled={busy || !isAdmin || !scheduleInput} onClick={props.onSchedule}>
                {scheduling ? 'Saving…' : scheduledAt ? 'Update schedule' : 'Schedule'}
              </AdminButton>
              {scheduledAt && (
                <AdminButton size="sm" disabled={busy || !isAdmin} onClick={props.onUnschedule}>
                  {unscheduling ? 'Canceling…' : 'Cancel schedule'}
                </AdminButton>
              )}
            </div>
          </div>
        )}
      </Section>

      {isEditing && <ReviewBlock reviewStatus={props.reviewStatus} reviewNote={props.reviewNote} isAdmin={isAdmin} busy={busy} onReview={props.onReview} />}

      <CollapsibleSection title="Organize" icon={Tags} defaultOpen>
        <TextField id="category" label="Category" value={form.category} onChange={(next) => update('category', next)} max={CATEGORY_MAX} placeholder="e.g. Branding" />
        <TagInput label="Tags" values={form.tags} onChange={(next) => update('tags', next)} placeholder="Add a tag" maxItems={TAGS_MAX_ITEMS} maxItemLength={TAG_MAX} />
        <TextField id="authorName" label="Author" value={form.authorName} onChange={(next) => update('authorName', next)} max={EDITOR_NAME_MAX} hint="Shown in the article byline." />
        {!isEditing && (
          <TextField id="publishDate" label="Publish date" type="date" value={form.publishDate} onChange={(next) => update('publishDate', next)} hint="Optional. Used the first time it’s published; leave blank to use that moment." />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Image details" icon={ImageIcon}>
        <TextField id="coverImageTitle" label="Title" value={form.coverImageTitle} onChange={(next) => update('coverImageTitle', next)} max={COVER_IMAGE_TITLE_MAX} />
        <TextField id="coverImageCaption" label="Caption" value={form.coverImageCaption} onChange={(next) => update('coverImageCaption', next)} max={COVER_IMAGE_CAPTION_MAX} />
        <TextField id="coverImageDescription" label="Description" value={form.coverImageDescription} onChange={(next) => update('coverImageDescription', next)} max={COVER_IMAGE_DESCRIPTION_MAX} />
      </CollapsibleSection>

      <CollapsibleSection title="Outline" icon={ListTree} defaultOpen meta={analysis.toc.length ? `${analysis.toc.length}` : undefined}>
        {analysis.toc.length ? (
          <ol className="m-0 flex list-none flex-col p-0">
            {analysis.toc.map((entry, index) => (
              <li key={`${entry.id}-${index}`} style={{ paddingLeft: `${(entry.level - 2) * 14}px` }}>
                <button type="button" className="admin-outline-item" onClick={() => props.onJumpToHeading(index)}>{entry.text}</button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-a-ink-2">Add headings (H2–H4) and they’ll appear here as a clickable outline.</p>
        )}
      </CollapsibleSection>

      <RevisionHistory id={id} onRestore={props.onRestoreRevision} />
    </div>
  )
}

export default DocumentPanel
