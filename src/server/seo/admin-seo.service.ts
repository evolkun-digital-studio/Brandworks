import 'server-only'

import { classifyLink, parseMarkdown } from '../../lib/markdownMetrics'
import { analyzeBlog, type AnalyzerInput } from '../../admin/pages/blogs/lib/blogAnalyzer'
import { queryAdminBlogs } from '../repositories/admin-blog.repository'
import { buildSitemapEntries } from './sitemap'
import { resolvePublicOrigin } from '../config/env'
import type { AdminBlogDocument } from '../admin/blog-types'

const STATIC_PATHS = new Set([
  '/', '/about', '/services', '/work', '/blog', '/contact', '/news', '/privacy-policy', '/terms-of-use', '/cookie-policy',
  '/services/Concept-creation', '/services/graphic-design', '/services/performance-marketing', '/services/photography',
  '/services/pr-founder-reputation', '/services/seo', '/services/social-club', '/services/social-media', '/services/technology', '/services/videography',
])

function analyzerInput(post: AdminBlogDocument): AnalyzerInput {
  return {
    title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content,
    coverImage: post.coverImage, coverImageAlt: post.coverImageAlt, category: post.category ?? '', tags: post.tags ?? [],
    aiSummary: post.aiSummary ?? '', keyTakeaways: post.keyTakeaways ?? [], aiContext: post.aiContext ?? null,
    entitySeo: post.entitySeo ?? null, faq: post.faq ?? [], expertQuote: post.expertQuote ?? null,
    seoTitle: post.seoTitle ?? '', seoDescription: post.seoDescription ?? '', focusKeyword: post.focusKeyword ?? '',
    secondaryKeywords: post.secondaryKeywords ?? [], canonicalUrl: post.canonicalUrl ?? '', robotsIndex: post.robotsIndex ?? true,
    ogTitle: post.ogTitle ?? '', ogDescription: post.ogDescription ?? '', ogImage: post.ogImage ?? '',
    twitterCard: post.twitterCard ?? '', breadcrumbEnabled: post.breadcrumbEnabled ?? true,
    customMetaTags: post.customMetaTags ?? [], authorName: post.authorName,
  }
}

function normalizeInternalPath(raw: string) {
  try {
    const parsed = raw.startsWith('/') ? new URL(raw, 'https://brandworks.local') : new URL(raw)
    if (parsed.hostname !== 'brandworks.local' && !parsed.hostname.includes('brandworks')) return null
    return parsed.pathname.replace(/\/$/, '') || '/'
  } catch {
    return raw.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/'
  }
}

async function auditInternalLinks(posts: AdminBlogDocument[]) {
  const known = new Set(STATIC_PATHS)
  for (const post of posts) if (post.status === 'published' && post.deletedAt === null) known.add(`/blog/${post.slug}`)
  const broken: Array<{ articleId: string; articleTitle: string; url: string }> = []
  for (const post of posts) {
    for (const link of parseMarkdown(post.content).links) {
      if (classifyLink(link.url) !== 'internal' || link.url.startsWith('#') || link.url.startsWith('mailto:') || link.url.startsWith('tel:')) continue
      const path = normalizeInternalPath(link.url)
      if (path && !known.has(path) && !path.startsWith('/api/')) broken.push({ articleId: post._id.toHexString(), articleTitle: post.title, url: link.url })
    }
  }
  return broken
}

function isValidImageUrl(value: string) {
  if (!value.trim()) return false
  if (value.startsWith('/') || value.startsWith('data:')) return true
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' } catch { return false }
}

function auditImages(posts: AdminBlogDocument[]) {
  const issues: Array<{ articleId: string; articleTitle: string; kind: string; value: string }> = []
  for (const post of posts) {
    if (!isValidImageUrl(post.coverImage)) issues.push({ articleId: post._id.toHexString(), articleTitle: post.title, kind: 'cover image URL', value: post.coverImage || 'missing' })
    if (!post.coverImageAlt.trim()) issues.push({ articleId: post._id.toHexString(), articleTitle: post.title, kind: 'cover image alt text', value: 'missing' })
    for (const image of parseMarkdown(post.content).images) {
      if (!isValidImageUrl(image.url)) issues.push({ articleId: post._id.toHexString(), articleTitle: post.title, kind: 'content image URL', value: image.url || 'missing' })
      if (!image.alt.trim()) issues.push({ articleId: post._id.toHexString(), articleTitle: post.title, kind: 'content image alt text', value: 'missing' })
    }
  }
  return issues
}

function analyticsAvailability() {
  const ga4Id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim()
  const ga4ReportReady = Boolean(process.env.GA4_PROPERTY_ID?.trim() && process.env.GA4_SERVICE_ACCOUNT_JSON?.trim())
  const gscReportReady = Boolean(process.env.GSC_SITE_URL?.trim() && process.env.GSC_SERVICE_ACCOUNT_JSON?.trim())
  return {
    ga4: { measurementConfigured: Boolean(ga4Id), reportingConfigured: ga4ReportReady, data: 'not_retrieved' as const },
    searchConsole: { verificationConfigured: Boolean(gscVerification), reportingConfigured: gscReportReady, data: 'not_retrieved' as const },
    note: 'No performance metrics are shown until a server-side reporting credential and property are configured and queried successfully.',
  }
}

export async function getSeoOverview() {
  const firstPage = await queryAdminBlogs({ includeDeleted: false, page: 1, limit: 100 })
  const remainingPages = await Promise.all(Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) => queryAdminBlogs({ includeDeleted: false, page: index + 2, limit: 100 })))
  const posts = [firstPage.items, ...remainingPages.map((page) => page.items)].flat()
  const audits = posts.map((post) => {
    const analysis = analyzeBlog(analyzerInput(post))
    const attention = analysis.checklist.flatMap((section) => section.items.filter((item) => item.status === 'fail' || item.status === 'warning')).slice(0, 6)
    return { id: post._id.toHexString(), title: post.title, slug: post.slug, status: post.status, seoScore: analysis.seo.score, aeoScore: analysis.aeo.score, geoScore: analysis.geo.score, attention }
  })
  let sitemap: { status: 'healthy' | 'unavailable'; url: string; urlCount: number; checkedAt: string; error?: string }
  try {
    const origin = resolvePublicOrigin()
    const entries = await buildSitemapEntries(origin)
    sitemap = { status: 'healthy', url: `${origin}/sitemap.xml`, urlCount: entries.length, checkedAt: new Date().toISOString() }
  } catch (error) {
    sitemap = { status: 'unavailable', url: '/sitemap.xml', urlCount: 0, checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Sitemap could not be checked.' }
  }
  const [brokenInternalLinks, imageIssues] = await Promise.all([auditInternalLinks(posts), Promise.resolve(auditImages(posts))])
  const published = posts.filter((post) => post.status === 'published').length
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      articles: posts.length, published, drafts: posts.filter((post) => post.status === 'draft').length,
      metadataAttention: audits.filter((audit) => audit.attention.some((item) => item.id.includes('meta') || item.id.includes('title'))).length,
      structuredContentAttention: audits.filter((audit) => audit.aeoScore < 70 || audit.geoScore < 70).length,
    },
    audits, brokenInternalLinks, imageIssues, sitemap, analytics: analyticsAvailability(),
  }
}

