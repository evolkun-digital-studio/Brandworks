import type { Metadata } from 'next'
import PublicNewsIndex from '../../../src/next/PublicNewsIndex'
import { listPublicBlogPage } from '../../../src/server/services/public-blog.service'
import { editorialIndexMetadata, getEditorialIndexSchema, serializeJsonLd } from '../../../src/editorial/seo'

export const metadata: Metadata = {
  title: editorialIndexMetadata.news.title,
  description: editorialIndexMetadata.news.description,
  alternates: { canonical: editorialIndexMetadata.news.path },
  openGraph: {
    type: 'website',
    title: editorialIndexMetadata.news.title,
    description: editorialIndexMetadata.news.description,
    url: editorialIndexMetadata.news.path,
  },
  twitter: {
    card: 'summary',
    title: editorialIndexMetadata.news.title,
    description: editorialIndexMetadata.news.description,
  },
}

export const revalidate = 60

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { page } = await searchParams
  const params = new URLSearchParams({ limit: '20' })
  if (page) params.set('page', Array.isArray(page) ? page[0] : page)
  const { result } = await listPublicBlogPage(params, 'newsroom')
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getEditorialIndexSchema('news')) }} />
      <PublicNewsIndex result={result} />
    </>
  )
}
