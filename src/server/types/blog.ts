import type { ObjectId } from 'mongodb'
import type {
  AiContext,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  PublicBlogDetail,
  PublicBlogListItem,
  TwitterCardType,
} from '../../blog/api/types'

export type { PublicBlogDetail, PublicBlogListItem }
export type BlogStatus = 'draft' | 'published' | 'unpublished'

/** Fields used by the public service and exact public response mappers. */
export interface BlogDocument {
  _id: ObjectId
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  coverImageTitle?: string | null
  coverImageCaption?: string | null
  coverImageDescription?: string | null
  authorName: string
  status: BlogStatus
  publishedAt: Date | null
  updatedAt: Date
  deletedAt: Date | null
  seoTitle: string | null
  seoDescription: string | null
  category?: string | null
  tags?: string[]
  aiSummary?: string | null
  keyTakeaways?: string[]
  aiContext?: AiContext | null
  entitySeo?: EntitySeo | null
  faq?: FaqItem[]
  expertQuote?: ExpertQuote | null
  canonicalUrl?: string | null
  robotsIndex?: boolean
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  twitterCard?: TwitterCardType | null
  breadcrumbEnabled?: boolean
}

export function toPublicBlogListItem(doc: BlogDocument): PublicBlogListItem {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    coverImage: doc.coverImage,
    coverImageAlt: doc.coverImageAlt,
    authorName: doc.authorName,
    publishedAt: doc.publishedAt!.toISOString(),
  }
}

export function toPublicBlogDetail(doc: BlogDocument): PublicBlogDetail {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: doc.content,
    coverImage: doc.coverImage,
    coverImageAlt: doc.coverImageAlt,
    coverImageTitle: doc.coverImageTitle ?? null,
    coverImageCaption: doc.coverImageCaption ?? null,
    coverImageDescription: doc.coverImageDescription ?? null,
    authorName: doc.authorName,
    publishedAt: doc.publishedAt!.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    seoTitle: doc.seoTitle,
    seoDescription: doc.seoDescription,
    category: doc.category ?? null,
    tags: doc.tags ?? [],
    aiSummary: doc.aiSummary ?? null,
    keyTakeaways: doc.keyTakeaways ?? [],
    aiContext: doc.aiContext ?? null,
    entitySeo: doc.entitySeo ?? null,
    faq: doc.faq ?? [],
    expertQuote: doc.expertQuote ?? null,
    canonicalUrl: doc.canonicalUrl ?? null,
    robotsIndex: doc.robotsIndex ?? true,
    ogTitle: doc.ogTitle ?? null,
    ogDescription: doc.ogDescription ?? null,
    ogImage: doc.ogImage ?? null,
    twitterCard: doc.twitterCard ?? null,
    breadcrumbEnabled: doc.breadcrumbEnabled ?? true,
  }
}
