/**
 * Deterministic, local, dependency-light content analyzer.
 *
 * `analyzeBlog(input)` is a pure function: the same input always
 * produces the same output. No network requests, no LLM/AI calls, no
 * external SEO APIs — every check here is a local, documented rule
 * over the post's own Markdown content and structured metadata.
 *
 * IMPORTANT — what these scores are NOT: they are not Google scores,
 * not ranking predictions, and not AI-visibility guarantees. They are
 * BRANDWORKS-internal editorial completeness indicators, surfaced in
 * the admin editor to guide writers — never a publish gate (see
 * AnalysisPanel.tsx, which never disables Save/Publish based on them).
 */

import type {
  AiContext,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
} from '../../../api/blogTypes'
import {
  buildToc,
  classifyLink,
  computeReadingTimeMinutes,
  computeWordCount,
  detectHeadingJumps,
  isQuestionHeading,
  parseMarkdown,
} from '../../../../lib/markdownMetrics'
import type { Heading, TocEntry } from '../../../../lib/markdownMetrics'

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'info'

export interface AnalyzerCheck {
  id: string
  label: string
  status: CheckStatus
  message: string
}

export interface ContentMetrics {
  wordCount: number
  readingTimeMinutes: number
  paragraphCount: number
  headingCount: number
  h1Count: number
  h2Count: number
  h3Count: number
  h4Count: number
  imageCount: number
  linkCount: number
  internalLinkCount: number
  externalLinkCount: number
  codeBlockCount: number
  blockquoteCount: number
}

export interface ReadabilityResult {
  /** Simplified Flesch Reading Ease approximation, clamped to 0-100 — see computeReadability(). */
  score: number
  label: 'Not enough content' | 'Needs improvement' | 'Fair' | 'Good'
  details: string
}

export type SchemaReadinessStatus = 'ready' | 'not_configured' | 'missing_data'

export interface SchemaReadinessItem {
  type: string
  status: SchemaReadinessStatus
  message: string
}

export interface ChecklistSection {
  section: string
  items: AnalyzerCheck[]
}

export interface ScoreBreakdown {
  score: number
  checks: AnalyzerCheck[]
}

export interface AnalysisResult {
  metrics: ContentMetrics
  toc: TocEntry[]
  headingWarnings: string[]
  seo: ScoreBreakdown
  aeo: ScoreBreakdown
  geo: ScoreBreakdown
  readability: ReadabilityResult
  schemaReadiness: SchemaReadinessItem[]
  checklist: ChecklistSection[]
}

export interface AnalyzerInput {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  category: string
  tags: string[]
  aiSummary: string
  keyTakeaways: string[]
  aiContext: AiContext | null
  entitySeo: EntitySeo | null
  faq: FaqItem[]
  expertQuote: ExpertQuote | null
  seoTitle: string
  seoDescription: string
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
  /**
   * Only known once the post has been saved at least once (the
   * server, not the form, owns authorship) — undefined while creating.
   */
  authorName?: string
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Case-insensitive "does haystack contain needle" — false for an empty needle. */
function containsKeyword(haystack: string, keyword: string): boolean {
  const k = normalize(keyword)
  if (!k) return false
  return normalize(haystack).includes(k)
}

/**
 * Same idea, but for a slug specifically: a slug spells a multi-word
 * keyword with hyphens ("technical-seo") where the keyword itself is
 * naturally written with spaces ("technical seo") — a plain substring
 * check would never match, so hyphens are normalized to spaces first.
 */
function containsKeywordInSlug(slug: string, keyword: string): boolean {
  const k = normalize(keyword)
  if (!k) return false
  const slugAsWords = normalize(slug).replace(/-/g, ' ')
  return slugAsWords.includes(k)
}

function check(
  id: string,
  label: string,
  status: CheckStatus,
  message: string,
): AnalyzerCheck {
  return { id, label, status, message }
}

/**
 * Weighted category score: each non-`info` check contributes
 * pass=1/warning=0.5/fail=0 toward its category's share of the total
 * weight; `info` checks are purely informational and don't affect
 * scoring. A category with no scoreable checks contributes its full
 * weight (nothing to penalize). This is the one formula used for
 * every SEO/AEO/GEO category — see the weight tables below for the
 * documented per-category values.
 */
function categoryScore(checks: AnalyzerCheck[], weight: number): number {
  const scoreable = checks.filter((c) => c.status !== 'info')
  if (scoreable.length === 0) return weight
  const earned = scoreable.reduce((sum, c) => {
    if (c.status === 'pass') return sum + 1
    if (c.status === 'warning') return sum + 0.5
    return sum
  }, 0)
  return (earned / scoreable.length) * weight
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

// ---------------------------------------------------------------------------
// SEO analysis — weights sum to 100, documented per Phase 7 spec section 21.
// ---------------------------------------------------------------------------

const SEO_WEIGHTS = {
  title: 15,
  meta: 15,
  keyword: 15,
  content: 15,
  headings: 10,
  images: 10,
  links: 10,
  canonical: 5,
  technical: 5,
} as const

function analyzeSeo(
  input: AnalyzerInput,
  headings: Heading[],
  metrics: ContentMetrics,
  headingJumps: string[],
): ScoreBreakdown {
  const hasFocusKeyword = input.focusKeyword.trim().length > 0

  // --- Title ---
  const titleChecks: AnalyzerCheck[] = []
  const titleLength = input.title.trim().length
  titleChecks.push(
    titleLength > 0
      ? check('seo-title-exists', 'Title present', 'pass', 'Title is set.')
      : check('seo-title-exists', 'Title present', 'fail', 'Title is required.'),
  )
  if (titleLength > 0) {
    titleChecks.push(
      titleLength >= 10 && titleLength <= 70
        ? check('seo-title-length', 'Title length', 'pass', `Title is ${titleLength} characters.`)
        : check(
            'seo-title-length',
            'Title length',
            'warning',
            `Title is ${titleLength} characters — 10-70 is a reasonable general range.`,
          ),
    )
  }
  if (hasFocusKeyword) {
    titleChecks.push(
      containsKeyword(input.title, input.focusKeyword)
        ? check('seo-keyword-in-title', 'Focus keyword in title', 'pass', 'Focus keyword appears in the title.')
        : check(
            'seo-keyword-in-title',
            'Focus keyword in title',
            'warning',
            'Focus keyword does not appear in the title.',
          ),
    )
  }

  // --- Meta ---
  const metaChecks: AnalyzerCheck[] = []
  const effectiveSeoTitle = input.seoTitle.trim() || input.title.trim()
  metaChecks.push(
    effectiveSeoTitle
      ? check('seo-meta-title', 'SEO title present', 'pass', 'SEO title is set (or falls back to the title).')
      : check('seo-meta-title', 'SEO title present', 'fail', 'Neither SEO title nor title is set.'),
  )
  const descLength = input.seoDescription.trim().length
  metaChecks.push(
    descLength > 0
      ? check('seo-meta-description', 'Meta description present', 'pass', 'Meta description is set.')
      : check(
          'seo-meta-description',
          'Meta description present',
          'warning',
          'Meta description is not set — the excerpt will be used as a fallback.',
        ),
  )
  if (descLength > 0) {
    metaChecks.push(
      descLength >= 50 && descLength <= 160
        ? check('seo-meta-length', 'Meta description length', 'pass', `${descLength} characters.`)
        : check(
            'seo-meta-length',
            'Meta description length',
            'warning',
            `Meta description is ${descLength} characters — 50-160 is a reasonable general range.`,
          ),
    )
  }

  // --- Keyword ---
  const keywordChecks: AnalyzerCheck[] = []
  keywordChecks.push(
    hasFocusKeyword
      ? check('seo-keyword-configured', 'Focus keyword configured', 'pass', 'Focus keyword is set.')
      : check(
          'seo-keyword-configured',
          'Focus keyword configured',
          'warning',
          'Focus keyword is not configured.',
        ),
  )
  if (hasFocusKeyword) {
    keywordChecks.push(
      containsKeywordInSlug(input.slug, input.focusKeyword)
        ? check('seo-keyword-in-slug', 'Focus keyword in slug', 'pass', 'Focus keyword appears in the slug.')
        : check(
            'seo-keyword-in-slug',
            'Focus keyword in slug',
            'warning',
            'Focus keyword does not appear in the slug.',
          ),
    )
    keywordChecks.push(
      containsKeyword(input.excerpt, input.focusKeyword) ||
        containsKeyword(input.seoDescription, input.focusKeyword)
        ? check(
            'seo-keyword-in-description',
            'Focus keyword in excerpt/description',
            'pass',
            'Focus keyword appears in the excerpt or meta description.',
          )
        : check(
            'seo-keyword-in-description',
            'Focus keyword in excerpt/description',
            'warning',
            'Focus keyword does not appear in the excerpt or meta description.',
          ),
    )
  }

  // --- Content ---
  const contentChecks: AnalyzerCheck[] = []
  contentChecks.push(
    metrics.wordCount > 0
      ? check('seo-content-exists', 'Content present', 'pass', `${metrics.wordCount} words.`)
      : check('seo-content-exists', 'Content present', 'fail', 'Content is empty.'),
  )
  if (metrics.wordCount > 0) {
    // Soft guidance only — see Phase 7 spec section 25. Never a fail.
    contentChecks.push(
      metrics.wordCount < 300
        ? check(
            'seo-content-length',
            'Content length',
            'warning',
            `${metrics.wordCount} words is quite short — consider whether the topic is fully covered.`,
          )
        : check('seo-content-length', 'Content length', 'pass', `${metrics.wordCount} words.`),
    )
    contentChecks.push(
      metrics.h2Count > 0
        ? check('seo-content-structure', 'Content is structured with headings', 'pass', `${metrics.h2Count} H2 heading(s).`)
        : check(
            'seo-content-structure',
            'Content is structured with headings',
            'warning',
            'No H2 headings found — consider breaking the content into sections.',
          ),
    )
  }

  // --- Headings ---
  const headingChecks: AnalyzerCheck[] = []
  const bodyH1s = headings.filter((h) => h.level === 1)
  headingChecks.push(
    bodyH1s.length === 0
      ? check(
          'seo-h1',
          'No competing H1 in content',
          'pass',
          'The page title acts as the H1; the Markdown body has no additional H1.',
        )
      : check(
          'seo-h1',
          'No competing H1 in content',
          'warning',
          `The Markdown body has ${bodyH1s.length} H1 heading(s) of its own — the page title is already the H1.`,
        ),
  )
  headingChecks.push(
    headingJumps.length === 0
      ? check('seo-heading-hierarchy', 'Heading hierarchy', 'pass', 'No heading level jumps detected.')
      : check(
          'seo-heading-hierarchy',
          'Heading hierarchy',
          'warning',
          `${headingJumps.length} heading level jump(s) detected.`,
        ),
  )

  // --- Images ---
  const imageChecks: AnalyzerCheck[] = []
  imageChecks.push(
    input.coverImage.trim()
      ? check('seo-featured-image', 'Featured image present', 'pass', 'Cover image is set.')
      : check('seo-featured-image', 'Featured image present', 'fail', 'Cover image is not set.'),
  )
  const altTrimmed = input.coverImageAlt.trim()
  imageChecks.push(
    altTrimmed.length > 0
      ? check('seo-image-alt', 'Image ALT present', 'pass', 'Cover image alt text is set.')
      : check('seo-image-alt', 'Image ALT present', 'fail', 'Cover image alt text is missing.'),
  )

  // --- Links ---
  const linkChecks: AnalyzerCheck[] = []
  linkChecks.push(
    metrics.internalLinkCount > 0
      ? check('seo-internal-links', 'Internal links present', 'pass', `${metrics.internalLinkCount} internal link(s).`)
      : check(
          'seo-internal-links',
          'Internal links present',
          'warning',
          'No internal links found — consider linking to related BRANDWORKS content.',
        ),
  )
  linkChecks.push(
    metrics.externalLinkCount > 0
      ? check('seo-external-links', 'External references present', 'pass', `${metrics.externalLinkCount} external link(s).`)
      : check(
          'seo-external-links',
          'External references present',
          'info',
          'No external references — optional, but can support credibility.',
        ),
  )

  // --- Canonical ---
  const canonicalChecks: AnalyzerCheck[] = [
    input.canonicalUrl.trim()
      ? check('seo-canonical', 'Canonical URL', 'pass', 'Canonical URL is set.')
      : check(
          'seo-canonical',
          'Canonical URL',
          'info',
          'No canonical URL set — the site default (this post’s own URL) will apply.',
        ),
  ]

  // --- Technical completeness ---
  const technicalChecks: AnalyzerCheck[] = [
    check(
      'seo-robots',
      'Robots index setting configured',
      'pass',
      input.robotsIndex ? 'This post is set to be indexed.' : 'This post is deliberately set to noindex.',
    ),
    input.twitterCard.trim()
      ? check('seo-twitter-card', 'Twitter card configured', 'pass', `Twitter card: ${input.twitterCard}.`)
      : check('seo-twitter-card', 'Twitter card configured', 'info', 'No Twitter card type selected.'),
  ]

  const allChecks = [
    ...titleChecks,
    ...metaChecks,
    ...keywordChecks,
    ...contentChecks,
    ...headingChecks,
    ...imageChecks,
    ...linkChecks,
    ...canonicalChecks,
    ...technicalChecks,
  ]

  const total =
    categoryScore(titleChecks, SEO_WEIGHTS.title) +
    categoryScore(metaChecks, SEO_WEIGHTS.meta) +
    categoryScore(keywordChecks, SEO_WEIGHTS.keyword) +
    categoryScore(contentChecks, SEO_WEIGHTS.content) +
    categoryScore(headingChecks, SEO_WEIGHTS.headings) +
    categoryScore(imageChecks, SEO_WEIGHTS.images) +
    categoryScore(linkChecks, SEO_WEIGHTS.links) +
    categoryScore(canonicalChecks, SEO_WEIGHTS.canonical) +
    categoryScore(technicalChecks, SEO_WEIGHTS.technical)

  return { score: clampScore(total), checks: allChecks }
}

// ---------------------------------------------------------------------------
// AEO analysis (Answer Engine Optimization) — weights sum to 100.
// ---------------------------------------------------------------------------

const AEO_WEIGHTS = {
  aiSummary: 20,
  keyTakeaways: 20,
  faq: 25,
  questionHeadings: 15,
  directAnswer: 20,
} as const

function analyzeAeo(input: AnalyzerInput, headings: Heading[]): ScoreBreakdown {
  // --- AI Summary ---
  const summaryChecks: AnalyzerCheck[] = [
    input.aiSummary.trim()
      ? check('aeo-ai-summary', 'AI Summary present', 'pass', 'AI Summary is set.')
      : check(
          'aeo-ai-summary',
          'AI Summary present',
          'warning',
          'AI Summary is not configured. Add a concise summary to improve content handoff/context for future AI optimization.',
        ),
  ]
  if (input.aiSummary.trim()) {
    summaryChecks.push(
      input.aiSummary.length <= 300
        ? check('aeo-ai-summary-length', 'AI Summary length', 'pass', `${input.aiSummary.length} characters.`)
        : check(
            'aeo-ai-summary-length',
            'AI Summary length',
            'warning',
            `AI Summary is ${input.aiSummary.length} characters, over the configured 300 limit.`,
          ),
    )
  }

  // --- Key Takeaways ---
  const takeawayCount = input.keyTakeaways.filter((t) => t.trim()).length
  const takeawayChecks: AnalyzerCheck[] = [
    takeawayCount === 0
      ? check(
          'aeo-key-takeaways',
          'Key Takeaways present',
          'warning',
          'No Key Takeaways configured. A short bulleted summary can help both readers and AI systems.',
        )
      : takeawayCount >= 3 && takeawayCount <= 7
        ? check('aeo-key-takeaways', 'Key Takeaways present', 'pass', `${takeawayCount} takeaway(s).`)
        : check(
            'aeo-key-takeaways',
            'Key Takeaways present',
            'warning',
            `${takeawayCount} takeaway(s) — 3-7 is a reasonable general range.`,
          ),
  ]

  // --- FAQ ---
  const validFaq = input.faq.filter((f) => f.question.trim() && f.answer.trim())
  const incompleteFaq = input.faq.length - validFaq.length
  const faqChecks: AnalyzerCheck[] = []
  if (input.faq.length === 0) {
    faqChecks.push(
      check(
        'aeo-faq',
        'FAQ configured',
        'info',
        'FAQ not configured. Consider adding FAQs when the topic naturally contains common questions.',
      ),
    )
  } else {
    faqChecks.push(
      incompleteFaq === 0
        ? check('aeo-faq', 'FAQ configured', 'pass', `${validFaq.length} complete FAQ item(s).`)
        : check(
            'aeo-faq',
            'FAQ configured',
            'warning',
            `${incompleteFaq} FAQ item(s) are missing a question or answer.`,
          ),
    )
  }

  // --- Question-based headings ---
  const questionHeadings = headings.filter((h) => h.level >= 2 && isQuestionHeading(h.text))
  const questionChecks: AnalyzerCheck[] = [
    questionHeadings.length > 0
      ? check(
          'aeo-question-headings',
          'Question-based headings',
          'pass',
          `${questionHeadings.length} heading(s) read as a direct question — good for answer-style extraction.`,
        )
      : check(
          'aeo-question-headings',
          'Question-based headings',
          'info',
          'No headings are phrased as questions. This is a heuristic suggestion, not a requirement.',
        ),
  ]

  // --- Direct-answer opportunity ---
  const excerptLength = input.excerpt.trim().length
  const directAnswerChecks: AnalyzerCheck[] = [
    excerptLength >= 40
      ? check(
          'aeo-direct-answer',
          'Excerpt provides a concise answer',
          'pass',
          'The excerpt is substantial enough to work as a direct-answer summary.',
        )
      : excerptLength > 0
        ? check(
            'aeo-direct-answer',
            'Excerpt provides a concise answer',
            'warning',
            'The excerpt is quite short to work as a standalone answer.',
          )
        : check(
            'aeo-direct-answer',
            'Excerpt provides a concise answer',
            'fail',
            'No excerpt configured.',
          ),
  ]

  const allChecks = [
    ...summaryChecks,
    ...takeawayChecks,
    ...faqChecks,
    ...questionChecks,
    ...directAnswerChecks,
  ]

  const total =
    categoryScore(summaryChecks, AEO_WEIGHTS.aiSummary) +
    categoryScore(takeawayChecks, AEO_WEIGHTS.keyTakeaways) +
    categoryScore(faqChecks, AEO_WEIGHTS.faq) +
    categoryScore(questionChecks, AEO_WEIGHTS.questionHeadings) +
    categoryScore(directAnswerChecks, AEO_WEIGHTS.directAnswer)

  return { score: clampScore(total), checks: allChecks }
}

// ---------------------------------------------------------------------------
// GEO analysis (Generative Engine Optimization) — weights sum to 100.
// ---------------------------------------------------------------------------

const GEO_WEIGHTS = {
  mainEntity: 20,
  supportingEntities: 15,
  aiContext: 20,
  contentClarity: 30,
  supportingEvidence: 15,
} as const

function analyzeGeo(input: AnalyzerInput, metrics: ContentMetrics): ScoreBreakdown {
  // --- Main entity ---
  const mainEntity = input.entitySeo?.mainEntity?.trim() ?? ''
  const mainEntityChecks: AnalyzerCheck[] = [
    mainEntity
      ? check('geo-main-entity', 'Main entity configured', 'pass', `Main entity: "${mainEntity}".`)
      : check(
          'geo-main-entity',
          'Main entity configured',
          'warning',
          'Main entity is not configured. If this article is clearly not entity-centric, that may be fine.',
        ),
  ]

  // --- About / mentioned entities ---
  const aboutCount = input.entitySeo?.about.length ?? 0
  const mentionedCount = input.entitySeo?.mentionedEntities.length ?? 0
  const supportingChecks: AnalyzerCheck[] = [
    aboutCount > 0
      ? check('geo-about', 'About entities configured', 'pass', `${aboutCount} entr(y/ies).`)
      : check('geo-about', 'About entities configured', 'info', 'No "about" entities configured.'),
    mentionedCount > 0
      ? check('geo-mentioned-entities', 'Mentioned entities configured', 'pass', `${mentionedCount} entr(y/ies).`)
      : check('geo-mentioned-entities', 'Mentioned entities configured', 'info', 'No mentioned entities configured.'),
  ]

  // --- AI context ---
  const ctx = input.aiContext
  const ctxFieldsSet = ctx
    ? [ctx.targetCountry, ctx.targetLanguage, ctx.targetAudience, ctx.contentType, ctx.contentIntent].filter(
        (v) => v && v.trim(),
      ).length
    : 0
  const aiContextChecks: AnalyzerCheck[] = [
    ctxFieldsSet === 0
      ? check('geo-ai-context', 'AI Context configured', 'warning', 'AI Context is not configured.')
      : ctxFieldsSet >= 3
        ? check('geo-ai-context', 'AI Context configured', 'pass', `${ctxFieldsSet}/5 AI Context fields set.`)
        : check(
            'geo-ai-context',
            'AI Context configured',
            'warning',
            `Only ${ctxFieldsSet}/5 AI Context fields set.`,
          ),
    ctx?.contentIntent?.trim()
      ? check('geo-content-intent', 'Content intent configured', 'pass', `Content intent: ${ctx.contentIntent}.`)
      : check('geo-content-intent', 'Content intent configured', 'warning', 'Content intent is not configured.'),
  ]

  // --- Content clarity ---
  const clarityChecks: AnalyzerCheck[] = [
    input.title.trim()
      ? check('geo-clear-title', 'Clear title', 'pass', 'Title is set.')
      : check('geo-clear-title', 'Clear title', 'fail', 'Title is not set.'),
    input.excerpt.trim()
      ? check('geo-clear-excerpt', 'Clear excerpt', 'pass', 'Excerpt is set.')
      : check('geo-clear-excerpt', 'Clear excerpt', 'fail', 'Excerpt is not set.'),
    input.aiSummary.trim()
      ? check('geo-clear-summary', 'Clear AI summary', 'pass', 'AI Summary is set.')
      : check('geo-clear-summary', 'Clear AI summary', 'warning', 'AI Summary is not set.'),
    input.keyTakeaways.filter((t) => t.trim()).length > 0
      ? check('geo-clear-takeaways', 'Key takeaways present', 'pass', 'Key Takeaways are set.')
      : check('geo-clear-takeaways', 'Key takeaways present', 'warning', 'Key Takeaways are not set.'),
    input.faq.filter((f) => f.question.trim() && f.answer.trim()).length > 0
      ? check('geo-clear-faq', 'Structured FAQ present', 'pass', 'FAQ is configured.')
      : check(
          'geo-clear-faq',
          'Structured FAQ present',
          'info',
          'FAQ is not configured — optional depending on topic.',
        ),
  ]

  // --- Supporting evidence ---
  const evidenceChecks: AnalyzerCheck[] = [
    metrics.externalLinkCount > 0
      ? check(
          'geo-external-evidence',
          'External references present',
          'pass',
          `${metrics.externalLinkCount} external link(s) as a source/reference indicator.`,
        )
      : check(
          'geo-external-evidence',
          'External references present',
          'info',
          'No external references found. External links don’t guarantee AI citation, but can indicate sourcing.',
        ),
  ]

  const allChecks = [
    ...mainEntityChecks,
    ...supportingChecks,
    ...aiContextChecks,
    ...clarityChecks,
    ...evidenceChecks,
  ]

  const total =
    categoryScore(mainEntityChecks, GEO_WEIGHTS.mainEntity) +
    categoryScore(supportingChecks, GEO_WEIGHTS.supportingEntities) +
    categoryScore(aiContextChecks, GEO_WEIGHTS.aiContext) +
    categoryScore(clarityChecks, GEO_WEIGHTS.contentClarity) +
    categoryScore(evidenceChecks, GEO_WEIGHTS.supportingEvidence)

  return { score: clampScore(total), checks: allChecks }
}

// ---------------------------------------------------------------------------
// Readability — simplified Flesch Reading Ease approximation.
// ---------------------------------------------------------------------------

/**
 * Vowel-group heuristic syllable counter — a common, simple
 * approximation (not a dictionary lookup). Documented as an
 * approximation, not an authoritative linguistic count.
 */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!cleaned) return 0
  const vowelGroups = cleaned.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (cleaned.endsWith('e') && count > 1) count -= 1
  return Math.max(1, count)
}

function computeReadability(plainText: string, wordCount: number): ReadabilityResult {
  if (wordCount === 0) {
    return { score: 0, label: 'Not enough content', details: 'Add content to calculate readability.' }
  }

  const sentenceCount = Math.max(1, plainText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length)
  const words = plainText.trim().split(/\s+/).filter(Boolean)
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const avgWordsPerSentence = wordCount / sentenceCount
  const avgSyllablesPerWord = syllableCount / wordCount

  // Standard Flesch Reading Ease formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/word).
  // Syllable counts here are heuristic (see countSyllables), so this is
  // a simplified approximation, not an authoritative linguistic score —
  // and it is not a Google ranking factor.
  const raw = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
  const score = clampScore(raw)
  const label: ReadabilityResult['label'] = score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs improvement'
  const details = `${avgWordsPerSentence.toFixed(1)} words/sentence, ${avgSyllablesPerWord.toFixed(2)} syllables/word (simplified Flesch Reading Ease approximation).`

  return { score, label, details }
}

// ---------------------------------------------------------------------------
// Schema readiness — readiness indicators only, no schema generated.
// ---------------------------------------------------------------------------

function computeSchemaReadiness(input: AnalyzerInput): SchemaReadinessItem[] {
  const hasCore = Boolean(input.title.trim() && input.content.trim())
  const hasImage = Boolean(input.coverImage.trim() && input.coverImageAlt.trim())
  const validFaqCount = input.faq.filter((f) => f.question.trim() && f.answer.trim()).length

  return [
    {
      type: 'Article',
      status: hasCore ? 'ready' : 'missing_data',
      message: hasCore ? 'Title and content are present.' : 'Needs a title and content.',
    },
    {
      type: 'BlogPosting',
      status: hasCore && hasImage ? 'ready' : 'missing_data',
      message:
        hasCore && hasImage
          ? 'Title, content, and a featured image with alt text are present.'
          : 'Needs a title, content, and a featured image with alt text.',
    },
    {
      type: 'Breadcrumb',
      status: input.breadcrumbEnabled ? 'ready' : 'not_configured',
      message: input.breadcrumbEnabled ? 'Breadcrumb is enabled for this post.' : 'Breadcrumb is disabled for this post.',
    },
    {
      type: 'FAQ',
      status: validFaqCount > 0 ? 'ready' : 'not_configured',
      message: validFaqCount > 0 ? `${validFaqCount} complete FAQ item(s).` : 'No FAQ configured.',
    },
    {
      type: 'Person (author)',
      status: input.authorName ? 'ready' : 'missing_data',
      message: input.authorName
        ? `Author: ${input.authorName}.`
        : 'Author information will be available once this post is saved.',
    },
    {
      type: 'ImageObject',
      status: hasImage ? 'ready' : 'missing_data',
      message: hasImage ? 'Cover image and alt text are present.' : 'Needs a cover image and alt text.',
    },
    {
      type: 'HowTo',
      status: 'not_configured',
      message: 'No structured step-by-step data model exists yet — future phase.',
    },
    {
      type: 'Review',
      status: 'not_configured',
      message: 'No structured review/rating data model exists yet — future phase.',
    },
  ]
}

// ---------------------------------------------------------------------------
// Publish checklist — a different grouping of largely the same underlying
// facts, organized the way an editor reviews before publishing (Phase 7 spec, section 20).
// ---------------------------------------------------------------------------

function buildChecklist(
  input: AnalyzerInput,
  metrics: ContentMetrics,
  headingJumps: string[],
  toc: TocEntry[],
  schemaReadiness: SchemaReadinessItem[],
): ChecklistSection[] {
  const hasFocusKeyword = input.focusKeyword.trim().length > 0
  const validFaqCount = input.faq.filter((f) => f.question.trim() && f.answer.trim()).length
  const takeawayCount = input.keyTakeaways.filter((t) => t.trim()).length
  const schemaByType = new Map(schemaReadiness.map((s) => [s.type, s]))

  const content: AnalyzerCheck[] = [
    check('cl-title', 'Title present', input.title.trim() ? 'pass' : 'fail', input.title.trim() ? 'Set.' : 'Missing.'),
    check('cl-slug', 'Slug present', input.slug.trim() ? 'pass' : 'fail', input.slug.trim() ? 'Set.' : 'Missing.'),
    check('cl-excerpt', 'Excerpt present', input.excerpt.trim() ? 'pass' : 'fail', input.excerpt.trim() ? 'Set.' : 'Missing.'),
    check('cl-content', 'Content present', metrics.wordCount > 0 ? 'pass' : 'fail', metrics.wordCount > 0 ? `${metrics.wordCount} words.` : 'Empty.'),
  ]

  const seo: AnalyzerCheck[] = [
    check(
      'cl-focus-keyword',
      'Focus keyword configured',
      hasFocusKeyword ? 'pass' : 'warning',
      hasFocusKeyword ? 'Set.' : 'Not configured.',
    ),
    check(
      'cl-keyword-title',
      'Focus keyword appears in title',
      !hasFocusKeyword ? 'info' : containsKeyword(input.title, input.focusKeyword) ? 'pass' : 'warning',
      !hasFocusKeyword ? 'No focus keyword configured.' : containsKeyword(input.title, input.focusKeyword) ? 'Present.' : 'Not found in title.',
    ),
    check(
      'cl-keyword-slug',
      'Focus keyword appears in slug',
      !hasFocusKeyword ? 'info' : containsKeywordInSlug(input.slug, input.focusKeyword) ? 'pass' : 'warning',
      !hasFocusKeyword ? 'No focus keyword configured.' : containsKeywordInSlug(input.slug, input.focusKeyword) ? 'Present.' : 'Not found in slug.',
    ),
    check(
      'cl-seo-title',
      'SEO title present',
      (input.seoTitle.trim() || input.title.trim()) ? 'pass' : 'fail',
      input.seoTitle.trim() ? 'Set explicitly.' : input.title.trim() ? 'Falling back to title.' : 'Missing.',
    ),
    check(
      'cl-meta-description',
      'Meta description present',
      input.seoDescription.trim() ? 'pass' : 'warning',
      input.seoDescription.trim() ? 'Set.' : 'Falling back to excerpt.',
    ),
    check(
      'cl-canonical',
      'Canonical configured or acceptable default',
      'pass',
      input.canonicalUrl.trim() ? 'Explicit canonical set.' : 'No canonical set — the post’s own URL will apply as the default.',
    ),
    check(
      'cl-featured-image',
      'Featured image present',
      input.coverImage.trim() ? 'pass' : 'fail',
      input.coverImage.trim() ? 'Set.' : 'Missing.',
    ),
    check(
      'cl-image-alt',
      'Image ALT present',
      input.coverImageAlt.trim() ? 'pass' : 'fail',
      input.coverImageAlt.trim() ? 'Set.' : 'Missing.',
    ),
  ]

  const structure: AnalyzerCheck[] = [
    check(
      'cl-heading-structure',
      'Heading structure reasonable',
      headingJumps.length === 0 ? 'pass' : 'warning',
      headingJumps.length === 0 ? 'No level jumps.' : `${headingJumps.length} jump(s) detected.`,
    ),
    check(
      'cl-toc',
      'TOC available',
      toc.length >= 2 ? 'pass' : 'info',
      toc.length >= 2 ? `${toc.length} entries.` : 'Not enough headings yet for a useful TOC.',
    ),
    check(
      'cl-key-takeaways',
      'Key Takeaways present',
      takeawayCount > 0 ? 'pass' : 'warning',
      takeawayCount > 0 ? `${takeawayCount} item(s).` : 'Not configured.',
    ),
    check(
      'cl-faq',
      'FAQ configured where appropriate',
      validFaqCount > 0 ? 'pass' : 'info',
      validFaqCount > 0 ? `${validFaqCount} item(s).` : 'Not configured — add if the topic naturally has common questions.',
    ),
    check('cl-reading-time', 'Reading time calculated', 'info', `${metrics.readingTimeMinutes} min.`),
    check('cl-word-count', 'Word count calculated', 'info', `${metrics.wordCount} words.`),
  ]

  const entityAi: AnalyzerCheck[] = [
    check(
      'cl-main-entity',
      'Main entity configured',
      input.entitySeo?.mainEntity?.trim() ? 'pass' : 'warning',
      input.entitySeo?.mainEntity?.trim() ? 'Set.' : 'Not configured.',
    ),
    check(
      'cl-ai-summary',
      'AI Summary present',
      input.aiSummary.trim() ? 'pass' : 'warning',
      input.aiSummary.trim() ? 'Set.' : 'Not configured.',
    ),
    check(
      'cl-ai-context',
      'AI Context configured',
      input.aiContext ? 'pass' : 'warning',
      input.aiContext ? 'At least one AI Context field is set.' : 'Not configured.',
    ),
    check(
      'cl-content-intent',
      'Content intent configured',
      input.aiContext?.contentIntent?.trim() ? 'pass' : 'warning',
      input.aiContext?.contentIntent?.trim() ? `Set: ${input.aiContext.contentIntent}.` : 'Not configured.',
    ),
  ]

  const links: AnalyzerCheck[] = [
    check(
      'cl-internal-links',
      'Internal links present',
      metrics.internalLinkCount > 0 ? 'pass' : 'warning',
      metrics.internalLinkCount > 0 ? `${metrics.internalLinkCount} link(s).` : 'None found.',
    ),
    check(
      'cl-external-links',
      'External references present',
      metrics.externalLinkCount > 0 ? 'pass' : 'info',
      metrics.externalLinkCount > 0 ? `${metrics.externalLinkCount} link(s).` : 'None found.',
    ),
  ]

  function schemaCheck(id: string, label: string, type: string): AnalyzerCheck {
    const entry = schemaByType.get(type)
    const status: CheckStatus = entry?.status === 'ready' ? 'pass' : entry?.status === 'not_configured' ? 'info' : 'warning'
    return check(id, label, status, entry?.message ?? 'Unknown.')
  }

  const schema: AnalyzerCheck[] = [
    schemaCheck('cl-schema-article', 'Article ready', 'Article'),
    schemaCheck('cl-schema-breadcrumb', 'Breadcrumb ready if enabled', 'Breadcrumb'),
    schemaCheck('cl-schema-faq', 'FAQ ready if FAQ exists', 'FAQ'),
    schemaCheck('cl-schema-author', 'Author readiness', 'Person (author)'),
    schemaCheck('cl-schema-image', 'Image readiness', 'ImageObject'),
  ]

  return [
    { section: 'Content', items: content },
    { section: 'SEO', items: seo },
    { section: 'Structure', items: structure },
    { section: 'Entity / AI', items: entityAi },
    { section: 'Links', items: links },
    { section: 'Schema readiness', items: schema },
  ]
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function analyzeBlog(input: AnalyzerInput): AnalysisResult {
  const parsed = parseMarkdown(input.content)
  const wordCount = computeWordCount(parsed.plainText)
  const readingTimeMinutes = computeReadingTimeMinutes(wordCount)

  const internalLinkCount = parsed.links.filter((l) => classifyLink(l.url) === 'internal').length
  const externalLinkCount = parsed.links.length - internalLinkCount

  const metrics: ContentMetrics = {
    wordCount,
    readingTimeMinutes,
    paragraphCount: parsed.paragraphCount,
    headingCount: parsed.headings.length,
    h1Count: parsed.headings.filter((h) => h.level === 1).length,
    h2Count: parsed.headings.filter((h) => h.level === 2).length,
    h3Count: parsed.headings.filter((h) => h.level === 3).length,
    h4Count: parsed.headings.filter((h) => h.level === 4).length,
    imageCount: parsed.images.length,
    linkCount: parsed.links.length,
    internalLinkCount,
    externalLinkCount,
    codeBlockCount: parsed.codeBlockCount,
    blockquoteCount: parsed.blockquoteCount,
  }

  const toc = buildToc(parsed.headings)
  const headingWarnings = detectHeadingJumps(parsed.headings)
  const readability = computeReadability(parsed.plainText, wordCount)
  const schemaReadiness = computeSchemaReadiness(input)

  const seo = analyzeSeo(input, parsed.headings, metrics, headingWarnings)
  const aeo = analyzeAeo(input, parsed.headings)
  const geo = analyzeGeo(input, metrics)
  const checklist = buildChecklist(input, metrics, headingWarnings, toc, schemaReadiness)

  return {
    metrics,
    toc,
    headingWarnings,
    seo,
    aeo,
    geo,
    readability,
    schemaReadiness,
    checklist,
  }
}
