import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import * as blogApi from '../../api/blogAdminApi'
import { ApiError } from '../../api/client'
import FormMessage from '../../components/FormMessage'
import type { AdminBlogPost, BlogStatus } from '../../api/blogTypes'

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Something went wrong. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Phase 16, Part 11 — the administrator's own local timezone (native
// Intl, no date library), a stable absolute date/time rather than a
// live-updating countdown (Part 12 explicitly asks against that).
const scheduledAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatScheduledAt(value: string): string {
  return scheduledAtFormatter.format(new Date(value))
}

const PAGE_SIZE = 10

const STATUS_FILTERS: { value: BlogStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
]

// Deliberately reuses only colors already established elsewhere in the
// admin panel (neutral + the emerald already used for "Enabled" in
// Users.tsx) — no new bright colors introduced. Each state also carries
// its own text label, so nothing here depends on color alone.
const STATUS_STYLES: Record<BlogStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-500',
  unpublished: 'bg-neutral-200 text-neutral-700',
  published: 'bg-emerald-50 text-emerald-700',
}

const STATUS_LABELS: Record<BlogStatus, string> = {
  draft: 'Draft',
  unpublished: 'Unpublished',
  published: 'Published',
}

function StatusBadge({ status }: { status: BlogStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface BlogRowProps {
  post: AdminBlogPost
  isAdmin: boolean
  trashView: boolean
  onChanged: (post: AdminBlogPost) => void
  onRemoved: (id: string) => void
}

// Exported (only) for direct testing — see BlogList.test.tsx's audit
// of the Phase 14 "Scheduled" indicator (Phase 15, Part 10). Nothing
// else in this file imports it from outside; BlogList itself still
// uses it exactly as before.
export function BlogRow({ post, isAdmin, trashView, onChanged, onRemoved }: BlogRowProps) {
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  async function togglePublish() {
    setRowError(null)
    setBusy(true)
    try {
      const nextStatus: BlogStatus = post.status === 'published' ? 'unpublished' : 'published'
      const { blog } = await blogApi.setBlogPostStatus(post.id, nextStatus)
      onChanged(blog)
    } catch (err) {
      setRowError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete "${post.title}"? It will be moved out of the active list, not permanently destroyed — an admin can restore it later.`,
      )
    ) {
      return
    }
    setRowError(null)
    setBusy(true)
    try {
      await blogApi.deleteBlogPost(post.id)
      onRemoved(post.id)
    } catch (err) {
      setRowError(errorMessage(err))
      setBusy(false)
    }
  }

  async function restore() {
    setRowError(null)
    setBusy(true)
    try {
      await blogApi.restoreBlogPost(post.id)
      onRemoved(post.id)
    } catch (err) {
      setRowError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="text-[14px] font-medium text-neutral-900">{post.title}</div>
        <div className="text-[12px] text-neutral-500">/{post.slug}</div>
        {rowError && <div className="mt-1 text-[12px] text-red-600">{rowError}</div>}
      </td>
      <td className="py-3 pr-4 text-[13px] text-neutral-600">{post.authorName}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={post.status} />
            {post.scheduledAt && (
              <span className="inline-flex items-center rounded-[4px] bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-700">
                Scheduled
              </span>
            )}
          </div>
          {/* Visible, not just a hover tooltip (Phase 16, Part 11) —
             the administrator's own local timezone, via native Intl,
             a stable absolute value rather than a live countdown
             (Part 12). */}
          {post.scheduledAt && (
            <span className="text-[12px] text-neutral-500">Publishes {formatScheduledAt(post.scheduledAt)}</span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-[13px] text-neutral-500">
        {formatDate(post.publishedAt)}
      </td>
      <td className="py-3 pr-4 text-[13px] text-neutral-500">{formatDate(post.updatedAt)}</td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-2">
          {trashView ? (
            isAdmin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void restore()}
                className="rounded-[4px] border border-neutral-300 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
              >
                Restore
              </button>
            )
          ) : (
            <>
              <Link
                to={`/admin/blogs/${post.id}/edit`}
                className="rounded-[4px] border border-neutral-300 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void togglePublish()}
                className="rounded-[4px] border border-neutral-300 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
              >
                {post.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              {/* Delete is never rendered for a sub-admin — not just visually
                  hidden, absent from the DOM entirely. The backend still
                  independently rejects it either way (see remove() above,
                  which surfaces any 403 as a normal row error rather than
                  crashing, in case this is ever bypassed). */}
              {isAdmin && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove()}
                  className="rounded-[4px] border border-red-300 px-2.5 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:border-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function BlogList() {
  const { admin } = useAdminAuth()
  const isAdmin = admin?.role === 'admin'

  // Read once, on mount, so a link like /admin/blogs?scheduled=true
  // (the Dashboard's "Scheduled Posts" card — see Dashboard.tsx) opens
  // straight into the Scheduled view (Phase 16, Part 16/17). This is
  // deliberately the *only* URL state BlogList has — search/status/
  // page/trash remain local component state exactly as before; adding
  // a full bidirectional URL-sync architecture for every filter isn't
  // warranted just for this one click-through.
  const [searchParams] = useSearchParams()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BlogStatus | ''>('')
  // "Scheduled" (Phase 16) is its own boolean flag, mirroring how
  // `trashView` already works — never a `BlogStatus` value (Part 3).
  const [scheduledView, setScheduledView] = useState(() => searchParams.get('scheduled') === 'true')
  const [trashView, setTrashView] = useState(false)
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<AdminBlogPost[] | null>(null)
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Debounce search input so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Any filter change starts back at page 1.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, scheduledView, trashView])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    const request = trashView
      ? // No dedicated "deleted only" filter exists on the API — it only
        // supports includeDeleted as an *addition* to the active set (see
        // backend/src/services/blog/blog.service.ts). For this v1 trash
        // view we fetch a single generous page and filter to deleted
        // items client-side below, rather than paginating server-side —
        // a deliberate, documented simplification (see the Phase 4 report).
        blogApi.listBlogPosts({ includeDeleted: true, limit: 100 })
      : blogApi.listBlogPosts({
          // Mutually exclusive on this UI (selecting one clears the
          // other — see the button handlers below), matching the
          // backend's own rule that scheduled+status can't both be
          // sent (Phase 16, Part 9: "should not produce a
          // contradictory query").
          status: scheduledView ? undefined : statusFilter || undefined,
          scheduled: scheduledView || undefined,
          search: debouncedSearch || undefined,
          page,
          limit: PAGE_SIZE,
        })

    request
      .then((result) => {
        if (cancelled) return
        if (trashView) {
          const deletedOnly = result.items.filter((item) => item.deletedAt !== null)
          setItems(deletedOnly)
          setPageInfo({ page: 1, totalPages: 1, total: deletedOnly.length })
        } else {
          setItems(result.items)
          setPageInfo({ page: result.page, totalPages: result.totalPages, total: result.total })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [statusFilter, scheduledView, debouncedSearch, page, trashView])

  function upsert(updated: AdminBlogPost) {
    setItems((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev))
  }

  function remove(id: string) {
    setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold text-neutral-900">Blogs</h1>
        <Link
          to="/admin/blogs/new"
          className="flex h-[40px] items-center justify-center rounded-[6px] bg-neutral-900 px-5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
        >
          New Blog
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-[12px] border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              onClick={() => {
                setTrashView(false)
                setScheduledView(false)
                setStatusFilter(filter.value)
              }}
              aria-pressed={!trashView && !scheduledView && statusFilter === filter.value}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                !trashView && !scheduledView && statusFilter === filter.value
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
          {/* Phase 16 — a distinct filter, not one of STATUS_FILTERS
             above: "Scheduled" isn't a BlogStatus value (Part 3),
             mutually exclusive with the status tabs and Deleted,
             mirroring exactly how Deleted itself already toggles. */}
          <button
            type="button"
            onClick={() => {
              setTrashView(false)
              setStatusFilter('')
              setScheduledView(true)
            }}
            aria-pressed={scheduledView}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              scheduledView
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Scheduled
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setScheduledView(false)
                setTrashView(true)
              }}
              aria-pressed={trashView}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                trashView
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              Deleted
            </button>
          )}
        </div>

        {!trashView && (
          <div className="flex flex-col gap-1.5 sm:w-[260px]">
            <label htmlFor="blog-search" className="sr-only">
              Search blogs by title
            </label>
            <input
              id="blog-search"
              type="search"
              placeholder="Search by title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-[8px] border border-neutral-300 px-3 py-2 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="rounded-[12px] border border-neutral-200 bg-white p-6">
        {trashView && (
          <p className="mb-4 text-[13px] text-neutral-500">
            Deleted posts are kept, not destroyed. Restore one to bring it back with its
            previous status intact.
          </p>
        )}

        {loadError && <FormMessage type="error">{loadError}</FormMessage>}

        {loading && !loadError && <p className="text-[14px] text-neutral-500">Loading…</p>}

        {!loading && !loadError && items && items.length === 0 && (
          <p className="text-[14px] text-neutral-500">
            {trashView ? 'No deleted posts.' : scheduledView ? 'Nothing is currently scheduled.' : 'No blog posts yet.'}
          </p>
        )}

        {!loading && !loadError && items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-[12px] uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Author</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Published</th>
                  <th className="py-2 pr-4 font-medium">Updated</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <BlogRow
                    key={post.id}
                    post={post}
                    isAdmin={isAdmin}
                    trashView={trashView}
                    onChanged={upsert}
                    onRemoved={remove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!trashView && !loading && !loadError && items && items.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[6px] border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-700"
            >
              Previous
            </button>
            <span className="text-[13px] text-neutral-500">
              Page {pageInfo.page} of {Math.max(pageInfo.totalPages, 1)} ({pageInfo.total} total)
            </span>
            <button
              type="button"
              disabled={pageInfo.page >= pageInfo.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-[6px] border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlogList
