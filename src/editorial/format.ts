import type { ArticleBlock, EditorialKind, EditorialPost } from './types'

export const hrefFor = (kind: EditorialKind, post: EditorialPost) => `/${kind}/${post.slug}`

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Formats a YYYY-MM-DD string without going through `Date`, so a
 * visitor west of UTC never sees the previous day, and without Intl,
 * whose en-GB output ("Sept") differs between engines.
 */
export function formatDate(iso: string, style: 'short' | 'long' = 'long'): string {
  const [year, month, day] = iso.split('-').map(Number)
  const names = style === 'long' ? MONTHS_LONG : MONTHS_SHORT
  return `${day} ${names[month - 1]} ${year}`
}

function blockText(block: ArticleBlock): string {
  switch (block.type) {
    case 'list':
      return block.items.join(' ')
    case 'image':
      return ''
    default:
      return block.text
  }
}

/** Minutes at 200 words a minute, any partial minute counted. */
export function readingTime(post: EditorialPost): string {
  const words = [post.excerpt, ...post.body.map(blockText)]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 200))} min read`
}

/** `?category=` value for a category label. */
export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Unsplash serves any width on request, so editorial images get a real
 * srcset. Any other host is used verbatim — nothing is fabricated for
 * URLs this module doesn't understand.
 */
export function imageSources(src: string, widths: number[]): { src: string; srcSet?: string } {
  if (!src.startsWith('https://images.unsplash.com/')) return { src }
  const base = src.split('?')[0]
  const at = (w: number) => `${base}?auto=format&fit=crop&w=${w}&q=80`
  return {
    src: at(widths[Math.floor(widths.length / 2)]),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', '),
  }
}
