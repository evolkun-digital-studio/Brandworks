import { CalendarDays, ChevronRight, Clock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '../../routing'
import * as blogApi from '../api/blogAdminApi'
import type { AdminBlogPost } from '../api/blogTypes'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormMessage from '../components/FormMessage'

function CalendarDay({ date, posts }: { date: string; posts: AdminBlogPost[] }) {
  return <section className="admin-calendar__day"><header><div><p>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</p><h2>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</h2></div><span>{posts.length} scheduled</span></header><div className="admin-calendar__items">{posts.map((post) => <Link key={post.id} to={`/admin/blogs/${post.id}/edit`} className="admin-calendar__item"><span className="admin-calendar__item-time"><Clock size={13} aria-hidden="true" />{post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span><span className="min-w-0"><strong>{post.title || 'Untitled article'}</strong><small>{post.authorName} · {post.reviewStatus === 'in_review' ? 'In review' : post.reviewStatus === 'approved' ? 'Approved' : 'Draft'}</small></span><ChevronRight size={15} aria-hidden="true" /></Link>)}</div></section>
}

function EditorialCalendar() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  async function load() { setLoading(true); setError(null); try { setPosts((await blogApi.listBlogPosts({ scheduled: true, limit: 100, sort: 'scheduled_asc' })).items) } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load the publishing calendar.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const groups = useMemo(() => { const grouped = new Map<string, AdminBlogPost[]>(); for (const post of posts) { const date = post.scheduledAt?.slice(0, 10) ?? 'unscheduled'; grouped.set(date, [...(grouped.get(date) ?? []), post]) } return [...grouped.entries()] }, [posts])
  return <div><AdminPageHeader eyebrow="Editorial operations" title="Calendar" description="A calm view of scheduled publishing and review readiness. Scheduling remains server-authoritative." actions={<AdminButton variant="secondary" onClick={() => void load()}><CalendarDays size={15} aria-hidden="true" /> Refresh</AdminButton>} />{error && <FormMessage type="error">{error}</FormMessage>}{loading ? <div className="admin-empty-state"><p className="admin-empty-state__title">Loading calendar</p><p className="admin-empty-state__description">Checking the publishing queue.</p></div> : groups.length === 0 ? <div className="admin-empty-state"><p className="admin-empty-state__title">Nothing scheduled</p><p className="admin-empty-state__description">Schedule an article from its editor to see it here.</p></div> : <div className="admin-calendar">{groups.map(([date, items]) => <CalendarDay key={date} date={date} posts={items} />)}</div>}</div>
}

export default EditorialCalendar
