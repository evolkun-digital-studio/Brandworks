import { useEffect, useLayoutEffect } from 'react'
import {
  removeJsonLd,
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setJsonLd,
  setLinkTag,
  setMetaTag,
} from '../blog/lib/documentHead'

const JSONLD_ID = 'brandworks-editorial-schema'

type PageMeta = {
  title: string
  description: string
  /** Path on this site, e.g. /blog/some-slug. */
  path: string
  image?: string
  type: 'website' | 'article'
  jsonLd: (origin: string, canonical: string) => object
}

/**
 * Title, description, canonical, Open Graph, Twitter and JSON-LD for an
 * editorial page. Everything is removed on unmount, the same convention
 * the rest of the site follows, so nothing leaks into the next route.
 * Pass null while there is nothing to describe (e.g. a missing article).
 */
export function useEditorialMeta(meta: PageMeta | null) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const title = meta?.title
  const description = meta?.description ?? ''
  const canonical = meta ? `${origin}${meta.path}` : ''
  const image = meta?.image
  const type = meta?.type ?? 'website'
  const jsonLd = meta ? JSON.stringify(meta.jsonLd(origin, canonical)) : ''

  useEffect(() => {
    if (!title) return
    const previousTitle = document.title

    setDocumentTitle(title)
    setMetaTag('name', 'description', description)
    setLinkTag('canonical', canonical)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:url', canonical)
    setMetaTag('property', 'og:title', title)
    setMetaTag('property', 'og:description', description)
    if (image) setMetaTag('property', 'og:image', image)
    setMetaTag('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setMetaTag('name', 'twitter:title', title)
    setMetaTag('name', 'twitter:description', description)
    if (image) setMetaTag('name', 'twitter:image', image)
    setJsonLd(JSONLD_ID, jsonLd)

    return () => {
      setDocumentTitle(previousTitle)
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
      for (const p of ['og:type', 'og:url', 'og:title', 'og:description', 'og:image']) removeMetaTag('property', p)
      for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) removeMetaTag('name', n)
      removeJsonLd(JSONLD_ID)
    }
  }, [title, description, canonical, image, type, jsonLd])
}

/**
 * The router keeps the previous page's scroll position, so an article
 * opened from the foot of the index would otherwise load mid-page.
 */
export function useScrollToTop(dependency: string) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [dependency])
}
