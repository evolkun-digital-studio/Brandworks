import { useEffect } from 'react'
import { setDocumentTitle, setMetaTag, removeMetaTag } from '../blog/lib/documentHead'

/**
 * Applies a plain, noindex'd title for a page state that has no real
 * content to represent — a 404/not-found route, or an article page's
 * own notFound/error state (Phase 13, Part 6/15). Used by both
 * NotFound.tsx and BlogDetailPage.tsx rather than duplicating the
 * same set-title/set-robots/cleanup effect twice.
 *
 * Restores whatever title/robots state was active before on cleanup —
 * the same pattern every other document-head effect in this codebase
 * already follows (see BlogPage.tsx/BlogDetailPage.tsx).
 */
export function useNoIndexPage(title: string, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previousTitle = document.title
    setDocumentTitle(title)
    setMetaTag('name', 'robots', 'noindex,nofollow')
    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'robots')
    }
  }, [title, active])
}
