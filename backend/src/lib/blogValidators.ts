import type {
  AiContext,
  Callout,
  CalloutType,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  TwitterCardType,
} from '../types/blog.js'

/**
 * Server-side field validation for blog posts — this is the only
 * validation that matters; any client-side check is a convenience,
 * not a guarantee. Mirrors the style of lib/validators.ts (used by
 * admin/auth), kept in its own file since it's a distinct domain.
 */

export const TITLE_MAX_LENGTH = 200
export const EXCERPT_MAX_LENGTH = 500
export const CONTENT_MAX_LENGTH = 100_000
export const SLUG_MAX_LENGTH = 200
export const COVER_IMAGE_ALT_MAX_LENGTH = 300
export const SEO_TITLE_MAX_LENGTH = 200
export const SEO_DESCRIPTION_MAX_LENGTH = 300

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateTitle(title: string): string | null {
  if (title.trim().length === 0) return 'Title is required.'
  if (title.length > TITLE_MAX_LENGTH) {
    return `Title must be at most ${TITLE_MAX_LENGTH} characters.`
  }
  return null
}

export function validateExcerpt(excerpt: string): string | null {
  if (excerpt.trim().length === 0) return 'Excerpt is required.'
  if (excerpt.length > EXCERPT_MAX_LENGTH) {
    return `Excerpt must be at most ${EXCERPT_MAX_LENGTH} characters.`
  }
  return null
}

export function validateContent(content: string): string | null {
  if (content.trim().length === 0) return 'Content is required.'
  if (content.length > CONTENT_MAX_LENGTH) {
    return `Content must be at most ${CONTENT_MAX_LENGTH} characters.`
  }
  return null
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Accepts http/https URLs only. */
export function validateCoverImage(coverImage: string): string | null {
  if (coverImage.trim().length === 0) return 'Cover image is required.'
  if (!isHttpUrl(coverImage)) return 'Cover image must be a valid URL.'
  return null
}

export function validateCoverImageAlt(alt: string): string | null {
  if (alt.trim().length === 0) return 'Cover image alt text is required.'
  if (alt.length > COVER_IMAGE_ALT_MAX_LENGTH) {
    return `Cover image alt text must be at most ${COVER_IMAGE_ALT_MAX_LENGTH} characters.`
  }
  return null
}

/**
 * Validates an already-normalized (slugify()'d) slug. Format should
 * always pass since slugify() only ever produces lowercase
 * alphanumeric-and-hyphen output — this exists as an explicit
 * assertion (and a length cap) rather than blind trust in that.
 */
export function validateSlugFormat(slug: string): string | null {
  if (slug.length === 0) {
    return 'Slug could not be generated from the given title — please provide one.'
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return `Slug must be at most ${SLUG_MAX_LENGTH} characters.`
  }
  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens.'
  }
  return null
}

export function validateSeoTitle(value: string): string | null {
  if (value.length > SEO_TITLE_MAX_LENGTH) {
    return `SEO title must be at most ${SEO_TITLE_MAX_LENGTH} characters.`
  }
  return null
}

export function validateSeoDescription(value: string): string | null {
  if (value.length > SEO_DESCRIPTION_MAX_LENGTH) {
    return `SEO description must be at most ${SEO_DESCRIPTION_MAX_LENGTH} characters.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Phase 6 — structured content + SEO metadata
// ---------------------------------------------------------------------------

export const COVER_IMAGE_TITLE_MAX_LENGTH = 200
export const COVER_IMAGE_CAPTION_MAX_LENGTH = 500
export const COVER_IMAGE_DESCRIPTION_MAX_LENGTH = 1000
export const CATEGORY_MAX_LENGTH = 200
export const AI_SUMMARY_MAX_LENGTH = 300
export const KEY_TAKEAWAY_MAX_LENGTH = 300
export const KEY_TAKEAWAYS_MAX_ITEMS = 20
export const TAG_MAX_LENGTH = 100
export const TAGS_MAX_ITEMS = 20
export const AI_CONTEXT_FIELD_MAX_LENGTH = 100
export const MAIN_ENTITY_MAX_LENGTH = 200
export const ENTITY_MAX_LENGTH = 200
export const ABOUT_MAX_ITEMS = 20
export const MENTIONED_ENTITIES_MAX_ITEMS = 30
export const FAQ_MAX_ITEMS = 20
export const FAQ_QUESTION_MAX_LENGTH = 300
export const FAQ_ANSWER_MAX_LENGTH = 2000
export const EXPERT_QUOTE_MAX_LENGTH = 2000
export const EXPERT_QUOTE_NAME_MAX_LENGTH = 200
export const CALLOUT_TITLE_MAX_LENGTH = 200
export const CALLOUT_CONTENT_MAX_LENGTH = 2000
export const CALLOUTS_MAX_ITEMS = 20
export const FOCUS_KEYWORD_MAX_LENGTH = 200
export const SECONDARY_KEYWORD_MAX_LENGTH = 200
export const SECONDARY_KEYWORDS_MAX_ITEMS = 30
export const OG_TITLE_MAX_LENGTH = 200
export const OG_DESCRIPTION_MAX_LENGTH = 500
export const CUSTOM_META_TAGS_MAX_ITEMS = 20
export const CUSTOM_META_TAG_NAME_MAX_LENGTH = 100
export const CUSTOM_META_TAG_CONTENT_MAX_LENGTH = 1000

interface FieldResult<T> {
  value: T
  error: string | null
}

function ok<T>(value: T): FieldResult<T> {
  return { value, error: null }
}

function fail<T>(fallback: T, error: string): FieldResult<T> {
  return { value: fallback, error }
}

/** A plain optional string field: undefined -> null, else validated + length-capped. */
export function validateOptionalString(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
): FieldResult<string | null> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'string') return fail(null, `${fieldLabel} must be text.`)
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok(null)
  if (trimmed.length > maxLength) {
    return fail(null, `${fieldLabel} must be at most ${maxLength} characters.`)
  }
  return ok(trimmed)
}

export function validateOptionalHttpUrl(
  value: unknown,
  fieldLabel: string,
): FieldResult<string | null> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'string') return fail(null, `${fieldLabel} must be text.`)
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok(null)
  if (!isHttpUrl(trimmed)) return fail(null, `${fieldLabel} must be a valid URL.`)
  return ok(trimmed)
}

export function validateOptionalBoolean(
  value: unknown,
  fieldLabel: string,
  fallback: boolean,
): FieldResult<boolean> {
  if (value === undefined) return ok(fallback)
  if (typeof value !== 'boolean') return fail(fallback, `${fieldLabel} must be true or false.`)
  return ok(value)
}

interface StringArrayOptions {
  fieldLabel: string
  maxItems: number
  maxItemLength: number
  /** Dedupe ignoring case (tags); defaults to exact-match dedupe. */
  caseInsensitiveDedupe?: boolean
}

/**
 * Shared normalizer for every simple string-array field (tags,
 * secondaryKeywords, about, mentionedEntities): validates it's an
 * array of strings, trims each entry, drops empty ones, removes
 * duplicates (preserving the first occurrence's casing), and caps
 * length — one implementation instead of four near-identical ones.
 */
export function validateStringArray(
  value: unknown,
  options: StringArrayOptions,
): FieldResult<string[]> {
  if (value === undefined) return ok([])
  if (!Array.isArray(value)) return fail([], `${options.fieldLabel} must be a list.`)

  const cleaned: string[] = []
  const seen = new Set<string>()

  for (const raw of value) {
    if (typeof raw !== 'string') {
      return fail([], `Each ${options.fieldLabel} entry must be text.`)
    }
    const trimmed = raw.trim()
    if (trimmed.length === 0) continue
    if (trimmed.length > options.maxItemLength) {
      return fail(
        [],
        `Each ${options.fieldLabel} entry must be at most ${options.maxItemLength} characters.`,
      )
    }
    const dedupeKey = options.caseInsensitiveDedupe ? trimmed.toLowerCase() : trimmed
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    cleaned.push(trimmed)
  }

  if (cleaned.length > options.maxItems) {
    return fail([], `${options.fieldLabel} must have at most ${options.maxItems} entries.`)
  }

  return ok(cleaned)
}

export function validateTags(value: unknown): FieldResult<string[]> {
  return validateStringArray(value, {
    fieldLabel: 'Tag',
    maxItems: TAGS_MAX_ITEMS,
    maxItemLength: TAG_MAX_LENGTH,
    caseInsensitiveDedupe: true,
  })
}

export function validateKeyTakeaways(value: unknown): FieldResult<string[]> {
  return validateStringArray(value, {
    fieldLabel: 'Key takeaway',
    maxItems: KEY_TAKEAWAYS_MAX_ITEMS,
    maxItemLength: KEY_TAKEAWAY_MAX_LENGTH,
  })
}

export function validateSecondaryKeywords(value: unknown): FieldResult<string[]> {
  return validateStringArray(value, {
    fieldLabel: 'Secondary keyword',
    maxItems: SECONDARY_KEYWORDS_MAX_ITEMS,
    maxItemLength: SECONDARY_KEYWORD_MAX_LENGTH,
    caseInsensitiveDedupe: true,
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Suggested-only values (Phase 6 spec, section 8) — deliberately not a
 * hard enum. Any reasonably short string is accepted so this stays a
 * flexible editorial field rather than a constraint the CMS enforces.
 */
export function validateAiContext(value: unknown): FieldResult<AiContext | null> {
  if (value === undefined || value === null) return ok(null)
  if (!isPlainObject(value)) return fail(null, 'AI context must be an object.')

  const targetCountry = validateOptionalString(value.targetCountry, 'Target country', AI_CONTEXT_FIELD_MAX_LENGTH)
  if (targetCountry.error) return fail(null, targetCountry.error)
  const targetLanguage = validateOptionalString(value.targetLanguage, 'Target language', AI_CONTEXT_FIELD_MAX_LENGTH)
  if (targetLanguage.error) return fail(null, targetLanguage.error)
  const targetAudience = validateOptionalString(value.targetAudience, 'Target audience', AI_CONTEXT_FIELD_MAX_LENGTH)
  if (targetAudience.error) return fail(null, targetAudience.error)
  const contentType = validateOptionalString(value.contentType, 'Content type', AI_CONTEXT_FIELD_MAX_LENGTH)
  if (contentType.error) return fail(null, contentType.error)
  const contentIntent = validateOptionalString(value.contentIntent, 'Content intent', AI_CONTEXT_FIELD_MAX_LENGTH)
  if (contentIntent.error) return fail(null, contentIntent.error)

  const context: AiContext = {
    targetCountry: targetCountry.value,
    targetLanguage: targetLanguage.value,
    targetAudience: targetAudience.value,
    contentType: contentType.value,
    contentIntent: contentIntent.value,
  }

  // An entirely empty object is stored as null rather than an object of five nulls.
  const isEmpty = Object.values(context).every((v) => v === null)
  return ok(isEmpty ? null : context)
}

export function validateEntitySeo(value: unknown): FieldResult<EntitySeo | null> {
  if (value === undefined || value === null) return ok(null)
  if (!isPlainObject(value)) return fail(null, 'Entity SEO must be an object.')

  const mainEntity = validateOptionalString(value.mainEntity, 'Main entity', MAIN_ENTITY_MAX_LENGTH)
  if (mainEntity.error) return fail(null, mainEntity.error)

  const about = validateStringArray(value.about, {
    fieldLabel: 'About',
    maxItems: ABOUT_MAX_ITEMS,
    maxItemLength: ENTITY_MAX_LENGTH,
  })
  if (about.error) return fail(null, about.error)

  const mentionedEntities = validateStringArray(value.mentionedEntities, {
    fieldLabel: 'Mentioned entity',
    maxItems: MENTIONED_ENTITIES_MAX_ITEMS,
    maxItemLength: ENTITY_MAX_LENGTH,
  })
  if (mentionedEntities.error) return fail(null, mentionedEntities.error)

  if (mainEntity.value === null && about.value.length === 0 && mentionedEntities.value.length === 0) {
    return ok(null)
  }

  return ok({ mainEntity: mainEntity.value, about: about.value, mentionedEntities: mentionedEntities.value })
}

export function validateFaqItems(value: unknown): FieldResult<FaqItem[]> {
  if (value === undefined) return ok([])
  if (!Array.isArray(value)) return fail([], 'FAQ must be a list.')
  if (value.length > FAQ_MAX_ITEMS) {
    return fail([], `FAQ must have at most ${FAQ_MAX_ITEMS} items.`)
  }

  const items: FaqItem[] = []
  for (const raw of value) {
    if (!isPlainObject(raw)) return fail([], 'Each FAQ item must be an object.')
    const question = typeof raw.question === 'string' ? raw.question.trim() : ''
    const answer = typeof raw.answer === 'string' ? raw.answer.trim() : ''
    if (!question) return fail([], 'Each FAQ item requires a question.')
    if (question.length > FAQ_QUESTION_MAX_LENGTH) {
      return fail([], `Each FAQ question must be at most ${FAQ_QUESTION_MAX_LENGTH} characters.`)
    }
    if (!answer) return fail([], 'Each FAQ item requires an answer.')
    if (answer.length > FAQ_ANSWER_MAX_LENGTH) {
      return fail([], `Each FAQ answer must be at most ${FAQ_ANSWER_MAX_LENGTH} characters.`)
    }
    items.push({ question, answer })
  }
  return ok(items)
}

export function validateExpertQuote(value: unknown): FieldResult<ExpertQuote | null> {
  if (value === undefined || value === null) return ok(null)
  if (!isPlainObject(value)) return fail(null, 'Expert quote must be an object.')

  const quote = typeof value.quote === 'string' ? value.quote.trim() : ''
  const personName = typeof value.personName === 'string' ? value.personName.trim() : ''
  const organization = typeof value.organization === 'string' ? value.organization.trim() : ''

  // An entirely empty submission (e.g. the admin opened the section and
  // left it blank) is treated as "no quote" rather than a validation error.
  if (!quote && !personName && !organization) return ok(null)

  if (!quote) return fail(null, 'Expert quote text is required.')
  if (quote.length > EXPERT_QUOTE_MAX_LENGTH) {
    return fail(null, `Expert quote must be at most ${EXPERT_QUOTE_MAX_LENGTH} characters.`)
  }
  if (!personName) return fail(null, 'Expert quote person name is required.')
  if (personName.length > EXPERT_QUOTE_NAME_MAX_LENGTH) {
    return fail(null, `Expert quote person name must be at most ${EXPERT_QUOTE_NAME_MAX_LENGTH} characters.`)
  }
  if (!organization) return fail(null, 'Expert quote organization is required.')
  if (organization.length > EXPERT_QUOTE_NAME_MAX_LENGTH) {
    return fail(null, `Expert quote organization must be at most ${EXPERT_QUOTE_NAME_MAX_LENGTH} characters.`)
  }

  const role = validateOptionalString(value.role, 'Expert quote role', EXPERT_QUOTE_NAME_MAX_LENGTH)
  if (role.error) return fail(null, role.error)

  return ok({ quote, personName, organization, role: role.value })
}

const CALLOUT_TYPES: CalloutType[] = ['important', 'warning', 'tip', 'note']

export function validateCallouts(value: unknown): FieldResult<Callout[]> {
  if (value === undefined) return ok([])
  if (!Array.isArray(value)) return fail([], 'Callouts must be a list.')
  if (value.length > CALLOUTS_MAX_ITEMS) {
    return fail([], `Callouts must have at most ${CALLOUTS_MAX_ITEMS} items.`)
  }

  const items: Callout[] = []
  for (const raw of value) {
    if (!isPlainObject(raw)) return fail([], 'Each callout must be an object.')
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null
    if (!id) return fail([], 'Each callout requires an id.')
    if (typeof raw.type !== 'string' || !CALLOUT_TYPES.includes(raw.type as CalloutType)) {
      return fail([], `Callout type must be one of: ${CALLOUT_TYPES.join(', ')}.`)
    }
    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    const content = typeof raw.content === 'string' ? raw.content.trim() : ''
    if (!title) return fail([], 'Each callout requires a title.')
    if (title.length > CALLOUT_TITLE_MAX_LENGTH) {
      return fail([], `Each callout title must be at most ${CALLOUT_TITLE_MAX_LENGTH} characters.`)
    }
    if (!content) return fail([], 'Each callout requires content.')
    if (content.length > CALLOUT_CONTENT_MAX_LENGTH) {
      return fail([], `Each callout content must be at most ${CALLOUT_CONTENT_MAX_LENGTH} characters.`)
    }
    items.push({ id, type: raw.type as CalloutType, title, content })
  }
  return ok(items)
}

export function validateCanonicalUrl(value: unknown): FieldResult<string | null> {
  return validateOptionalHttpUrl(value, 'Canonical URL')
}

export function validateOgImage(value: unknown): FieldResult<string | null> {
  return validateOptionalHttpUrl(value, 'Open Graph image')
}

const TWITTER_CARD_TYPES: TwitterCardType[] = ['summary', 'summary_large_image', 'player']

export function validateTwitterCard(value: unknown): FieldResult<TwitterCardType | null> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'string' || !TWITTER_CARD_TYPES.includes(value as TwitterCardType)) {
    return fail(null, `Twitter card must be one of: ${TWITTER_CARD_TYPES.join(', ')}.`)
  }
  return ok(value as TwitterCardType)
}

export function validateCustomMetaTags(value: unknown): FieldResult<CustomMetaTag[]> {
  if (value === undefined) return ok([])
  if (!Array.isArray(value)) return fail([], 'Custom meta tags must be a list.')
  if (value.length > CUSTOM_META_TAGS_MAX_ITEMS) {
    return fail([], `Custom meta tags must have at most ${CUSTOM_META_TAGS_MAX_ITEMS} items.`)
  }

  const items: CustomMetaTag[] = []
  for (const raw of value) {
    if (!isPlainObject(raw)) return fail([], 'Each custom meta tag must be an object.')
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    const content = typeof raw.content === 'string' ? raw.content.trim() : ''
    if (!name) return fail([], 'Each custom meta tag requires a name.')
    if (name.length > CUSTOM_META_TAG_NAME_MAX_LENGTH) {
      return fail([], `Each custom meta tag name must be at most ${CUSTOM_META_TAG_NAME_MAX_LENGTH} characters.`)
    }
    if (!content) return fail([], 'Each custom meta tag requires content.')
    if (content.length > CUSTOM_META_TAG_CONTENT_MAX_LENGTH) {
      return fail([], `Each custom meta tag content must be at most ${CUSTOM_META_TAG_CONTENT_MAX_LENGTH} characters.`)
    }
    items.push({ name, content })
  }
  return ok(items)
}

export function validatePublishedAtInput(value: unknown): FieldResult<Date | null> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'string') return fail(null, 'Publish date must be a date string.')
  const trimmed = value.trim()
  if (!trimmed) return ok(null)
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return fail(null, 'Publish date is not a valid date.')
  return ok(parsed)
}

// Requires an explicit date, time, and timezone designator (Phase 14,
// Part 2 — "the frontend should send an explicit ISO-8601 timestamp")
// rather than accepting whatever loose format `new Date(...)` happens
// to parse. Fractional seconds are optional; the timezone may be `Z`
// or a numeric offset.
const ISO_8601_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/

/**
 * Stricter than validatePublishedAtInput above on purpose (Phase 14):
 * scheduling is a forward-looking commitment ("publish this in the
 * future"), so a malformed or past timestamp has to be rejected
 * outright rather than silently accepted — there's no equivalent
 * "well, whatever you meant, we'll take it" tolerance appropriate
 * here. Every JS `Date` (and therefore every MongoDB BSON Date this
 * produces) is stored as a UTC instant regardless of the offset in
 * the input string — never a locale-formatted string, and never
 * silently reinterpreted in another timezone.
 */
export function validateScheduledAtInput(value: unknown): FieldResult<Date | null> {
  if (value === undefined || value === null) return ok(null)
  if (typeof value !== 'string') return fail(null, 'Scheduled date must be an ISO-8601 date string.')
  const trimmed = value.trim()
  if (!trimmed) return ok(null)
  if (!ISO_8601_DATETIME_PATTERN.test(trimmed)) {
    return fail(null, 'Scheduled date must be an explicit ISO-8601 timestamp (e.g. 2026-10-01T10:00:00Z).')
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return fail(null, 'Scheduled date is not a valid date.')
  if (parsed.getTime() <= Date.now()) return fail(null, 'Scheduled date must be in the future.')
  return ok(parsed)
}
