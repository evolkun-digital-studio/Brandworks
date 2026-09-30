/**
 * Minimal, dependency-free document-head management — the project has
 * no existing head-management library and none is warranted for this
 * (no SSR, no large SEO framework). Used by the blog list/detail pages
 * to set per-page title/description/canonical/robots/OG/Twitter tags
 * and JSON-LD, and cleaned up again on unmount so navigating away
 * never leaks one page's metadata onto another (see BlogDetailPage.tsx
 * and BlogPage.tsx for the set-then-cleanup pattern).
 */

export function setDocumentTitle(title: string): void {
  document.title = title
}

export function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function removeMetaTag(attr: 'name' | 'property', key: string): void {
  document.querySelector(`meta[${attr}="${key}"]`)?.remove()
}

/** For `<link rel="canonical" href="...">` — only one canonical tag is ever kept active. */
export function setLinkTag(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function removeLinkTag(rel: string): void {
  document.querySelector(`link[rel="${rel}"]`)?.remove()
}

/**
 * Sets a `<script type="application/ld+json">` tag's content via a
 * direct `.textContent` DOM assignment — never `dangerouslySetInnerHTML`
 * / `innerHTML`. A `.textContent` assignment is a plain property write,
 * not an HTML-parsing step, so it cannot be broken out of by a
 * `</script>` sequence the way an HTML-string insertion could; the
 * caller (see schema.ts's serializeJsonLd) also escapes `<` in the
 * JSON as a second, defense-in-depth layer on top of that.
 */
export function setJsonLd(id: string, json: string): void {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = json
}

export function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove()
}
