import { ObjectId } from 'mongodb'
import type { Collection, Document, Filter, Sort } from 'mongodb'
import { getDb } from '../config/database.js'
import type {
  AiContext,
  BlogDocument,
  BlogStatus,
  Callout,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  TwitterCardType,
} from '../types/blog.js'

const COLLECTION_NAME = 'blogs'

function collection(): Collection<BlogDocument> {
  return getDb().collection<BlogDocument>(COLLECTION_NAME)
}

/**
 * Creates the required indexes if they don't already exist. Safe to
 * call every startup — `createIndex` is idempotent — mirrors exactly
 * how repositories/admin.repository.ts's ensureAdminIndexes works.
 *
 * Only two indexes, both explicitly required by the Phase 1 spec:
 *  - `slug` unique, so a duplicate slug is rejected at the database
 *    level regardless of what the service layer checks beforehand.
 *  - `{status, publishedAt}` compound, matching the future public
 *    query shape exactly: equality on status, sorted by publishedAt.
 *
 * `deletedAt` is deliberately NOT folded into that compound index.
 * Every query that cares about deletion also filters on `status` (via
 * buildFilter below), so MongoDB can still use the `status` prefix of
 * this same index and then cheaply filter the (already small) matching
 * set by `deletedAt` — a third index field isn't earning its keep at
 * this data volume. Revisit only if real query patterns show otherwise.
 *
 * No `{status, scheduledAt}` index was added for the Phase 16
 * "Scheduled" filter/count, on purpose, after actually considering it
 * (a candidate the Phase 16 spec itself raised): the existing
 * `{status, publishedAt}` index already lets MongoDB use `status:
 * 'draft'` as an equality prefix for that query, exactly the same way
 * it already does for `deletedAt`/`robotsIndex` above — sorting or
 * filtering the resulting (small, at this project's real data volume)
 * set of drafts by `scheduledAt` in memory costs nothing meaningful.
 * Adding a second compound index purely for one admin-only, low-
 * traffic view isn't earning its keep yet either. Revisit only if real
 * draft-collection sizes or query patterns show otherwise.
 */
export async function ensureBlogIndexes(): Promise<void> {
  await collection().createIndex({ slug: 1 }, { unique: true })
  await collection().createIndex({ status: 1, publishedAt: -1 })
}

/**
 * Shared query shape for both listing and counting. `includeDeleted`
 * defaults to false everywhere it's used below — named and passed
 * explicitly rather than baked in silently, so a future admin trash
 * view can opt in with `{ includeDeleted: true }` instead of needing
 * a separate method.
 */
export interface BlogQueryFilter {
  status?: BlogStatus | BlogStatus[]
  authorId?: ObjectId
  /** For the future "publishedAt <= now" public query. */
  publishedAtBefore?: Date
  includeDeleted?: boolean
  /**
   * Case-insensitive substring match on `title`. Deliberately just a
   * `$regex` rather than a MongoDB text index/full-text search — the
   * Phase 2 spec explicitly calls for "simple," and this is the
   * query-construction logic the service layer shouldn't have to
   * build itself (see this file's module-level note on scope).
   */
  search?: string
  /**
   * Excludes posts explicitly marked `robotsIndex: false` (Phase 9,
   * sitemap eligibility only). A document with `robotsIndex` absent
   * or `true` still matches `{ $ne: false }`, matching the same
   * "default true" rule toPublicBlogDetail already applies. Nothing
   * in services/blog/publicBlog.service.ts's own public-visibility
   * queries sets this — robotsIndex never affects public API/page
   * reachability, only sitemap inclusion.
   */
  excludeNoIndex?: boolean
  /**
   * Restricts to documents with a *future*, real-Date `scheduledAt`
   * (Phase 16) — the query-construction half of "Scheduled" list/count
   * filtering (see services/blog/blog.service.ts's listBlogPostsForAdmin
   * and countScheduledBlogPosts, the only two callers). `$type: 'date'`
   * is the same Phase 14/15 protection as buildDueScheduledFilter below
   * — MongoDB sorts `null` before every date, so without it a document
   * with `scheduledAt: null` would incorrectly satisfy a bare `$gt`.
   * `$gt` (strictly greater than), not `$gte`: a schedule exactly at
   * "now" is on the verge of being published by the scheduler this
   * instant, so it no longer reads as "upcoming" — see that same
   * function's own module comment for the full reasoning.
   */
  scheduledAfter?: Date
}

export interface ListBlogsOptions extends BlogQueryFilter {
  limit?: number
  skip?: number
  sort?: Sort
}

/**
 * Exported (only) so it can be unit-tested directly as a pure function
 * — "given this BlogQueryFilter, what Mongo query results" — without
 * needing a live database connection (see blog.repository.test.ts).
 * Every caller in this file still goes through it exactly as before.
 */
export function buildFilter(filter: BlogQueryFilter): Filter<BlogDocument> {
  const query: Filter<BlogDocument> = {}

  if (filter.status) {
    query.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status
  }
  if (filter.authorId) {
    query.authorId = filter.authorId
  }
  if (filter.publishedAtBefore) {
    query.publishedAt = { $lte: filter.publishedAtBefore }
  }
  if (!filter.includeDeleted) {
    query.deletedAt = null
  }
  if (filter.search) {
    query.title = { $regex: escapeRegExp(filter.search), $options: 'i' }
  }
  if (filter.excludeNoIndex) {
    query.robotsIndex = { $ne: false }
  }
  if (filter.scheduledAfter) {
    query.scheduledAt = { $type: 'date', $gt: filter.scheduledAfter }
  }

  return query
}

/** Escapes regex metacharacters so a search string is matched literally. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findBlogById(
  id: string,
  options: { includeDeleted?: boolean } = {},
): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return Promise.resolve(null)
  const query: Filter<BlogDocument> = { _id: new ObjectId(id) }
  if (!options.includeDeleted) query.deletedAt = null
  return collection().findOne(query)
}

export function findBlogBySlug(
  slug: string,
  options: { includeDeleted?: boolean } = {},
): Promise<BlogDocument | null> {
  const query: Filter<BlogDocument> = { slug }
  if (!options.includeDeleted) query.deletedAt = null
  return collection().findOne(query)
}

export function listBlogs(options: ListBlogsOptions = {}): Promise<BlogDocument[]> {
  const { limit, skip, sort, ...filter } = options
  let cursor = collection()
    .find(buildFilter(filter))
    .sort(sort ?? { createdAt: -1 })
  if (typeof skip === 'number') cursor = cursor.skip(skip)
  if (typeof limit === 'number') cursor = cursor.limit(limit)
  return cursor.toArray()
}

export function countBlogs(filter: BlogQueryFilter = {}): Promise<number> {
  return collection().countDocuments(buildFilter(filter))
}

/** The only fields the sitemap (Phase 9) actually needs — never the full article content. */
export interface SitemapBlogProjection {
  slug: string
  canonicalUrl: string | null
  updatedAt: Date
}

/**
 * Lean, projected query used only for sitemap generation (Phase 9).
 * Takes the same `BlogQueryFilter` shape as everything else here —
 * the caller (services/blog/publicBlog.service.ts) decides which
 * filter counts as "sitemap eligible"; this function only knows how
 * to run it efficiently against the existing `{status, publishedAt}`
 * index with a minimal projection, exactly like `listBlogs` above but
 * without ever pulling `content` or any other unused field off the wire.
 *
 * No new index was added for this: the existing `{status, publishedAt}`
 * compound index above already covers this query's equality filter and
 * sort exactly (same reasoning as `deletedAt` not being folded into
 * that index — `robotsIndex` and `deletedAt` are cheap in-memory
 * filters over the already-small matching set). Revisit only if real
 * sitemap query patterns show otherwise.
 */
export function listBlogsForSitemap(filter: BlogQueryFilter): Promise<SitemapBlogProjection[]> {
  return collection()
    .find<SitemapBlogProjection>(buildFilter(filter), {
      projection: { _id: 0, slug: 1, canonicalUrl: 1, updatedAt: 1 },
    })
    .sort({ publishedAt: -1 })
    .toArray()
}

export interface CreateBlogInput {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  authorName: string
  authorId: ObjectId
  /**
   * Required, not defaulted here — whether a new post starts as a
   * draft (or anything else) is a service-layer decision, not
   * something this repository should assume on the caller's behalf.
   */
  status: BlogStatus
  seoTitle?: string | null
  seoDescription?: string | null

  coverImageTitle?: string | null
  coverImageCaption?: string | null
  coverImageDescription?: string | null

  category?: string | null
  tags?: string[]

  aiSummary?: string | null
  keyTakeaways?: string[]

  aiContext?: AiContext | null
  entitySeo?: EntitySeo | null

  faq?: FaqItem[]
  expertQuote?: ExpertQuote | null
  callouts?: Callout[]

  focusKeyword?: string | null
  secondaryKeywords?: string[]
  canonicalUrl?: string | null
  robotsIndex?: boolean
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  twitterCard?: TwitterCardType | null
  breadcrumbEnabled?: boolean
  customMetaTags?: CustomMetaTag[]

  /**
   * Editor-chosen publish date, create-time only (Phase 6). `null`/
   * omitted means the usual behavior applies: the first `published`
   * status transition sets it to that moment. See
   * services/blog/blog.service.ts's createBlogPost for the full
   * reasoning — this repository just stores whatever it's given.
   */
  publishedAt?: Date | null
}

/**
 * `deletedAt` always starts `null`. `publishedAt` defaults to `null`
 * (the usual case — "first publish sets it") unless the caller passes
 * one explicitly (Phase 6's create-time editor-chosen date). Every
 * other new Phase 6 field defaults exactly as documented on
 * BlogDocument in types/blog.ts, written explicitly here so a new
 * document is always fully populated (never relies on the mappers'
 * `??` fallbacks — those exist only for pre-Phase-6 documents).
 */
export async function createBlog(input: CreateBlogInput): Promise<BlogDocument> {
  const now = new Date()
  const doc: BlogDocument = {
    _id: new ObjectId(),
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    coverImage: input.coverImage,
    coverImageAlt: input.coverImageAlt,
    coverImageTitle: input.coverImageTitle ?? null,
    coverImageCaption: input.coverImageCaption ?? null,
    coverImageDescription: input.coverImageDescription ?? null,
    authorName: input.authorName,
    authorId: input.authorId,
    status: input.status,
    publishedAt: input.publishedAt ?? null,
    scheduledAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
    aiSummary: input.aiSummary ?? null,
    keyTakeaways: input.keyTakeaways ?? [],
    aiContext: input.aiContext ?? null,
    entitySeo: input.entitySeo ?? null,
    faq: input.faq ?? [],
    expertQuote: input.expertQuote ?? null,
    callouts: input.callouts ?? [],
    focusKeyword: input.focusKeyword ?? null,
    secondaryKeywords: input.secondaryKeywords ?? [],
    canonicalUrl: input.canonicalUrl ?? null,
    robotsIndex: input.robotsIndex ?? true,
    ogTitle: input.ogTitle ?? null,
    ogDescription: input.ogDescription ?? null,
    ogImage: input.ogImage ?? null,
    twitterCard: input.twitterCard ?? null,
    breadcrumbEnabled: input.breadcrumbEnabled ?? true,
    customMetaTags: input.customMetaTags ?? [],
  }
  await collection().insertOne(doc)
  return doc
}

export type UpdateBlogInput = Partial<
  Pick<
    BlogDocument,
    | 'title'
    | 'slug'
    | 'excerpt'
    | 'content'
    | 'coverImage'
    | 'coverImageAlt'
    | 'authorName'
    | 'seoTitle'
    | 'seoDescription'
    | 'coverImageTitle'
    | 'coverImageCaption'
    | 'coverImageDescription'
    | 'category'
    | 'tags'
    | 'aiSummary'
    | 'keyTakeaways'
    | 'aiContext'
    | 'entitySeo'
    | 'faq'
    | 'expertQuote'
    | 'callouts'
    | 'focusKeyword'
    | 'secondaryKeywords'
    | 'canonicalUrl'
    | 'robotsIndex'
    | 'ogTitle'
    | 'ogDescription'
    | 'ogImage'
    | 'twitterCard'
    | 'breadcrumbEnabled'
    | 'customMetaTags'
  >
>

/**
 * General content update. Deliberately excludes `status`, `publishedAt`,
 * `deletedAt`, and `authorId`/`authorName` — those change only via the
 * dedicated methods below (or, for authorName, never at all through
 * update — see services/blog/blog.service.ts), each of which states
 * its own rules about what it touches, rather than one catch-all
 * update accepting anything.
 */
export async function updateBlogById(
  id: string,
  update: UpdateBlogInput,
): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return null
  return collection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

/**
 * Sets status and publishedAt together in one write. This repository
 * does not decide what `publishedAt` should be — the caller (service
 * layer) computes and passes it explicitly, per the Phase 1 spec ("the
 * future service layer will decide when it is set").
 *
 * `clearScheduledAt` (Phase 14, Part 8): any *manual* status change —
 * made through this function — cancels a pending schedule; the
 * service layer (setBlogPostStatus) always passes this as `true`. The
 * scheduler's own transition to `published` never calls this function
 * at all (see publishDueScheduledBlogs below, which clears
 * `scheduledAt` itself as part of its own atomic pipeline update) —
 * kept as an explicit opt-in rather than unconditional so this stays
 * a plain data-access primitive with no business rule baked in by
 * default, same convention as everywhere else in this file.
 */
export async function setBlogStatus(
  id: string,
  status: BlogStatus,
  publishedAt: Date | null,
  options: { clearScheduledAt?: boolean } = {},
): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return null
  const set: Partial<BlogDocument> = { status, publishedAt, updatedAt: new Date() }
  if (options.clearScheduledAt) set.scheduledAt = null
  return collection().findOneAndUpdate({ _id: new ObjectId(id) }, { $set: set }, { returnDocument: 'after' })
}

/** Soft delete only — never removes the document. See setBlogStatus's sibling, restoreBlogById. */
export async function softDeleteBlogById(id: string): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return null
  return collection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

/**
 * `clearScheduledAt` (Phase 14, Part 7): the service layer passes this
 * as `true` when the post being restored has a `scheduledAt` that's
 * already in the past — otherwise the very next scheduler tick would
 * immediately publish it, which is exactly the "restoring shouldn't
 * auto-publish" behavior the spec calls for. A still-future
 * `scheduledAt` is left untouched (this defaults to `false`), so a
 * restored post that was legitimately scheduled ahead of time keeps
 * that schedule.
 */
export async function restoreBlogById(
  id: string,
  options: { clearScheduledAt?: boolean } = {},
): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return null
  const set: Partial<BlogDocument> = { deletedAt: null, updatedAt: new Date() }
  if (options.clearScheduledAt) set.scheduledAt = null
  return collection().findOneAndUpdate({ _id: new ObjectId(id) }, { $set: set }, { returnDocument: 'after' })
}

/**
 * Sets (or clears) a pending schedule (Phase 14). `forceStatus`, when
 * given, is set in the same write — used only to normalize "scheduling
 * an unpublished post" into the single canonical `draft +
 * scheduledAt` representation this project uses for "scheduled" (see
 * services/blog/blog.service.ts's scheduleBlogPost for the full
 * reasoning); omitted when merely clearing a schedule, which leaves
 * status exactly as it was.
 */
export async function setBlogScheduledAt(
  id: string,
  scheduledAt: Date | null,
  forceStatus?: BlogStatus,
): Promise<BlogDocument | null> {
  if (!ObjectId.isValid(id)) return null
  const set: Partial<BlogDocument> = { scheduledAt, updatedAt: new Date() }
  if (forceStatus) set.status = forceStatus
  return collection().findOneAndUpdate({ _id: new ObjectId(id) }, { $set: set }, { returnDocument: 'after' })
}

/**
 * The eligibility filter for "due scheduled posts" — exported (Phase
 * 15) so it can be unit-tested directly as a pure function, the same
 * way buildFilter above is, without needing a live database
 * connection (see blog.repository.test.ts).
 *
 * `{ $type: 'date', $lte: now }` (rather than just `$lte: now`) is
 * deliberate: MongoDB's BSON type ordering sorts `null` *before* all
 * dates, so a plain `$lte` would incorrectly match documents whose
 * `scheduledAt` is `null` too. `$type: 'date'` rules that out
 * explicitly, rather than relying on comparison-operator ordering
 * trivia to keep this query correct. `$lte` (not `$lt`) is also
 * deliberate: the documented semantic is "due when scheduledAt <=
 * now," so a post scheduled for exactly `now` is eligible, not
 * skipped for one more cycle.
 */
export function buildDueScheduledFilter(now: Date): Filter<BlogDocument> {
  return {
    status: 'draft',
    scheduledAt: { $type: 'date', $lte: now },
    deletedAt: null,
  }
}

/**
 * The atomic pipeline-style update that publishes a due scheduled
 * post — also exported for the same pure-testability reason. An array
 * (a pipeline, supported since MongoDB 4.2) rather than a plain `$set`
 * object lets `publishedAt` be set *from the document's own
 * `scheduledAt` value* within the same atomic operation, so there's
 * no separate read-then-write step for a second scheduler cycle (or a
 * second process, in a multi-instance deployment) to race against.
 *
 * `now` is passed in (not read via Mongo's own `$$NOW`) so every
 * scheduled post published in one cycle gets the exact same
 * `updatedAt`, from one clock (the caller's), rather than mixing the
 * caller's `now` for the filter with the database server's own clock
 * for the write. `publishedAt` never uses `now` at all — it always
 * comes from `'$scheduledAt'`, the one invariant this whole feature
 * exists to guarantee (see the Phase 14/15 reports).
 */
export function buildDueScheduledPublishPipeline(now: Date): Document[] {
  return [
    {
      $set: {
        status: 'published',
        publishedAt: '$scheduledAt',
        scheduledAt: null,
        updatedAt: now,
      },
    },
  ]
}

/**
 * Atomically publishes every scheduled draft whose `scheduledAt` has
 * arrived (Phase 14, Part 5/6). The `status: 'draft'` clause in
 * buildDueScheduledFilter is itself what makes a concurrent duplicate
 * run safe without any extra locking: once one operation flips a
 * document's status to `'published'`, that document no longer matches
 * the filter, so a second concurrent call simply doesn't touch it
 * again.
 */
export async function publishDueScheduledBlogs(now: Date): Promise<number> {
  const result = await collection().updateMany(
    buildDueScheduledFilter(now),
    buildDueScheduledPublishPipeline(now),
  )
  return result.modifiedCount
}
