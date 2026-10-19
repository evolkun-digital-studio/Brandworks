import { Activity, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as operationsApi from '../api/operationsApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormMessage from '../components/FormMessage'

const labels: Record<string, string> = { created: 'Created', updated: 'Updated', submitted_for_review: 'Submitted for review', approved: 'Approved', changes_requested: 'Changes requested', published: 'Published', unpublished: 'Unpublished', scheduled: 'Scheduled', unscheduled: 'Schedule canceled', archived: 'Archived', restored: 'Restored', backup_exported: 'Backup exported', backup_restored: 'Backup restored' }

function ActivityLog() {
  const [items, setItems] = useState<operationsApi.ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  async function load() { setLoading(true); setError(null); try { setItems((await operationsApi.listActivity()).activities) } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load activity history.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  return <div><AdminPageHeader eyebrow="Editorial operations" title="Activity" description="A server-recorded trail of publishing, review, archive, restore, and backup operations." actions={<AdminButton variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Refresh</AdminButton>} />{error && <FormMessage type="error">{error}</FormMessage>}{loading ? <div className="admin-empty-state"><p className="admin-empty-state__title">Loading activity</p><p className="admin-empty-state__description">Reading the operational history.</p></div> : items.length === 0 ? <div className="admin-empty-state"><Activity size={22} className="mx-auto mb-3 text-neutral-400" aria-hidden="true" /><p className="admin-empty-state__title">No activity recorded yet</p><p className="admin-empty-state__description">New editorial actions will appear here.</p></div> : <section className="admin-surface admin-activity-list">{items.map((item) => <article key={item.id} className="admin-activity-row"><span className="admin-activity-row__dot" aria-hidden="true" /><div className="min-w-0"><strong>{labels[item.action] ?? item.action}</strong><p>{item.entityTitle || item.entityType}{item.metadata.note ? ` · ${item.metadata.note}` : ''}</p></div><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()} · {item.actorName}</time></article>)}</section>}</div>
}

export default ActivityLog
