/**
 * Minimal, dependency-free XML helpers for sitemap.xml (Phase 9). No
 * XML library is pulled in for this — the only document this project
 * ever generates is a flat `<urlset>` of `<url><loc>/<lastmod></url>`
 * entries, which is a handful of lines of string-building rather than
 * something that earns a whole dependency.
 */

/**
 * Escapes the five characters XML requires escaping in text/attribute
 * content. Order matters: `&` must be escaped first, or the `&` this
 * function itself inserts for `<`/`>`/etc. would get double-escaped.
 */
export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface SitemapUrlEntry {
  loc: string
  /** ISO 8601 timestamp — a valid W3C Datetime per the sitemap protocol. Omit rather than invent one. */
  lastmod?: string
}

/**
 * A standard sitemap has a 50,000 URL / 50MB per-file limit. This
 * project is nowhere near that, so a single `<urlset>` is correct for
 * now (Phase 9 spec, Part 8) — this constant exists only so a future
 * split into a `<sitemapindex>` of multiple files has an explicit,
 * already-named threshold to check against, not so it can be enforced
 * here today.
 */
export const SITEMAP_URL_LIMIT = 50_000

/** Serializes a list of already-deduplicated, already-validated entries into a complete sitemap.xml document. */
export function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const urlBlocks = entries.map((entry) => {
    const lines = [`    <loc>${escapeXmlText(entry.loc)}</loc>`]
    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXmlText(entry.lastmod)}</lastmod>`)
    }
    return `  <url>\n${lines.join('\n')}\n  </url>`
  })

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (urlBlocks.length > 0 ? `${urlBlocks.join('\n')}\n` : '') +
    '</urlset>\n'
  )
}
