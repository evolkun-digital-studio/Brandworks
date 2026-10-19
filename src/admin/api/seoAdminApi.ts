import { adminApiRequest } from './client'

export interface SeoIssue { id: string; label: string; status: 'pass' | 'warning' | 'fail' | 'info'; message: string }
export interface SeoOverview {
  generatedAt: string
  totals: { articles: number; published: number; drafts: number; metadataAttention: number; structuredContentAttention: number }
  audits: Array<{ id: string; title: string; slug: string; status: string; seoScore: number; aeoScore: number; geoScore: number; attention: SeoIssue[] }>
  brokenInternalLinks: Array<{ articleId: string; articleTitle: string; url: string }>
  imageIssues: Array<{ articleId: string; articleTitle: string; kind: string; value: string }>
  sitemap: { status: 'healthy' | 'unavailable'; url: string; urlCount: number; checkedAt: string; error?: string }
  analytics: {
    ga4: { measurementConfigured: boolean; reportingConfigured: boolean; data: 'not_retrieved' }
    searchConsole: { verificationConfigured: boolean; reportingConfigured: boolean; data: 'not_retrieved' }
    note: string
  }
}

export interface RedirectRecord { fromSlug: string; toSlug: string; createdAt: string }

export function getSeoOverview() { return adminApiRequest<SeoOverview>('/seo') }
export function listRedirects() { return adminApiRequest<{ redirects: RedirectRecord[] }>('/redirects') }
export function createRedirect(fromSlug: string, toSlug: string) { return adminApiRequest<{ redirect: Pick<RedirectRecord, 'fromSlug' | 'toSlug'> }>('/redirects', { method: 'POST', body: { fromSlug, toSlug } }) }
export function deleteRedirect(fromSlug: string) { return adminApiRequest<undefined>(`/redirects/${encodeURIComponent(fromSlug)}`, { method: 'DELETE' }) }
