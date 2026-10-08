import { connection } from 'next/server'
import type { Metadata } from 'next'
import EditorialIndexClient from '../../../src/next/EditorialIndexClient'
import { editorialIndexMetadata, getEditorialIndexSchema, serializeJsonLd } from '../../../src/editorial/seo'

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

export default async function BlogPage() {
  await connection()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(getEditorialIndexSchema('blog')) }} />
      <EditorialIndexClient kind="blog" />
    </>
  )
}
