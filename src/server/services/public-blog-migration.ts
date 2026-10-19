import 'server-only'

import { blogPosts } from '../../editorial/data'
import type { PublicBlogDetail, PublicBlogListItem } from '../../blog/api/types'
import type { ArticleBlock, EditorialPost } from '../../editorial/types'

/**
 * The public site is migrated in two reversible steps:
 *
 * 1. Published MongoDB content is authoritative whenever it exists.
 * 2. Until the migration is confirmed complete, the old static journal is
 *    available as a fallback when MongoDB has no published content and for
 *    legacy slugs that have not yet been created in the CMS.
 *
 * Set PUBLIC_BLOG_LEGACY_FALLBACK=false after the editorial team has verified
 * the migrated slugs. No stored content is deleted by this switch.
 */
export function isLegacyPublicBlogFallbackEnabled(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.PUBLIC_BLOG_LEGACY_FALLBACK?.trim().toLowerCase() !== 'false'
}

function blockToMarkdown(block: ArticleBlock): string {
  if (block.type === 'p') return block.text
  if (block.type === 'h2') return `## ${block.text}`
  if (block.type === 'h3') return `### ${block.text}`
  if (block.type === 'quote') return `> ${block.text}`
  if (block.type === 'list') {
    return block.items
      .map((item, index) => `${block.ordered ? `${index + 1}.` : '-'} ${item}`)
      .join('\n')
  }

  const caption = block.caption ? `\n\n*${block.caption}*` : ''
  return `![${block.alt}](${block.src})${caption}`
}

function legacyContent(post: EditorialPost): string {
  return post.body.map(blockToMarkdown).join('\n\n')
}

function legacyListItem(post: EditorialPost): PublicBlogListItem {
  return {
    id: `legacy:${post.slug}`,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.image,
    coverImageAlt: post.imageAlt,
    authorName: post.author,
    publishedAt: new Date(`${post.date}T12:00:00.000Z`).toISOString(),
  }
}

function legacyDetail(post: EditorialPost): PublicBlogDetail {
  const publishedAt = legacyListItem(post).publishedAt
  return {
    ...legacyListItem(post),
    content: legacyContent(post),
    coverImageTitle: null,
    coverImageCaption: post.imageCaption ?? null,
    coverImageDescription: null,
    updatedAt: publishedAt,
    seoTitle: null,
    seoDescription: null,
    category: post.category || null,
    tags: [],
    aiSummary: null,
    keyTakeaways: [],
    aiContext: null,
    entitySeo: null,
    faq: [],
    expertQuote: null,
    canonicalUrl: null,
    robotsIndex: true,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    breadcrumbEnabled: true,
  }
}

export function getLegacyPublicBlogList(): PublicBlogListItem[] {
  return blogPosts
    .map(legacyListItem)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
}

export function getLegacyPublicBlogBySlug(slug: string): PublicBlogDetail | null {
  const post = blogPosts.find((candidate) => candidate.slug === slug)
  return post ? legacyDetail(post) : null
}

