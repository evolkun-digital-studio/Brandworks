import { connection } from 'next/server'
import type { Metadata } from 'next'
import EditorialIndexClient from '../../../src/next/EditorialIndexClient'
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

export default async function NewsPage() {
  await connection()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getEditorialIndexSchema('news')) }} />
      <EditorialIndexClient kind="news" />
    </>
  )
}
