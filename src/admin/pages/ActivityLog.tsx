import { Activity, Archive, CalendarClock, CheckCircle2, ClipboardCheck, FilePenLine, ListFilter, RefreshCw, RotateCcw, ShieldCheck, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import * as operationsApi from '../api/operationsApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormMessage from '../components/FormMessage'

const labels: Record<string, string> = { created: 'Created', updated: 'Updated', submitted_for_review: 'Submitted for review', approved: 'Approved', changes_requested: 'Changes requested', published: 'Published', unpublished: 'Unpublished', scheduled: 'Scheduled', unscheduled: 'Schedule canceled', archived: 'Archived', restored: 'Restored', backup_exported: 'Backup exported', backup_restored: 'Backup restored' }
const actionOptions = [{ value: 'all', label: 'All events' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]

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
  async function load() { setLoading(true); setError(null); try { setItems((await operationsApi.listActivity()).activities) } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load activity history.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const filteredItems = useMemo(() => actionFilter === 'all' ? items : items.filter((item) => item.action === actionFilter), [actionFilter, items])
  const groups = useMemo(() => {
    const grouped = new Map<string, operationsApi.ActivityRecord[]>()
    filteredItems.forEach((item) => {
      const date = new Date(item.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      grouped.set(date, [...(grouped.get(date) ?? []), item])
    })
    return [...grouped.entries()]
  }, [filteredItems])
  const actorCount = new Set(items.map((item) => item.actorName)).size
  const eventTypeCount = new Set(items.map((item) => item.action)).size
  const latestEvent = items[0]?.createdAt ? new Date(items[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'
  return <div><AdminPageHeader eyebrow="Editorial operations" title="Activity" description="A server-recorded trail of publishing, review, archive, restore, and backup operations." actions={<AdminButton variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}</AdminButton>} />{error && <FormMessage type="error">{error}</FormMessage>}{!loading && items.length > 0 && <><section className="admin-activity-summary" aria-label="Activity summary"><div><span>Total events</span><strong>{items.length}</strong></div><div><span>Event types</span><strong>{eventTypeCount}</strong></div><div><span>Contributors</span><strong>{actorCount}</strong></div><div><span>Latest activity</span><strong>{latestEvent}</strong></div></section><div className="admin-activity-toolbar"><label htmlFor="activity-filter"><ListFilter size={14} strokeWidth={1.8} aria-hidden="true" /> Event type</label><select id="activity-filter" className="admin-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>{actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span>{filteredItems.length} event{filteredItems.length === 1 ? '' : 's'}</span>{actionFilter !== 'all' && <button type="button" className="admin-activity-clear" onClick={() => setActionFilter('all')}><X size={13} strokeWidth={2} aria-hidden="true" /> Clear filter</button>}</div></>}{loading ? <div className="admin-empty-state"><p className="admin-empty-state__title">Loading activity</p><p className="admin-empty-state__description">Reading the operational history.</p></div> : filteredItems.length === 0 ? <div className="admin-empty-state"><Activity size={22} className="mx-auto mb-3 text-neutral-400" aria-hidden="true" /><p className="admin-empty-state__title">{items.length ? 'No matching activity' : 'No activity recorded yet'}</p><p className="admin-empty-state__description">{items.length ? 'Try a different event type.' : 'New editorial actions will appear here.'}</p>{items.length > 0 && <AdminButton variant="secondary" onClick={() => setActionFilter('all')}>Show all activity</AdminButton>}</div> : <div className="admin-activity-groups" aria-live="polite">{groups.map(([date, group]) => { const groupId = `activity-${date.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`; return <section key={date} className="admin-activity-group" aria-labelledby={groupId}><h2 id={groupId}>{date}<span>{group.length} event{group.length === 1 ? '' : 's'}</span></h2><section className="admin-surface admin-activity-list">{group.map((item) => { const Icon = iconFor(item.action); return <article key={item.id} className="admin-activity-row"><span className="admin-activity-row__icon" aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span><div className="min-w-0"><strong>{labels[item.action] ?? item.action}</strong><p>{item.entityTitle || item.entityType}{item.metadata.note ? ` · ${item.metadata.note}` : ''}</p></div><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {item.actorName}</time></article> })}</section></section> })}</div>}</div>
}

export default ActivityLog
