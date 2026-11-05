import type { Metadata } from 'next'
import { articleMetadata } from '../../../../src/blog/lib/metadata'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicBlogPage, getPublicBlogRedirect, listPublicBlogPage } from '../../../../src/server/services/public-blog.service'
import PublicNewsArticle from '../../../../src/next/PublicNewsArticle'
import { buildArticleSchemaGraph, serializeJsonLd } from '../../../../src/blog/lib/schema'
import { ApiError } from '../../../../src/server/http/errors'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { blog } = await getPublicBlogPage(slug, undefined, 'newsroom')
    return articleMetadata(blog)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
    return { title: 'Story Not Found | BRANDWORKS', robots: { index: false, follow: false } }
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params
  const redirectTo = await getPublicBlogRedirect(slug, 'newsroom')
  if (redirectTo) permanentRedirect(`/news/${redirectTo}`)
  let resolved
  try {
    resolved = await getPublicBlogPage(slug, undefined, 'newsroom')
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
    notFound()
  }
  const relatedResult = await listPublicBlogPage(new URLSearchParams('page=1&limit=4'), 'newsroom')
  const related = relatedResult.result.items.filter((item) => item.slug !== resolved.blog.slug).slice(0, 3)
  const schema = buildArticleSchemaGraph(resolved.blog, { origin: 'https://brandworks.me', siteName: 'BRANDWORKS' })
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <PublicNewsArticle post={resolved.blog} related={related} />
    </>
  )
}
