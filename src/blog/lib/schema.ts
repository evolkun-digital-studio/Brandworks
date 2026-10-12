/**
 * Deterministic Schema.org JSON-LD generation for a published blog
 * post. Pure function: same input always produces the same graph, no
 * network calls, no invented data — every value here traces back to
 * an actual field on the post (or the site's own known origin/name).
 *
 * Deliberately NOT generated, and why (Phase 8 spec, sections 25-30):
 *  - HowTo: no structured step data model exists yet (contentType
 *    being "How-to" is an editorial label, not step data).
 *  - Product / Review: no structured product/review fields exist.
 *  - VideoObject: no structured video metadata model exists; never
 *    inferred from a URL that happens to appear in Markdown.
 *  - Speakable: no validated speakable-selector implementation exists
 *    yet, so it's never emitted by default (see buildArticleSchemaGraph's
 *    comment near the bottom).
 *  - AI Context / Entity SEO fields are never mapped onto invented
 *    Schema.org properties (no "targetAudienceCountry", "AIIntent",
 *    etc.) — they stay editorial metadata, not schema.
 *  - Entity strings are never turned into fabricated `sameAs` URLs —
 *    the CMS stores names, not authoritative entity URLs.
 */

import type { PublicBlogDetail } from '../api/types'

export interface SiteContext {
  /** The public site's own origin, e.g. `window.location.origin` — never hardcoded, never the backend API origin. */
  origin: string
  siteName: string
}

/** Resolves the canonical URL exactly the way the document-head logic does: configured value wins, else the site's own article URL. */
export function resolveCanonicalUrl(post: PublicBlogDetail, site: SiteContext): string {
  return post.canonicalUrl || `${site.origin}/blog/${post.slug}`
}

function effectiveTitle(post: PublicBlogDetail): string {
  return post.seoTitle || post.title
}

function effectiveDescription(post: PublicBlogDetail): string {
  return post.seoDescription || post.excerpt
}

/**
 * Builds the full `@graph` for a single published article. Every node
 * is linked by `@id` reference rather than nested/duplicated inline,
 * so e.g. the author and publisher are described once and referenced
 * from both WebPage and BlogPosting — standard, coherent JSON-LD graph
 * shape rather than several disconnected script tags.
 */
export function buildArticleSchemaGraph(
  post: PublicBlogDetail,
  site: SiteContext,
): Record<string, unknown> {
  const canonicalUrl = resolveCanonicalUrl(post, site)
  const title = effectiveTitle(post)
  const description = effectiveDescription(post)

  const organizationId = `${site.origin}/#organization`
  const personId = `${canonicalUrl}#author`
  const webPageId = `${canonicalUrl}#webpage`
  const blogPostingId = `${canonicalUrl}#blogposting`
  const imageId = post.coverImage ? `${canonicalUrl}#primaryimage` : null
  const breadcrumbId = post.breadcrumbEnabled ? `${canonicalUrl}#breadcrumb` : null

  const graph: Record<string, unknown>[] = []

  // Organization — only what's actually known about the site. No
  // address/phone/founders/social profiles are invented (Phase 8
  // spec, section 21) — those don't exist anywhere in this project.
  graph.push({
    '@type': 'Organization',
    '@id': organizationId,
    name: site.siteName,
    url: site.origin,
  })

  // Person — the editorial byline only. No author URL/email/image/bio
  // is invented; `authorName` is the only author data this CMS has.
  graph.push({
    '@type': 'Person',
    '@id': personId,
    name: post.authorName,
  })

  // ImageObject — only emitted when a cover image actually exists, so
  // an empty/missing cover never produces an invalid, empty-url node.
  if (imageId) {
    graph.push({
      '@type': 'ImageObject',
      '@id': imageId,
      url: post.coverImage,
      contentUrl: post.coverImage,
      ...(post.coverImageCaption ? { caption: post.coverImageCaption } : {}),
      ...(post.coverImageDescription ? { description: post.coverImageDescription } : {}),
    })
  }

  graph.push({
    '@type': 'WebPage',
    '@id': webPageId,
    url: canonicalUrl,
    name: title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    ...(imageId ? { primaryImageOfPage: { '@id': imageId } } : {}),
    ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
  })

  // BlogPosting is the primary type for an ordinary BRANDWORKS post;
  // "Article" is included alongside it (not as a second, separate
  // entity) only because BlogPosting is itself an Article subtype —
  // this is one node describing one page, with two applicable types.
  graph.push({
    '@type': ['BlogPosting', 'Article'],
    '@id': blogPostingId,
    headline: title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@id': personId },
    publisher: { '@id': organizationId },
    ...(imageId ? { image: { '@id': imageId } } : {}),
    mainEntityOfPage: { '@id': webPageId },
    url: canonicalUrl,
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    ...(post.category ? { articleSection: post.category } : {}),
  })

  if (breadcrumbId) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: site.origin },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site.origin}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
      ],
    })
  }

  // FAQPage only from complete entries — matches the visible FAQ
  // section exactly (see BlogDetailPage.tsx), and never from a
  // malformed (missing question or answer) entry.
  const validFaq = post.faq.filter((item) => item.question.trim() && item.answer.trim())
  if (validFaq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonicalUrl}#faq`,
      mainEntity: validFaq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    })
  }

  // Speakable is deliberately never added here — see the module
  // comment. The graph shape above (WebPage/BlogPosting already
  // present) is what a future phase would extend with a `speakable`
  // property once real, validated speakable selectors exist; nothing
  // about this structure needs to change to support that later.

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

/**
 * Safe, deterministic serialization for embedding in a `<script
 * type="application/ld+json">` tag. Escapes every `<` as `<` —
 * valid JSON, decodes back to `<` when parsed — so a value containing
 * a literal `</script>` (or any other tag-like sequence) can never
 * prematurely close the script element. This is defense-in-depth on
 * top of documentHead.ts's setJsonLd, which already uses a safe
 * `.textContent` DOM assignment rather than HTML-string insertion.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
