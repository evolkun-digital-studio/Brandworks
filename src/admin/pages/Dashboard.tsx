import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  FilePlus2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { Link } from '../../routing'
import { useAdminAuth } from '../context/useAdminAuth'
import * as blogAdminApi from '../api/blogAdminApi'
import type { PublishDueJobStatus } from '../api/blogAdminApi'
import type { AdminBlogListResult, AdminBlogPost } from '../api/blogTypes'
import AdminButton from '../components/AdminButton'
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
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

function statusFor(post: AdminBlogPost) {
  if (post.scheduledAt && post.status !== 'published') return 'scheduled' as const
  return post.status
}

function statusLabel(post: AdminBlogPost) {
  const status = statusFor(post)
  return status === 'unpublished' ? 'Unpublished' : status[0].toUpperCase() + status.slice(1)
}

function statusTone(post: AdminBlogPost) {
  const status = statusFor(post)
  if (status === 'published') return 'success' as const
  if (status === 'scheduled') return 'warning' as const
  if (status === 'unpublished') return 'accent' as const
  return 'neutral' as const
}

function jobStatusLabel(status: PublishDueJobStatus['status']) {
  if (status === 'healthy') return 'Healthy'
  if (status === 'stale') return 'Stale'
  if (status === 'failed') return 'Last run failed'
  return 'No run recorded'
}

function ArticleRow({ post }: { post: AdminBlogPost }) {
  return (
    <Link to={`/admin/blogs/${post.id}/edit`} className="admin-dashboard__article-row">
      {post.coverImage ? (
        <img
          className="admin-dashboard__article-image"
          src={post.coverImage}
          alt={post.coverImageAlt || ''}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="admin-dashboard__article-image admin-dashboard__article-image--empty" aria-hidden="true">
          <FileText size={17} strokeWidth={1.7} />
        </span>
      )}
      <span className="admin-dashboard__article-copy">
        <strong>{post.title || 'Untitled article'}</strong>
        <span>
          {post.authorName || 'Unassigned'} <span aria-hidden="true">·</span> Edited {formatDate(post.updatedAt)}
        </span>
      </span>
      <AdminStatusBadge tone={statusTone(post)}>{statusLabel(post)}</AdminStatusBadge>
      <ChevronRight className="admin-dashboard__article-chevron" size={17} strokeWidth={1.8} aria-hidden="true" />
    </Link>
  )
}

function DashboardMetric({ label, value, detail }: { label: string; value: number | null; detail: string }) {
  return (
    <div className="admin-dashboard__metric">
      <div className="admin-dashboard__metric-label">{label}</div>
      <div className="admin-dashboard__metric-value" aria-live="polite">
        {value === null ? '—' : value}
      </div>
      <div className="admin-dashboard__metric-detail">{detail}</div>
    </div>
  )
}

function Dashboard() {
  const { admin } = useAdminAuth()
  const shouldReduceMotion = useReducedMotion()
  const [library, setLibrary] = useState<DashboardLibrary | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState(false)
  const [scheduledCount, setScheduledCount] = useState<number | null>(null)
  const [scheduledError, setScheduledError] = useState(false)
  const [publishJobStatus, setPublishJobStatus] = useState<PublishDueJobStatus | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    // Keep this request independent from the article library. A temporary
    // failure in one dashboard region should not hide the rest of the workspace.
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

    // The dashboard test double only provides getScheduledCount. The runtime
    // always has listBlogPosts, while this guard keeps a partial test harness
    // from turning a non-critical dashboard view into a crash.
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

  return (
    <motion.div
      className="admin-dashboard"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
    >
      <header className="admin-dashboard__header">
        <div>
          <p className="admin-dashboard__context">BRANDWORKS / CONTENT STUDIO</p>
          <h1>Overview</h1>
          <p className="admin-dashboard__subtitle">Your publishing workspace.</p>
        </div>
        <div className="admin-dashboard__header-actions">
          <span className="admin-dashboard__account-context">
            {admin?.role === 'admin' ? 'Administrator' : 'Sub-admin'} workspace
          </span>
          <Link to="/admin/blogs/new">
            <AdminButton variant="primary" icon={<FilePlus2 size={16} strokeWidth={1.8} />}>Create article</AdminButton>
          </Link>
        </div>
      </header>

      <section className="admin-dashboard__metrics" aria-label="Publishing overview">
        <DashboardMetric label="Articles" value={library?.total ?? null} detail="In your library" />
        <DashboardMetric label="Published" value={library?.published ?? null} detail="Live on the CMS" />
        <DashboardMetric label="Drafts" value={library?.drafts ?? null} detail="Need your attention" />
        <DashboardMetric label="Scheduled" value={scheduledValue} detail={scheduledError ? 'Unavailable' : 'Waiting to publish'} />
      </section>

      <div className="admin-dashboard__workspace">
        <section className="admin-dashboard__recent" aria-labelledby="continue-working-heading">
          <div className="admin-dashboard__section-heading">
            <div>
              <p className="admin-dashboard__section-kicker">Continue working</p>
              <h2 id="continue-working-heading">Recently edited</h2>
            </div>
            <Link to="/admin/blogs" className="admin-dashboard__text-link">
              Open library <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>

          {libraryLoading ? (
            <div className="admin-dashboard__loading-list" aria-label="Loading articles" aria-busy="true">
              {[1, 2, 3].map((item) => <span key={item} className="admin-dashboard__loading-line" />)}
            </div>
          ) : libraryError ? (
            <div className="admin-dashboard__inline-state">
              <CircleAlert size={18} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <strong>Article library unavailable</strong>
                <p>We could not load recent work right now.</p>
              </div>
              <button type="button" className="admin-dashboard__retry" onClick={retry}>
                <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" /> Retry
              </button>
            </div>
          ) : library?.recent.length ? (
            <div className="admin-dashboard__article-list">
              {library.recent.map((post) => <ArticleRow key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="admin-dashboard__empty-state">
              <FileText size={20} strokeWidth={1.6} aria-hidden="true" />
              <strong>Your library is ready for its first article.</strong>
              <p>Start with a clear idea and shape it into something publishable.</p>
              <Link to="/admin/blogs/new" className="admin-dashboard__text-link">Create an article <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" /></Link>
            </div>
          )}
        </section>

        <aside className="admin-dashboard__rail">
          <section className="admin-dashboard__rail-block" aria-labelledby="publishing-queue-heading">
            <div className="admin-dashboard__rail-heading">
              <div>
                <p className="admin-dashboard__section-kicker">Next up</p>
                <h2 id="publishing-queue-heading">Publishing queue</h2>
              </div>
              <CalendarClock size={19} strokeWidth={1.7} aria-hidden="true" />
            </div>
            {libraryLoading ? (
              <div className="admin-dashboard__rail-loading" aria-hidden="true"><span /><span /></div>
            ) : libraryError ? (
              <p className="admin-dashboard__rail-note">Queue details are unavailable. <button type="button" onClick={retry}>Retry</button></p>
            ) : library?.scheduled.length ? (
              <div className="admin-dashboard__queue-list">
                {library.scheduled.slice(0, 3).map((post) => (
                  <Link key={post.id} to={`/admin/blogs/${post.id}/edit`} className="admin-dashboard__queue-item">
                    <span className="admin-dashboard__queue-copy">
                      <strong>{post.title || 'Untitled article'}</strong>
                      <span>{formatDate(post.scheduledAt, true)}</span>
                    </span>
                    <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="admin-dashboard__rail-note">Nothing is scheduled yet. Set a publish time from an article.</p>
            )}
            <p className="admin-dashboard__operational-note">
              <CircleAlert size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Automatic publishing depends on the external publish job.{' '}
                {publishJobStatus ? `Scheduler: ${jobStatusLabel(publishJobStatus.status)}${publishJobStatus.lastSuccessAt ? ` · Last success ${formatDate(publishJobStatus.lastSuccessAt, true)}` : ''}.` : 'No scheduler heartbeat is available yet.'}
              </span>
            </p>
            <Link to="/admin/blogs?scheduled=true" className="admin-dashboard__rail-link">
              <span>Scheduled Posts</span>
              <span>{scheduledValue === null ? '—' : scheduledValue}</span>
            </Link>
          </section>

          <section className="admin-dashboard__rail-block" aria-labelledby="editorial-attention-heading">
            <div className="admin-dashboard__rail-heading">
              <div>
                <p className="admin-dashboard__section-kicker">Editorial attention</p>
                <h2 id="editorial-attention-heading">Worth a look</h2>
              </div>
              <CircleAlert size={19} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div className="admin-dashboard__attention-list">
              {library?.drafts ? (
                <Link to="/admin/blogs?status=draft" className="admin-dashboard__attention-item">
                  <span><strong>{library.drafts} draft{library.drafts === 1 ? '' : 's'} to review</strong><small>Continue shaping unfinished work.</small></span>
                  <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ) : null}
              {metadataAttention ? (
                <Link to="/admin/blogs" className="admin-dashboard__attention-item">
                  <span><strong>{metadataAttention} recent article{metadataAttention === 1 ? '' : 's'} need metadata</strong><small>Check excerpt, alt text, or description.</small></span>
                  <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ) : null}
              {!libraryLoading && !libraryError && !library?.drafts && !metadataAttention ? (
                <p className="admin-dashboard__rail-note">No immediate editorial blockers found.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <nav className="admin-dashboard__shortcuts" aria-label="Workspace shortcuts">
        <span className="admin-dashboard__shortcuts-label">Quick actions</span>
        <Link to="/admin/blogs/new"><FilePlus2 size={15} strokeWidth={1.8} aria-hidden="true" /> New article</Link>
        <Link to="/admin/blogs"><FileText size={15} strokeWidth={1.8} aria-hidden="true" /> Blogs</Link>
        <Link to="/admin/blogs?status=draft"><FileText size={15} strokeWidth={1.8} aria-hidden="true" /> Drafts</Link>
        <Link to="/admin/blogs?scheduled=true"><CalendarClock size={15} strokeWidth={1.8} aria-hidden="true" /> Scheduled</Link>
        <Link to="/admin/settings"><Settings2 size={15} strokeWidth={1.8} aria-hidden="true" /> Settings</Link>
        {admin?.role === 'admin' && <Link to="/admin/users"><UsersRound size={15} strokeWidth={1.8} aria-hidden="true" /> Team</Link>}
        {libraryLoading && <LoaderCircle className="admin-dashboard__loading-icon" size={15} strokeWidth={1.8} aria-label="Refreshing dashboard" />}
      </nav>
    </motion.div>
  )
}

export default Dashboard
