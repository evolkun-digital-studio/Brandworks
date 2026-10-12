/**
 * Deterministic, dependency-light Markdown analysis.
 *
 * This is deliberately NOT a full Markdown parser (no AST, no
 * `remark`/`unified` pipeline) — react-markdown/remark-gfm (already
 * installed) don't expose a standalone "parse to AST" function for
 * reuse outside of React rendering, and importing their internal
 * transitive dependencies directly would be relying on undeclared,
 * unstable internals. Per the Phase 7 spec, a full parser isn't
 * needed here anyway: a small set of well-documented regex passes is
 * enough to extract headings/links/images/code/quotes and to produce
 * a "plain prose" version of the text for word counting, and it stays
 * fast, dependency-free, and easy to reason about.
 *
 * Every function here is pure: same input always produces the same
 * output, no I/O, no randomness, no network access.
 */

export interface Heading {
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Inline Markdown (bold/italic/code/links) stripped to plain display text. */
  text: string
  line: number
}

export interface MarkdownLink {
  text: string
  url: string
}

export interface MarkdownImage {
  alt: string
  url: string
}

export interface ParsedMarkdown {
  headings: Heading[]
  links: MarkdownLink[]
  images: MarkdownImage[]
  codeBlockCount: number
  blockquoteCount: number
  paragraphCount: number
  /** `[text]()` — a link with an empty URL is the one unambiguous "obviously malformed" signal we flag. */
  malformedLinkCount: number
  /** Markdown syntax stripped down to prose, for word counting — see toPlainText(). */
  plainText: string
}

const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g
const HEADING_LINE_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]*)\)/g
// Negative lookbehind excludes image syntax (`![...]...`) from also
// matching as a link, since both share the same `[...](...)` shape.
const LINK_PATTERN = /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g
const BLOCKQUOTE_LINE_PATTERN = /^>\s?/
const UNORDERED_LIST_LINE_PATTERN = /^\s*[-*+]\s+/
const ORDERED_LIST_LINE_PATTERN = /^\s*\d+\.\s+/
const TABLE_ROW_PATTERN = /^\s*\|/
const HORIZONTAL_RULE_PATTERN = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/

/** Strips inline Markdown formatting, leaving plain readable text (used for heading/TOC display text). */
function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
}

/**
 * Reduces Markdown source to plain prose for word counting. Rules,
 * applied in order:
 *  1. Images removed entirely (alt text isn't article prose).
 *  2. Links replaced by their visible text (the text IS prose; the URL isn't).
 *  3. Inline code removed (code isn't prose; fenced blocks are already
 *     stripped by the caller before this runs).
 *  4. Heading/blockquote/list-marker/table-pipe/horizontal-rule syntax
 *     removed, keeping whatever text followed them.
 *  5. Emphasis markers (bold/italic/strikethrough) removed, keeping the text.
 */
function toPlainText(contentWithoutCodeBlocks: string): string {
  return contentWithoutCodeBlocks
    .replace(IMAGE_PATTERN, ' ')
    .replace(LINK_PATTERN, '$1')
    .replace(/`[^`]*`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, ' ')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/~~([^~]*)~~/g, '$1')
}

/**
 * Meaningful word count — deliberately not `content.split(' ').length`
 * (see module comment). After the Markdown-stripping above, a token
 * is only counted as a word if it contains at least one letter or
 * digit — this excludes stray leftover punctuation (e.g. a lone "."
 * that remains after removing an adjacent inline-code span).
 */
export function computeWordCount(plainText: string): number {
  const words = plainText
    .trim()
    .split(/\s+/)
    .filter((token) => /[a-z0-9]/i.test(token))
  return words.length
}

export function parseMarkdown(content: string): ParsedMarkdown {
  const codeBlockMatches = content.match(FENCED_CODE_BLOCK_PATTERN) ?? []
  // Replaced with the same number of blank lines the block itself
  // spanned (not collapsed to a single line) so every line number
  // after a code block — including each Heading's `line` below —
  // still matches the original source's own line numbering. That
  // matters beyond just "sane paragraph boundaries": ArticleMarkdown.tsx
  // relies on Heading.line lining up 1:1 with react-markdown's own
  // `node.position.start.line` (which is computed against the
  // unmodified original source) to assign TOC ids without guessing.
  const withoutCode = content.replace(
    FENCED_CODE_BLOCK_PATTERN,
    (match) => '\n'.repeat(match.split('\n').length - 1),
  )

  const lines = withoutCode.split('\n')

  const headings: Heading[] = []
  lines.forEach((line, index) => {
    const match = HEADING_LINE_PATTERN.exec(line)
    if (match) {
      headings.push({
        level: match[1].length as Heading['level'],
        text: cleanInlineMarkdown(match[2]),
        line: index,
      })
    }
  })

  const images: MarkdownImage[] = []
  for (const match of withoutCode.matchAll(IMAGE_PATTERN)) {
    images.push({ alt: match[1].trim(), url: match[2].trim() })
  }

  // Links are extracted with images already stripped out, so image
  // syntax is never double-counted as a link too.
  const withoutImages = withoutCode.replace(IMAGE_PATTERN, '')
  const links: MarkdownLink[] = []
  let malformedLinkCount = 0
  for (const match of withoutImages.matchAll(LINK_PATTERN)) {
    const url = match[2].trim()
    if (!url) {
      malformedLinkCount += 1
      continue
    }
    links.push({ text: match[1].trim(), url })
  }

  // Blockquotes: a contiguous run of `>` lines counts as one blockquote.
  let blockquoteCount = 0
  let inBlockquote = false
  for (const line of lines) {
    const isQuoteLine = BLOCKQUOTE_LINE_PATTERN.test(line)
    if (isQuoteLine && !inBlockquote) {
      blockquoteCount += 1
      inBlockquote = true
    } else if (!isQuoteLine) {
      inBlockquote = false
    }
  }

  // Paragraphs: contiguous non-empty lines that aren't a heading,
  // blockquote, list item, table row, or horizontal rule.
  let paragraphCount = 0
  let inParagraph = false
  for (const line of lines) {
    const trimmed = line.trim()
    const isStructural =
      trimmed.length === 0 ||
      HEADING_LINE_PATTERN.test(line) ||
      BLOCKQUOTE_LINE_PATTERN.test(line) ||
      UNORDERED_LIST_LINE_PATTERN.test(line) ||
      ORDERED_LIST_LINE_PATTERN.test(line) ||
      TABLE_ROW_PATTERN.test(line) ||
      HORIZONTAL_RULE_PATTERN.test(line)

    if (!isStructural) {
      if (!inParagraph) {
        paragraphCount += 1
        inParagraph = true
      }
    } else {
      inParagraph = false
    }
  }

  const plainText = toPlainText(withoutCode)

  return {
    headings,
    links,
    images,
    codeBlockCount: codeBlockMatches.length,
    blockquoteCount,
    paragraphCount,
    malformedLinkCount,
    plainText,
  }
}

// 225 wpm — the documented midpoint of the commonly cited 200-250
// words/minute range for adult silent reading. A single fixed,
// documented value keeps reading time deterministic.
const READING_WORDS_PER_MINUTE = 225

export function computeReadingTimeMinutes(wordCount: number): number {
  if (wordCount === 0) return 0
  // Never rounds down to 0 for non-empty content.
  return Math.max(1, Math.round(wordCount / READING_WORDS_PER_MINUTE))
}

/**
 * Internal/external link classification. There's no configured public
 * site domain constant anywhere in this frontend to check against
 * reliably (see the Phase 7 report), so this uses the conservative
 * heuristic the spec explicitly allows: a relative path, hash anchor,
 * `mailto:`/`tel:` link, or anything that fails to parse as an
 * absolute URL is treated as internal; an absolute http(s) URL is
 * internal only if its hostname looks like a BRANDWORKS domain,
 * otherwise external.
 */
export function classifyLink(url: string): 'internal' | 'external' {
  const trimmed = url.trim()
  if (!trimmed) return 'internal'
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return 'internal'
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return 'internal'
  try {
    const parsed = new URL(trimmed)
    return parsed.hostname.toLowerCase().includes('brandworks') ? 'internal' : 'external'
  } catch {
    return 'internal'
  }
}

const QUESTION_WORD_PATTERN = /^(what|why|how|when|where|who|which|can|does|do|is|are|should|will)\b/i

/** Heuristic only — no semantic understanding, just punctuation/wording. */
export function isQuestionHeading(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return trimmed.endsWith('?') || QUESTION_WORD_PATTERN.test(trimmed)
}

/** Detects a heading level jump (e.g. H2 straight to H4) skipping an intermediate level. */
export function detectHeadingJumps(headings: Heading[]): string[] {
  const warnings: string[] = []
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1]
    const curr = headings[i]
    if (curr.level > prev.level + 1) {
      warnings.push(
        `Heading jumps from H${prev.level} to H${curr.level} ("${curr.text || 'untitled heading'}") without an H${prev.level + 1} in between.`,
      )
    }
  }
  return warnings
}

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3 | 4
}

function slugifyHeadingText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * TOC from H2-H4 only (H1 excluded — the page title is the H1). IDs
 * are deterministic slugs of the heading text; a repeated heading
 * gets a `-2`, `-3`, ... suffix so every id stays unique. Not written
 * back into stored Markdown — this is derived data only, for a future
 * public renderer to consume (Phase 7 spec, section 10).
 */
export function buildToc(headings: Heading[]): TocEntry[] {
  const seen = new Map<string, number>()
  const entries: TocEntry[] = []

  for (const heading of headings) {
    if (heading.level < 2 || heading.level > 4) continue
    const base = slugifyHeadingText(heading.text) || 'section'
    const priorCount = seen.get(base) ?? 0
    seen.set(base, priorCount + 1)
    const id = priorCount === 0 ? base : `${base}-${priorCount + 1}`
    entries.push({ id, text: heading.text, level: heading.level as 2 | 3 | 4 })
  }

  return entries
}
