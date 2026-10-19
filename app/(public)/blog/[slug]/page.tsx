import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicBlogPage, getPublicBlogRedirect, listPublicBlogPage } from '../../../../src/server/services/public-blog.service'
import PublicBlogArticle from '../../../../src/next/PublicBlogArticle'
import { buildArticleSchemaGraph, resolveCanonicalUrl, serializeJsonLd } from '../../../../src/blog/lib/schema'
import { ApiError } from '../../../../src/server/http/errors'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { blog } = await getPublicBlogPage(slug)
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
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
    return { title: 'Story Not Found | BRANDWORKS', robots: { index: false, follow: false } }
  }
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const redirectTo = await getPublicBlogRedirect(slug)
  if (redirectTo) permanentRedirect(`/blog/${redirectTo}`)
  let resolved
  try {
    resolved = await getPublicBlogPage(slug)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
    notFound()
  }
  const relatedResult = await listPublicBlogPage(new URLSearchParams('page=1&limit=4'))
  const related = relatedResult.result.items.filter((item) => item.slug !== resolved.blog.slug).slice(0, 3)
  const schema = buildArticleSchemaGraph(resolved.blog, { origin: 'https://brandworks.me', siteName: 'BRANDWORKS' })
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <PublicBlogArticle post={resolved.blog} related={related} />
    </>
  )
}
