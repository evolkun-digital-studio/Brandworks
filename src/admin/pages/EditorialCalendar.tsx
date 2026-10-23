import { CalendarDays, ChevronRight, Clock, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '../../routing'
import * as blogApi from '../api/blogAdminApi'
import type { AdminBlogPost } from '../api/blogTypes'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import FormMessage from '../components/FormMessage'

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function CalendarDay({ date, posts }: { date: string; posts: AdminBlogPost[] }) {
  const day = new Date(`${date}T12:00:00`)
  const isToday = date === localDateKey(new Date())

  return (
    <section className="admin-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5.5 pt-4.5 pb-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[17px] font-semibold tracking-[-0.016em]">{day.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</h2>
          <span className="text-[13px] text-a-ink-2">{day.toLocaleDateString(undefined, { weekday: 'long' })}{isToday ? ' · Today' : ''}</span>
        </div>
        <AdminStatusBadge tone={isToday ? 'success' : 'neutral'}>{posts.length} {posts.length === 1 ? 'article' : 'articles'}</AdminStatusBadge>
      </header>
      <div className="admin-list">
        {posts.map((post) => {
          const overdue = Boolean(post.scheduledAt && new Date(post.scheduledAt).getTime() < Date.now())
          const reviewLabel = overdue ? 'Overdue' : post.reviewStatus === 'in_review' ? 'In review' : post.reviewStatus === 'approved' ? 'Approved' : 'Draft'
          const reviewTone = overdue ? 'danger' : post.reviewStatus === 'approved' ? 'success' : post.reviewStatus === 'in_review' ? 'warning' : 'neutral'
          return (
            <Link key={post.id} to={`/admin/blogs/${post.id}/edit`} className="admin-list-row">
              <span className="flex w-20 flex-none items-center gap-1.5 text-[13px] text-a-ink-2 tabular-nums">
                <Clock size={13} aria-hidden="true" />
                {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
              </span>
              <span className="admin-list-row__main">
                <span className="admin-list-row__title">{post.title || 'Untitled article'}</span>
                <span className="admin-list-row__sub">{post.authorName}</span>
              </span>
              <AdminStatusBadge tone={reviewTone}>{reviewLabel}</AdminStatusBadge>
              <ChevronRight size={15} className="text-a-ink-3" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function EditorialCalendar() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setPosts((await blogApi.listBlogPosts({ scheduled: true, limit: 100, sort: 'scheduled_asc' })).items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the publishing calendar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const groups = useMemo(() => {
    const grouped = new Map<string, AdminBlogPost[]>()
    for (const post of posts) {
      const key = post.scheduledAt ? localDateKey(new Date(post.scheduledAt)) : 'unscheduled'
      grouped.set(key, [...(grouped.get(key) ?? []), post])
    }
    return [...grouped.entries()]
  }, [posts])

  const overdueCount = posts.filter((post) => Boolean(post.scheduledAt && new Date(post.scheduledAt).getTime() < Date.now())).length
  const nextPublish = posts[0]?.scheduledAt ? new Date(posts[0].scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Calendar"
        description={nextPublish ? `Next article goes live ${nextPublish}.` : 'Everything scheduled to publish, day by day.'}
        actions={<AdminButton disabled={loading} onClick={() => void load()} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />}>Refresh</AdminButton>}
      />
      {error && <FormMessage type="error">{error}</FormMessage>}
      {overdueCount > 0 && <FormMessage type="error">{overdueCount} scheduled article{overdueCount === 1 ? ' is' : 's are'} past {overdueCount === 1 ? 'its' : 'their'} publish time. Check the scheduler on the Overview page.</FormMessage>}

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true"><span className="admin-skeleton h-40 rounded-a-lg" /><span className="admin-skeleton h-40 rounded-a-lg" /></div>
      ) : groups.length === 0 ? (
        <div className="admin-card admin-empty-state">
          <span className="admin-empty-state__icon"><CalendarDays size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <p className="admin-empty-state__title">Nothing scheduled</p>
          <p className="admin-empty-state__description">Choose a publish time from any article’s settings and it will appear here.</p>
          <Link to="/admin/blogs/new" className="admin-button admin-button--primary">New article</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4" aria-live="polite">
          {groups.map(([date, items]) => <CalendarDay key={date} date={date} posts={items} />)}
        </div>
      )}
    </div>
  )
}

export default EditorialCalendar
