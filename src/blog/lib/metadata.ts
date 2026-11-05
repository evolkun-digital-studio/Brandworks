import type { Metadata } from 'next'
import type { PublicBlogDetail } from '../api/types'
import { resolveCanonicalUrl } from './schema'

/** Shared SEO mapping for both CMS publication types. */
export function articleMetadata(blog: PublicBlogDetail): Metadata {
  const title = blog.seoTitle || blog.title
  const description = blog.seoDescription || blog.excerpt
  const image = blog.ogImage || blog.coverImage
  const canonical = resolveCanonicalUrl(blog, { origin: 'https://brandworks.me', siteName: 'BRANDWORKS' })
  return {
    title: title.toUpperCase().includes('BRANDWORKS') ? title : `${title} | BRANDWORKS`,
    description,
    alternates: { canonical },
    robots: blog.robotsIndex ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'article',
      title: blog.ogTitle || title,
      description: blog.ogDescription || description,
      url: canonical,
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      authors: [blog.authorName],
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: blog.twitterCard || 'summary_large_image',
      title: blog.ogTitle || title,
      description: blog.ogDescription || description,
      ...(image ? { images: [image] } : {}),
    },
  }
}
