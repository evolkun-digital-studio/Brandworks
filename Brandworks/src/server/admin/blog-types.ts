import type { ObjectId } from 'mongodb'
import type { AiContext, EntitySeo, ExpertQuote, FaqItem, TwitterCardType } from '../../blog/api/types'

export type AdminBlogStatus = 'draft' | 'published' | 'unpublished'
export interface AdminBlogDocument {
  _id: ObjectId; title: string; slug: string; excerpt: string; content: string
  coverImage: string; coverImageAlt: string; coverImageTitle?: string | null
  coverImageCaption?: string | null; coverImageDescription?: string | null
  authorName: string; authorId: ObjectId; status: AdminBlogStatus
  publishedAt: Date | null; scheduledAt?: Date | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null
  seoTitle: string | null; seoDescription: string | null; category?: string | null; tags?: string[]
  aiSummary?: string | null; keyTakeaways?: string[]; aiContext?: AiContext | null; entitySeo?: EntitySeo | null
  faq?: FaqItem[]; expertQuote?: ExpertQuote | null; callouts?: unknown[]; focusKeyword?: string | null
  secondaryKeywords?: string[]; canonicalUrl?: string | null; robotsIndex?: boolean; ogTitle?: string | null
  ogDescription?: string | null; ogImage?: string | null; twitterCard?: TwitterCardType | null
  breadcrumbEnabled?: boolean; customMetaTags?: Array<{name:string;content:string}>
}

export function toAdminBlogResponse(doc: AdminBlogDocument) {
  return {
    id: doc._id.toHexString(), title: doc.title, slug: doc.slug, excerpt: doc.excerpt, content: doc.content,
    coverImage: doc.coverImage, coverImageAlt: doc.coverImageAlt, coverImageTitle: doc.coverImageTitle ?? null,
    coverImageCaption: doc.coverImageCaption ?? null, coverImageDescription: doc.coverImageDescription ?? null,
    authorName: doc.authorName, status: doc.status, publishedAt: doc.publishedAt?.toISOString() ?? null,
    scheduledAt: doc.scheduledAt?.toISOString() ?? null, createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(), deletedAt: doc.deletedAt?.toISOString() ?? null,
    seoTitle: doc.seoTitle, seoDescription: doc.seoDescription, category: doc.category ?? null, tags: doc.tags ?? [],
    aiSummary: doc.aiSummary ?? null, keyTakeaways: doc.keyTakeaways ?? [], aiContext: doc.aiContext ?? null,
    entitySeo: doc.entitySeo ?? null, faq: doc.faq ?? [], expertQuote: doc.expertQuote ?? null,
    callouts: doc.callouts ?? [], focusKeyword: doc.focusKeyword ?? null,
    secondaryKeywords: doc.secondaryKeywords ?? [], canonicalUrl: doc.canonicalUrl ?? null,
    robotsIndex: doc.robotsIndex ?? true, ogTitle: doc.ogTitle ?? null, ogDescription: doc.ogDescription ?? null,
    ogImage: doc.ogImage ?? null, twitterCard: doc.twitterCard ?? null,
    breadcrumbEnabled: doc.breadcrumbEnabled ?? true, customMetaTags: doc.customMetaTags ?? [],
  }
}
