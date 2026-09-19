import { Link } from 'react-router-dom'
import { useNoIndexPage } from './lib/useNoIndexPage'

/**
 * Catch-all for any path that doesn't match a real route (Phase 13,
 * Part 1/15). Before this existed, an unmatched path (anything other
 * than /, /blog, /blog/:slug, or /admin/*) rendered nothing at all —
 * <Routes> has no fallback without an explicit `*` route — not even
 * Header/Footer, since no layout route matched either. Mirrors
 * BlogDetailPage.tsx's own "Post not found" state visually, since
 * that's already the site's established not-found language.
 *
 * noindex, not blocked-from-crawling: this route intentionally has no
 * sitemap entry (see backend sitemap.service.ts — routes aren't added
 * "merely because they exist"), and robots.txt still allows crawling
 * it (robots.txt controls crawling, not indexing — see robots.ts) so
 * a crawler that follows a stale/broken link here sees a clean,
 * correctly-noindex'd page instead of nothing.
 */
function NotFound() {
  useNoIndexPage('Page Not Found | BRANDWORKS', true)

  return (
    <main className="flex flex-col items-center gap-4 bg-white px-4 py-24 text-center">
      <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 uppercase">
        Page Not Found
      </h1>
      <p className="max-w-[420px] text-[15px] text-neutral-600">
        The page you&apos;re looking for doesn&apos;t exist, or has moved.
      </p>
      <Link
        to="/"
        className="mt-2 flex h-[40px] items-center justify-center rounded-[4px] bg-neutral-900 px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </main>
  )
}

export default NotFound
