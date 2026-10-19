import { useEffect, useState } from 'react'
import { ArrowUpRight, FileText, Settings2, UsersRound } from 'lucide-react'
import { Link } from '../../routing'
import { useAdminAuth } from '../context/useAdminAuth'
import { getScheduledCount } from '../api/blogAdminApi'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'

function ScheduledPostsCard() {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getScheduledCount()
      .then(({ scheduled }) => {
        if (!cancelled) setCount(scheduled)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link
      to="/admin/blogs?scheduled=true"
      className="admin-surface group flex min-h-[180px] flex-col justify-between p-5 no-underline transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="admin-eyebrow mb-2">Publishing queue</p>
          <h2 className="text-[17px] font-bold tracking-[-0.025em] text-neutral-900">Scheduled Posts</h2>
        </div>
        <ArrowUpRight size={18} className="text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="text-[38px] font-bold leading-none tracking-[-0.06em] text-neutral-900">
          {failed ? '—' : count === null ? '…' : count}
        </span>
        <span className="max-w-[150px] text-right text-[12px] leading-[1.5] text-neutral-500">
          {failed ? 'Could not load this count.' : 'Posts waiting to publish automatically.'}
        </span>
      </div>
    </Link>
  )
}

function WorkspaceCard({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string
  title: string
  description: string
  icon: typeof FileText
}) {
  return (
    <Link
      to={to}
      className="admin-surface group flex min-h-[180px] flex-col justify-between p-5 no-underline transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-neutral-100 text-neutral-700">
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <ArrowUpRight size={18} className="text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.025em] text-neutral-900">{title}</h2>
        <p className="mt-2 max-w-[270px] text-[13px] leading-[1.55] text-neutral-500">{description}</p>
      </div>
    </Link>
  )
}

function Dashboard() {
  const { admin } = useAdminAuth()

  return (
    <div>
      <AdminPageHeader
        eyebrow="Workspace overview"
        title={`Good to see you, ${admin?.username ?? 'there'}.`}
        description="A calm place to shape, review, and publish the work that represents BRANDWORKS."
        actions={
          <Link to="/admin/blogs/new">
            <AdminButton variant="primary" icon={<FileText size={16} strokeWidth={1.8} />}>New article</AdminButton>
          </Link>
        }
      />

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <AdminStatusBadge tone="success">Workspace ready</AdminStatusBadge>
        <span className="text-[12px] text-neutral-500">Signed in as {admin?.role === 'admin' ? 'administrator' : 'sub-admin'}</span>
      </div>

      <section aria-labelledby="workspace-actions-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="workspace-actions-heading" className="text-[13px] font-bold uppercase tracking-[0.12em] text-neutral-500">Workspace</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceCard to="/admin/blogs" title="Blogs" description="Create, edit, and manage the editorial library." icon={FileText} />
          <ScheduledPostsCard />
          <WorkspaceCard to="/admin/settings" title="Settings" description="Update your login ID and password securely." icon={Settings2} />
          {admin?.role === 'admin' && (
            <WorkspaceCard to="/admin/users" title="Team" description="Manage administrator and sub-admin access." icon={UsersRound} />
          )}
        </div>
      </section>

      <section className="mt-8 admin-surface flex flex-col gap-3 p-5" aria-labelledby="editorial-note-heading">
        <p className="admin-eyebrow mb-0">Publishing note</p>
        <h2 id="editorial-note-heading" className="text-[18px] font-bold tracking-[-0.03em] text-neutral-900">Keep the work moving one clear decision at a time.</h2>
        <p className="max-w-[700px] text-[13px] leading-[1.6] text-neutral-500">
          Content Health is editorial guidance inside the article editor. It does not represent search rankings, traffic, or a Google score.
        </p>
      </section>
    </div>
  )
}

export default Dashboard
