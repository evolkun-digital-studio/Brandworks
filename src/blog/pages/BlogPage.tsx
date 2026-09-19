import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BlogCard from '../components/BlogCard'
import { getBlogs } from '../api/blogApi'
import { PublicApiError } from '../api/client'
import { removeLinkTag, removeMetaTag, setDocumentTitle, setLinkTag, setMetaTag } from '../lib/documentHead'
import type { PublicBlogListItem } from '../api/types'

const PAGE_SIZE = 9

const BLOG_LIST_DESCRIPTION =
  'Thoughts, ideas and perspectives on branding, creativity, digital experiences and the work shaping modern brands.'

/** Invalid/non-positive/non-integer values resolve to page 1 — never
 *  forwarded to the API, so a malformed URL can't trigger a 400 or a
 *  navigation loop (nothing here rewrites the URL on its own). */
function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="aspect-[16/10] w-full animate-pulse rounded-[16px] bg-neutral-100" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
    </div>
  )
}

function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))

  const [items, setItems] = useState<PublicBlogListItem[] | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Static title/description, but a per-page canonical: each paginated
  // page canonicalizes to *itself* (e.g. /blog?page=2), not blindly to
  // page 1 — page 2 is genuinely different content from page 1, so
  // telling crawlers "this is a duplicate of page 1" would be wrong.
  // This is the simplest defensible behavior for this phase (see the
  // Phase 8 report); a future phase can add rel=prev/next if needed.
  // Cleaned up on unmount so navigating to another page never leaves
  // this page's title/description/canonical behind (Phase 8 spec,
  // section 32) — this was a real gap before this phase: previously
  // this effect never restored the title on unmount at all.
  useEffect(() => {
    const previousTitle = document.title
    setDocumentTitle('Blog | BRANDWORKS')
    setMetaTag('name', 'description', BLOG_LIST_DESCRIPTION)
    const canonical = `${window.location.origin}/blog${page > 1 ? `?page=${page}` : ''}`
    setLinkTag('canonical', canonical)

    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
    }
  }, [page])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getBlogs(page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return
        // A page past the last one just comes back with an empty
        // items array (the backend doesn't error on this) — handled
        // by the empty state below, nothing special needed here.
        setItems(result.items)
        setTotalPages(Math.max(result.totalPages, 1))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof PublicApiError
              ? err.message
              : 'Something went wrong loading the blog. Please try again.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page])

  function goToPage(next: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
      return params
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="flex flex-col items-center bg-white px-4 pt-16 pb-24 sm:pt-20">
      <div className="flex flex-col items-center text-center">
        <h1 className="site-display text-neutral-900 uppercase">
          Blog
        </h1>
        <p className="site-copy mt-4 max-w-[560px] text-neutral-600">
          Thoughts, ideas and perspectives on branding, creativity, digital
          experiences and the work shaping modern brands.
        </p>
      </div>

      <div className="mt-14 w-full max-w-[1280px]">
        {error && (
          <p role="alert" className="py-16 text-center text-[15px] text-neutral-500">
            {error}
          </p>
        )}

        {!error && loading && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!error && !loading && items && items.length === 0 && (
          <p className="py-16 text-center text-[15px] text-neutral-500">
            No posts published yet — check back soon.
          </p>
        )}

        {!error && !loading && items && items.length > 0 && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post, index) => (
              // First grid row (up to 3 columns at the widest
              // breakpoint) can be above the fold on this page — unlike
              // the homepage's Blog teaser, which is always well below
              // it — so those cards skip lazy-loading (Phase 10, Part 2).
              <BlogCard key={post.id} post={post} showExcerpt priority={index < 3} />
            ))}
          </div>
        )}
      </div>

      {!error && !loading && items && items.length > 0 && totalPages > 1 && (
        <nav aria-label="Blog pagination" className="mt-14 flex items-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-[6px] border border-neutral-300 px-4 py-2 text-[14px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-700"
          >
            Previous
          </button>
          <span className="text-[14px] text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="rounded-[6px] border border-neutral-300 px-4 py-2 text-[14px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40 disabled:hover:border-neutral-300 disabled:hover:text-neutral-700"
          >
            Next
          </button>
        </nav>
      )}
    </main>
  )
}

export default BlogPage
