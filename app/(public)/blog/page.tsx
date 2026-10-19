import type { Metadata } from 'next'
import { listPublicBlogPage } from '../../../src/server/services/public-blog.service'
import PublicBlogIndex from '../../../src/next/PublicBlogIndex'
import { editorialIndexMetadata, getEditorialIndexSchema, serializeJsonLd } from '../../../src/editorial/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: editorialIndexMetadata.blog.title,
  description: editorialIndexMetadata.blog.description,
  alternates: { canonical: editorialIndexMetadata.blog.path },
  openGraph: {
    type: 'website',
    title: editorialIndexMetadata.blog.title,
    description: editorialIndexMetadata.blog.description,
    url: editorialIndexMetadata.blog.path,
  },
  twitter: {
    card: 'summary',
    title: editorialIndexMetadata.blog.title,
    description: editorialIndexMetadata.blog.description,
  },
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function toSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams()
  const page = input.page
  if (typeof page === 'string') params.set('page', page)
  else if (Array.isArray(page) && page[0]) params.set('page', page[0])
  return params
}

export default async function BlogPage({ searchParams }: Props) {
  const { result, legacyFallback } = await listPublicBlogPage(toSearchParams(await searchParams))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getEditorialIndexSchema('blog')) }} />
      <PublicBlogIndex result={result} legacyFallback={legacyFallback} />
    </>
  )
}
