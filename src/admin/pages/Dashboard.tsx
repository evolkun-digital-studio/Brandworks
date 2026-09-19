import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { getScheduledCount } from '../api/blogAdminApi'

/**
 * Phase 16 — the one small metric this dashboard has: how many posts
 * are currently scheduled to publish (status=draft, a real future
 * scheduledAt, never deleted — the exact same eligibility rule as
 * BlogList's own Scheduled filter). Reuses the existing card visual
 * language below (same container, same <h2>+<p> shape, same Link-as-
 * card pattern) rather than introducing a new "KPI" component system
 * — the only thing new is that this card's number comes from a fetch
 * instead of being static copy.
 *
 * Backend-driven count, not a full list fetch (Part 13): one small
 * request via GET /api/admin/blogs/scheduled-count.
 */
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
        // Never break the Dashboard over this — and never show a
        // fabricated zero on a failed request, which would misinform
        // the administrator that nothing is scheduled (Phase 16, Part
        // 15). No error detail (message/stack) is surfaced here.
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link
      to="/admin/blogs?scheduled=true"
      className="rounded-[12px] border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-400"
    >
      <h2 className="text-[16px] font-semibold text-neutral-900">Scheduled Posts</h2>
      <p className="mt-2 text-[28px] font-semibold text-neutral-900">
        {failed ? '—' : count === null ? '…' : count}
      </p>
      <p className="mt-1 text-[14px] leading-[1.6] text-neutral-600">
        {failed ? 'Could not load right now.' : 'Posts waiting to publish automatically.'}
      </p>
    </Link>
  )
}

/**
 * Intentionally minimal — just sign-in confirmation and a way into
 * each section, plus (Phase 16) one small operational count. Still no
 * general analytics here on purpose; that remains out of scope.
 */
function Dashboard() {
  const { admin } = useAdminAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold text-neutral-900">
          Welcome, {admin?.username}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600">
          You are signed in as{' '}
          <span className="font-medium text-neutral-900">
            {admin?.role === 'admin' ? 'Admin' : 'Sub-admin'}
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/admin/blogs"
          className="rounded-[12px] border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-400"
        >
          <h2 className="text-[16px] font-semibold text-neutral-900">Blogs</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
            Create, edit, publish, and manage blog posts.
          </p>
        </Link>

        <ScheduledPostsCard />

        <Link
          to="/admin/settings"
          className="rounded-[12px] border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-400"
        >
          <h2 className="text-[16px] font-semibold text-neutral-900">Settings</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
            Change your login ID or password.
          </p>
        </Link>

        {admin?.role === 'admin' && (
          <Link
            to="/admin/users"
            className="rounded-[12px] border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-400"
          >
            <h2 className="text-[16px] font-semibold text-neutral-900">Admins</h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-neutral-600">
              Create, enable/disable, or remove sub-admin accounts.
            </p>
          </Link>
        )}
      </div>
    </div>
  )
}

export default Dashboard
