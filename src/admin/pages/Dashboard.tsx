import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  FileText,
  Images,
  RefreshCw,
  Settings2,
} from 'lucide-react'
import { Link } from '../../routing'
import * as blogAdminApi from '../api/blogAdminApi'
import type { PublishDueJobStatus } from '../api/blogAdminApi'
import type { AdminBlogListResult, AdminBlogPost } from '../api/blogTypes'
import AdminButton from '../components/AdminButton'
import AdminIconButton from '../components/AdminIconButton'
import AdminStatusBadge from '../components/AdminStatusBadge'

interface DashboardLibrary {
  recent: AdminBlogPost[]
  scheduled: AdminBlogPost[]
  total: number
  published: number
  drafts: number
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : { year: 'numeric' }),
  }).format(date)
}

function statusFor(post: AdminBlogPost) {
  if (post.scheduledAt && post.status !== 'published') return 'scheduled' as const
  return post.status
}

function statusLabel(post: AdminBlogPost) {
  const status = statusFor(post)
  return status[0].toUpperCase() + status.slice(1)
}

function statusTone(post: AdminBlogPost) {
  const status = statusFor(post)
  if (status === 'published') return 'success' as const
  if (status === 'scheduled') return 'accent' as const
  if (status === 'unpublished') return 'warning' as const
  return 'neutral' as const
}

function jobStatusLabel(status: PublishDueJobStatus['status']) {
  if (status === 'healthy') return 'Healthy'
  if (status === 'stale') return 'Stale'
  if (status === 'failed') return 'Last run failed'
  return 'No run recorded'
}

function jobStatusTone(status: PublishDueJobStatus['status'] | null) {
  if (status === 'healthy') return 'success' as const
  if (status === 'stale') return 'warning' as const
  if (status === 'failed') return 'danger' as const
  return 'neutral' as const
}

function greeting(hour: number) {
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ArticleRow({ post }: { post: AdminBlogPost }) {
  return (
    <Link to={`/admin/blogs/${post.id}/edit`} className="admin-list-row">
      <span className="admin-thumb">
        {post.coverImage
          ? <img src={post.coverImage} alt="" loading="lazy" decoding="async" />
          : <FileText size={17} strokeWidth={1.6} aria-hidden="true" />}
      </span>
      <span className="admin-list-row__main">
        <span className="admin-list-row__title">{post.title || 'Untitled article'}</span>
        <span className="admin-list-row__sub">
          {post.authorName || 'Unassigned'} · Edited {formatDate(post.updatedAt)}
        </span>
      </span>
      <AdminStatusBadge tone={statusTone(post)}>{statusLabel(post)}</AdminStatusBadge>
      <ChevronRight size={16} strokeWidth={1.8} className="text-a-ink-3" aria-hidden="true" />
    </Link>
  )
}

function Stat({ label, value, caption, href }: { label: string; value: number | null; caption: string; href: string }) {
  return (
    <Link
      to={href}
      className="group relative flex flex-col gap-1 px-6 py-5 transition-colors duration-120 ease-a hover:bg-a-fill max-sm:px-4 max-sm:py-4"
    >
      <span className="text-[13px] font-medium text-a-ink-2">{label}</span>
      <span className="text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums" aria-live="polite">
        {value === null ? '—' : value}
      </span>
      <span className="text-xs text-a-ink-2">{caption}</span>
      <ArrowUpRight
        size={15}
        strokeWidth={1.8}
        className="absolute top-5 right-5 text-a-ink-3 opacity-0 transition-opacity duration-120 group-hover:opacity-100"
        aria-hidden="true"
      />
    </Link>
  )
}

function Dashboard() {
  const shouldReduceMotion = useReducedMotion()
  const [library, setLibrary] = useState<DashboardLibrary | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [scheduledError, setScheduledError] = useState(false)
  const [publishJobStatus, setPublishJobStatus] = useState<PublishDueJobStatus | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [hello, setHello] = useState('Welcome back')

  useEffect(() => {
    setHello(greeting(new Date().getHours()))
  }, [])

  useEffect(() => {
    let cancelled = false

    // Each request is independent: one failing region never hides the rest.
    blogAdminApi.getScheduledCount()
      .then(({ scheduled }) => {
        if (!cancelled) setScheduledCount(scheduled)
      })
      .catch(() => {
        if (!cancelled) setScheduledError(true)
      })

    if ('getPublishDueJobStatus' in blogAdminApi) {
      blogAdminApi.getPublishDueJobStatus()
        .then((result) => {
          if (!cancelled) setPublishJobStatus(result)
        })
        .catch(() => {
          if (!cancelled) setPublishJobStatus(null)
        })
    }

    // A partial API double (tests) may not provide listBlogPosts.
    if (!('listBlogPosts' in blogAdminApi)) {
      setLibraryLoading(false)
      return () => {
        cancelled = true
      }
    }

    Promise.all([
      blogAdminApi.listBlogPosts({ page: 1, limit: 100 }),
      blogAdminApi.listBlogPosts({ status: 'published', page: 1, limit: 1 }),
      blogAdminApi.listBlogPosts({ status: 'draft', page: 1, limit: 1 }),
      blogAdminApi.listBlogPosts({ scheduled: true, page: 1, limit: 5 }),
    ] as Promise<AdminBlogListResult>[])
      .then(([allPosts, publishedPosts, draftPosts, scheduledPosts]) => {
        if (cancelled) return
        setLibrary({
          recent: allPosts.items.slice(0, 6),
          scheduled: [...scheduledPosts.items].sort((a, b) => {
            const left = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.POSITIVE_INFINITY
            const right = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.POSITIVE_INFINITY
            return left - right
          }),
          total: allPosts.total,
          published: publishedPosts.total,
          drafts: draftPosts.total,
        })
      })
      .catch(() => {
        if (!cancelled) setLibraryError(true)
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  const metadataAttention = useMemo(
    () => library?.recent.filter((post) => !post.excerpt?.trim() || !post.coverImageAlt?.trim() || !post.seoDescription?.trim()).length ?? 0,
    [library],
  )

  const retry = () => {
    setLibraryLoading(true)
    setLibraryError(false)
    setScheduledCount(null)
    setScheduledError(false)
    setPublishJobStatus(null)
    setRefreshToken((value) => value + 1)
  }
  const scheduledValue = scheduledError ? null : scheduledCount

  const summary = library
    ? [
        library.drafts ? `${library.drafts} draft${library.drafts === 1 ? '' : 's'} in progress` : 'No drafts waiting',
        scheduledValue ? `${scheduledValue} scheduled` : null,
      ].filter(Boolean).join(' · ')
    : 'Your publishing workspace.'

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
    >
      <header className="admin-page-header">
        <div className="min-w-0">
          <h1 className="admin-page-title">{hello}</h1>
          <p className="admin-page-description">{summary}</p>
        </div>
        <div className="admin-page-actions">
          <AdminIconButton label="Refresh" disabled={libraryLoading} onClick={retry}>
            <RefreshCw size={16} strokeWidth={1.8} className={libraryLoading ? 'animate-spin' : ''} />
          </AdminIconButton>
        </div>
      </header>

      <section
        className="admin-card grid grid-cols-4 overflow-hidden max-md:grid-cols-2 [&>*]:border-l [&>*]:border-a-line [&>*:first-child]:border-l-0 max-md:[&>*:nth-child(odd)]:border-l-0 max-md:[&>*:nth-child(n+3)]:border-t"
        aria-label="Publishing overview"
      >
        <Stat label="Articles" value={library?.total ?? null} caption="In your library" href="/admin/blogs" />
        <Stat label="Published" value={library?.published ?? null} caption="Live on the website" href="/admin/blogs?status=published" />
        <Stat label="Drafts" value={library?.drafts ?? null} caption="Waiting for you" href="/admin/blogs?status=draft" />
        <Stat label="Scheduled" value={scheduledValue} caption={scheduledError ? 'Unavailable' : 'Queued to publish'} href="/admin/blogs?scheduled=true" />
      </section>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-lg:grid-cols-1">
        <section className="admin-card overflow-hidden" aria-labelledby="recent-heading">
          <div className="admin-card__head">
            <h2 id="recent-heading">Recently edited</h2>
            <Link to="/admin/blogs" className="admin-link">See all <ChevronRight size={14} aria-hidden="true" /></Link>
          </div>

          {libraryLoading ? (
            <div className="flex flex-col gap-3 px-5.5 pt-1 pb-5" aria-label="Loading articles" aria-busy="true">
              {[1, 2, 3].map((item) => <span key={item} className="admin-skeleton h-11" />)}
            </div>
          ) : libraryError ? (
            <div className="admin-empty-state">
              <span className="admin-empty-state__icon"><CircleAlert size={20} strokeWidth={1.7} aria-hidden="true" /></span>
              <p className="admin-empty-state__title">Articles unavailable</p>
              <p className="admin-empty-state__description">We couldn’t load recent work right now.</p>
              <AdminButton onClick={retry} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</AdminButton>
            </div>
          ) : library?.recent.length ? (
            <div className="admin-list">
              {library.recent.map((post) => <ArticleRow key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="admin-empty-state">
              <span className="admin-empty-state__icon"><FileText size={20} strokeWidth={1.6} aria-hidden="true" /></span>
              <p className="admin-empty-state__title">Write your first article</p>
              <p className="admin-empty-state__description">Start with one clear idea and shape it into something worth publishing.</p>
              <Link to="/admin/blogs/new" className="admin-button admin-button--primary">New article</Link>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section className="admin-card overflow-hidden" aria-labelledby="queue-heading">
            <div className="admin-card__head">
              <h2 id="queue-heading">Publishing queue</h2>
              <CalendarClock size={17} strokeWidth={1.7} className="text-a-ink-3" aria-hidden="true" />
            </div>

            {libraryLoading ? (
              <div className="flex flex-col gap-2.5 px-5.5 pb-4" aria-hidden="true"><span className="admin-skeleton h-9" /><span className="admin-skeleton h-9" /></div>
            ) : libraryError ? (
              <p className="px-5.5 pb-4 text-[13px] text-a-ink-2">Queue details are unavailable.</p>
            ) : library?.scheduled.length ? (
              <div className="admin-list">
                {library.scheduled.slice(0, 3).map((post) => (
                  <Link key={post.id} to={`/admin/blogs/${post.id}/edit`} className="admin-list-row min-h-13">
                    <span className="admin-list-row__main">
                      <span className="admin-list-row__title">{post.title || 'Untitled article'}</span>
                      <span className="admin-list-row__sub">{formatDate(post.scheduledAt, true)}</span>
                    </span>
                    <ChevronRight size={15} strokeWidth={1.8} className="text-a-ink-3" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5.5 pb-4 text-[13px] text-a-ink-2">Nothing is scheduled. Set a publish time from any article.</p>
            )}

            <div className="flex items-center justify-between gap-3 px-5.5 py-3 text-[13px]" style={{ boxShadow: 'inset 0 1px 0 var(--a-line)' }}>
              <span className="text-a-ink-2">Scheduler</span>
              <AdminStatusBadge tone={jobStatusTone(publishJobStatus?.status ?? null)}>
                {publishJobStatus ? jobStatusLabel(publishJobStatus.status) : libraryLoading ? 'Checking' : 'No heartbeat'}
              </AdminStatusBadge>
            </div>
            <Link
              to="/admin/blogs?scheduled=true"
              className="flex items-center justify-between px-5.5 py-3 text-[13px] transition-colors duration-120 hover:bg-a-fill"
              style={{ boxShadow: 'inset 0 1px 0 var(--a-line)' }}
            >
              <span>Scheduled Posts</span>
              <span className="tabular-nums text-a-ink-2">{scheduledValue === null ? '—' : scheduledValue}</span>
            </Link>
          </section>

          <section className="admin-card overflow-hidden" aria-labelledby="attention-heading">
            <div className="admin-card__head">
              <h2 id="attention-heading">Needs attention</h2>
            </div>
            <div className="admin-list pb-1.5">
              {library?.drafts ? (
                <Link to="/admin/blogs?status=draft" className="admin-list-row min-h-13">
                  <span className="admin-list-row__main">
                    <span className="admin-list-row__title">{library.drafts} draft{library.drafts === 1 ? '' : 's'} to finish</span>
                    <span className="admin-list-row__sub">Pick up where you left off</span>
                  </span>
                  <ChevronRight size={15} strokeWidth={1.8} className="text-a-ink-3" aria-hidden="true" />
                </Link>
              ) : null}
              {metadataAttention ? (
                <Link to="/admin/blogs" className="admin-list-row min-h-13">
                  <span className="admin-list-row__main">
                    <span className="admin-list-row__title">{metadataAttention} article{metadataAttention === 1 ? '' : 's'} missing details</span>
                    <span className="admin-list-row__sub">Excerpt, alt text or meta description</span>
                  </span>
                  <ChevronRight size={15} strokeWidth={1.8} className="text-a-ink-3" aria-hidden="true" />
                </Link>
              ) : null}
              {!libraryLoading && !libraryError && !library?.drafts && !metadataAttention ? (
                <p className="px-5.5 pb-3 text-[13px] text-a-ink-2">Everything looks in order.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Shortcuts">
        <Link to="/admin/blogs" className="admin-button"><FileText size={14} aria-hidden="true" /> Articles</Link>
        <Link to="/admin/media" className="admin-button"><Images size={14} aria-hidden="true" /> Media</Link>
        <Link to="/admin/settings" className="admin-button"><Settings2 size={14} aria-hidden="true" /> Settings</Link>
      </nav>
    </motion.div>
  )
}

export default Dashboard
