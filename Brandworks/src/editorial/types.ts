export type EditorialKind = 'blog' | 'news'

/**
 * One block of article body copy. Kept deliberately small: these are
 * the only shapes an editorial article needs, and each one maps to a
 * single, consistently styled element in ArticleBody.
 *
 * Paragraphs, list items and quotes accept inline `[label](/href)`
 * links — nothing else is parsed.
 */
export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | {
      type: 'image'
      src: string
      alt: string
      caption?: string
      /** normal = reading column, wide = up to 1120px, full = edge to edge (use rarely). */
      size?: 'normal' | 'wide' | 'full'
    }

export interface EditorialPost {
  slug: string
  title: string
  /** Used as the card excerpt and as the article's standfirst. */
  excerpt: string
  category: string
  image: string
  imageAlt: string
  imageCaption?: string
  author: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  featured?: boolean
  body: ArticleBlock[]
}
