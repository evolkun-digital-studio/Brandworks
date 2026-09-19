import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicBlogListItem } from '../api/types'
import { formatBlogDate } from '../lib/formatDate'
import { trackEvent } from '../../analytics/analytics'
import { AnalyticsEvents } from '../../analytics/events'

interface BlogCardProps {
  post: PublicBlogListItem
  /** Off by default to preserve the homepage section's original card
   *  design exactly; the /blog listing turns it on (see BlogPage.tsx). */
  showExcerpt?: boolean
  /**
   * Set for cards likely to render above the fold (Phase 10, Part 2) —
   * the homepage's Blog teaser section never sets this (it's always
   * well below the fold), but the /blog listing page's first grid row
   * does, since that row can be a real LCP candidate there. Off by
   * default so every existing caller keeps today's lazy behavior
   * unless it explicitly opts in.
   */
  priority?: boolean
}

/**
 * The single card implementation used by both the homepage Blog
 * section and the /blog listing page (see src/Blog.tsx and
 * src/blog/pages/BlogPage.tsx) — one visual design maintained in one
 * place. Image/title sizing matches the original hardcoded homepage
 * card exactly; the author avatar circle from that original design is
 * not reproduced here since the public API has no avatar/role fields
 * to back it with real data.
 */
function BlogCard({ post, showExcerpt = false, priority = false }: BlogCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Link
      to={`/blog/${post.slug}`}
      onClick={() => trackEvent({ name: AnalyticsEvents.blogCardClick, params: { slug: post.slug } })}
      className="group flex flex-col items-start text-left"
    >
      {imageFailed ? (
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[16px] bg-neutral-100 text-[13px] text-neutral-400">
          Image unavailable
        </div>
      ) : (
        <img
          src={post.coverImage}
          alt={post.coverImageAlt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? undefined : 'async'}
          onError={() => setImageFailed(true)}
          className="aspect-[16/10] w-full rounded-[16px] object-cover transition-opacity group-hover:opacity-90"
        />
      )}

      <h3 className="mt-5 text-[18px] leading-[1.35] font-semibold tracking-[-0.01em] text-neutral-900">
        {post.title}
      </h3>

      {showExcerpt && (
        <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-neutral-600">
          {post.excerpt}
        </p>
      )}

      <div className="mt-4 flex w-full items-center justify-between gap-4">
        <span className="text-[14px] leading-tight font-medium text-neutral-900">
          {post.authorName}
        </span>
        <span className="text-[13px] text-neutral-500">
          {formatBlogDate(post.publishedAt)}
        </span>
      </div>
    </Link>
  )
}

export default BlogCard
