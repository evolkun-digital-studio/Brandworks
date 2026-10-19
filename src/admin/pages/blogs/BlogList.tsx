import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarClock, Check, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from '../../../routing'
import { useAdminAuth } from '../../context/useAdminAuth'
import * as blogApi from '../../api/blogAdminApi'
import { ApiError } from '../../api/client'
import AdminButton from '../../components/AdminButton'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminStatusBadge from '../../components/AdminStatusBadge'
import FormMessage from '../../components/FormMessage'
import type { AdminBlogPost, BlogStatus } from '../../api/blogTypes'
import type { AdminBlogSort } from '../../api/blogAdminApi'

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const scheduledAtFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

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

const SORT_OPTIONS: { value: AdminBlogSort; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'published_desc', label: 'Recently published' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'scheduled_asc', label: 'Next scheduled' },
]

function isSort(value: string | null): value is AdminBlogSort {
  return SORT_OPTIONS.some((option) => option.value === value)
}

function StatusBadge({ status }: { status: BlogStatus }) {
  const tone = status === 'published' ? 'success' : status === 'unpublished' ? 'warning' : 'neutral'
  return <AdminStatusBadge tone={tone}>{status === 'published' ? 'Published' : status === 'unpublished' ? 'Unpublished' : 'Draft'}</AdminStatusBadge>
}

interface BlogRowProps {
  post: AdminBlogPost
  isAdmin: boolean
  trashView: boolean
  onChanged: (post: AdminBlogPost) => void
  onRemoved: (id: string) => void
  selected?: boolean
  onSelected?: (id: string, selected: boolean) => void
}

async function confirmRemove(post: AdminBlogPost): Promise<boolean> {
  return window.confirm(`Delete "${post.title}"? It will be moved out of the active list, not permanently destroyed — an admin can restore it later.`)
}

export function BlogRow({ post, isAdmin, trashView, onChanged, onRemoved, selected = false, onSelected = () => {} }: BlogRowProps) {
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
    if (!(await confirmRemove(post))) return
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
    <div className="admin-article-row">
      <label className="admin-article-select">
        <span className="sr-only">Select {post.title || 'untitled article'}</span>
        <input type="checkbox" checked={selected} onChange={(event) => onSelected(post.id, event.target.checked)} />
      </label>
      <div className="admin-article-preview" aria-hidden={post.coverImage ? undefined : true}>
        {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" decoding="async" /> : <span>—</span>}
      </div>
      <div className="min-w-0">
        <div className="admin-article-title">{post.title}</div>
        <div className="admin-article-meta">/{post.slug}</div>
        {rowError && <div className="mt-1 text-[12px] text-red-600">{rowError}</div>}
      </div>
      <div className="text-[12px] text-neutral-600">{post.authorName}</div>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={post.status} />
          {post.reviewStatus === 'in_review' && <AdminStatusBadge tone="accent">In review</AdminStatusBadge>}
          {post.reviewStatus === 'changes_requested' && <AdminStatusBadge tone="warning">Changes requested</AdminStatusBadge>}
          {post.reviewStatus === 'approved' && <AdminStatusBadge tone="success">Approved</AdminStatusBadge>}
          {post.scheduledAt && <AdminStatusBadge tone="accent">Scheduled</AdminStatusBadge>}
        </div>
        {post.scheduledAt && <span className="text-[11px] text-neutral-500">Publishes {formatScheduledAt(post.scheduledAt)}</span>}
      </div>
      <div className="text-[12px] text-neutral-500">{formatDate(post.publishedAt)}</div>
      <div className="text-[12px] text-neutral-500">{formatDate(post.updatedAt)}</div>
      <div className="flex justify-end gap-2">
        {trashView ? isAdmin && (
          <AdminButton variant="secondary" disabled={busy} onClick={() => void restore()}>Restore</AdminButton>
        ) : (
          <>
            <Link to={`/admin/blogs/${post.id}/edit`} className="admin-button admin-button--secondary">Edit <ArrowRight size={14} aria-hidden="true" /></Link>
            <AdminButton variant="secondary" disabled={busy || !isAdmin} onClick={() => void togglePublish()}>{post.status === 'published' ? 'Unpublish' : 'Publish'}</AdminButton>
            {isAdmin && <AdminButton variant="danger" disabled={busy} onClick={() => void remove()}><Trash2 size={14} aria-hidden="true" /> Delete</AdminButton>}
          </>
        )}
      </div>
    </div>
  )
}

function MobileArticleCard({ post, isAdmin, trashView, onChanged, onRemoved, selected = false, onSelected = () => {} }: BlogRowProps) {
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  async function setStatus() {
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
    if (!(await confirmRemove(post))) return
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
    <article className="admin-mobile-article">
      <div className="admin-mobile-article__top">
        <label className="admin-article-select">
          <span className="sr-only">Select {post.title || 'untitled article'}</span>
          <input type="checkbox" checked={selected} onChange={(event) => onSelected(post.id, event.target.checked)} />
        </label>
        <div className="admin-article-preview" aria-hidden={post.coverImage ? undefined : true}>
          {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" decoding="async" /> : <span>—</span>}
        </div>
        <div className="min-w-0">
          <div className="admin-article-title">{post.title}</div>
          <div className="admin-article-meta">/{post.slug}</div>
        </div>
        {post.scheduledAt && <CalendarClock size={16} className="shrink-0 text-neutral-500" aria-label="Scheduled" />}
      </div>
      <div className="admin-mobile-article__meta">
        <StatusBadge status={post.status} />
        {post.reviewStatus === 'in_review' && <AdminStatusBadge tone="accent">In review</AdminStatusBadge>}
        {post.reviewStatus === 'changes_requested' && <AdminStatusBadge tone="warning">Changes requested</AdminStatusBadge>}
        {post.reviewStatus === 'approved' && <AdminStatusBadge tone="success">Approved</AdminStatusBadge>}
        <span>{post.authorName}</span>
        <span>Updated {formatDate(post.updatedAt)}</span>
        {post.scheduledAt && <span>Publishes {formatScheduledAt(post.scheduledAt)}</span>}
      </div>
      {rowError && <p className="text-[12px] text-red-600" role="alert">{rowError}</p>}
      <div className="admin-mobile-article__actions">
        {trashView ? isAdmin && <AdminButton variant="secondary" disabled={busy} onClick={() => void restore}>Restore</AdminButton> : (
          <>
            <Link to={`/admin/blogs/${post.id}/edit`} className="admin-button admin-button--secondary">Edit</Link>
            <AdminButton variant="secondary" disabled={busy || !isAdmin} onClick={() => void setStatus()}>{post.status === 'published' ? 'Unpublish' : 'Publish'}</AdminButton>
            {isAdmin && <AdminButton variant="danger" disabled={busy} onClick={() => void remove()}>Delete</AdminButton>}
          </>
        )}
      </div>
    </article>
  )
}

function BlogList() {
  const { admin } = useAdminAuth()
  const isAdmin = admin?.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status')
  const initialSort = searchParams.get('sort')
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BlogStatus | ''>(() => (
    initialStatus === 'draft' || initialStatus === 'published' || initialStatus === 'unpublished'
      ? initialStatus
      : ''
  ))
  const [scheduledView, setScheduledView] = useState(() => searchParams.get('scheduled') === 'true')
  const [trashView, setTrashView] = useState(false)
  const [sortOrder, setSortOrder] = useState<AdminBlogSort>(() => isSort(initialSort) ? initialSort : 'updated_desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminBlogPost[] | null>(null)
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setScheduledView(searchParams.get('scheduled') === 'true')
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [debouncedSearch, statusFilter, scheduledView, trashView, sortOrder])

  useEffect(() => {
    const next = new URLSearchParams()
    if (statusFilter && !scheduledView && !trashView) next.set('status', statusFilter)
    if (scheduledView && !trashView) next.set('scheduled', 'true')
    if (debouncedSearch && !trashView) next.set('search', debouncedSearch)
    if (sortOrder !== 'updated_desc' && !trashView) next.set('sort', sortOrder)
    if (page > 1 && !trashView) next.set('page', String(page))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [debouncedSearch, page, searchParams, setSearchParams, sortOrder, statusFilter, scheduledView, trashView])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    const request = trashView
      ? blogApi.listBlogPosts({ includeDeleted: true, limit: 100 })
      : blogApi.listBlogPosts({ status: scheduledView ? undefined : statusFilter || undefined, scheduled: scheduledView || undefined, search: debouncedSearch || undefined, sort: scheduledView ? 'scheduled_asc' : sortOrder, page, limit: PAGE_SIZE })

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

    return () => { cancelled = true }
  }, [statusFilter, scheduledView, debouncedSearch, page, sortOrder, trashView])

  const selectedPosts = useMemo(() => items?.filter((item) => selectedIds.includes(item.id)) ?? [], [items, selectedIds])
  const allVisibleSelected = Boolean(items?.length && items.every((item) => selectedIds.includes(item.id)))

  function onSelected(id: string, selected: boolean) {
    setSelectedIds((current) => selected ? [...new Set([...current, id])] : current.filter((value) => value !== id))
  }

  function toggleAllVisible() {
    if (!items) return
    setSelectedIds(allVisibleSelected ? [] : items.map((item) => item.id))
  }

  async function runBulkStatus(nextStatus: BlogStatus) {
    if (!selectedPosts.length) return
    setBulkBusy(true)
    setBulkMessage(null)
    const results = await Promise.allSettled(selectedPosts.map((post) => blogApi.setBlogPostStatus(post.id, nextStatus)))
    const succeeded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value.blog] : [])
    setItems((current) => current ? current.map((post) => succeeded.find((updated) => updated.id === post.id) ?? post) : current)
    setSelectedIds([])
    setBulkBusy(false)
    setBulkMessage(`${succeeded.length} article${succeeded.length === 1 ? '' : 's'} updated.`)
  }

  async function runBulkArchive() {
    if (!isAdmin || !selectedPosts.length) return
    if (!window.confirm(`Move ${selectedPosts.length} selected article${selectedPosts.length === 1 ? '' : 's'} to Deleted?`)) return
    setBulkBusy(true)
    setBulkMessage(null)
    const results = await Promise.allSettled(selectedPosts.map((post) => blogApi.deleteBlogPost(post.id)))
    const succeededIds = selectedPosts.filter((_, index) => results[index]?.status === 'fulfilled').map((post) => post.id)
    setItems((current) => current ? current.filter((post) => !succeededIds.includes(post.id)) : current)
    setSelectedIds([])
    setBulkBusy(false)
    setBulkMessage(`${succeededIds.length} article${succeededIds.length === 1 ? '' : 's'} moved to Deleted.`)
  }

  function upsert(updated: AdminBlogPost) {
    setItems((prev) => prev ? prev.map((post) => post.id === updated.id ? updated : post) : prev)
  }

  function remove(id: string) {
    setItems((prev) => prev ? prev.filter((post) => post.id !== id) : prev)
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Editorial library"
        title="Articles"
        description="A focused publishing library for the stories, guides, and ideas behind BRANDWORKS."
        actions={<Link to="/admin/blogs/new"><AdminButton variant="primary">New article</AdminButton></Link>}
      />

      <section className="admin-surface overflow-visible" aria-label="Article filters">
        <div className="admin-filter-bar">
          <div className="admin-segmented-control" role="group" aria-label="Filter articles">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                onClick={() => { setTrashView(false); setScheduledView(false); setStatusFilter(filter.value) }}
                aria-pressed={!trashView && !scheduledView && statusFilter === filter.value}
              >
                {filter.label}
              </button>
            ))}
            <button type="button" onClick={() => { setTrashView(false); setStatusFilter(''); setScheduledView(true) }} aria-pressed={scheduledView}>Scheduled</button>
            {isAdmin && <button type="button" onClick={() => { setScheduledView(false); setTrashView(true) }} aria-pressed={trashView}>Deleted</button>}
          </div>

          {!trashView && (
            <div className="admin-filter-controls">
              <label className="relative block w-full sm:w-[270px]">
                <span className="sr-only">Search articles by title</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  id="blog-search"
                  type="search"
                  placeholder="Search articles"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="admin-input pl-9 text-[13px]"
                />
              </label>
              <label className="admin-sort-control">
                <span>Sort</span>
                <select className="admin-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as AdminBlogSort)}>
                  {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="admin-surface mt-4 overflow-hidden" aria-live="polite">
        {trashView && <p className="border-b border-neutral-200 px-5 py-4 text-[13px] text-neutral-500">Deleted posts are kept, not destroyed. Restore one to bring it back with its previous status intact.</p>}
        {loadError && <div className="p-5"><FormMessage type="error">{loadError}</FormMessage></div>}
        {bulkMessage && <div className="admin-library-notice" role="status"><Check size={15} aria-hidden="true" /> {bulkMessage}</div>}
        {!trashView && items && items.length > 0 && (
          <div className="admin-bulk-bar">
            <label className="admin-select-all">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
              <span>Select visible</span>
            </label>
            {selectedIds.length > 0 && <span className="admin-bulk-count">{selectedIds.length} selected</span>}
            {selectedIds.length > 0 && (
              <div className="admin-bulk-actions">
                {isAdmin && <><AdminButton variant="secondary" disabled={bulkBusy} onClick={() => void runBulkStatus('published')}>Publish</AdminButton>
                <AdminButton variant="secondary" disabled={bulkBusy} onClick={() => void runBulkStatus('unpublished')}>Unpublish</AdminButton></>}
                {isAdmin && <AdminButton variant="danger" disabled={bulkBusy} onClick={() => void runBulkArchive()}><Trash2 size={14} aria-hidden="true" /> Archive</AdminButton>}
              </div>
            )}
          </div>
        )}
        {loading && !loadError && <div className="admin-empty-state"><p className="admin-empty-state__title">Loading articles</p><p className="admin-empty-state__description">Your publishing library is on its way.</p></div>}
        {!loading && !loadError && items && items.length === 0 && (
          <div className="admin-empty-state"><p className="admin-empty-state__title">{trashView ? 'No deleted articles.' : scheduledView ? 'Nothing is currently scheduled.' : 'No articles yet.'}</p><p className="admin-empty-state__description">{trashView ? 'Deleted posts will appear here for authorized restoration.' : 'Create the first article to begin building the library.'}</p></div>
        )}

        {!loading && !loadError && items && items.length > 0 && (
          <>
            <div className="admin-table-desktop">
              <div className="admin-table-head"><span className="sr-only">Select</span><span>Preview</span><span>Title</span><span>Author</span><span>Status</span><span>Published</span><span>Updated</span><span className="text-right">Actions</span></div>
              {items.map((post) => <BlogRow key={post.id} post={post} isAdmin={isAdmin} trashView={trashView} onChanged={upsert} onRemoved={remove} selected={selectedIds.includes(post.id)} onSelected={onSelected} />)}
            </div>
            <div className="admin-mobile-article-list">
              {items.map((post) => <MobileArticleCard key={post.id} post={post} isAdmin={isAdmin} trashView={trashView} onChanged={upsert} onRemoved={remove} selected={selectedIds.includes(post.id)} onSelected={onSelected} />)}
            </div>
          </>
        )}

        {!trashView && !loading && !loadError && items && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-4 sm:px-5">
            <AdminButton variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} icon={<ChevronLeft size={15} aria-hidden="true" />}>Previous</AdminButton>
            <span className="text-[12px] text-neutral-500">Page {pageInfo.page} of {Math.max(pageInfo.totalPages, 1)} · {pageInfo.total} total</span>
            <AdminButton variant="secondary" disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => setPage((value) => value + 1)} icon={<ChevronRight size={15} aria-hidden="true" />}>Next</AdminButton>
          </div>
        )}
      </section>
    </div>
  )
}

export default BlogList
