import { CalendarDays, ChevronRight, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '../../routing'
import * as blogApi from '../api/blogAdminApi'
import type { AdminBlogPost } from '../api/blogTypes'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import FormMessage from '../components/FormMessage'

function CalendarDay({ date, posts }: { date: string; posts: AdminBlogPost[] }) {
  const day = new Date(`${date}T12:00:00`)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isToday = date === todayKey

  return <section className={`admin-calendar__day ${isToday ? 'admin-calendar__day--today' : ''}`}><header><div><p>{day.toLocaleDateString(undefined, { weekday: 'short' })}{isToday ? ' · Today' : ''}</p><h2>{day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</h2></div><AdminStatusBadge tone={isToday ? 'success' : 'accent'}>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</AdminStatusBadge></header><div className="admin-calendar__items">{posts.map((post) => { const overdue = Boolean(post.scheduledAt && new Date(post.scheduledAt).getTime() < Date.now()); const reviewLabel = overdue ? 'Needs attention' : post.reviewStatus === 'in_review' ? 'In review' : post.reviewStatus === 'approved' ? 'Approved' : 'Draft'; const reviewTone = overdue ? 'danger' : post.reviewStatus === 'approved' ? 'success' : post.reviewStatus === 'in_review' ? 'warning' : 'neutral'; return <Link key={post.id} to={`/admin/blogs/${post.id}/edit`} className={`admin-calendar__item ${overdue ? 'admin-calendar__item--overdue' : ''}`}><span className="admin-calendar__item-time"><Clock size={13} aria-hidden="true" />{post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span><span className="admin-calendar__item-copy"><strong>{post.title || 'Untitled article'}</strong><small>{post.authorName}</small><AdminStatusBadge tone={reviewTone}>{reviewLabel}</AdminStatusBadge></span><ChevronRight size={15} aria-hidden="true" /></Link> })}</div></section>
}

function EditorialCalendar() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  async function load() { setLoading(true); setError(null); try { setPosts((await blogApi.listBlogPosts({ scheduled: true, limit: 100, sort: 'scheduled_asc' })).items) } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load the publishing calendar.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const groups = useMemo(() => { const grouped = new Map<string, AdminBlogPost[]>(); for (const post of posts) { const date = post.scheduledAt?.slice(0, 10) ?? 'unscheduled'; grouped.set(date, [...(grouped.get(date) ?? []), post]) } return [...grouped.entries()] }, [posts])
  const overdueCount = posts.filter((post) => Boolean(post.scheduledAt && new Date(post.scheduledAt).getTime() < Date.now())).length
  const nextPublish = posts[0]?.scheduledAt ? new Date(posts[0].scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Nothing queued'
  return <div><AdminPageHeader eyebrow="Editorial operations" title="Calendar" description="A calm view of scheduled publishing and review readiness. Scheduling remains server-authoritative." actions={<AdminButton variant="secondary" disabled={loading} onClick={() => void load()}><CalendarDays size={15} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}</AdminButton>} />{error && <FormMessage type="error">{error}</FormMessage>}{!loading && <section className="admin-calendar-summary" aria-label="Publishing summary"><div><span>Scheduled</span><strong>{posts.length}</strong></div><div><span>Publishing days</span><strong>{groups.length}</strong></div><div><span>Needs attention</span><strong className={overdueCount ? 'is-warning' : ''}>{overdueCount}</strong></div><div><span>Next publish</span><strong>{nextPublish}</strong></div></section>}{loading ? <div className="admin-empty-state"><p className="admin-empty-state__title">Loading calendar</p><p className="admin-empty-state__description">Checking the publishing queue.</p></div> : groups.length === 0 ? <div className="admin-empty-state"><p className="admin-empty-state__title">Nothing scheduled</p><p className="admin-empty-state__description">Schedule an article from its editor to see it here.</p><Link to="/admin/blogs/new" className="admin-button admin-button--primary">Create article</Link></div> : <div className="admin-calendar" aria-live="polite">{groups.map(([date, items]) => <CalendarDay key={date} date={date} posts={items} />)}</div>}</div>
}

export default EditorialCalendar
