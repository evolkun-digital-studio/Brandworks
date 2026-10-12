import type { Metadata } from 'next'
import EditorialArticleClient from '../../../../src/next/EditorialArticleClient'
import { blogPosts } from '../../../../src/editorial/data'
import { getEditorialArticleSchema, getEditorialPost, serializeJsonLd } from '../../../../src/editorial/seo'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return blogPosts.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getEditorialPost('blog', slug)
  if (!post) {
    return {
      title: 'Story Not Found | BRANDWORKS',
      robots: { index: false, follow: false },
    }
  }

  const title = `${post.title} | BRANDWORKS`
  const path = `/blog/${post.slug}`
  const image = `${post.image}?auto=format&fit=crop&w=1200&h=630&q=80`
  return {
    title,
    description: post.excerpt,
    alternates: { canonical: path },
    openGraph: { type: 'article', title, description: post.excerpt, url: path, images: [image] },
    twitter: { card: 'summary_large_image', title, description: post.excerpt, images: [image] },
  }
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const post = getEditorialPost('blog', slug)
  return (
    <>
      {post && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getEditorialArticleSchema('blog', post)) }} />}
      <EditorialArticleClient kind="blog" />
    </>
  )
}
