import { describe, expect, it } from 'vitest'
import { analyzeBlog } from './blogAnalyzer'
import type { AnalyzerInput } from './blogAnalyzer'

function emptyInput(): AnalyzerInput {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    coverImageAlt: '',
    category: '',
    tags: [],
    aiSummary: '',
    keyTakeaways: [],
    aiContext: null,
    entitySeo: null,
    faq: [],
    expertQuote: null,
    seoTitle: '',
    seoDescription: '',
    focusKeyword: '',
    secondaryKeywords: [],
    canonicalUrl: '',
    robotsIndex: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: '',
    breadcrumbEnabled: true,
    customMetaTags: [],
  }
}

const STRONG_CONTENT = `## What is Technical SEO?

Technical SEO is the practice of optimizing a website so search engines can crawl and index it effectively. It focuses on the infrastructure behind the content rather than the content itself.

### Why It Matters

A technically sound site helps both search engines and [BRANDWORKS clients](https://brandworks.com/services) get better results. For further reading see [this external guide](https://example.com/technical-seo-guide).

### Core Areas

- Site speed
- Crawlability
- Structured data

## How Does Schema Markup Work?

Schema markup gives search engines explicit structured signals about page content.

> Structured data does not guarantee rich results, but it makes them possible.

Here is a small code sample:

\`\`\`js
console.log('example')
\`\`\`

Learn more on our [about page](/about).
`

function strongInput(): AnalyzerInput {
  return {
    title: 'A Complete Guide to Technical SEO',
    slug: 'complete-guide-technical-seo',
    excerpt:
      'This complete guide explains what technical SEO is, why it matters, and how to get started improving your site today.',
    content: STRONG_CONTENT,
    coverImage: 'https://example.com/cover.jpg',
    coverImageAlt: 'A diagram illustrating technical SEO components',
    category: 'SEO',
    tags: ['SEO', 'Technical SEO'],
    aiSummary: 'A concise guide covering the fundamentals of technical SEO and why it matters for site performance.',
    keyTakeaways: [
      'Technical SEO improves crawlability.',
      'Fast pages improve user experience.',
      'Structured data helps machines understand content.',
    ],
    aiContext: {
      targetCountry: 'United States',
      targetLanguage: 'English',
      targetAudience: 'Marketing managers',
      contentType: 'Guide',
      contentIntent: 'Informational',
    },
    entitySeo: {
      mainEntity: 'Technical SEO',
      about: ['Search Engine Optimization'],
      mentionedEntities: ['Google', 'Schema.org'],
    },
    faq: [
      { question: 'What is technical SEO?', answer: 'It is the practice of optimizing site infrastructure for search engines.' },
      { question: 'Why does it matter?', answer: 'It directly affects crawlability and indexing.' },
    ],
    expertQuote: null,
    seoTitle: 'Technical SEO Guide | BRANDWORKS',
    seoDescription:
      'Learn the fundamentals of technical SEO, including crawlability, structured data, and site speed, in this complete guide.',
    focusKeyword: 'technical seo',
    secondaryKeywords: ['schema markup', 'site speed'],
    canonicalUrl: 'https://brandworks.com/blog/complete-guide-technical-seo',
    robotsIndex: true,
    ogTitle: 'A Complete Guide to Technical SEO',
    ogDescription: 'Everything you need to know about technical SEO.',
    ogImage: 'https://example.com/og.jpg',
    twitterCard: 'summary_large_image',
    breadcrumbEnabled: true,
    customMetaTags: [],
  }
}

describe('analyzeBlog — empty article', () => {
  const result = analyzeBlog(emptyInput())

  it('reports near-zero metrics without crashing', () => {
    expect(result.metrics.wordCount).toBe(0)
    expect(result.metrics.readingTimeMinutes).toBe(0)
    expect(result.metrics.headingCount).toBe(0)
    expect(result.toc).toEqual([])
  })

  it('produces multiple appropriate warnings/fails rather than crashing', () => {
    const failing = result.seo.checks.filter((c) => c.status === 'fail')
    expect(failing.length).toBeGreaterThan(0)
  })

  it('keeps all three scores within bounds even for empty content', () => {
    for (const score of [result.seo.score, result.aeo.score, result.geo.score]) {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('readability reports "Not enough content" rather than NaN', () => {
    expect(result.readability.label).toBe('Not enough content')
    expect(Number.isNaN(result.readability.score)).toBe(false)
  })
})

describe('analyzeBlog — strong article', () => {
  const result = analyzeBlog(strongInput())

  it('passes the core SEO checks', () => {
    const byId = Object.fromEntries(result.seo.checks.map((c) => [c.id, c]))
    expect(byId['seo-title-exists'].status).toBe('pass')
    expect(byId['seo-keyword-in-title'].status).toBe('pass')
    expect(byId['seo-keyword-in-slug'].status).toBe('pass')
    expect(byId['seo-featured-image'].status).toBe('pass')
    expect(byId['seo-image-alt'].status).toBe('pass')
    expect(byId['seo-internal-links'].status).toBe('pass')
    expect(byId['seo-external-links'].status).toBe('pass')
  })

  it('scores meaningfully higher than the empty article on all three axes', () => {
    const empty = analyzeBlog(emptyInput())
    expect(result.seo.score).toBeGreaterThan(empty.seo.score)
    expect(result.aeo.score).toBeGreaterThan(empty.aeo.score)
    expect(result.geo.score).toBeGreaterThan(empty.geo.score)
  })

  it('builds a non-empty TOC from H2/H3 headings', () => {
    expect(result.toc.length).toBeGreaterThan(0)
    expect(result.toc.some((t) => t.level === 2)).toBe(true)
    expect(result.toc.some((t) => t.level === 3)).toBe(true)
  })

  it('reports content metrics consistent with the source', () => {
    expect(result.metrics.wordCount).toBeGreaterThan(0)
    expect(result.metrics.codeBlockCount).toBe(1)
    expect(result.metrics.blockquoteCount).toBe(1)
    expect(result.metrics.linkCount).toBe(3)
    expect(result.metrics.internalLinkCount).toBe(2) // brandworks.com absolute + /about relative
    expect(result.metrics.externalLinkCount).toBe(1) // example.com
  })

  it('detects the question-phrased heading for AEO', () => {
    const byId = Object.fromEntries(result.aeo.checks.map((c) => [c.id, c]))
    expect(byId['aeo-question-headings'].status).toBe('pass')
  })

  it('marks FAQ, key takeaways, and AI summary as present', () => {
    const byId = Object.fromEntries(result.aeo.checks.map((c) => [c.id, c]))
    expect(byId['aeo-faq'].status).toBe('pass')
    expect(byId['aeo-key-takeaways'].status).toBe('pass')
    expect(byId['aeo-ai-summary'].status).toBe('pass')
  })

  it('marks main entity and AI context as present for GEO', () => {
    const byId = Object.fromEntries(result.geo.checks.map((c) => [c.id, c]))
    expect(byId['geo-main-entity'].status).toBe('pass')
    expect(byId['geo-ai-context'].status).toBe('pass')
  })
})

describe('focus keyword matching', () => {
  it('matches case-insensitively', () => {
    const input = { ...strongInput(), focusKeyword: 'TECHNICAL SEO' }
    const result = analyzeBlog(input)
    const byId = Object.fromEntries(result.seo.checks.map((c) => [c.id, c]))
    expect(byId['seo-keyword-in-title'].status).toBe('pass')
  })

  it('produces a warning (not a crash/fail-everything) when the keyword is missing from the title', () => {
    const input = { ...strongInput(), focusKeyword: 'something unrelated' }
    const result = analyzeBlog(input)
    const byId = Object.fromEntries(result.seo.checks.map((c) => [c.id, c]))
    expect(byId['seo-keyword-in-title'].status).toBe('warning')
  })

  it('shows an info-level "not configured" check when no focus keyword is set at all', () => {
    const result = analyzeBlog(emptyInput())
    const byId = Object.fromEntries(result.seo.checks.map((c) => [c.id, c]))
    expect(byId['seo-keyword-configured'].status).toBe('warning')
    expect(byId['seo-keyword-configured'].message).toMatch(/not configured/i)
  })
})

describe('FAQ warnings', () => {
  it('warns when a FAQ item is missing its answer', () => {
    const input = { ...strongInput(), faq: [{ question: 'Unanswered?', answer: '' }] }
    const result = analyzeBlog(input)
    const byId = Object.fromEntries(result.aeo.checks.map((c) => [c.id, c]))
    expect(byId['aeo-faq'].status).toBe('warning')
  })

  it('does not treat a missing FAQ as a hard failure', () => {
    const result = analyzeBlog(emptyInput())
    const byId = Object.fromEntries(result.aeo.checks.map((c) => [c.id, c]))
    expect(byId['aeo-faq'].status).toBe('info')
  })
})

describe('AI context warnings', () => {
  it('warns on GEO and AEO-adjacent checks when AI context is entirely missing', () => {
    const input = { ...strongInput(), aiContext: null }
    const result = analyzeBlog(input)
    const byId = Object.fromEntries(result.geo.checks.map((c) => [c.id, c]))
    expect(byId['geo-ai-context'].status).toBe('warning')
    expect(byId['geo-content-intent'].status).toBe('warning')
  })
})

describe('determinism', () => {
  it('produces identical results for the same input across multiple runs', () => {
    const input = strongInput()
    const first = analyzeBlog(input)
    const second = analyzeBlog(input)
    const third = analyzeBlog(structuredClone(input))
    expect(first.seo.score).toBe(second.seo.score)
    expect(first.aeo.score).toBe(second.aeo.score)
    expect(first.geo.score).toBe(second.geo.score)
    expect(first.seo.score).toBe(third.seo.score)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe('score bounds', () => {
  it('keeps every score between 0 and 100 across a range of inputs', () => {
    const inputs = [emptyInput(), strongInput(), { ...strongInput(), content: '' }, { ...emptyInput(), title: 'x'.repeat(500) }]
    for (const input of inputs) {
      const result = analyzeBlog(input)
      for (const score of [result.seo.score, result.aeo.score, result.geo.score, result.readability.score]) {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('schema readiness', () => {
  it('marks FAQ as not_configured when no FAQ exists, and ready when it does', () => {
    const withoutFaq = analyzeBlog(emptyInput())
    const withFaq = analyzeBlog(strongInput())
    const faqReadiness = (r: ReturnType<typeof analyzeBlog>) => r.schemaReadiness.find((s) => s.type === 'FAQ')
    expect(faqReadiness(withoutFaq)?.status).toBe('not_configured')
    expect(faqReadiness(withFaq)?.status).toBe('ready')
  })

  it('marks Breadcrumb readiness based on the breadcrumbEnabled flag', () => {
    const enabled = analyzeBlog({ ...strongInput(), breadcrumbEnabled: true })
    const disabled = analyzeBlog({ ...strongInput(), breadcrumbEnabled: false })
    const breadcrumb = (r: ReturnType<typeof analyzeBlog>) => r.schemaReadiness.find((s) => s.type === 'Breadcrumb')
    expect(breadcrumb(enabled)?.status).toBe('ready')
    expect(breadcrumb(disabled)?.status).toBe('not_configured')
  })
})

describe('publish checklist', () => {
  it('covers all six sections with at least one item each', () => {
    const result = analyzeBlog(strongInput())
    const sections = result.checklist.map((s) => s.section)
    expect(sections).toEqual(['Content', 'SEO', 'Structure', 'Entity / AI', 'Links', 'Schema readiness'])
    for (const section of result.checklist) {
      expect(section.items.length).toBeGreaterThan(0)
    }
  })
})
