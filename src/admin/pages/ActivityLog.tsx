import { Activity, Archive, CalendarClock, CheckCircle2, ClipboardCheck, FilePenLine, RefreshCw, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import * as operationsApi from '../api/operationsApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormMessage from '../components/FormMessage'

const labels: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  submitted_for_review: 'Sent for review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  published: 'Published',
  unpublished: 'Unpublished',
  scheduled: 'Scheduled',
  unscheduled: 'Schedule canceled',
  archived: 'Deleted',
  restored: 'Restored',
  backup_exported: 'Backup exported',
  backup_restored: 'Backup restored',
}

const actionOptions = [{ value: 'all', label: 'All activity' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]

function iconFor(action: string): LucideIcon {
  if (action === 'published' || action === 'approved') return CheckCircle2
  if (action === 'scheduled' || action === 'unscheduled') return CalendarClock
  if (action === 'archived') return Archive
  if (action === 'restored') return RotateCcw
  if (action.startsWith('backup')) return Upload
  if (action === 'submitted_for_review' || action === 'changes_requested') return ClipboardCheck
  if (action === 'created' || action === 'updated' || action === 'unpublished') return FilePenLine
  return ShieldCheck
}

function ActivityLog() {
  const [items, setItems] = useState<operationsApi.ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('all')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setItems((await operationsApi.listActivity()).activities)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load activity.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filteredItems = useMemo(() => actionFilter === 'all' ? items : items.filter((item) => item.action === actionFilter), [actionFilter, items])
  const groups = useMemo(() => {
    const grouped = new Map<string, operationsApi.ActivityRecord[]>()
    filteredItems.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      grouped.set(date, [...(grouped.get(date) ?? []), item])
    })
    return [...grouped.entries()]
  }, [filteredItems])

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Activity"
        description="A record of publishing, review and backup actions."
        actions={
          <>
            {items.length > 0 && (
              <>
                <label htmlFor="activity-filter" className="sr-only">Filter by event</label>
                <select id="activity-filter" className="admin-select w-auto" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                  {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </>
            )}
            <AdminButton onClick={() => void load()} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />}>Refresh</AdminButton>
          </>
        }
      />
      {error && <FormMessage type="error">{error}</FormMessage>}

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true"><span className="admin-skeleton h-24 rounded-a-lg" /><span className="admin-skeleton h-40 rounded-a-lg" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="admin-card admin-empty-state">
          <span className="admin-empty-state__icon"><Activity size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <p className="admin-empty-state__title">{items.length ? 'No matching activity' : 'Nothing yet'}</p>
          <p className="admin-empty-state__description">{items.length ? 'Try a different event type.' : 'Publishing, review and backup actions will appear here.'}</p>
          {items.length > 0 && <AdminButton onClick={() => setActionFilter('all')}>Show everything</AdminButton>}
        </div>
      ) : (
        <div className="flex flex-col gap-6" aria-live="polite">
          {groups.map(([date, group]) => {
            const groupId = `activity-${date.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
            return (
              <section key={date} aria-labelledby={groupId}>
                <h2 id={groupId} className="mb-2 px-1 text-[13px] font-semibold text-a-ink-2">{date}</h2>
                <div className="admin-card admin-list overflow-hidden">
                  {group.map((item) => {
                    const Icon = iconFor(item.action)
                    return (
                      <article key={item.id} className="admin-list-row">
                        <span className="grid size-9 flex-none place-items-center rounded-full bg-a-fill text-a-ink-2" aria-hidden="true"><Icon size={16} strokeWidth={1.8} /></span>
                        <div className="admin-list-row__main">
                          <strong className="block text-[14px] font-semibold">{labels[item.action] ?? item.action}</strong>
                          <p className="truncate text-[13px] text-a-ink-2">{item.entityTitle || item.entityType}{item.metadata.note ? ` · ${item.metadata.note}` : ''}</p>
                        </div>
                        <time className="flex-none text-right text-xs text-a-ink-2" dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          <span className="block">{item.actorName}</span>
                        </time>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ActivityLog
