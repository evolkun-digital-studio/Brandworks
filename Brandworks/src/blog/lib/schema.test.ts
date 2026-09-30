import { describe, expect, it } from 'vitest'
import { buildArticleSchemaGraph, resolveCanonicalUrl, serializeJsonLd } from './schema'
import type { PublicBlogDetail } from '../api/types'
import type { SiteContext } from './schema'

const SITE: SiteContext = { origin: 'https://brandworks.com', siteName: 'BRANDWORKS' }

function basePost(overrides: Partial<PublicBlogDetail> = {}): PublicBlogDetail {
  return {
    id: '1',
    title: 'A Complete Guide to Technical SEO',
    slug: 'complete-guide-technical-seo',
    excerpt: 'Everything you need to know about technical SEO.',
    content: '## Heading\n\nSome content.',
    coverImage: 'https://example.com/cover.jpg',
    coverImageAlt: 'A diagram',
    coverImageTitle: null,
    coverImageCaption: null,
    coverImageDescription: null,
    authorName: 'Jane Doe',
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    seoTitle: null,
    seoDescription: null,
    category: null,
    tags: [],
    aiSummary: null,
    keyTakeaways: [],
    aiContext: null,
    entitySeo: null,
    faq: [],
    expertQuote: null,
    canonicalUrl: null,
    robotsIndex: true,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    breadcrumbEnabled: true,
    ...overrides,
  }
}

function graphByType(graph: Record<string, unknown>, type: string) {
  const nodes = (graph['@graph'] as Record<string, unknown>[]) ?? []
  return nodes.find((n) => {
    const t = n['@type']
    return t === type || (Array.isArray(t) && t.includes(type))
  })
}

describe('buildArticleSchemaGraph — basic article', () => {
  const graph = buildArticleSchemaGraph(basePost(), SITE)

  it('includes Organization, Person, ImageObject, WebPage, and BlogPosting', () => {
    expect(graphByType(graph, 'Organization')).toBeDefined()
    expect(graphByType(graph, 'Person')).toBeDefined()
    expect(graphByType(graph, 'ImageObject')).toBeDefined()
    expect(graphByType(graph, 'WebPage')).toBeDefined()
    expect(graphByType(graph, 'BlogPosting')).toBeDefined()
  })

  it('uses BlogPosting combined with Article, not a separate Article entity', () => {
    const nodes = graph['@graph'] as Record<string, unknown>[]
    const articleTyped = nodes.filter((n) => {
      const t = n['@type']
      return t === 'Article' || (Array.isArray(t) && t.includes('Article'))
    })
    expect(articleTyped).toHaveLength(1)
    expect(articleTyped[0]['@type']).toEqual(['BlogPosting', 'Article'])
  })

  it('does not invent Organization contact details', () => {
    const org = graphByType(graph, 'Organization') as Record<string, unknown>
    expect(org.address).toBeUndefined()
    expect(org.telephone).toBeUndefined()
    expect(org.sameAs).toBeUndefined()
    expect(org.founder).toBeUndefined()
  })

  it('does not invent author URL/email/image', () => {
    const person = graphByType(graph, 'Person') as Record<string, unknown>
    expect(person.name).toBe('Jane Doe')
    expect(person.url).toBeUndefined()
    expect(person.email).toBeUndefined()
    expect(person.image).toBeUndefined()
  })

  it('includes BreadcrumbList when breadcrumbEnabled is true', () => {
    expect(graphByType(graph, 'BreadcrumbList')).toBeDefined()
  })

  it('links author/publisher/image by @id reference rather than duplicating them inline', () => {
    const blogPosting = graphByType(graph, 'BlogPosting') as Record<string, unknown>
    expect(blogPosting.author).toHaveProperty('@id')
    expect(blogPosting.publisher).toHaveProperty('@id')
    expect(blogPosting.image).toHaveProperty('@id')
  })
})

describe('FAQ schema', () => {
  it('generates FAQPage with exactly the visible question/answer data when FAQ exists', () => {
    const post = basePost({
      faq: [
        { question: 'What is technical SEO?', answer: 'It is the practice of optimizing infrastructure.' },
        { question: 'Why does it matter?', answer: 'It affects crawlability.' },
      ],
    })
    const graph = buildArticleSchemaGraph(post, SITE)
    const faqPage = graphByType(graph, 'FAQPage') as Record<string, unknown>
    expect(faqPage).toBeDefined()
    const entities = faqPage.mainEntity as Record<string, unknown>[]
    expect(entities).toHaveLength(2)
    expect(entities[0].name).toBe('What is technical SEO?')
    expect((entities[0].acceptedAnswer as Record<string, unknown>).text).toBe(
      'It is the practice of optimizing infrastructure.',
    )
  })

  it('produces no FAQPage when there is no FAQ', () => {
    const graph = buildArticleSchemaGraph(basePost(), SITE)
    expect(graphByType(graph, 'FAQPage')).toBeUndefined()
  })

  it('excludes malformed (incomplete) FAQ entries rather than emitting them', () => {
    const post = basePost({
      faq: [
        { question: 'Complete question?', answer: 'Complete answer.' },
        { question: '', answer: 'An answer with no question.' },
        { question: 'A question with no answer?', answer: '' },
      ],
    })
    const graph = buildArticleSchemaGraph(post, SITE)
    const faqPage = graphByType(graph, 'FAQPage') as Record<string, unknown>
    const entities = faqPage.mainEntity as Record<string, unknown>[]
    expect(entities).toHaveLength(1)
    expect(entities[0].name).toBe('Complete question?')
  })
})

describe('breadcrumb disabled', () => {
  const graph = buildArticleSchemaGraph(basePost({ breadcrumbEnabled: false }), SITE)

  it('produces no BreadcrumbList node', () => {
    expect(graphByType(graph, 'BreadcrumbList')).toBeUndefined()
  })

  it('the WebPage node has no breadcrumb reference', () => {
    const webPage = graphByType(graph, 'WebPage') as Record<string, unknown>
    expect(webPage.breadcrumb).toBeUndefined()
  })
})

describe('no cover image', () => {
  it('produces no ImageObject node, and BlogPosting/WebPage have no image reference', () => {
    const graph = buildArticleSchemaGraph(basePost({ coverImage: '' }), SITE)
    expect(graphByType(graph, 'ImageObject')).toBeUndefined()
    const blogPosting = graphByType(graph, 'BlogPosting') as Record<string, unknown>
    const webPage = graphByType(graph, 'WebPage') as Record<string, unknown>
    expect(blogPosting.image).toBeUndefined()
    expect(webPage.primaryImageOfPage).toBeUndefined()
  })
})

describe('canonical URL resolution', () => {
  it('uses the configured canonicalUrl when present, over the generated one', () => {
    const post = basePost({ canonicalUrl: 'https://brandworks.com/blog/custom-canonical' })
    expect(resolveCanonicalUrl(post, SITE)).toBe('https://brandworks.com/blog/custom-canonical')
  })

  it('falls back to {origin}/blog/{slug} when no canonicalUrl is configured', () => {
    const post = basePost({ canonicalUrl: null })
    expect(resolveCanonicalUrl(post, SITE)).toBe('https://brandworks.com/blog/complete-guide-technical-seo')
  })
})

describe('unsupported schema types are never generated', () => {
  it('never emits HowTo, Product, Review, VideoObject, or Speakable', () => {
    const post = basePost({
      aiContext: {
        targetCountry: 'US',
        targetLanguage: 'English',
        targetAudience: 'Marketers',
        contentType: 'How-to',
        contentIntent: 'Informational',
      },
      faq: [{ question: 'Q?', answer: 'A.' }],
    })
    const graph = buildArticleSchemaGraph(post, SITE)
    const raw = JSON.stringify(graph)
    for (const forbidden of ['HowTo', 'Product', 'Review', 'VideoObject', 'Speakable']) {
      expect(raw).not.toContain(forbidden)
    }
  })
})

describe('entity SEO is never turned into fabricated sameAs URLs', () => {
  it('does not add a sameAs property anywhere from entitySeo data', () => {
    const post = basePost({
      entitySeo: { mainEntity: 'ChatGPT', about: ['AI chatbot'], mentionedEntities: ['OpenAI'] },
    })
    const graph = buildArticleSchemaGraph(post, SITE)
    expect(JSON.stringify(graph)).not.toContain('sameAs')
  })
})

describe('JSON-LD serialization safety', () => {
  it('escapes a literal </script> sequence so it cannot break out of the script element', () => {
    const post = basePost({ title: 'Beware </script><script>alert(1)</script> injection' })
    const graph = buildArticleSchemaGraph(post, SITE)
    const serialized = serializeJsonLd(graph)
    // Every "<" is escaped to \u003c — that alone is sufficient: an HTML
    // parser can never recognize "</script>" as a closing tag if the
    // leading "<" isn't a literal "<" character. The trailing ">" needs
    // no escaping for this purpose.
    expect(serialized).not.toContain('</script>')
    expect(serialized).not.toContain('<script>')
    expect(serialized).toContain('\\u003c/script>')
  })

  it('still round-trips to valid, equivalent JSON after escaping', () => {
    const post = basePost({ title: 'A </script> title' })
    const graph = buildArticleSchemaGraph(post, SITE)
    const serialized = serializeJsonLd(graph)
    const parsed = JSON.parse(serialized)
    expect(parsed).toEqual(graph)
  })

  it('is deterministic — same input produces identical serialized output', () => {
    const post = basePost()
    const a = serializeJsonLd(buildArticleSchemaGraph(post, SITE))
    const b = serializeJsonLd(buildArticleSchemaGraph(post, SITE))
    expect(a).toBe(b)
  })
})

describe('publisher/author consistency', () => {
  it('BlogPosting datePublished/dateModified match the post publishedAt/updatedAt', () => {
    const post = basePost({ publishedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' })
    const graph = buildArticleSchemaGraph(post, SITE)
    const blogPosting = graphByType(graph, 'BlogPosting') as Record<string, unknown>
    expect(blogPosting.datePublished).toBe('2026-01-01T00:00:00.000Z')
    expect(blogPosting.dateModified).toBe('2026-02-02T00:00:00.000Z')
  })
})
