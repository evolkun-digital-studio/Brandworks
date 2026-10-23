import type {
  AdminBlogPost,
  AiContext,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  TwitterCardType,
} from '../../../api/blogTypes'

/**
 * Convenience-only, independent of the backend's authoritative
 * slugify() — used purely for a live suggestion as the admin types a
 * title. The backend re-normalizes and validates whatever slug is
 * actually submitted.
 */
export function suggestSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SLUG_FORMAT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Field limits — these mirror the backend validators exactly.
export const TITLE_MAX = 200
export const EXCERPT_MAX = 500
export const CONTENT_MAX = 100_000
export const SLUG_MAX = 200
export const EDITOR_NAME_MAX = 100
export const SEO_TITLE_MAX = 200
export const SEO_DESCRIPTION_MAX = 300
export const COVER_IMAGE_TITLE_MAX = 200
export const COVER_IMAGE_CAPTION_MAX = 500
export const COVER_IMAGE_DESCRIPTION_MAX = 1000
export const CATEGORY_MAX = 200
export const TAG_MAX = 100
export const TAGS_MAX_ITEMS = 20
export const AI_SUMMARY_MAX = 300
export const KEY_TAKEAWAY_MAX = 300
export const KEY_TAKEAWAYS_MAX_ITEMS = 20
export const AI_CONTEXT_FIELD_MAX = 100
export const MAIN_ENTITY_MAX = 200
export const ENTITY_MAX = 200
export const ABOUT_MAX_ITEMS = 20
export const MENTIONED_ENTITIES_MAX_ITEMS = 30
export const EXPERT_QUOTE_MAX = 2000
export const EXPERT_QUOTE_NAME_MAX = 200
export const FOCUS_KEYWORD_MAX = 200
export const SECONDARY_KEYWORD_MAX = 200
export const SECONDARY_KEYWORDS_MAX_ITEMS = 30
export const OG_TITLE_MAX = 200
export const OG_DESCRIPTION_MAX = 500

export const CONTENT_TYPES = ['Article', 'Guide', 'Tutorial', 'How-to', 'News', 'Opinion', 'Review', 'Case Study', 'List', 'FAQ']
export const CONTENT_INTENTS = ['Informational', 'Commercial', 'Transactional', 'Navigational']
export const TWITTER_CARD_OPTIONS: TwitterCardType[] = ['summary', 'summary_large_image', 'player']

export interface FormState {
  title: string
  slug: string
  excerpt: string
  authorName: string
  coverImage: string
  coverImageAlt: string
  content: string
  seoTitle: string
  seoDescription: string

  coverImageTitle: string
  coverImageCaption: string
  coverImageDescription: string
  category: string
  tags: string[]
  /** yyyy-mm-dd for <input type="date"> — create mode only. */
  publishDate: string

  aiSummary: string
  keyTakeaways: string[]

  targetCountry: string
  targetLanguage: string
  targetAudience: string
  contentType: string
  contentIntent: string

  mainEntity: string
  about: string[]
  mentionedEntities: string[]

  faq: FaqItem[]

  expertQuoteText: string
  expertQuotePersonName: string
  expertQuoteOrganization: string
  expertQuoteRole: string

  focusKeyword: string
  secondaryKeywords: string[]
  canonicalUrl: string
  robotsIndex: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterCard: string
  breadcrumbEnabled: boolean
  customMetaTags: CustomMetaTag[]
}

export const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  authorName: '',
  coverImage: '',
  coverImageAlt: '',
  content: '',
  seoTitle: '',
  seoDescription: '',

  coverImageTitle: '',
  coverImageCaption: '',
  coverImageDescription: '',
  category: '',
  tags: [],
  publishDate: '',

  aiSummary: '',
  keyTakeaways: [],

  targetCountry: '',
  targetLanguage: '',
  targetAudience: '',
  contentType: '',
  contentIntent: '',

  mainEntity: '',
  about: [],
  mentionedEntities: [],

  faq: [],

  expertQuoteText: '',
  expertQuotePersonName: '',
  expertQuoteOrganization: '',
  expertQuoteRole: '',

  focusKeyword: '',
  secondaryKeywords: [],
  canonicalUrl: '',
  robotsIndex: true,
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterCard: '',
  breadcrumbEnabled: true,
  customMetaTags: [],
}

export function formFromPost(post: AdminBlogPost): FormState {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    authorName: post.authorName,
    coverImage: post.coverImage,
    coverImageAlt: post.coverImageAlt,
    content: post.content,
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',

    coverImageTitle: post.coverImageTitle ?? '',
    coverImageCaption: post.coverImageCaption ?? '',
    coverImageDescription: post.coverImageDescription ?? '',
    category: post.category ?? '',
    tags: post.tags,
    publishDate: post.publishedAt ? post.publishedAt.slice(0, 10) : '',

    aiSummary: post.aiSummary ?? '',
    keyTakeaways: post.keyTakeaways,

    targetCountry: post.aiContext?.targetCountry ?? '',
    targetLanguage: post.aiContext?.targetLanguage ?? '',
    targetAudience: post.aiContext?.targetAudience ?? '',
    contentType: post.aiContext?.contentType ?? '',
    contentIntent: post.aiContext?.contentIntent ?? '',

    mainEntity: post.entitySeo?.mainEntity ?? '',
    about: post.entitySeo?.about ?? [],
    mentionedEntities: post.entitySeo?.mentionedEntities ?? [],

    faq: post.faq,

    expertQuoteText: post.expertQuote?.quote ?? '',
    expertQuotePersonName: post.expertQuote?.personName ?? '',
    expertQuoteOrganization: post.expertQuote?.organization ?? '',
    expertQuoteRole: post.expertQuote?.role ?? '',

    focusKeyword: post.focusKeyword ?? '',
    secondaryKeywords: post.secondaryKeywords,
    canonicalUrl: post.canonicalUrl ?? '',
    robotsIndex: post.robotsIndex,
    ogTitle: post.ogTitle ?? '',
    ogDescription: post.ogDescription ?? '',
    ogImage: post.ogImage ?? '',
    twitterCard: post.twitterCard ?? '',
    breadcrumbEnabled: post.breadcrumbEnabled,
    customMetaTags: post.customMetaTags,
  }
}

/** Returns a user-facing message, or null if the form is valid enough to submit. */
export function validateForm(form: FormState): string | null {
  if (!form.title.trim()) return 'Add a title before saving.'
  if (form.title.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters.`
  if (!form.excerpt.trim()) return 'Add a short summary (excerpt) before saving.'
  if (form.excerpt.length > EXCERPT_MAX) return `Excerpt must be at most ${EXCERPT_MAX} characters.`
  if (!form.authorName.trim()) return 'Author name is required.'
  if (form.authorName.length > EDITOR_NAME_MAX) return `Author name must be at most ${EDITOR_NAME_MAX} characters.`
  if (!form.content.trim()) return 'Write something in the article before saving.'
  if (form.content.length > CONTENT_MAX) return `Content must be at most ${CONTENT_MAX} characters.`
  if (!form.coverImage.trim()) return 'Add a cover image before saving.'
  if (!isLikelyUrl(form.coverImage)) return 'Cover image must be a valid http(s) URL.'
  if (!form.coverImageAlt.trim()) return 'Describe the cover image (alt text) before saving.'
  if (form.coverImageAlt.length > 300) return 'Cover image alt text must be at most 300 characters.'
  if (form.slug.trim()) {
    if (form.slug.length > SLUG_MAX) return `Slug must be at most ${SLUG_MAX} characters.`
    if (!SLUG_FORMAT_PATTERN.test(form.slug)) {
      return 'Slug must contain only lowercase letters, numbers, and hyphens.'
    }
  }
  if (form.seoTitle.length > SEO_TITLE_MAX) return `SEO title must be at most ${SEO_TITLE_MAX} characters.`
  if (form.seoDescription.length > SEO_DESCRIPTION_MAX) return `SEO description must be at most ${SEO_DESCRIPTION_MAX} characters.`
  if (form.canonicalUrl.trim() && !isLikelyUrl(form.canonicalUrl.trim())) return 'Canonical URL must be a valid http(s) URL.'
  if (form.ogImage.trim() && !isLikelyUrl(form.ogImage.trim())) return 'Open Graph image must be a valid http(s) URL.'
  if (form.expertQuoteText.trim() || form.expertQuotePersonName.trim() || form.expertQuoteOrganization.trim()) {
    if (!form.expertQuoteText.trim()) return 'Expert quote text is required.'
    if (!form.expertQuotePersonName.trim()) return 'Expert quote person name is required.'
    if (!form.expertQuoteOrganization.trim()) return 'Expert quote organization is required.'
  }
  for (const item of form.faq) {
    if (!item.question.trim() || !item.answer.trim()) {
      return 'Every FAQ item needs both a question and an answer (or remove the empty one).'
    }
  }
  return null
}

export type InlineField = 'title' | 'slug' | 'excerpt' | 'authorName' | 'coverImage' | 'coverImageAlt' | 'content'

export function fieldError(form: FormState, field: InlineField): string | null {
  if (field === 'title') {
    if (!form.title.trim()) return 'A title is required.'
    if (form.title.length > TITLE_MAX) return `Keep the title under ${TITLE_MAX} characters.`
  }
  if (field === 'slug') {
    if (!form.slug.trim()) return 'A slug is required.'
    if (form.slug.length > SLUG_MAX) return `Keep the slug under ${SLUG_MAX} characters.`
    if (!SLUG_FORMAT_PATTERN.test(form.slug)) return 'Use lowercase letters, numbers, and hyphens.'
  }
  if (field === 'excerpt') {
    if (!form.excerpt.trim()) return 'A short summary is required.'
    if (form.excerpt.length > EXCERPT_MAX) return `Keep the summary under ${EXCERPT_MAX} characters.`
  }
  if (field === 'authorName') {
    if (!form.authorName.trim()) return 'Author name is required.'
    if (form.authorName.length > EDITOR_NAME_MAX) return `Keep the name under ${EDITOR_NAME_MAX} characters.`
  }
  if (field === 'content') {
    if (!form.content.trim()) return 'Write something in the article.'
    if (form.content.length > CONTENT_MAX) return `Keep the article under ${CONTENT_MAX.toLocaleString()} characters.`
  }
  if (field === 'coverImage') {
    if (!form.coverImage.trim()) return 'A cover image is required.'
    if (!isLikelyUrl(form.coverImage)) return 'Use a valid http(s) image URL.'
  }
  if (field === 'coverImageAlt' && !form.coverImageAlt.trim()) return 'Alt text is required for accessibility.'
  return null
}

export function buildAiContext(form: FormState): AiContext | null {
  const context: AiContext = {
    targetCountry: form.targetCountry.trim() || null,
    targetLanguage: form.targetLanguage.trim() || null,
    targetAudience: form.targetAudience.trim() || null,
    contentType: form.contentType.trim() || null,
    contentIntent: form.contentIntent.trim() || null,
  }
  const isEmpty = Object.values(context).every((v) => v === null)
  return isEmpty ? null : context
}

export function buildEntitySeo(form: FormState): EntitySeo | null {
  const mainEntity = form.mainEntity.trim() || null
  if (!mainEntity && form.about.length === 0 && form.mentionedEntities.length === 0) return null
  return { mainEntity, about: form.about, mentionedEntities: form.mentionedEntities }
}

export function buildExpertQuote(form: FormState): ExpertQuote | null {
  if (!form.expertQuoteText.trim() && !form.expertQuotePersonName.trim() && !form.expertQuoteOrganization.trim()) {
    return null
  }
  return {
    quote: form.expertQuoteText.trim(),
    personName: form.expertQuotePersonName.trim(),
    organization: form.expertQuoteOrganization.trim(),
    role: form.expertQuoteRole.trim() || null,
  }
}

/**
 * A `<input type="datetime-local">` value for an ISO timestamp, via the
 * Date object's own local getters — never string slicing, which would
 * shift the displayed hour by the visitor's UTC offset.
 */
export function toDatetimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local-time shortcuts offered next to the schedule picker. */
export function schedulePresets(now = new Date()): Array<{ label: string; value: string }> {
  const at = (days: number, hour: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    date.setHours(hour, 0, 0, 0)
    return date
  }
  const nextMonday = at(((8 - now.getDay()) % 7) || 7, 9)
  const options = [
    { label: 'Tomorrow, 9:00', date: at(1, 9) },
    { label: 'Next Monday, 9:00', date: nextMonday },
    { label: 'In a week', date: at(7, 9) },
  ]
  return options.map(({ label, date }) => ({ label, value: toDatetimeLocalValue(date.toISOString()) }))
}

export const localTimeZoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone
