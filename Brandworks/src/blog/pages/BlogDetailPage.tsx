import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBlogBySlug, getBlogs } from '../api/blogApi'
import { PublicApiError } from '../api/client'
import { trackBlogArticleView } from '../../analytics/analytics'
import { useNoIndexPage } from '../../lib/useNoIndexPage'
import ArticleMarkdown from '../components/ArticleMarkdown'
import BlogCard from '../components/BlogCard'
import { formatBlogDate } from '../lib/formatDate'
import {
  removeJsonLd,
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setJsonLd,
  setLinkTag,
  setMetaTag,
} from '../lib/documentHead'
import { buildArticleSchemaGraph, serializeJsonLd } from '../lib/schema'
import { buildToc, parseMarkdown } from '../../lib/markdownMetrics'
import type { TocEntry } from '../../lib/markdownMetrics'
import type { ExpertQuote, PublicBlogDetail, PublicBlogListItem } from '../api/types'

const SITE_NAME = 'BRANDWORKS'
const JSONLD_ID = 'blog-article-jsonld'

/** {selected title} | BRANDWORKS — unless the selected title already mentions BRANDWORKS. */
function buildPageTitle(selectedTitle: string): string {
  return selectedTitle.toUpperCase().includes(SITE_NAME) ? selectedTitle : `${selectedTitle} | ${SITE_NAME}`
}

function BackToBlogLink() {
  return (
    <Link
      to="/blog"
      className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Back to Blog
    </Link>
  )
}

/** Subtle, per section 19 — real links for Home/Blog, the current article is plain text. */
function Breadcrumb({ title }: { title: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex w-full flex-wrap items-center gap-1.5 text-[12px] text-neutral-500"
    >
      <Link to="/" className="transition-colors hover:text-neutral-900">
        Home
      </Link>
      <span aria-hidden="true">/</span>
      <Link to="/blog" className="transition-colors hover:text-neutral-900">
        Blog
      </Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="truncate text-neutral-700">
        {title}
      </span>
    </nav>
  )
}

function TableOfContents({ toc }: { toc: TocEntry[] }) {
  if (toc.length < 2) return null
  return (
    <nav aria-label="Table of contents" className="my-10 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 p-6">
      <h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">On this page</h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {toc.map((entry) => (
          <li key={entry.id} style={{ paddingLeft: `${(entry.level - 2) * 16}px` }}>
            <a
              href={`#${entry.id}`}
              className="text-[14px] text-neutral-700 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * "Summary" rather than "AI Summary" publicly — the CMS field allows
 * manual entry, so labeling it as AI-generated content here would be
 * misleading unless it actually is (Phase 8 spec, section 15).
 */
function SummarySection({ summary }: { summary: string | null }) {
  if (!summary?.trim()) return null
  return (
    <div className="my-8 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 p-6">
      <h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">Summary</h2>
      <p className="mt-2 text-[15px] leading-[1.6] text-neutral-800">{summary}</p>
    </div>
  )
}

function KeyTakeaways({ items }: { items: string[] }) {
  const valid = items.filter((item) => item.trim())
  if (valid.length === 0) return null
  return (
    <div className="my-8 w-full rounded-[12px] border border-neutral-200 bg-white p-6">
      <h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">Key Takeaways</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {valid.map((item, index) => (
          <li key={index} className="flex gap-2.5 text-[15px] leading-[1.6] text-neutral-800">
            <span aria-hidden="true" className="mt-[2px] text-neutral-400">
              &bull;
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FaqSection({ items }: { items: { question: string; answer: string }[] }) {
  const valid = items.filter((item) => item.question.trim() && item.answer.trim())
  if (valid.length === 0) return null
  return (
    <section aria-labelledby="faq-heading" className="my-14 w-full border-t border-neutral-200 pt-10">
      <h2 id="faq-heading" className="text-[22px] font-bold tracking-tight text-neutral-900 uppercase">
        Frequently Asked Questions
      </h2>
      <div className="mt-6 flex flex-col divide-y divide-neutral-100">
        {valid.map((item, index) => (
          <div key={index} className="py-4">
            <h3 className="text-[16px] font-semibold text-neutral-900">{item.question}</h3>
            <p className="mt-2 text-[15px] leading-[1.6] text-neutral-700">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Does not imply the person endorses BRANDWORKS — just attributes the quote (Phase 8 spec, section 18). */
function ExpertQuoteSection({ quote }: { quote: ExpertQuote | null }) {
  if (!quote?.quote.trim()) return null
  return (
    <blockquote className="my-14 w-full border-l-2 border-neutral-900 py-2 pl-6">
      <p className="text-[18px] leading-[1.5] font-medium text-neutral-900">&ldquo;{quote.quote}&rdquo;</p>
      <footer className="mt-3 text-[14px] text-neutral-600">
        <span className="font-medium text-neutral-900">{quote.personName}</span>
        {quote.role && <span>, {quote.role}</span>}
        {quote.organization && <span> &middot; {quote.organization}</span>}
      </footer>
    </blockquote>
  )
}

function MoreFromBlog({ excludeSlug }: { excludeSlug: string }) {
  const [posts, setPosts] = useState<PublicBlogListItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // Fetch a couple extra in case the current post is among the
    // latest ones, then show up to 3 others — simple, no dedicated
    // "exclude" API parameter needed for this optional section.
    getBlogs(1, 4)
      .then((result) => {
        if (cancelled) return
        setPosts(result.items.filter((p) => p.slug !== excludeSlug).slice(0, 3))
      })
      .catch(() => {
        // Optional section — fails silently rather than disturbing
        // the article the visitor came to read.
        if (!cancelled) setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [excludeSlug])

  if (!posts || posts.length === 0) return null

  return (
    <div className="mt-20 w-full max-w-[1280px] border-t border-neutral-200 pt-14">
      <h2 className="text-[22px] font-bold tracking-tight text-neutral-900 uppercase">
        More from the blog
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const [post, setPost] = useState<PublicBlogDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [coverFailed, setCoverFailed] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(null)
    setCoverFailed(false)
    // Clears any previous article's data immediately, before the new
    // fetch even starts (Phase 13, Part 5/6) — without this, navigating
    // directly from one article straight to another (e.g. via a "More
    // from the blog" card) left the OLD post's title/canonical/OG/
    // JSON-LD in the document head for the entire loading window, even
    // though the visible UI already correctly showed the loading
    // skeleton. The metadata effect below is keyed on `post`, so
    // clearing it here runs that effect's cleanup immediately too.
    setPost(null)

    getBlogBySlug(slug)
      .then(({ blog }) => {
        if (!cancelled) setPost(blog)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // Draft, unpublished, deleted, and future-scheduled posts all
        // reach here as the same generic 404 from the backend — this
        // page doesn't try to tell those apart either.
        if (err instanceof PublicApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(
            err instanceof PublicApiError
              ? err.message
              : 'Something went wrong loading this post. Please try again.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  // Same deterministic H2-H4 parser/slugger used by the TOC panel
  // below and by ArticleMarkdown's heading ids — see
  // src/lib/markdownMetrics.ts. Computed once per post so the on-page
  // "On this page" list and the ids ArticleMarkdown assigns are
  // guaranteed to always agree (same pure function, same input).
  const toc = useMemo(() => (post ? buildToc(parseMarkdown(post.content).headings) : []), [post])

  // Fires once per distinct article actually viewed (Phase 12, Part
  // 4) — guarded by slug so React StrictMode's double-invoked effect
  // doesn't send a duplicate event for the same post, while genuinely
  // navigating from one article straight to another still fires
  // again. Built from an explicit field allowlist inside
  // trackBlogArticleView itself — this effect never spreads `post`.
  const trackedArticleSlugRef = useRef<string | null>(null)
  useEffect(() => {
    if (!post) return
    if (trackedArticleSlugRef.current === post.slug) return
    trackedArticleSlugRef.current = post.slug
    trackBlogArticleView({
      slug: post.slug,
      title: post.title,
      category: post.category,
      author: post.authorName,
      contentType: post.aiContext?.contentType ?? null,
      contentIntent: post.aiContext?.contentIntent ?? null,
    })
  }, [post])

  useEffect(() => {
    if (!post) return
    const previousTitle = document.title

    const title = post.seoTitle || post.title
    const description = post.seoDescription || post.excerpt
    const origin = window.location.origin
    const canonicalUrl = post.canonicalUrl || `${origin}/blog/${post.slug}`
    const ogTitle = post.ogTitle || post.seoTitle || post.title
    const ogDescription = post.ogDescription || post.seoDescription || post.excerpt
    const ogImage = post.ogImage || post.coverImage
    const twitterCard = post.twitterCard || 'summary_large_image'

    setDocumentTitle(buildPageTitle(title))
    setMetaTag('name', 'description', description)
    setLinkTag('canonical', canonicalUrl)
    // robotsIndex only controls this crawler directive — it never
    // hides the post from the public API itself; the backend's own
    // published-visibility rules remain the sole authority on that
    // (Phase 8 spec, section 7).
    setMetaTag('name', 'robots', post.robotsIndex ? 'index,follow' : 'noindex,nofollow')

    setMetaTag('property', 'og:type', 'article')
    setMetaTag('property', 'og:url', canonicalUrl)
    setMetaTag('property', 'og:title', ogTitle)
    setMetaTag('property', 'og:description', ogDescription)
    if (ogImage) setMetaTag('property', 'og:image', ogImage)
    setMetaTag('property', 'article:published_time', post.publishedAt)
    setMetaTag('property', 'article:modified_time', post.updatedAt)
    setMetaTag('property', 'article:author', post.authorName)

    setMetaTag('name', 'twitter:card', twitterCard)
    setMetaTag('name', 'twitter:title', ogTitle)
    setMetaTag('name', 'twitter:description', ogDescription)
    if (ogImage) setMetaTag('name', 'twitter:image', ogImage)

    const graph = buildArticleSchemaGraph(post, { origin, siteName: SITE_NAME })
    setJsonLd(JSONLD_ID, serializeJsonLd(graph))

    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
      removeMetaTag('name', 'robots')
      removeMetaTag('property', 'og:type')
      removeMetaTag('property', 'og:url')
      removeMetaTag('property', 'og:title')
      removeMetaTag('property', 'og:description')
      removeMetaTag('property', 'og:image')
      removeMetaTag('property', 'article:published_time')
      removeMetaTag('property', 'article:modified_time')
      removeMetaTag('property', 'article:author')
      removeMetaTag('name', 'twitter:card')
      removeMetaTag('name', 'twitter:title')
      removeMetaTag('name', 'twitter:description')
      removeMetaTag('name', 'twitter:image')
      removeJsonLd(JSONLD_ID)
    }
  }, [post])

  // The notFound/error states have no article to represent — no
  // canonical, no JSON-LD, no OG/Twitter is ever set for them (the
  // effect above only ever runs when `post` is truthy), but they had
  // no explicit title/robots treatment of their own either, so
  // whatever title happened to be left over from wherever the visitor
  // came from just stayed on screen. Phase 13, Part 6: an explicit,
  // noindex'd title for both, restored on cleanup like everything else.
  useNoIndexPage(
    buildPageTitle(notFound ? 'Post Not Found' : 'Something Went Wrong'),
    !post && (notFound || Boolean(error)),
  )

  if (loading) {
    return (
      <main className="flex flex-col items-center gap-6 bg-white px-4 py-24">
        <div className="w-full max-w-[760px] animate-pulse">
          <div className="h-8 w-2/3 rounded bg-neutral-100" />
          <div className="mt-4 h-5 w-1/3 rounded bg-neutral-100" />
          <div className="mt-10 aspect-[16/9] w-full rounded-[16px] bg-neutral-100" />
        </div>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex flex-col items-center gap-4 bg-white px-4 py-24 text-center">
        <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 uppercase">
          Post not found
        </h1>
        <p className="max-w-[420px] text-[15px] text-neutral-600">
          This post doesn&apos;t exist, or isn&apos;t available anymore.
        </p>
        <Link
          to="/blog"
          className="mt-2 flex h-[40px] items-center justify-center rounded-[4px] bg-neutral-900 px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Back to Blog
        </Link>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-col items-center gap-4 bg-white px-4 py-24 text-center">
        <p role="alert" className="text-[15px] text-neutral-500">
          {error}
        </p>
        <BackToBlogLink />
      </main>
    )
  }

  if (!post) return null

  // "Updated" only shows when meaningfully different from "Published"
  // — compared at day granularity (matching formatBlogDate's own
  // display precision), so a same-day resave doesn't show an Updated
  // date that reads identically to Published (Phase 8 spec, section 12).
  const showUpdated =
    post.updatedAt &&
    new Date(post.updatedAt).toDateString() !== new Date(post.publishedAt).toDateString()

  return (
    <main className="flex flex-col items-center bg-white px-4 pt-12 pb-24 sm:pt-16">
      <article className="flex w-full max-w-[760px] flex-col items-start">
        {post.breadcrumbEnabled && <Breadcrumb title={post.title} />}
        <BackToBlogLink />

        {post.category && (
          <span className="mt-6 rounded-[4px] bg-neutral-100 px-2.5 py-1 text-[12px] font-medium tracking-wide text-neutral-600 uppercase">
            {post.category}
          </span>
        )}

        <h1
          className={`${post.category ? 'mt-3' : 'mt-6'} site-heading text-neutral-900 uppercase`}
        >
          {post.title}
        </h1>

        <p className="site-copy mt-4 text-neutral-600">{post.excerpt}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-neutral-600">
          <span className="font-medium text-neutral-900">{post.authorName}</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            Published <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          </span>
          {showUpdated && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>
                Updated <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time>
              </span>
            </>
          )}
        </div>

        {/* The dominant, prominent visual on this page and the most
           plausible LCP candidate for it (Phase 10, Part 2/17) — the
           <img> below is kept eager (the default, made explicit here)
           with fetchPriority "high" to ask the browser to fetch it
           sooner, and no decoding attribute (Part 3: don't force async
           decoding on a likely-LCP image). aspect-[16/9] already
           reserves its box before the image loads, so it carries no
           CLS risk. */}
        {coverFailed ? (
          <div className="mt-10 flex aspect-[16/9] w-full items-center justify-center rounded-[16px] bg-neutral-100 text-[13px] text-neutral-400">
            Image unavailable
          </div>
        ) : (
          <img
            src={post.coverImage}
            alt={post.coverImageAlt}
            loading="eager"
            fetchPriority="high"
            onError={() => setCoverFailed(true)}
            className="mt-10 aspect-[16/9] w-full rounded-[16px] object-cover"
          />
        )}
        {post.coverImageCaption && (
          <p className="mt-2 text-[13px] text-neutral-500">{post.coverImageCaption}</p>
        )}

        <SummarySection summary={post.aiSummary} />
        <KeyTakeaways items={post.keyTakeaways} />
        <TableOfContents toc={toc} />

        <div className="mt-10 w-full">
          <ArticleMarkdown content={post.content} />
        </div>

        <FaqSection items={post.faq} />
        <ExpertQuoteSection quote={post.expertQuote} />

        <div className="mt-14 border-t border-neutral-200 pt-8">
          <BackToBlogLink />
        </div>
      </article>

      <MoreFromBlog excludeSlug={post.slug} />
    </main>
  )
}

export default BlogDetailPage
