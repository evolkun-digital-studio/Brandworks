import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as blogApi from '../../api/blogAdminApi'
import { ApiError } from '../../api/client'
import FormField from '../../components/FormField'
import FormMessage from '../../components/FormMessage'
import CollapsibleSection from './components/CollapsibleSection'
import TagInput from './components/TagInput'
import RepeatingTextField from './components/RepeatingTextField'
import FaqEditor from './components/FaqEditor'
import CustomMetaTagsEditor from './components/CustomMetaTagsEditor'
import { ContentHealthSummary, AnalysisDetails } from './components/AnalysisPanel'
import { analyzeBlog } from './lib/blogAnalyzer'
import type { AnalyzerInput } from './lib/blogAnalyzer'
import type {
  AdminBlogPost,
  AiContext,
  BlogStatus,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  TwitterCardType,
} from '../../api/blogTypes'

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Something went wrong. Please try again.'
}

/**
 * Convenience-only, independent of the backend's authoritative
 * slugify() — used purely for a live suggestion as the admin types a
 * title. The backend re-normalizes and validates whatever slug is
 * actually submitted, so this never needs to match it exactly.
 */
function suggestSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SLUG_FORMAT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Core fields (Phase 2-4)
const TITLE_MAX = 200
const EXCERPT_MAX = 500
const CONTENT_MAX = 100_000
const SLUG_MAX = 200
const SEO_TITLE_MAX = 200
const SEO_DESCRIPTION_MAX = 300

// Phase 6 fields — mirror backend/src/lib/blogValidators.ts's limits exactly.
const COVER_IMAGE_TITLE_MAX = 200
const COVER_IMAGE_CAPTION_MAX = 500
const COVER_IMAGE_DESCRIPTION_MAX = 1000
const CATEGORY_MAX = 200
const TAG_MAX = 100
const TAGS_MAX_ITEMS = 20
const AI_SUMMARY_MAX = 300
const KEY_TAKEAWAY_MAX = 300
const KEY_TAKEAWAYS_MAX_ITEMS = 20
const AI_CONTEXT_FIELD_MAX = 100
const MAIN_ENTITY_MAX = 200
const ENTITY_MAX = 200
const ABOUT_MAX_ITEMS = 20
const MENTIONED_ENTITIES_MAX_ITEMS = 30
const EXPERT_QUOTE_MAX = 2000
const EXPERT_QUOTE_NAME_MAX = 200
const FOCUS_KEYWORD_MAX = 200
const SECONDARY_KEYWORD_MAX = 200
const SECONDARY_KEYWORDS_MAX_ITEMS = 30
const OG_TITLE_MAX = 200
const OG_DESCRIPTION_MAX = 500

/**
 * Shown next to the scheduling datetime input (Phase 15, Part 9) so
 * it's explicit — never silently assumed — that the value the admin
 * picks is interpreted in *this device's* local time, not UTC. Safe
 * to compute once at module scope: a browser's own timezone doesn't
 * change over a page's lifetime.
 */
const localTimeZoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * UTC ISO timestamp -> the local "YYYY-MM-DDTHH:mm" string a
 * `<input type="datetime-local">` expects, via the Date object's own
 * local getters (getFullYear/getMonth/...) — never string slicing on
 * the ISO text, which would silently treat an already-UTC timestamp
 * as if it were local and shift the displayed hour by the visitor's
 * UTC offset (Phase 15, Part 9's explicit "no fragile string
 * manipulation" requirement).
 */
function toDatetimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const CONTENT_TYPES = [
  'Article',
  'Guide',
  'Tutorial',
  'How-to',
  'News',
  'Opinion',
  'Review',
  'Case Study',
  'List',
  'FAQ',
]
const CONTENT_INTENTS = ['Informational', 'Commercial', 'Transactional', 'Navigational']
const TWITTER_CARD_OPTIONS: TwitterCardType[] = ['summary', 'summary_large_image', 'player']

interface FormState {
  title: string
  slug: string
  excerpt: string
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
  /** yyyy-mm-dd for <input type="date"> — create mode only; see the CONTENT section. */
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

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  excerpt: '',
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

function formFromPost(post: AdminBlogPost): FormState {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
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
function validateForm(form: FormState): string | null {
  if (!form.title.trim()) return 'Title is required.'
  if (form.title.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters.`
  if (!form.excerpt.trim()) return 'Excerpt is required.'
  if (form.excerpt.length > EXCERPT_MAX) return `Excerpt must be at most ${EXCERPT_MAX} characters.`
  if (!form.content.trim()) return 'Content is required.'
  if (form.content.length > CONTENT_MAX) return `Content must be at most ${CONTENT_MAX} characters.`
  if (!form.coverImage.trim()) return 'Cover image is required.'
  if (!isLikelyUrl(form.coverImage)) return 'Cover image must be a valid http(s) URL.'
  if (!form.coverImageAlt.trim()) return 'Cover image alt text is required.'
  if (form.slug.trim()) {
    if (form.slug.length > SLUG_MAX) return `Slug must be at most ${SLUG_MAX} characters.`
    if (!SLUG_FORMAT_PATTERN.test(form.slug)) {
      return 'Slug must contain only lowercase letters, numbers, and hyphens.'
    }
  }
  if (form.seoTitle.length > SEO_TITLE_MAX) {
    return `SEO title must be at most ${SEO_TITLE_MAX} characters.`
  }
  if (form.seoDescription.length > SEO_DESCRIPTION_MAX) {
    return `SEO description must be at most ${SEO_DESCRIPTION_MAX} characters.`
  }

  if (form.canonicalUrl.trim() && !isLikelyUrl(form.canonicalUrl.trim())) {
    return 'Canonical URL must be a valid http(s) URL.'
  }
  if (form.ogImage.trim() && !isLikelyUrl(form.ogImage.trim())) {
    return 'Open Graph image must be a valid http(s) URL.'
  }
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

function buildAiContext(form: FormState): AiContext | null {
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

function buildEntitySeo(form: FormState): EntitySeo | null {
  const mainEntity = form.mainEntity.trim() || null
  if (!mainEntity && form.about.length === 0 && form.mentionedEntities.length === 0) return null
  return { mainEntity, about: form.about, mentionedEntities: form.mentionedEntities }
}

function buildExpertQuote(form: FormState): ExpertQuote | null {
  if (
    !form.expertQuoteText.trim() &&
    !form.expertQuotePersonName.trim() &&
    !form.expertQuoteOrganization.trim()
  ) {
    return null
  }
  return {
    quote: form.expertQuoteText.trim(),
    personName: form.expertQuotePersonName.trim(),
    organization: form.expertQuoteOrganization.trim(),
    role: form.expertQuoteRole.trim() || null,
  }
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-[12px] text-neutral-400">
      {value.length}/{max}
    </span>
  )
}

function CoverImagePreview({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [url])

  if (!isLikelyUrl(url)) return null

  return (
    <div className="mt-3 overflow-hidden rounded-[8px] border border-neutral-200 bg-neutral-50">
      {failed ? (
        <p className="p-4 text-[13px] text-neutral-500">
          Couldn't load an image from that URL.
        </p>
      ) : (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img
          src={url}
          alt={alt || 'Cover image preview'}
          className="aspect-[16/10] w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

/** Small preview for the Open Graph image specifically, in the SEO section. */
function OgImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  if (!isLikelyUrl(url)) return null
  return (
    <div className="mt-2 w-[220px] overflow-hidden rounded-[8px] border border-neutral-200 bg-neutral-50">
      {failed ? (
        <p className="p-3 text-[12px] text-neutral-500">Couldn't load this image.</p>
      ) : (
        <img
          src={url}
          alt="Open Graph preview"
          className="aspect-[1200/630] w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

/** Non-scoring mockup of how the post might appear in a search result — no SEO score. */
function SeoPreview({
  title,
  slug,
  description,
}: {
  title: string
  slug: string
  description: string
}) {
  return (
    <div className="rounded-[8px] border border-neutral-200 bg-white p-4">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
        Search result preview
      </p>
      <div className="max-w-[560px] truncate text-[18px] text-[#1a0dab]">
        {title || 'Untitled post'}
      </div>
      <div className="text-[13px] text-[#006621]">brandworks.com/blog/{slug || 'your-slug'}</div>
      <p className="mt-1 line-clamp-2 text-[13px] text-neutral-600">
        {description || 'A meta description will appear here.'}
      </p>
    </div>
  )
}

function MarkdownField({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="content" className="text-[14px] font-medium text-neutral-900">
          Content (Markdown)
        </label>
        <div className="flex gap-1 rounded-[6px] bg-neutral-100 p-0.5">
          <button
            type="button"
            onClick={() => setTab('write')}
            aria-pressed={tab === 'write'}
            className={`rounded-[4px] px-3 py-1 text-[12px] font-medium transition-colors ${
              tab === 'write' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            aria-pressed={tab === 'preview'}
            className={`rounded-[4px] px-3 py-1 text-[12px] font-medium transition-colors ${
              tab === 'preview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {tab === 'write' ? (
        <textarea
          id="content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          placeholder="Write in Markdown — headings, lists, links, blockquotes, and code blocks are all supported."
          className="w-full resize-y rounded-[10px] border border-neutral-300 px-4 py-3 font-mono text-[14px] leading-[1.6] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
        />
      ) : (
        <div className="min-h-[300px] rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3">
          {value.trim() ? (
            // No typography plugin is installed, so nested elements are
            // styled directly via arbitrary-variant utilities — enough
            // for a lightweight preview without a new dependency.
            <div
              className="max-w-none text-[14px] leading-[1.7] text-neutral-800
                [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-[24px] [&_h1]:font-semibold [&_h1]:text-neutral-900 [&_h1]:first:mt-0
                [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h2]:first:mt-0
                [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-neutral-900
                [&_p]:my-2.5 [&_strong]:font-semibold [&_strong]:text-neutral-900 [&_em]:italic
                [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1
                [&_a]:text-neutral-900 [&_a]:underline [&_a]:underline-offset-2
                [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600
                [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-[8px] [&_pre]:bg-neutral-900 [&_pre]:p-3 [&_pre]:text-[13px] [&_pre]:text-neutral-100
                [&_code]:rounded-[4px] [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_hr]:my-4 [&_hr]:border-neutral-200"
            >
              {/* rehype-raw is intentionally never enabled — raw HTML in the
                  source is never executed, only recognized Markdown nodes
                  are rendered. Same safe-by-default assumption the future
                  public renderer will use. */}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-400">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="text-right text-[12px] text-neutral-400">
        {value.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
      </div>
    </div>
  )
}

function BlogEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [status, setStatus] = useState<BlogStatus | null>(null)
  const [publishedAtDisplay, setPublishedAtDisplay] = useState<string | null>(null)
  // Phase 14 — a pending future publish date, if any (never set while
  // status === 'published'; the backend enforces that, this just
  // reflects it). `scheduleInput` is the separate, uncommitted
  // <input type="datetime-local"> value — only turned into a real
  // schedule when "Schedule" is clicked, same pattern as every other
  // form field here being distinct from what's actually been saved.
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [scheduleInput, setScheduleInput] = useState('')
  // Keeps the picker in sync with whatever the server says the
  // current schedule is — pre-filled (converted UTC -> local) so
  // rescheduling starts from the existing value instead of empty, and
  // cleared the moment there's no schedule at all (Phase 15, Part 5/9).
  // One effect here rather than repeating this in every handler that
  // can change `scheduledAt` (load, save, publish, schedule, unschedule).
  useEffect(() => {
    setScheduleInput(scheduledAt ? toDatetimeLocalValue(scheduledAt) : '')
  }, [scheduledAt])
  const [authorName, setAuthorName] = useState<string | undefined>(undefined)
  const [slugTouched, setSlugTouched] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [loading, setLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<
    'save' | 'publish' | 'unpublish' | 'schedule' | 'unschedule' | null
  >(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    blogApi
      .fetchBlogPost(id)
      .then(({ blog }) => {
        if (cancelled) return
        setForm(formFromPost(blog))
        setStatus(blog.status)
        setPublishedAtDisplay(blog.publishedAt)
        setScheduledAt(blog.scheduledAt)
        setAuthorName(blog.authorName)
        setSlugTouched(true) // an existing slug is never auto-derived from title edits
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Warns on tab close/refresh/external navigation while there are
  // unsaved changes. Minimal, standards-compliant beforeunload usage —
  // does not cover in-app navigation via the top nav (see handleBack
  // below for the one in-app case this editor itself controls).
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Debounced snapshot of the form, so the analyzer (regex-based over
  // the full Markdown body) doesn't re-run on every single keystroke —
  // it recomputes ~400ms after the admin stops typing/changing fields.
  const [debouncedForm, setDebouncedForm] = useState(form)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedForm(form), 400)
    return () => clearTimeout(timer)
  }, [form])

  const analyzerInput = useMemo<AnalyzerInput>(
    () => ({
      title: debouncedForm.title,
      slug: debouncedForm.slug,
      excerpt: debouncedForm.excerpt,
      content: debouncedForm.content,
      coverImage: debouncedForm.coverImage,
      coverImageAlt: debouncedForm.coverImageAlt,
      category: debouncedForm.category,
      tags: debouncedForm.tags,
      aiSummary: debouncedForm.aiSummary,
      keyTakeaways: debouncedForm.keyTakeaways,
      aiContext: buildAiContext(debouncedForm),
      entitySeo: buildEntitySeo(debouncedForm),
      faq: debouncedForm.faq,
      expertQuote: buildExpertQuote(debouncedForm),
      seoTitle: debouncedForm.seoTitle,
      seoDescription: debouncedForm.seoDescription,
      focusKeyword: debouncedForm.focusKeyword,
      secondaryKeywords: debouncedForm.secondaryKeywords,
      canonicalUrl: debouncedForm.canonicalUrl,
      robotsIndex: debouncedForm.robotsIndex,
      ogTitle: debouncedForm.ogTitle,
      ogDescription: debouncedForm.ogDescription,
      ogImage: debouncedForm.ogImage,
      twitterCard: debouncedForm.twitterCard,
      breadcrumbEnabled: debouncedForm.breadcrumbEnabled,
      customMetaTags: debouncedForm.customMetaTags,
      authorName,
    }),
    [debouncedForm, authorName],
  )

  // Pure + memoized — only recomputes when the debounced input actually changes.
  const analysis = useMemo(() => analyzeBlog(analyzerInput), [analyzerInput])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setSuccessMessage(null)
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      // Only ever auto-derives the slug while creating AND before the
      // admin has touched the slug field themselves — never overwrites
      // a manually chosen (or already-existing, in edit mode) slug.
      slug: !isEditing && !slugTouched ? suggestSlug(value) : prev.slug,
    }))
    setDirty(true)
    setSuccessMessage(null)
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    updateField('slug', value)
  }

  function handleBack() {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return
    }
    navigate('/admin/blogs')
  }

  async function persist(): Promise<AdminBlogPost | null> {
    const validationError = validateForm(form)
    if (validationError) {
      setFormError(validationError)
      return null
    }
    setFormError(null)

    const seoTitle = form.seoTitle.trim() ? form.seoTitle.trim() : null
    const seoDescription = form.seoDescription.trim() ? form.seoDescription.trim() : null

    const structuredFields = {
      coverImageTitle: form.coverImageTitle.trim() || null,
      coverImageCaption: form.coverImageCaption.trim() || null,
      coverImageDescription: form.coverImageDescription.trim() || null,
      category: form.category.trim() || null,
      tags: form.tags,
      aiSummary: form.aiSummary.trim() || null,
      keyTakeaways: form.keyTakeaways.filter((t) => t.trim().length > 0),
      aiContext: buildAiContext(form),
      entitySeo: buildEntitySeo(form),
      faq: form.faq.filter((f) => f.question.trim() && f.answer.trim()),
      expertQuote: buildExpertQuote(form),
      focusKeyword: form.focusKeyword.trim() || null,
      secondaryKeywords: form.secondaryKeywords,
      canonicalUrl: form.canonicalUrl.trim() || null,
      robotsIndex: form.robotsIndex,
      ogTitle: form.ogTitle.trim() || null,
      ogDescription: form.ogDescription.trim() || null,
      ogImage: form.ogImage.trim() || null,
      twitterCard: (form.twitterCard || null) as TwitterCardType | null,
      breadcrumbEnabled: form.breadcrumbEnabled,
      customMetaTags: form.customMetaTags.filter((t) => t.name.trim() && t.content.trim()),
    }

    if (isEditing && id) {
      const { blog } = await blogApi.updateBlogPost(id, {
        title: form.title,
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        coverImageAlt: form.coverImageAlt,
        seoTitle,
        seoDescription,
        ...structuredFields,
      })
      return blog
    }

    const { blog } = await blogApi.createBlogPost({
      title: form.title,
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      coverImageAlt: form.coverImageAlt,
      seoTitle,
      seoDescription,
      // Editor-chosen publish date, before first publication only — the
      // backend accepts this only on create (see
      // backend/src/services/blog/blog.service.ts's createBlogPost).
      publishedAt: form.publishDate ? new Date(form.publishDate).toISOString() : null,
      ...structuredFields,
    })
    return blog
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSubmitting('save')
    try {
      const saved = await persist()
      if (!saved) return
      setDirty(false)
      setStatus(saved.status)
      setPublishedAtDisplay(saved.publishedAt)
      setScheduledAt(saved.scheduledAt)
      if (!isEditing) {
        // Redirect to the edit page, as specified, rather than staying
        // on the create form or going back to the list.
        navigate(`/admin/blogs/${saved.id}/edit`, { replace: true })
        return
      }
      setForm(formFromPost(saved))
      setSuccessMessage('Changes saved.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handlePublishToggle() {
    const nextStatus: BlogStatus = status === 'published' ? 'unpublished' : 'published'

    // A non-blocking heads-up only — the analyzer is guidance, never a
    // gate (Phase 7 spec, section 24). Declining the confirm simply
    // cancels this click; the admin can still publish immediately
    // after by clicking again, score unchanged.
    if (nextStatus === 'published') {
      const concerns = [...analysis.seo.checks, ...analysis.aeo.checks].filter(
        (c) => c.status === 'warning' || c.status === 'fail',
      ).length
      if (concerns >= 5) {
        const proceed = window.confirm(
          `This post has ${concerns} SEO/AEO warnings. You can still publish — continue?`,
        )
        if (!proceed) return
      }
    }

    setSubmitting(nextStatus === 'published' ? 'publish' : 'unpublish')
    try {
      // Save any pending edits first so publishing doesn't discard them.
      const saved = await persist()
      if (!saved) return

      const { blog } = await blogApi.setBlogPostStatus(saved.id, nextStatus)
      setDirty(false)
      setStatus(blog.status)
      setPublishedAtDisplay(blog.publishedAt)
      // A manual status change always cancels a pending schedule
      // (Phase 14, Part 8) — the backend already did this; reflect it.
      setScheduledAt(blog.scheduledAt)
      setForm(formFromPost(blog))
      setSuccessMessage(
        blog.status === 'published'
          ? `Published${blog.publishedAt ? ` on ${new Date(blog.publishedAt).toLocaleString()}` : ''}.`
          : 'Unpublished.',
      )

      if (!isEditing) {
        navigate(`/admin/blogs/${blog.id}/edit`, { replace: true })
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  /**
   * The <input type="datetime-local"> value has no timezone
   * designator at all — per spec it's always interpreted as the
   * browser's own local time when passed to `new Date(...)`, so
   * `.toISOString()` on the result is exactly the "explicit ISO-8601
   * UTC timestamp" the backend requires (Phase 14, Part 2) — this is
   * the one, unavoidable, correct local-to-UTC conversion a
   * datetime picker needs, not a silent reinterpretation of an
   * already-explicit timestamp.
   */
  async function handleSchedule() {
    if (!scheduleInput) {
      setFormError('Choose a date and time to schedule this post.')
      return
    }
    const parsed = new Date(scheduleInput)
    if (Number.isNaN(parsed.getTime())) {
      setFormError('That date/time is not valid.')
      return
    }
    // Client-side only, first-line UX (Phase 15, Part 9) — the backend
    // remains the authoritative check (scheduleBlogPost's
    // validateScheduledAtInput) and rejects a past/equal-to-now value
    // regardless of what this catches; this just avoids a round trip
    // for the obvious case.
    if (parsed.getTime() <= Date.now()) {
      setFormError('Scheduled time must be in the future.')
      return
    }

    const wasAlreadyScheduled = Boolean(scheduledAt)
    setSubmitting('schedule')
    try {
      const saved = await persist()
      if (!saved) return

      const { blog } = await blogApi.scheduleBlogPost(saved.id, parsed.toISOString())
      setDirty(false)
      setStatus(blog.status)
      setScheduledAt(blog.scheduledAt)
      setForm(formFromPost(blog))
      const verb = wasAlreadyScheduled ? 'Rescheduled' : 'Scheduled'
      setSuccessMessage(
        blog.scheduledAt ? `${verb} to publish on ${new Date(blog.scheduledAt).toLocaleString()}.` : `${verb}.`,
      )

      if (!isEditing) {
        navigate(`/admin/blogs/${blog.id}/edit`, { replace: true })
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleUnschedule() {
    if (!id) return
    setSubmitting('unschedule')
    try {
      const { blog } = await blogApi.unscheduleBlogPost(id)
      setStatus(blog.status)
      setScheduledAt(blog.scheduledAt) // triggers the sync effect above, clearing scheduleInput too
      setSuccessMessage('Schedule canceled.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  const busy = submitting !== null

  if (loading) {
    return <p className="text-[14px] text-neutral-500">Loading…</p>
  }

  if (loadError) {
    return <FormMessage type="error">{loadError}</FormMessage>
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleBack}
        className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Blogs
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[24px] font-semibold text-neutral-900">
          {isEditing ? 'Edit Blog' : 'New Blog'}
        </h1>
        {status && (
          <span
            className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-medium ${
              status === 'published'
                ? 'bg-emerald-50 text-emerald-700'
                : status === 'unpublished'
                  ? 'bg-neutral-200 text-neutral-700'
                  : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {status === 'published' ? 'Published' : status === 'unpublished' ? 'Unpublished' : 'Draft'}
          </span>
        )}
        {publishedAtDisplay && (
          <span className="text-[12px] text-neutral-500">
            First published {new Date(publishedAtDisplay).toLocaleDateString()}
          </span>
        )}
        {scheduledAt && (
          <span className="inline-flex items-center rounded-[4px] bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-700">
            Scheduled for {new Date(scheduledAt).toLocaleString()}
          </span>
        )}
      </div>

      <ContentHealthSummary analysis={analysis} />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {formError && <FormMessage type="error">{formError}</FormMessage>}
        {successMessage && <FormMessage type="success">{successMessage}</FormMessage>}

        {/* CONTENT ------------------------------------------------------ */}
        <div className="flex flex-col gap-5 rounded-[12px] border border-neutral-200 bg-white p-6">
          <h2 className="text-[16px] font-semibold text-neutral-900">Content</h2>

          <FormField
            id="title"
            label="Title"
            type="text"
            required
            maxLength={TITLE_MAX}
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <FormField
              id="slug"
              label="Slug"
              type="text"
              required
              maxLength={SLUG_MAX}
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <p className="text-[12px] text-neutral-500">
              Lowercase letters, numbers, and hyphens only.
              {isEditing && status === 'published' && (
                <span className="text-amber-700">
                  {' '}
                  This post is published — changing its slug can break existing links.
                </span>
              )}
            </p>
          </div>

          <FormField
            id="excerpt"
            label="Excerpt"
            type="text"
            required
            maxLength={EXCERPT_MAX}
            value={form.excerpt}
            onChange={(e) => updateField('excerpt', e.target.value)}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="category"
              label="Category"
              type="text"
              maxLength={CATEGORY_MAX}
              placeholder="e.g. SEO"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            />
            {!isEditing && (
              <div className="flex flex-col gap-2">
                <FormField
                  id="publishDate"
                  label="Publish date (optional)"
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => updateField('publishDate', e.target.value)}
                />
                <p className="text-[12px] text-neutral-500">
                  Used the first time this post is published. Leave blank to use the moment
                  you actually click Publish.
                </p>
              </div>
            )}
          </div>

          <TagInput
            label="Tags"
            values={form.tags}
            onChange={(next) => updateField('tags', next)}
            placeholder="Add a tag…"
            maxItems={TAGS_MAX_ITEMS}
            maxItemLength={TAG_MAX}
          />

          <div className="border-t border-neutral-100 pt-5">
            <h3 className="text-[14px] font-medium text-neutral-900">Featured image</h3>
            <div className="mt-3 flex flex-col gap-5">
              <FormField
                id="coverImage"
                label="Cover Image URL"
                type="text"
                required
                placeholder="https://…"
                value={form.coverImage}
                onChange={(e) => updateField('coverImage', e.target.value)}
              />
              <CoverImagePreview url={form.coverImage} alt={form.coverImageAlt} />

              <FormField
                id="coverImageAlt"
                label="Cover Image Alt Text"
                type="text"
                required
                value={form.coverImageAlt}
                onChange={(e) => updateField('coverImageAlt', e.target.value)}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  id="coverImageTitle"
                  label="Image title"
                  type="text"
                  maxLength={COVER_IMAGE_TITLE_MAX}
                  value={form.coverImageTitle}
                  onChange={(e) => updateField('coverImageTitle', e.target.value)}
                />
                <FormField
                  id="coverImageCaption"
                  label="Image caption"
                  type="text"
                  maxLength={COVER_IMAGE_CAPTION_MAX}
                  value={form.coverImageCaption}
                  onChange={(e) => updateField('coverImageCaption', e.target.value)}
                />
              </div>
              <FormField
                id="coverImageDescription"
                label="Image description"
                type="text"
                maxLength={COVER_IMAGE_DESCRIPTION_MAX}
                value={form.coverImageDescription}
                onChange={(e) => updateField('coverImageDescription', e.target.value)}
              />
            </div>
          </div>

          <MarkdownField value={form.content} onChange={(v) => updateField('content', v)} />
        </div>

        <AnalysisDetails analysis={analysis} />

        {/* AI SUMMARY ---------------------------------------------------- */}
        <CollapsibleSection
          title="AI Summary"
          description="Manually written — not generated automatically."
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="aiSummary" className="text-[14px] font-medium text-neutral-900">
                AI Summary
              </label>
              <CharCount value={form.aiSummary} max={AI_SUMMARY_MAX} />
            </div>
            <textarea
              id="aiSummary"
              value={form.aiSummary}
              onChange={(e) => updateField('aiSummary', e.target.value)}
              maxLength={AI_SUMMARY_MAX}
              rows={3}
              className="w-full resize-y rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <RepeatingTextField
            label="Key Takeaways"
            values={form.keyTakeaways}
            onChange={(next) => updateField('keyTakeaways', next)}
            placeholder="A key takeaway…"
            maxItems={KEY_TAKEAWAYS_MAX_ITEMS}
            maxItemLength={KEY_TAKEAWAY_MAX}
          />
        </CollapsibleSection>

        {/* AI CONTEXT ------------------------------------------------------ */}
        <CollapsibleSection
          title="AI Context"
          description="Structured editorial context for future optimization — not enforced SEO claims."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="targetCountry"
              label="Target Country"
              type="text"
              maxLength={AI_CONTEXT_FIELD_MAX}
              placeholder="e.g. United States"
              value={form.targetCountry}
              onChange={(e) => updateField('targetCountry', e.target.value)}
            />
            <FormField
              id="targetLanguage"
              label="Target Language"
              type="text"
              maxLength={AI_CONTEXT_FIELD_MAX}
              placeholder="e.g. English"
              value={form.targetLanguage}
              onChange={(e) => updateField('targetLanguage', e.target.value)}
            />
          </div>
          <FormField
            id="targetAudience"
            label="Target Audience"
            type="text"
            maxLength={AI_CONTEXT_FIELD_MAX}
            placeholder="e.g. Marketing managers"
            value={form.targetAudience}
            onChange={(e) => updateField('targetAudience', e.target.value)}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="contentType" className="text-[14px] font-medium text-neutral-900">
                Content Type
              </label>
              <select
                id="contentType"
                value={form.contentType}
                onChange={(e) => updateField('contentType', e.target.value)}
                className="w-full rounded-[10px] border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
              >
                <option value="">—</option>
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="contentIntent" className="text-[14px] font-medium text-neutral-900">
                Content Intent
              </label>
              <select
                id="contentIntent"
                value={form.contentIntent}
                onChange={(e) => updateField('contentIntent', e.target.value)}
                className="w-full rounded-[10px] border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
              >
                <option value="">—</option>
                {CONTENT_INTENTS.map((intent) => (
                  <option key={intent} value={intent}>
                    {intent}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* ENTITY SEO ------------------------------------------------------ */}
        <CollapsibleSection title="Entity SEO" description="Structured topic/entity context.">
          <FormField
            id="mainEntity"
            label="Main Entity"
            type="text"
            maxLength={MAIN_ENTITY_MAX}
            placeholder="e.g. ChatGPT"
            value={form.mainEntity}
            onChange={(e) => updateField('mainEntity', e.target.value)}
          />
          <TagInput
            label="About"
            values={form.about}
            onChange={(next) => updateField('about', next)}
            placeholder="e.g. AI chatbot"
            maxItems={ABOUT_MAX_ITEMS}
            maxItemLength={ENTITY_MAX}
          />
          <TagInput
            label="Mentioned Entities"
            values={form.mentionedEntities}
            onChange={(next) => updateField('mentionedEntities', next)}
            placeholder="e.g. OpenAI"
            maxItems={MENTIONED_ENTITIES_MAX_ITEMS}
            maxItemLength={ENTITY_MAX}
          />
        </CollapsibleSection>

        {/* FAQ ------------------------------------------------------ */}
        <CollapsibleSection
          title="FAQ"
          description="Structured question/answer pairs — not embedded in the Markdown body."
        >
          <FaqEditor items={form.faq} onChange={(next) => updateField('faq', next)} />
        </CollapsibleSection>

        {/* EXPERT QUOTE ------------------------------------------------------ */}
        <CollapsibleSection title="Expert Quote">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expertQuoteText" className="text-[14px] font-medium text-neutral-900">
              Quote
            </label>
            <textarea
              id="expertQuoteText"
              value={form.expertQuoteText}
              onChange={(e) => updateField('expertQuoteText', e.target.value)}
              maxLength={EXPERT_QUOTE_MAX}
              rows={3}
              className="w-full resize-y rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="expertQuotePersonName"
              label="Person"
              type="text"
              maxLength={EXPERT_QUOTE_NAME_MAX}
              value={form.expertQuotePersonName}
              onChange={(e) => updateField('expertQuotePersonName', e.target.value)}
            />
            <FormField
              id="expertQuoteOrganization"
              label="Organization"
              type="text"
              maxLength={EXPERT_QUOTE_NAME_MAX}
              value={form.expertQuoteOrganization}
              onChange={(e) => updateField('expertQuoteOrganization', e.target.value)}
            />
          </div>
          <FormField
            id="expertQuoteRole"
            label="Role (optional)"
            type="text"
            maxLength={EXPERT_QUOTE_NAME_MAX}
            value={form.expertQuoteRole}
            onChange={(e) => updateField('expertQuoteRole', e.target.value)}
          />
        </CollapsibleSection>

        {/* SEO ------------------------------------------------------ */}
        <CollapsibleSection title="SEO" defaultOpen>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seoTitle" className="text-[14px] font-medium text-neutral-900">
                SEO Title
              </label>
              <CharCount value={form.seoTitle} max={SEO_TITLE_MAX} />
            </div>
            <input
              id="seoTitle"
              type="text"
              maxLength={SEO_TITLE_MAX}
              placeholder={form.title || 'Falls back to the title'}
              value={form.seoTitle}
              onChange={(e) => updateField('seoTitle', e.target.value)}
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seoDescription" className="text-[14px] font-medium text-neutral-900">
                Meta Description
              </label>
              <CharCount value={form.seoDescription} max={SEO_DESCRIPTION_MAX} />
            </div>
            <textarea
              id="seoDescription"
              maxLength={SEO_DESCRIPTION_MAX}
              placeholder={form.excerpt || 'Falls back to the excerpt'}
              value={form.seoDescription}
              onChange={(e) => updateField('seoDescription', e.target.value)}
              rows={2}
              className="w-full resize-y rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <SeoPreview
            title={form.seoTitle || form.title}
            slug={form.slug}
            description={form.seoDescription || form.excerpt}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="focusKeyword" className="text-[14px] font-medium text-neutral-900">
                Focus Keyword
              </label>
              <CharCount value={form.focusKeyword} max={FOCUS_KEYWORD_MAX} />
            </div>
            <input
              id="focusKeyword"
              type="text"
              maxLength={FOCUS_KEYWORD_MAX}
              value={form.focusKeyword}
              onChange={(e) => updateField('focusKeyword', e.target.value)}
              className="w-full rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <TagInput
            label="Secondary Keywords"
            values={form.secondaryKeywords}
            onChange={(next) => updateField('secondaryKeywords', next)}
            placeholder="Add a keyword…"
            maxItems={SECONDARY_KEYWORDS_MAX_ITEMS}
            maxItemLength={SECONDARY_KEYWORD_MAX}
            helpText={`Each up to ${SECONDARY_KEYWORD_MAX} characters. Press Enter or comma to add.`}
          />

          <FormField
            id="canonicalUrl"
            label="Canonical URL"
            type="text"
            placeholder="https://…"
            value={form.canonicalUrl}
            onChange={(e) => updateField('canonicalUrl', e.target.value)}
          />

          <label className="flex items-center gap-2.5 text-[14px] text-neutral-800">
            <input
              type="checkbox"
              checked={form.robotsIndex}
              onChange={(e) => updateField('robotsIndex', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-400"
            />
            Allow search engines to index this post
          </label>

          <label className="flex items-center gap-2.5 text-[14px] text-neutral-800">
            <input
              type="checkbox"
              checked={form.breadcrumbEnabled}
              onChange={(e) => updateField('breadcrumbEnabled', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-400"
            />
            Show breadcrumb navigation
          </label>

          <div className="border-t border-neutral-100 pt-5">
            <h3 className="mb-4 text-[14px] font-medium text-neutral-900">Open Graph &amp; Twitter</h3>
            <div className="flex flex-col gap-5">
              <FormField
                id="ogTitle"
                label="Open Graph Title"
                type="text"
                maxLength={OG_TITLE_MAX}
                placeholder={form.seoTitle || form.title || 'Falls back to the title'}
                value={form.ogTitle}
                onChange={(e) => updateField('ogTitle', e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="ogDescription" className="text-[14px] font-medium text-neutral-900">
                    Open Graph Description
                  </label>
                  <CharCount value={form.ogDescription} max={OG_DESCRIPTION_MAX} />
                </div>
                <textarea
                  id="ogDescription"
                  maxLength={OG_DESCRIPTION_MAX}
                  placeholder={form.seoDescription || form.excerpt || 'Falls back to the meta description'}
                  value={form.ogDescription}
                  onChange={(e) => updateField('ogDescription', e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <FormField
                  id="ogImage"
                  label="Open Graph Image"
                  type="text"
                  placeholder={form.coverImage || 'https://…'}
                  value={form.ogImage}
                  onChange={(e) => updateField('ogImage', e.target.value)}
                />
                <OgImagePreview url={form.ogImage || form.coverImage} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="twitterCard" className="text-[14px] font-medium text-neutral-900">
                  Twitter Card
                </label>
                <select
                  id="twitterCard"
                  value={form.twitterCard}
                  onChange={(e) => updateField('twitterCard', e.target.value)}
                  className="w-full rounded-[10px] border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
                >
                  <option value="">—</option>
                  {TWITTER_CARD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* CUSTOM META TAGS ------------------------------------------------------ */}
        <CollapsibleSection title="Custom Meta Tags">
          <CustomMetaTagsEditor
            items={form.customMetaTags}
            onChange={(next) => updateField('customMetaTags', next)}
          />
        </CollapsibleSection>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={busy}
            className="flex h-[44px] items-center justify-center rounded-[6px] border border-neutral-900 px-6 text-[14px] font-medium text-neutral-900 transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {submitting === 'save' ? 'Saving…' : isEditing ? 'Save changes' : 'Save Draft'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePublishToggle()}
            className="flex h-[44px] items-center justify-center rounded-[6px] bg-neutral-900 px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting === 'publish'
              ? 'Publishing…'
              : submitting === 'unpublish'
                ? 'Unpublishing…'
                : status === 'published'
                  ? 'Unpublish'
                  : 'Publish'}
          </button>
        </div>

        {/* SCHEDULING (Phase 14) — meaningless for an already-published
           post (the backend rejects it — see blog.service.ts's
           scheduleBlogPost), so hidden rather than shown-then-erroring. */}
        {status !== 'published' && (
          <div className="flex flex-col gap-3 rounded-[12px] border border-neutral-200 bg-white p-6">
            <h2 className="text-[16px] font-semibold text-neutral-900">Scheduled Publishing</h2>

            {/* State is always shown explicitly — scheduled with its
               date, or "no schedule set" — rather than only being
               implied by which controls happen to be visible (Phase
               15, Part 9). */}
            <p className="text-[14px] text-neutral-600">
              {scheduledAt ? (
                <>
                  This post will publish automatically on{' '}
                  <span className="font-medium text-neutral-900">{new Date(scheduledAt).toLocaleString()}</span>.
                </>
              ) : (
                'No schedule is currently set for this post.'
              )}
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="scheduledAt" className="text-[13px] font-medium text-neutral-700">
                  Publish at
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduleInput}
                  onChange={(e) => setScheduleInput(e.target.value)}
                  className="h-[38px] rounded-[6px] border border-neutral-300 px-3 text-[14px] text-neutral-900 focus:border-neutral-500 focus:outline-none"
                />
                {/* Explicit, rather than silently treating the value
                   as UTC (Phase 15, Part 9) — a datetime-local input
                   has no timezone of its own; the browser (and
                   handleSchedule's `new Date(...)` parse) always
                   interprets it as this device's local time. Pre-filled
                   from the current schedule via toDatetimeLocalValue
                   when one exists, so adjusting it starts from the
                   existing value rather than blank (Part 5:
                   rescheduling replaces the old value cleanly). */}
                <p className="text-[12px] text-neutral-400">
                  Interpreted in your local timezone ({localTimeZoneLabel}).
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSchedule()}
                className="flex h-[38px] items-center justify-center rounded-[6px] border border-neutral-900 px-4 text-[13px] font-medium text-neutral-900 transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                {submitting === 'schedule'
                  ? scheduledAt
                    ? 'Updating…'
                    : 'Scheduling…'
                  : scheduledAt
                    ? 'Update schedule'
                    : 'Schedule'}
              </button>
              {scheduledAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUnschedule()}
                  className="flex h-[38px] items-center justify-center rounded-[6px] border border-neutral-300 px-4 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
                >
                  {submitting === 'unschedule' ? 'Canceling…' : 'Cancel schedule'}
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default BlogEditor
