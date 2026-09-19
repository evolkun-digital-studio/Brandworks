/**
 * One formatter reused by the homepage cards, the /blog listing, and
 * the detail page, so a post's date reads identically everywhere —
 * e.g. "September 12, 2026". No date library needed for this.
 */
export function formatBlogDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
