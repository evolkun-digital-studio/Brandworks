import Link from 'next/link'
import BlogCard from '../blog/components/BlogCard'
import InsightsNavigation from '../editorial/InsightsNavigation'
import type { PublicBlogListItem, PublicBlogListResult } from '../blog/api/types'

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="aspect-[16/10] w-full rounded-[16px] bg-neutral-100" />
      <div className="h-4 w-3/4 rounded bg-neutral-100" />
      <div className="h-4 w-1/2 rounded bg-neutral-100" />
    </div>
  )
}

export default function PublicBlogIndex({
  result,
}: {
  result: PublicBlogListResult
}) {
  const page = result.page
  const hasPosts = result.items.length > 0

  return (
    <main className="flex flex-col items-center bg-white px-4 pt-16 pb-24 sm:pt-20">
      <div className="flex flex-col items-center text-center">
        {/* <p className="site-kicker text-neutral-500">BRANDWORKS / JOURNAL</p> */}
        <h1 className="site-display mt-4 text-neutral-900 uppercase">Blog</h1>
        <p className="site-copy mt-4 max-w-[560px] text-neutral-600">
          Thoughts, ideas and perspectives on branding, creativity, digital experiences and the work shaping modern brands.
        </p>
      </div>

      <div className="mt-14 w-full max-w-[1280px]">
        <div className="insights-navigation-row">
          <InsightsNavigation />
        </div>
        {!hasPosts ? (
          <div className="py-16 text-center">
            <p className="text-[15px] text-neutral-500">No posts published yet — check back soon.</p>
            <div className="mt-5"><Link href="/" className="text-[14px] font-medium text-neutral-900 underline underline-offset-4">Return home</Link></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post: PublicBlogListItem, index) => (
              <BlogCard key={post.id} post={post} showExcerpt priority={index < 3} />
            ))}
          </div>
        )}
      </div>

      {hasPosts && result.totalPages > 1 && (
        <nav aria-label="Blog pagination" className="mt-14 flex items-center gap-4">
          {page > 1 ? (
            <Link href={page === 2 ? '/blog' : `/blog?page=${page - 1}`} className="rounded-[6px] border border-neutral-300 px-4 py-2 text-[14px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900">
              Previous
            </Link>
          ) : <span className="rounded-[6px] border border-neutral-200 px-4 py-2 text-[14px] text-neutral-300">Previous</span>}
          <span className="text-[14px] text-neutral-500">Page {page} of {result.totalPages}</span>
          {page < result.totalPages ? (
            <Link href={`/blog?page=${page + 1}`} className="rounded-[6px] border border-neutral-300 px-4 py-2 text-[14px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900">
              Next
            </Link>
          ) : <span className="rounded-[6px] border border-neutral-200 px-4 py-2 text-[14px] text-neutral-300">Next</span>}
        </nav>
      )}
    </main>
  )
}

