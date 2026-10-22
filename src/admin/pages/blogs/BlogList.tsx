import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, FileText, Pencil, Search, Trash2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate, useSearchParams } from '../../../routing'
import { useAdminAuth } from '../../context/useAdminAuth'
import * as blogApi from '../../api/blogAdminApi'
import { ApiError } from '../../api/client'
import AdminButton from '../../components/AdminButton'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminStatusBadge from '../../components/AdminStatusBadge'
import FormMessage from '../../components/FormMessage'
import { useConfirm } from '../../components/ConfirmDialog'
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
  onDuplicate?: (post: AdminBlogPost) => void
  selected?: boolean
  onSelected?: (id: string, selected: boolean) => void
}

const rowAction =
  'inline-flex h-6 items-center gap-1 rounded-md border-0 bg-transparent px-1.5 text-xs font-medium text-a-accent transition-colors duration-120 hover:bg-a-accent-soft disabled:opacity-40'

export function BlogRow({ post, isAdmin, trashView, onChanged, onRemoved, onDuplicate, selected = false, onSelected = () => {} }: BlogRowProps) {
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  async function togglePublish() {
    setRowError(null)
    setBusy(true)
    try {
      const nextStatus: BlogStatus = post.status === 'published' ? 'unpublished' : 'published'
      const { blog } = await blogApi.setBlogPostStatus(post.id, nextStatus)
      onChanged(blog)
      toast.success(nextStatus === 'published' ? 'Article published.' : 'Article unpublished.')
    } catch (err) {
      setRowError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete “${post.title || 'Untitled article'}”?`,
      message: 'It moves to Deleted, where an administrator can restore it later.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    setRowError(null)
    setBusy(true)
    try {
      await blogApi.deleteBlogPost(post.id)
      onRemoved(post.id)
      toast.success('Article moved to Deleted.')
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
      toast.success('Article restored.')
    } catch (err) {
      setRowError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <tr className={`group ${selected ? 'is-selected' : ''}`}>
      <td className="w-10">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${post.title || 'untitled article'}`}
          onChange={(event) => onSelected(post.id, event.target.checked)}
        />
      </td>
      <td className="w-[46%] min-w-60">
        <div className="flex items-center gap-3">
          <span className="admin-thumb size-12" aria-hidden="true">
            {post.coverImage ? <img src={post.coverImage} alt="" loading="lazy" decoding="async" /> : <FileText size={17} strokeWidth={1.6} />}
          </span>
          <div className="min-w-0">
            {trashView ? (
              <span className="line-clamp-2 text-[14px] font-semibold">{post.title}</span>
            ) : (
              <Link to={`/admin/blogs/${post.id}/edit`} className="line-clamp-2 text-[14px] font-semibold hover:text-a-accent">
                {post.title || 'Untitled article'}
              </Link>
            )}
            <span className="block truncate text-xs text-a-ink-2">/{post.slug}</span>
            <div className="mt-0.5 -ml-1.5 flex flex-wrap items-center opacity-0 transition-opacity duration-120 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
              {trashView ? (
                isAdmin && (
                  <button type="button" className={rowAction} disabled={busy} onClick={() => void restore()}>
                    <Undo2 size={12} aria-hidden="true" /> Restore
                  </button>
                )
              ) : (
                <>
                  <Link to={`/admin/blogs/${post.id}/edit`} className={rowAction}>
                    <Pencil size={12} aria-hidden="true" /> Edit
                  </Link>
                  {onDuplicate && (
                    <button type="button" className={rowAction} disabled={busy} onClick={() => onDuplicate(post)}>
                      <Copy size={12} aria-hidden="true" /> Duplicate
                    </button>
                  )}
                  {post.status === 'published' && (
                    <a className={rowAction} href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink size={12} aria-hidden="true" /> View
                    </a>
                  )}
                  {isAdmin && (
                    <button type="button" className={rowAction} disabled={busy} onClick={() => void togglePublish()}>
                      {post.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                  {isAdmin && (
                    <button type="button" className={`${rowAction} text-a-danger! hover:bg-a-danger-soft!`} disabled={busy} onClick={() => void remove()}>
                      <Trash2 size={12} aria-hidden="true" /> Delete
                    </button>
                  )}
                </>
              )}
            </div>
            {rowError && <p className="mt-1 text-xs text-a-danger" role="alert">{rowError}</p>}
          </div>
        </div>
        {dialog}
      </td>
      <td className="text-a-ink-2 max-md:hidden">{post.authorName}</td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={post.status} />
            {post.reviewStatus === 'in_review' && <AdminStatusBadge tone="accent">In review</AdminStatusBadge>}
            {post.reviewStatus === 'changes_requested' && <AdminStatusBadge tone="warning">Changes requested</AdminStatusBadge>}
            {post.reviewStatus === 'approved' && <AdminStatusBadge tone="success">Approved</AdminStatusBadge>}
            {post.scheduledAt && <AdminStatusBadge tone="accent">Scheduled</AdminStatusBadge>}
          </div>
          {post.scheduledAt && <span className="text-xs text-a-ink-2">Publishes {formatScheduledAt(post.scheduledAt)}</span>}
        </div>
      </td>
      <td className="text-a-ink-2 whitespace-nowrap max-lg:hidden">
        <span className="block text-xs">{post.publishedAt ? 'Published' : 'Modified'}</span>
        <span className="block">{formatDate(post.publishedAt ?? post.updatedAt)}</span>
      </td>
    </tr>
  )
}

function BlogList() {
  const { admin } = useAdminAuth()
  const navigate = useNavigate()
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
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminBlogPost[] | null>(null)
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

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
  const someSelected = selectedIds.length > 0 && !allVisibleSelected

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
    const results = await Promise.allSettled(selectedPosts.map((post) => blogApi.setBlogPostStatus(post.id, nextStatus)))
    const succeeded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value.blog] : [])
    setItems((current) => current ? current.map((post) => succeeded.find((updated) => updated.id === post.id) ?? post) : current)
    setSelectedIds([])
    setBulkBusy(false)
    const message = `${succeeded.length} article${succeeded.length === 1 ? '' : 's'} updated.`
    if (succeeded.length === selectedPosts.length) toast.success(message)
    else toast.warning(`${message} Some updates need another try.`)
  }

  async function runBulkArchive() {
    if (!isAdmin || !selectedPosts.length) return
    const ok = await confirm({
      title: `Delete ${selectedPosts.length} article${selectedPosts.length === 1 ? '' : 's'}?`,
      message: 'They move to Deleted, where they can be restored.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    setBulkBusy(true)
    const results = await Promise.allSettled(selectedPosts.map((post) => blogApi.deleteBlogPost(post.id)))
    const succeededIds = selectedPosts.filter((_, index) => results[index]?.status === 'fulfilled').map((post) => post.id)
    setItems((current) => current ? current.filter((post) => !succeededIds.includes(post.id)) : current)
    setSelectedIds([])
    setBulkBusy(false)
    const message = `${succeededIds.length} article${succeededIds.length === 1 ? '' : 's'} moved to Deleted.`
    if (succeededIds.length === selectedPosts.length) toast.success(message)
    else toast.warning(`${message} Some articles could not be moved.`)
  }

  async function duplicate(post: AdminBlogPost) {
    const toastId = toast.loading('Duplicating…')
    try {
      const { blog } = await blogApi.createBlogPost({
        title: `${post.title} (copy)`,
        authorName: post.authorName,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        coverImageAlt: post.coverImageAlt,
        coverImageTitle: post.coverImageTitle,
        coverImageCaption: post.coverImageCaption,
        coverImageDescription: post.coverImageDescription,
        category: post.category,
        tags: post.tags,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        focusKeyword: post.focusKeyword,
        secondaryKeywords: post.secondaryKeywords,
        aiSummary: post.aiSummary,
        keyTakeaways: post.keyTakeaways,
        faq: post.faq,
      })
      toast.success('Copy created as a draft.', { id: toastId })
      navigate(`/admin/blogs/${blog.id}/edit`)
    } catch (err) {
      toast.error(errorMessage(err), { id: toastId })
    }
  }

  function upsert(updated: AdminBlogPost) {
    setItems((prev) => prev ? prev.map((post) => post.id === updated.id ? updated : post) : prev)
  }

  function remove(id: string) {
    setItems((prev) => prev ? prev.filter((post) => post.id !== id) : prev)
  }

  const hasActiveFilters = Boolean(debouncedSearch || statusFilter || scheduledView || trashView || sortOrder !== 'updated_desc')

  function clearFilters() {
    setSearchInput('')
    setStatusFilter('')
    setScheduledView(false)
    setTrashView(false)
    setSortOrder('updated_desc')
    setPage(1)
  }

  return (
    <div>
      <AdminPageHeader
        title="Articles"
        description="Everything you’ve written for the BRANDWORKS journal."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="admin-segmented-control max-w-full overflow-x-auto" role="group" aria-label="Filter articles">
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block w-full sm:w-[260px]">
              <span className="sr-only">Search articles by title</span>
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-a-ink-3" aria-hidden="true" />
              <input
                id="blog-search"
                type="search"
                placeholder="Search articles"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="admin-input pl-9"
              />
            </label>
            <label className="sr-only" htmlFor="blog-sort">Sort articles</label>
            <select id="blog-sort" className="admin-select w-auto" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as AdminBlogSort)}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <section className="admin-card overflow-hidden" aria-live="polite">
        {trashView && <p className="border-b border-a-line px-5.5 py-3.5 text-[13px] text-a-ink-2">Deleted articles are kept, not destroyed. Restore one to bring it back exactly as it was.</p>}
        {loadError && <div className="p-5"><FormMessage type="error">{loadError}</FormMessage></div>}

        {!trashView && items && items.length > 0 && (
          <div className={`flex min-h-12 items-center gap-3 border-b border-a-line px-5.5 py-2 text-[13px] ${selectedIds.length ? 'bg-a-accent-soft' : ''}`}>
            <input
              type="checkbox"
              aria-label="Select all visible articles"
              checked={allVisibleSelected}
              ref={(node) => { if (node) node.indeterminate = someSelected }}
              onChange={toggleAllVisible}
            />
            {selectedIds.length === 0 ? (
              <span className="text-a-ink-2">{loading ? 'Updating…' : `${pageInfo.total} article${pageInfo.total === 1 ? '' : 's'}`}</span>
            ) : (
              <>
                <span className="font-semibold">{selectedIds.length} selected</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {isAdmin && <AdminButton size="sm" disabled={bulkBusy} onClick={() => void runBulkStatus('published')}>Publish</AdminButton>}
                  {isAdmin && <AdminButton size="sm" disabled={bulkBusy} onClick={() => void runBulkStatus('unpublished')}>Unpublish</AdminButton>}
                  {isAdmin && <AdminButton size="sm" variant="danger" disabled={bulkBusy} onClick={() => void runBulkArchive()}>Delete</AdminButton>}
                  <AdminButton size="sm" variant="quiet" onClick={() => setSelectedIds([])}>Clear</AdminButton>
                </div>
              </>
            )}
          </div>
        )}

        {loading && !loadError && (
          <div className="flex flex-col gap-3 p-5.5" aria-busy="true" aria-label="Loading articles">
            {[1, 2, 3, 4].map((item) => <span key={item} className="admin-skeleton h-12" />)}
          </div>
        )}

        {!loading && !loadError && items && items.length === 0 && (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><FileText size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <p className="admin-empty-state__title">{trashView ? 'Nothing deleted' : scheduledView ? 'Nothing is scheduled' : hasActiveFilters ? 'No matching articles' : 'No articles yet'}</p>
            <p className="admin-empty-state__description">{trashView ? 'Deleted articles will appear here until they’re restored.' : hasActiveFilters ? 'Try a different search, or clear the filters.' : 'Write your first article to start the journal.'}</p>
            {hasActiveFilters
              ? <AdminButton onClick={clearFilters} icon={<X size={14} aria-hidden="true" />}>Clear filters</AdminButton>
              : <Link to="/admin/blogs/new" className="admin-button admin-button--primary">New article</Link>}
          </div>
        )}

        {!loading && !loadError && items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-10"><span className="sr-only">Select</span></th>
                  <th>Title</th>
                  <th className="max-md:hidden">Author</th>
                  <th>Status</th>
                  <th className="max-lg:hidden">Date</th>
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
                    onDuplicate={(source) => void duplicate(source)}
                    selected={selectedIds.includes(post.id)}
                    onSelected={onSelected}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!trashView && !loading && !loadError && items && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-a-line px-5.5 py-3">
            <AdminButton disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton>
            <span className="text-xs text-a-ink-2">Page {pageInfo.page} of {Math.max(pageInfo.totalPages, 1)}</span>
            <AdminButton disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => setPage((value) => value + 1)}>Next</AdminButton>
          </div>
        )}
      </section>
      {dialog}
    </div>
  )
}

export default BlogList
