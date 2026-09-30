// Mirrors backend/src/types/blog.ts's PublicBlogListItem/PublicBlogDetail
// shapes exactly. No admin-only fields (authorId, status, deletedAt,
// createdAt) exist here — the frontend never assumes a field the
// public API doesn't actually return.

export interface PublicBlogListItem {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImage: string
  coverImageAlt: string
  authorName: string
  publishedAt: string
}

export interface PublicBlogListResult {
  items: PublicBlogListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AiContext {
  targetCountry: string | null
  targetLanguage: string | null
  targetAudience: string | null
  contentType: string | null
  contentIntent: string | null
}

export interface EntitySeo {
  mainEntity: string | null
  about: string[]
  mentionedEntities: string[]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface ExpertQuote {
  quote: string
  personName: string
  organization: string
  role: string | null
}

export type TwitterCardType = 'summary' | 'summary_large_image' | 'player'

/**
 * Mirrors backend/src/types/blog.ts's toPublicBlogDetail output
 * exactly. Three categories of admin-only field are deliberately NOT
 * here, matching the backend mapper: `focusKeyword`/`secondaryKeywords`/
 * `customMetaTags` (internal SEO-authoring fields) and `callouts`
 * (rendering explicitly deferred to a future phase).
 */
export interface PublicBlogDetail {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  coverImageTitle: string | null
  coverImageCaption: string | null
  coverImageDescription: string | null
  authorName: string
  publishedAt: string
  updatedAt: string
  seoTitle: string | null
  seoDescription: string | null

  category: string | null
  tags: string[]

  aiSummary: string | null
  keyTakeaways: string[]

  aiContext: AiContext | null
  entitySeo: EntitySeo | null

  faq: FaqItem[]
  expertQuote: ExpertQuote | null

  canonicalUrl: string | null
  robotsIndex: boolean
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  twitterCard: TwitterCardType | null
  breadcrumbEnabled: boolean
}
