import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BlogCard from './blog/components/BlogCard'
import { getBlogs } from './blog/api/blogApi'
import type { PublicBlogListItem } from './blog/api/types'

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="aspect-[16/10] w-full animate-pulse rounded-[16px] bg-neutral-100" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
    </div>
  )
}

function Blog() {
  const [posts, setPosts] = useState<PublicBlogListItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getBlogs(1, 3)
      .then((result) => {
        if (!cancelled) setPosts(result.items)
      })
      .catch(() => {
        // Fails gracefully — the rest of the homepage is unaffected,
        // this section just shows a restrained fallback instead of
        // fake/hardcoded posts.
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col px-4 py-20">
      <span className="site-kicker flex items-center gap-1 text-neutral-500">
        Blog
        <sup className="text-[10px]">&reg;</sup>
      </span>

      <h2 className="site-display mt-4 text-neutral-900 uppercase">
        Insights &amp; Perspectives
      </h2>

      <p className="site-copy mt-4 max-w-[620px] text-neutral-600">
        Thoughts, ideas and perspectives on branding, creativity, digital
        experiences and the work shaping modern brands.
      </p>

      {failed ? (
        <p className="mt-12 text-[15px] text-neutral-500">
          Unable to load blog posts right now.
        </p>
      ) : posts === null ? (
        <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-12 text-[15px] text-neutral-500">
          No posts published yet — check back soon.
        </p>
      ) : (
        <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <div className="site-kicker mt-10 flex w-full flex-wrap items-center justify-center gap-2 text-center text-neutral-500">
        Explore our latest insights
        <span aria-hidden="true">&rarr;</span>
        <Link
          to="/blog"
          className="text-neutral-900 underline underline-offset-4"
        >
          View all blog
        </Link>
      </div>
    </section>
  )
}

export default Blog
