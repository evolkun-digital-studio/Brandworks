export type ContentType = 'journal' | 'newsroom'

/** Records created before content types were introduced belong to the Journal. */
export function contentPath(contentType?: ContentType): '/blog' | '/news' {
  return contentType === 'newsroom' ? '/news' : '/blog'
}
