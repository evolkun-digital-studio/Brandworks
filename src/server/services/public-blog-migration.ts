import { blogPosts, newsPosts } from '../../editorial/data'
import type { ContentType } from '../../blog/contentType'
import type { PublicBlogDetail, PublicBlogListItem } from '../../blog/api/types'
import type { ArticleBlock, EditorialPost } from '../../editorial/types'

// Migration input only. Public pages never import or fall back to these records.

function blockToMarkdown(block: ArticleBlock): string {
  if (block.type === 'p') return block.text
  if (block.type === 'h2') return `## ${block.text}`
  if (block.type === 'h3') return `### ${block.text}`
  if (block.type === 'quote') return `> ${block.text}${block.cite ? `\n>\n> — ${block.cite}` : ''}`
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

function legacyDetail(post: EditorialPost, contentType: ContentType): PublicBlogDetail {
  const publishedAt = legacyListItem(post).publishedAt
  return {
    ...legacyListItem(post),
    contentType,
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

/** Original photo IDs were copied into R2 paths without uploading the files. */
function originalImageUrl(url: string): string {
  const match = url.match(/\/Photography\/(photo-\d+-[a-z0-9]+)\.jpg$/)
  return match ? `https://images.unsplash.com/${match[1]}?auto=format&fit=crop&w=1600&q=85` : url
}

export function legacyEditorialRecords(repairImages = true): PublicBlogDetail[] {
  const records = [
    ...blogPosts.map((post) => legacyDetail(post, 'journal')),
    ...newsPosts.map((post) => legacyDetail(post, 'newsroom')),
  ]
  return repairImages ? records.map((post) => ({
    ...post,
    coverImage: originalImageUrl(post.coverImage),
    content: post.content.replace(/https:\/\/[^\s)]+\/Photography\/photo-\d+-[a-z0-9]+\.jpg/g, originalImageUrl),
  })) : records
}

