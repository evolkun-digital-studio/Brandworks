// Mirrors backend/src/types/blog.ts's AdminBlogResponse shape.
export type BlogStatus = 'draft' | 'published' | 'unpublished'

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

export type CalloutType = 'important' | 'warning' | 'tip' | 'note'

export interface Callout {
  id: string
  type: CalloutType
  title: string
  content: string
}

export interface CustomMetaTag {
  name: string
  content: string
}

export type TwitterCardType = 'summary' | 'summary_large_image' | 'player'

export interface AdminBlogPost {
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
  status: BlogStatus
  publishedAt: string | null
  /** Phase 14 — a pending future publish date, if this post has one; `null` otherwise. Always `null` once `status` is `'published'`. */
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
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
  callouts: Callout[]

  focusKeyword: string | null
  secondaryKeywords: string[]
  canonicalUrl: string | null
  robotsIndex: boolean
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  twitterCard: TwitterCardType | null
  breadcrumbEnabled: boolean
  customMetaTags: CustomMetaTag[]
}

export interface AdminBlogListResult {
  items: AdminBlogPost[]
  page: number
  limit: number
  total: number
  totalPages: number
}
