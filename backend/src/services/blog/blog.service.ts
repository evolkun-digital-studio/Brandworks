import {
  countBlogs,
  createBlog,
  findBlogById,
  findBlogBySlug,
  listBlogs,
  softDeleteBlogById,
  restoreBlogById,
  setBlogScheduledAt,
  setBlogStatus,
  updateBlogById,
} from '../../repositories/blog.repository.js'
import type { BlogQueryFilter } from '../../repositories/blog.repository.js'
import { slugify } from '../../lib/slugify.js'
import {
  validateAiContext,
  validateCallouts,
  validateCanonicalUrl,
  validateContent,
  validateCoverImage,
  validateCoverImageAlt,
  validateCustomMetaTags,
  validateEntitySeo,
  validateExcerpt,
  validateExpertQuote,
  validateFaqItems,
  validateKeyTakeaways,
  validateOgImage,
  validateOptionalBoolean,
  validateOptionalString,
  validatePublishedAtInput,
  validateScheduledAtInput,
  validateSecondaryKeywords,
  validateSeoDescription,
  validateSeoTitle,
  validateSlugFormat,
  validateTags,
  validateTitle,
  validateTwitterCard,
  AI_SUMMARY_MAX_LENGTH,
  CATEGORY_MAX_LENGTH,
  COVER_IMAGE_CAPTION_MAX_LENGTH,
  COVER_IMAGE_DESCRIPTION_MAX_LENGTH,
  COVER_IMAGE_TITLE_MAX_LENGTH,
  FOCUS_KEYWORD_MAX_LENGTH,
  OG_DESCRIPTION_MAX_LENGTH,
  OG_TITLE_MAX_LENGTH,
} from '../../lib/blogValidators.js'
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js'
import type { AdminDocument } from '../../types/admin.js'
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
} from '../../types/blog.js'

/**
 * Owns every blog business rule (workflow, authorship, slug
 * uniqueness, permissions). The repository underneath has none of
 * this — it only knows how to read/write documents. `actor` is always
 * the database-verified admin from requireAdminAuth, never anything
 * client-supplied, so authorization here can't be bypassed by
 * tampering with a request body.
 */

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/

/**
 * Stricter than the repository's own `ObjectId.isValid` (which also
 * accepts arbitrary 12-byte strings, not just 24-char hex) — this is
 * the boundary that should turn a malformed id into a clean 400
 * rather than let a look-alike value fall through to a 404.
 */
function assertValidObjectId(id: string): void {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw badRequest('Invalid blog id.')
  }
}

function assertIsAdmin(actor: AdminDocument): void {
  if (actor.role !== 'admin') {
    throw forbidden('Only admins can perform this action.')
  }
}

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR_CODE
  )
}

const VALID_STATUSES: BlogStatus[] = ['draft', 'published', 'unpublished']

function assertValidStatus(status: string): asserts status is BlogStatus {
  if (!VALID_STATUSES.includes(status as BlogStatus)) {
    throw badRequest(`Status must be one of: ${VALID_STATUSES.join(', ')}.`)
  }
}

// ---------------------------------------------------------------------------
// Phase 6 — structured content + SEO metadata (shared by create + update)
// ---------------------------------------------------------------------------

/**
 * Every Phase 6 field is independently optional and `unknown` here —
 * the controller does no shape-checking on these (see
 * controllers/admin/blog.controller.ts), it just forwards whatever
 * the client sent; all real validation happens below.
 */
export interface StructuredFieldsInput {
  coverImageTitle?: unknown
  coverImageCaption?: unknown
  coverImageDescription?: unknown
  category?: unknown
  tags?: unknown
  aiSummary?: unknown
  keyTakeaways?: unknown
  aiContext?: unknown
  entitySeo?: unknown
  faq?: unknown
  expertQuote?: unknown
  callouts?: unknown
  focusKeyword?: unknown
  secondaryKeywords?: unknown
  canonicalUrl?: unknown
  robotsIndex?: unknown
  ogTitle?: unknown
  ogDescription?: unknown
  ogImage?: unknown
  twitterCard?: unknown
  breadcrumbEnabled?: unknown
  customMetaTags?: unknown
}

interface StructuredFieldsPatch {
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
}

/**
 * Validates only the fields actually present on `input` (each one is
 * independently optional) and returns a patch containing just those —
 * an omitted field stays entirely absent from the result. That's what
 * lets the exact same function serve both createBlogPost (the
 * repository fills in defaults for whatever's missing — see
 * repositories/blog.repository.ts's createBlog) and updateBlogPost (a
 * genuine partial patch, same spirit as the pre-existing
 * title/excerpt/etc. handling just below it). Throws badRequest on
 * the first invalid field, same convention as every other validator
 * call in this file.
 */
function validateStructuredFields(input: StructuredFieldsInput): StructuredFieldsPatch {
  const patch: StructuredFieldsPatch = {}

  if (input.coverImageTitle !== undefined) {
    const r = validateOptionalString(input.coverImageTitle, 'Cover image title', COVER_IMAGE_TITLE_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.coverImageTitle = r.value
  }
  if (input.coverImageCaption !== undefined) {
    const r = validateOptionalString(
      input.coverImageCaption,
      'Cover image caption',
      COVER_IMAGE_CAPTION_MAX_LENGTH,
    )
    if (r.error) throw badRequest(r.error)
    patch.coverImageCaption = r.value
  }
  if (input.coverImageDescription !== undefined) {
    const r = validateOptionalString(
      input.coverImageDescription,
      'Cover image description',
      COVER_IMAGE_DESCRIPTION_MAX_LENGTH,
    )
    if (r.error) throw badRequest(r.error)
    patch.coverImageDescription = r.value
  }
  if (input.category !== undefined) {
    const r = validateOptionalString(input.category, 'Category', CATEGORY_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.category = r.value
  }
  if (input.tags !== undefined) {
    const r = validateTags(input.tags)
    if (r.error) throw badRequest(r.error)
    patch.tags = r.value
  }
  if (input.aiSummary !== undefined) {
    const r = validateOptionalString(input.aiSummary, 'AI summary', AI_SUMMARY_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.aiSummary = r.value
  }
  if (input.keyTakeaways !== undefined) {
    const r = validateKeyTakeaways(input.keyTakeaways)
    if (r.error) throw badRequest(r.error)
    patch.keyTakeaways = r.value
  }
  if (input.aiContext !== undefined) {
    const r = validateAiContext(input.aiContext)
    if (r.error) throw badRequest(r.error)
    patch.aiContext = r.value
  }
  if (input.entitySeo !== undefined) {
    const r = validateEntitySeo(input.entitySeo)
    if (r.error) throw badRequest(r.error)
    patch.entitySeo = r.value
  }
  if (input.faq !== undefined) {
    const r = validateFaqItems(input.faq)
    if (r.error) throw badRequest(r.error)
    patch.faq = r.value
  }
  if (input.expertQuote !== undefined) {
    const r = validateExpertQuote(input.expertQuote)
    if (r.error) throw badRequest(r.error)
    patch.expertQuote = r.value
  }
  if (input.callouts !== undefined) {
    const r = validateCallouts(input.callouts)
    if (r.error) throw badRequest(r.error)
    patch.callouts = r.value
  }
  if (input.focusKeyword !== undefined) {
    const r = validateOptionalString(input.focusKeyword, 'Focus keyword', FOCUS_KEYWORD_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.focusKeyword = r.value
  }
  if (input.secondaryKeywords !== undefined) {
    const r = validateSecondaryKeywords(input.secondaryKeywords)
    if (r.error) throw badRequest(r.error)
    patch.secondaryKeywords = r.value
  }
  if (input.canonicalUrl !== undefined) {
    const r = validateCanonicalUrl(input.canonicalUrl)
    if (r.error) throw badRequest(r.error)
    patch.canonicalUrl = r.value
  }
  if (input.robotsIndex !== undefined) {
    const r = validateOptionalBoolean(input.robotsIndex, 'Robots index', true)
    if (r.error) throw badRequest(r.error)
    patch.robotsIndex = r.value
  }
  if (input.ogTitle !== undefined) {
    const r = validateOptionalString(input.ogTitle, 'Open Graph title', OG_TITLE_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.ogTitle = r.value
  }
  if (input.ogDescription !== undefined) {
    const r = validateOptionalString(input.ogDescription, 'Open Graph description', OG_DESCRIPTION_MAX_LENGTH)
    if (r.error) throw badRequest(r.error)
    patch.ogDescription = r.value
  }
  if (input.ogImage !== undefined) {
    const r = validateOgImage(input.ogImage)
    if (r.error) throw badRequest(r.error)
    patch.ogImage = r.value
  }
  if (input.twitterCard !== undefined) {
    const r = validateTwitterCard(input.twitterCard)
    if (r.error) throw badRequest(r.error)
    patch.twitterCard = r.value
  }
  if (input.breadcrumbEnabled !== undefined) {
    const r = validateOptionalBoolean(input.breadcrumbEnabled, 'Breadcrumb enabled', true)
    if (r.error) throw badRequest(r.error)
    patch.breadcrumbEnabled = r.value
  }
  if (input.customMetaTags !== undefined) {
    const r = validateCustomMetaTags(input.customMetaTags)
    if (r.error) throw badRequest(r.error)
    patch.customMetaTags = r.value
  }

  return patch
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateBlogPostInput extends StructuredFieldsInput {
  title: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  /** Optional — auto-generated from title via slugify() when omitted. */
  slug?: string
  seoTitle?: string | null
  seoDescription?: string | null
  /**
   * Editor-chosen publish date, before first publication only (Phase
   * 6). A date string, or omitted/null for the default behavior
   * (first `published` transition sets it to that moment — see
   * setBlogPostStatus). Never accepted through updateBlogPost.
   */
  publishedAt?: string | null
}

export async function createBlogPost(
  actor: AdminDocument,
  input: CreateBlogPostInput,
): Promise<BlogDocument> {
  // Both roles can create — see routes/admin/blog.routes.ts.

  const titleError = validateTitle(input.title)
  if (titleError) throw badRequest(titleError)

  const excerptError = validateExcerpt(input.excerpt)
  if (excerptError) throw badRequest(excerptError)

  const contentError = validateContent(input.content)
  if (contentError) throw badRequest(contentError)

  const coverImageError = validateCoverImage(input.coverImage)
  if (coverImageError) throw badRequest(coverImageError)

  const altError = validateCoverImageAlt(input.coverImageAlt)
  if (altError) throw badRequest(altError)

  if (input.seoTitle) {
    const seoTitleError = validateSeoTitle(input.seoTitle)
    if (seoTitleError) throw badRequest(seoTitleError)
  }
  if (input.seoDescription) {
    const seoDescriptionError = validateSeoDescription(input.seoDescription)
    if (seoDescriptionError) throw badRequest(seoDescriptionError)
  }

  // A client-supplied slug is normalized through the same slugify()
  // used to derive one from the title — not blindly trusted as-is.
  const slug = slugify(input.slug && input.slug.trim().length > 0 ? input.slug : input.title)
  const slugError = validateSlugFormat(slug)
  if (slugError) throw badRequest(slugError)

  await assertSlugAvailable(slug)

  const structured = validateStructuredFields(input)

  const publishedAtResult = validatePublishedAtInput(input.publishedAt)
  if (publishedAtResult.error) throw badRequest(publishedAtResult.error)

  try {
    return await createBlog({
      title: input.title,
      slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage,
      coverImageAlt: input.coverImageAlt,
      // Authorship always comes from the authenticated session — never
      // from the request body (see the type for CreateBlogPostInput,
      // which has no authorId/authorName field at all).
      authorId: actor._id,
      authorName: actor.username,
      // New posts always start as drafts — not client-controlled.
      status: 'draft',
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      // Editor-chosen date, before first publication — see the field
      // comment on CreateBlogPostInput.publishedAt. setBlogPostStatus's
      // existing "first publish sets publishedAt" logic already treats
      // a non-null publishedAt as "already set", so this can't be
      // overwritten by a later publish — no change needed there.
      publishedAt: publishedAtResult.value,
      ...structured,
    })
  } catch (error) {
    // Closes the race window between assertSlugAvailable's check above
    // and this insert — the unique index is the real guarantee.
    if (isDuplicateKeyError(error)) {
      throw conflict('That slug is already in use.')
    }
    throw error
  }
}

/**
 * The service-layer half of slug-uniqueness: a friendly pre-check
 * (checked against deleted posts too, since a soft-deleted document
 * still holds its slug in the unique index — the DB unique index has
 * no idea about `deletedAt`). This pre-check is a UX nicety, not the
 * actual guarantee: the database's unique index is what actually
 * prevents a race between two concurrent requests, so createBlogPost
 * and updateBlogPost's callers also catch a raw Mongo error code
 * 11000 as a fallback (see MONGO_DUPLICATE_KEY_ERROR_CODE below).
 */
async function assertSlugAvailable(slug: string, excludingId?: string): Promise<void> {
  const existing = await findBlogBySlug(slug, { includeDeleted: true })
  if (existing && existing._id.toHexString() !== excludingId) {
    throw conflict('That slug is already in use.')
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getBlogPostForAdmin(id: string): Promise<BlogDocument> {
  assertValidObjectId(id)
  // Always includes soft-deleted posts — a targeted fetch by exact id
  // is a deliberate admin-management action (e.g. reviewing a post
  // before deciding whether to restore it), not accidental trash
  // browsing, so no extra flag is needed here (contrast listBlogPostsForAdmin).
  const blog = await findBlogById(id, { includeDeleted: true })
  if (!blog) throw notFound('Blog post not found.')
  return blog
}

export interface ListBlogPostsQuery {
  status?: string
  /**
   * "Scheduled" (Phase 16) is a distinct filter dimension, not a
   * fourth `BlogStatus` value — see this function's own handling
   * below and the Phase 16 report's data-model rationale. Mutually
   * exclusive with `status`: sending both is rejected rather than
   * silently picking a winner (Part 9 — "should not produce a
   * contradictory query").
   */
  scheduled?: boolean
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}

export interface ListBlogPostsResult {
  items: BlogDocument[]
  page: number
  limit: number
  total: number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

export async function listBlogPostsForAdmin(
  actor: AdminDocument,
  query: ListBlogPostsQuery,
): Promise<ListBlogPostsResult> {
  // Status filtering and search are open to both roles; only viewing
  // deleted posts is admin-only (sub-admins "see all non-deleted
  // posts" per the Phase 2 spec). Same for `scheduled` (Phase 16) —
  // it's just another read-only filter on the same list, open to
  // whichever role could already see BlogList.
  if (query.includeDeleted) {
    assertIsAdmin(actor)
  }

  if (query.scheduled && query.status) {
    throw badRequest('scheduled and status cannot both be specified.')
  }

  let status: BlogStatus | undefined
  if (query.status) {
    assertValidStatus(query.status)
    status = query.status
  }

  const page = Number.isFinite(query.page) && (query.page as number) > 0 ? Math.floor(query.page as number) : 1
  const limit =
    Number.isFinite(query.limit) && (query.limit as number) > 0
      ? Math.min(Math.floor(query.limit as number), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  const search = query.search?.trim() || undefined

  // Phase 16, Part 5/9: `scheduled: true` always means "status=draft,
  // a real future scheduledAt, never deleted" — regardless of any
  // `includeDeleted` the caller also passed (the spec is explicit:
  // "the query must NOT include ... deleted posts"), while still
  // composing with `search` (Part 9: "Scheduled + 'SEO'" must work).
  const filter: BlogQueryFilter = query.scheduled
    ? { status: 'draft', scheduledAfter: new Date(), includeDeleted: false, search }
    : { status, includeDeleted: query.includeDeleted ?? false, search }

  const [items, total] = await Promise.all([
    listBlogs({
      ...filter,
      skip: (page - 1) * limit,
      limit,
      // Phase 16, Part 10: the Scheduled view sorts by what's
      // publishing next; every other view keeps its existing order.
      sort: query.scheduled ? { scheduledAt: 1 } : { createdAt: -1 },
    }),
    countBlogs(filter),
  ])

  return {
    items,
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  }
}

/**
 * The Phase 16 dashboard count — the exact same eligibility rule as
 * the Scheduled list filter above (status=draft, real future
 * scheduledAt, never deleted), just counted instead of paginated. Open
 * to both roles, same as the list filter; no dedicated aggregation
 * pipeline needed since `countBlogs` (repositories/blog.repository.ts)
 * already exists and this is a single, already-indexed-enough query.
 */
export async function countScheduledBlogPosts(): Promise<number> {
  return countBlogs({ status: 'draft', scheduledAfter: new Date(), includeDeleted: false })
}

// ---------------------------------------------------------------------------
// Update (content only — never status/publishedAt/author/timestamps)
// ---------------------------------------------------------------------------

export interface UpdateBlogPostInput extends StructuredFieldsInput {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  coverImage?: string
  coverImageAlt?: string
  seoTitle?: string | null
  seoDescription?: string | null
  // Deliberately no `publishedAt` field — see this file's header
  // comment and CreateBlogPostInput.publishedAt. Once a post exists,
  // its publish date changes only via the status endpoint (first
  // publish) or never again.
}

export async function updateBlogPost(
  id: string,
  input: UpdateBlogPostInput,
): Promise<BlogDocument> {
  assertValidObjectId(id)

  // A soft-deleted post isn't editable directly — restore it first.
  // Keeps "editing something in the trash" from ever being a state
  // anyone has to reason about.
  const existing = await findBlogById(id)
  if (!existing) throw notFound('Blog post not found.')

  const patch: Record<string, unknown> = {}

  if (input.title !== undefined) {
    const error = validateTitle(input.title)
    if (error) throw badRequest(error)
    patch.title = input.title
    // Deliberately NOT re-deriving the slug here even though the
    // title changed — see updateSlugIfProvided below. A manually (or
    // previously auto-) chosen slug is never silently changed by a
    // title edit.
  }

  if (input.excerpt !== undefined) {
    const error = validateExcerpt(input.excerpt)
    if (error) throw badRequest(error)
    patch.excerpt = input.excerpt
  }

  if (input.content !== undefined) {
    const error = validateContent(input.content)
    if (error) throw badRequest(error)
    patch.content = input.content
  }

  if (input.coverImage !== undefined) {
    const error = validateCoverImage(input.coverImage)
    if (error) throw badRequest(error)
    patch.coverImage = input.coverImage
  }

  if (input.coverImageAlt !== undefined) {
    const error = validateCoverImageAlt(input.coverImageAlt)
    if (error) throw badRequest(error)
    patch.coverImageAlt = input.coverImageAlt
  }

  if (input.seoTitle !== undefined) {
    if (input.seoTitle !== null) {
      const error = validateSeoTitle(input.seoTitle)
      if (error) throw badRequest(error)
    }
    patch.seoTitle = input.seoTitle
  }

  if (input.seoDescription !== undefined) {
    if (input.seoDescription !== null) {
      const error = validateSeoDescription(input.seoDescription)
      if (error) throw badRequest(error)
    }
    patch.seoDescription = input.seoDescription
  }

  if (input.slug !== undefined) {
    const normalized = slugify(input.slug)
    const slugError = validateSlugFormat(normalized)
    if (slugError) throw badRequest(slugError)

    if (normalized !== existing.slug) {
      await assertSlugAvailable(normalized, id)
      patch.slug = normalized
    }
  }

  // Note: authorName/authorId are never read from `input` at all —
  // there is no such field on UpdateBlogPostInput — so the original
  // author is preserved no matter who performs this edit.

  Object.assign(patch, validateStructuredFields(input))

  try {
    const updated = await updateBlogById(id, patch)
    if (!updated) throw notFound('Blog post not found.')
    return updated
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('That slug is already in use.')
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function setBlogPostStatus(
  id: string,
  nextStatus: string,
): Promise<BlogDocument> {
  assertValidObjectId(id)
  assertValidStatus(nextStatus)

  const existing = await findBlogById(id)
  if (!existing) throw notFound('Blog post not found.')

  // First publish sets publishedAt; every later transition (in either
  // direction) leaves it exactly as it was. No state-machine
  // restriction — any status may move to any other, per the Phase 2
  // spec ("do not unnecessarily enforce a strict linear state machine").
  // This also covers Phase 14 Part 8's "publish before the scheduled
  // time" case exactly as specified: publishedAt is set to *now* only
  // if the post has never been published before; scheduledAt is
  // cleared below regardless.
  const publishedAt =
    nextStatus === 'published' && existing.publishedAt === null
      ? new Date()
      : existing.publishedAt

  // Phase 14, Part 8: any *manual* status change cancels a pending
  // schedule — the admin has explicitly chosen an immediate status
  // rather than waiting for the pending future one. The scheduler's
  // own transition to `published` never goes through this function
  // (see publishBlogPostsDue below), so this never interferes with it.
  const updated = await setBlogStatus(id, nextStatus, publishedAt, { clearScheduledAt: true })
  if (!updated) throw notFound('Blog post not found.')
  return updated
}

// ---------------------------------------------------------------------------
// Scheduling (Phase 14)
// ---------------------------------------------------------------------------

/**
 * Schedules a not-yet-published post to publish automatically at a
 * future date (Part 1/3). Deliberately does not introduce a fourth
 * `BlogStatus` value — a "scheduled" post is represented as
 * `status: 'draft'` with `scheduledAt` set, which is exactly what
 * Part 1's own data-model examples describe, and it keeps the public
 * visibility rule (`status === 'published'`) and the scheduler's own
 * query trivially simple: there is exactly one state that means
 * "pending schedule." Scheduling an `unpublished` post is allowed —
 * it's normalized into that same canonical `draft + scheduledAt`
 * representation (`forceStatus: 'draft'` below) rather than adding a
 * second state that would also need to mean "scheduled."
 *
 * Refuses to schedule an already-`published` post (Part 9): scheduling
 * has no sensible meaning for a post that's already live, and forcing
 * the caller through an explicit unpublish-then-schedule sequence is
 * what protects that post's historical `publishedAt` from ever being
 * casually touched by this code path.
 */
export async function scheduleBlogPost(id: string, scheduledAtInput: unknown): Promise<BlogDocument> {
  assertValidObjectId(id)

  const existing = await findBlogById(id)
  if (!existing) throw notFound('Blog post not found.')

  if (existing.status === 'published') {
    throw badRequest(
      'This post is already published. Unpublish it first if you want to schedule a future republish.',
    )
  }

  const result = validateScheduledAtInput(scheduledAtInput)
  if (result.error) throw badRequest(result.error)
  if (result.value === null) throw badRequest('A scheduled date is required.')

  const updated = await setBlogScheduledAt(id, result.value, 'draft')
  if (!updated) throw notFound('Blog post not found.')
  return updated
}

/** Cancels a pending schedule without otherwise changing the post's status (Part 3: "scheduled -> draft"). A no-op, not an error, if the post had no schedule. */
export async function unscheduleBlogPost(id: string): Promise<BlogDocument> {
  assertValidObjectId(id)

  const existing = await findBlogById(id)
  if (!existing) throw notFound('Blog post not found.')

  const updated = await setBlogScheduledAt(id, null)
  if (!updated) throw notFound('Blog post not found.')
  return updated
}

// ---------------------------------------------------------------------------
// Soft delete / restore — admin only
// ---------------------------------------------------------------------------

export async function softDeleteBlogPost(actor: AdminDocument, id: string): Promise<void> {
  assertIsAdmin(actor)
  assertValidObjectId(id)

  const existing = await findBlogById(id)
  if (!existing) throw notFound('Blog post not found.')

  await softDeleteBlogById(id)
}

export async function restoreBlogPost(actor: AdminDocument, id: string): Promise<BlogDocument> {
  assertIsAdmin(actor)
  assertValidObjectId(id)

  // Looks among deleted posts specifically — that's the whole point
  // of a restore. Status is untouched by restoreBlogById itself, so
  // "published -> deleted -> restore -> published" falls out for free.
  const existing = await findBlogById(id, { includeDeleted: true })
  if (!existing) throw notFound('Blog post not found.')

  // Phase 14, Part 7: a deleted article's scheduledAt is ignored by
  // the scheduler (it requires deletedAt === null) for as long as the
  // article stays deleted, but the scheduler runs on its own periodic
  // timer — if the scheduled time already passed while the post was
  // deleted, simply restoring it would leave it matching the
  // scheduler's query again, and the very next tick would publish it.
  // That's "publishing merely because the old schedule is in the
  // past," which the spec explicitly says not to do. Only that one
  // case clears the schedule; a still-future scheduledAt is left
  // untouched and will still fire normally, later, as originally set.
  const scheduleAlreadyExpired = Boolean(existing.scheduledAt && existing.scheduledAt.getTime() <= Date.now())

  const restored = await restoreBlogById(id, { clearScheduledAt: scheduleAlreadyExpired })
  if (!restored) throw notFound('Blog post not found.')
  return restored
}
