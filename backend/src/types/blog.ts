import type { ObjectId } from 'mongodb'

/**
 * Reused wherever blog status is checked/set — service layer,
 * repository filters, and eventually the API/UI, so there is one
 * source of truth for the allowed values.
 */
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

/**
 * Stored separately from `content` rather than embedded via custom
 * Markdown syntax — see repositories/blog.repository.ts's module note
 * on why. Not yet rendered into the public article; that's deferred
 * to when the public article architecture is updated for it (Phase 6
 * spec, section 12).
 */
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

/**
 * The document as stored in the `blogs` collection.
 *
 * Fields added in Phase 6 are typed as optional/nullable-and-absent
 * (`?:`) rather than required, because documents created in Phases
 * 1-5 genuinely do not have these keys in MongoDB — there was no
 * migration, per the Phase 6 backward-compatibility requirement (see
 * repositories/blog.repository.ts's ensureBlogIndexes comment and
 * this file's mapper functions below). `createBlog` always writes
 * every one of these keys explicitly on a new document; only
 * pre-Phase-6 documents ever actually rely on a field being absent.
 * Application code should not read these directly off a raw
 * BlogDocument — go through toAdminBlogResponse/toPublicBlogDetail
 * (or the equivalent list mapper), which apply the same defaults
 * documented per-field below.
 */
export interface BlogDocument {
  _id: ObjectId
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  /** Optional image metadata — default `null` when absent. */
  coverImageTitle?: string | null
  coverImageCaption?: string | null
  coverImageDescription?: string | null
  /** Editorial byline shown publicly — intentionally not resolved from `authorId`. */
  authorName: string
  /** The admin account that owns this post in the CMS. Internal only, never public. */
  authorId: ObjectId
  status: BlogStatus
  /**
   * Set the first time a post is published; not cleared on a later
   * unpublish. When/whether to set or change this is a service-layer
   * decision (see repositories/blog.repository.ts's setBlogStatus) —
   * this type only describes where it's stored. Phase 6 additionally
   * allows an editor-chosen value at *create* time only (see
   * services/blog/blog.service.ts's createBlogPost) — never through
   * the ordinary update endpoint.
   */
  publishedAt: Date | null
  /**
   * A future publish date the admin has chosen for a not-yet-published
   * post (Phase 14). Deliberately a *separate* field from `publishedAt`
   * — one is "when this should go live," the other is "when it
   * actually did." Scheduling is represented as `status: 'draft'` with
   * this set, rather than a fourth `BlogStatus` value — see
   * services/blog/blog.service.ts's scheduleBlogPost for why. `null`
   * (the default, and always true for documents from before Phase 14)
   * means no pending schedule. Never present on a `published` post —
   * every write path that sets `status: 'published'` also clears this.
   */
  scheduledAt?: Date | null
  createdAt: Date
  updatedAt: Date
  /**
   * Soft-delete marker. Never `deleteOne()` a blog document — see
   * repositories/blog.repository.ts. `null` means active/not deleted.
   */
  deletedAt: Date | null
  /** Optional per-post override of `title` for `<title>`/OG; falls back to `title` when null. */
  seoTitle: string | null
  /** Optional per-post override of `excerpt` for meta description; falls back to `excerpt` when null. */
  seoDescription: string | null

  /** Default `null` when absent. */
  category?: string | null
  /** Default `[]` when absent. */
  tags?: string[]

  /** Default `null` when absent. Manually written — never AI-generated in this phase. */
  aiSummary?: string | null
  /** Default `[]` when absent. Manually written — never AI-generated in this phase. */
  keyTakeaways?: string[]

  /** Default `null` when absent. Structured editorial context, not enforced SEO claims. */
  aiContext?: AiContext | null
  /** Default `null` when absent. */
  entitySeo?: EntitySeo | null

  /** Default `[]` when absent. Structured data — not generated automatically, not yet rendered as schema. */
  faq?: FaqItem[]
  /** Default `null` when absent. */
  expertQuote?: ExpertQuote | null
  /** Default `[]` when absent. Admin-only in Phase 6 — see the Callout type comment. */
  callouts?: Callout[]

  /** Default `null` when absent. Admin-only — never exposed on the public API (see toPublicBlogDetail). */
  focusKeyword?: string | null
  /** Default `[]` when absent. Admin-only — see focusKeyword. */
  secondaryKeywords?: string[]
  /** Default `null` when absent. */
  canonicalUrl?: string | null
  /** Default `true` when absent — safe default per the Phase 6 spec; not yet acted on publicly (storage/editor foundation only). */
  robotsIndex?: boolean
  /** Default `null` when absent. */
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  /** Default `null` when absent. */
  twitterCard?: TwitterCardType | null
  /** Default `true` when absent. Not yet acted on publicly — storage/editor foundation only. */
  breadcrumbEnabled?: boolean
  /** Default `[]` when absent. Admin-only — see focusKeyword. */
  customMetaTags?: CustomMetaTag[]
}

/**
 * Safe representation returned by the authenticated admin blog API.
 * `authorId` is intentionally omitted — it's an internal CMS-ownership
 * detail (see the field comment above), not something the admin UI
 * needs today; add it back deliberately if a future feature (e.g. a
 * "my posts" filter) genuinely needs it. Dates are ISO strings, not
 * `Date` objects, since this shape crosses the JSON boundary.
 */
export interface AdminBlogResponse {
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
  /** Phase 14 — the pending future publish date, if this post has one; `null` otherwise. Admin-only, never on the public API. */
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

export function toAdminBlogResponse(doc: BlogDocument): AdminBlogResponse {
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
    status: doc.status,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    scheduledAt: doc.scheduledAt ? doc.scheduledAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
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
    callouts: doc.callouts ?? [],

    focusKeyword: doc.focusKeyword ?? null,
    secondaryKeywords: doc.secondaryKeywords ?? [],
    canonicalUrl: doc.canonicalUrl ?? null,
    robotsIndex: doc.robotsIndex ?? true,
    ogTitle: doc.ogTitle ?? null,
    ogDescription: doc.ogDescription ?? null,
    ogImage: doc.ogImage ?? null,
    twitterCard: doc.twitterCard ?? null,
    breadcrumbEnabled: doc.breadcrumbEnabled ?? true,
    customMetaTags: doc.customMetaTags ?? [],
  }
}

/**
 * Card/preview shape for the public list endpoint (homepage Blog
 * section, /blog listing page). Unchanged in Phase 6 — deliberately
 * excludes `content` and every new structured field; a list card has
 * no use for them yet (see services/blog/publicBlog.service.ts's
 * module note).
 */
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

/**
 * Only ever called on a document the public service has already
 * confirmed is published (see getPublicBlogBySlug/listPublicBlogs in
 * services/blog/publicBlog.service.ts) — such a document always has a
 * `publishedAt`, which is why the assertion below is safe, matching
 * the `req.admin!` convention already used at similar enforced-upstream
 * points elsewhere in this codebase.
 */
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

/**
 * Full article shape for the public detail endpoint. No `authorId`,
 * no `deletedAt`, no `status` — none of those are meaningful or safe
 * to hand to a visitor once the service has already decided the post
 * is public.
 *
 * Phase 6 deliberately exposes most new editorial/structured-data
 * fields here (per the spec's "acceptable to expose" list) since a
 * future public article/SEO phase will read them directly from this
 * response. Three categories are deliberately withheld, matching that
 * same list's own omissions:
 *  - `focusKeyword`/`secondaryKeywords`/`customMetaTags` — internal
 *    SEO-authoring fields, not conventionally rendered or exposed to
 *    visitors (not in the spec's explicit "acceptable" list either).
 *  - `callouts` — explicitly deferred per the Phase 6 spec ("defer
 *    rendering them into the article until the public article
 *    architecture is updated").
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
