import { describe, expect, it } from 'vitest'
import { articleMetadata } from './metadata'
import { buildArticleSchemaGraph } from './schema'
import { legacyEditorialRecords } from '../../server/services/public-blog-migration'

describe('CMS newsroom SEO', () => {
  it('uses newsroom URLs and CMS metadata in canonical, Open Graph and JSON-LD', () => {
    const post = { ...legacyEditorialRecords().find((p) => p.contentType === 'newsroom')!, seoTitle: 'Custom newsroom title', seoDescription: 'Custom description', ogTitle: 'Social title' }
    const metadata = articleMetadata(post)
    expect(metadata).toMatchObject({ title: 'Custom newsroom title | BRANDWORKS', description: 'Custom description', alternates: { canonical: `https://brandworks.me/news/${post.slug}` }, openGraph: { title: 'Social title', url: `https://brandworks.me/news/${post.slug}` } })
    const schema = buildArticleSchemaGraph(post, { origin: 'https://brandworks.me', siteName: 'BRANDWORKS' })
    expect(schema['@graph']).toEqual(expect.arrayContaining([expect.objectContaining({ '@type': ['NewsArticle', 'Article'] }), expect.objectContaining({ '@type': 'BreadcrumbList', itemListElement: expect.arrayContaining([expect.objectContaining({ name: 'Newsroom', item: 'https://brandworks.me/news' })]) })]))
  })
})
