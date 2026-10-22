/**
 * Link authority from a paid provider, picked by SEO_DATA_PROVIDER:
 *
 *   moz         Moz API (JSON-RPC) data.site.metrics.fetch, scope "domain",
 *               header x-moz-token: MOZ_API_TOKEN
 *   dataforseo  DataForSEO Backlinks API summary/live, HTTP Basic with
 *               DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD
 *
 * Unset (or a missing key) means 'skipped', never an error. The two
 * providers' numbers are different metrics and are labelled as such:
 * Moz's Domain Authority is not DataForSEO's Domain Rank.
 */
import { randomUUID } from 'node:crypto'
import { envValue, failed, num, ok, skipped, type AuthorityData, type CollectorDeps, type CollectorResult } from '../types'
import { dataForSeoCredentials, dataForSeoLive } from './dataforseo'

export const MOZ_URL = 'https://api.moz.com/jsonrpc'
export const MOZ_SOURCE = 'Moz API'
export const DATAFORSEO_BACKLINKS_SOURCE = 'DataForSEO Backlinks API'
const AUTHORITY_SOURCE = 'Authority (no provider)'
const MOZ_TIMEOUT_MS = 20_000

export type SeoProvider = 'moz' | 'dataforseo'

export function seoProvider(deps: CollectorDeps): SeoProvider | null {
  const value = envValue(deps, 'SEO_DATA_PROVIDER')?.toLowerCase()
  return value === 'moz' || value === 'dataforseo' ? value : null
}

type MozResponse = {
  result?: {
    site_metrics?: {
      domain_authority?: number
      page_authority?: number
      spam_score?: number
      root_domains_to_root_domain?: number
      external_pages_to_root_domain?: number
    }
  }
  error?: { code?: number; status?: number; message?: string }
}

async function fromMoz(domain: string, token: string, deps: CollectorDeps): Promise<CollectorResult<AuthorityData>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MOZ_TIMEOUT_MS)
  try {
    const response = await (deps.fetch ?? fetch)(MOZ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-moz-token': token, 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomUUID(),
        method: 'data.site.metrics.fetch',
        params: { data: { site_query: { query: domain, scope: 'domain' } } },
      }),
    })
    const body = (await response.json().catch(() => ({}))) as MozResponse
    if (body.error || !response.ok) {
      return failed(MOZ_SOURCE, `Moz responded ${body.error?.status ?? response.status}${body.error?.message ? `: ${body.error.message}` : ''}`, deps)
    }
    const m = body.result?.site_metrics
    if (!m) return failed(MOZ_SOURCE, 'Moz returned no site metrics', deps)
    const spam = num(m.spam_score)
    return ok(MOZ_SOURCE, {
      provider: 'moz',
      domainAuthority: num(m.domain_authority),
      pageAuthority: num(m.page_authority),
      // Moz uses -1 for "no spam score calculated".
      spamScore: spam !== null && spam >= 0 ? spam : null,
      linkingRootDomains: num(m.root_domains_to_root_domain),
      externalLinks: num(m.external_pages_to_root_domain),
    }, deps)
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return failed(MOZ_SOURCE, aborted ? 'Moz timed out' : 'Moz request failed', deps)
  } finally {
    clearTimeout(timer)
  }
}

type BacklinksSummary = {
  rank?: number
  backlinks?: number
  referring_domains?: number
  referring_main_domains?: number
  broken_backlinks?: number
  backlinks_spam_score?: number
}

async function fromDataForSeo(domain: string, credentials: { login: string; password: string }, deps: CollectorDeps): Promise<CollectorResult<AuthorityData>> {
  try {
    const r = await dataForSeoLive<BacklinksSummary>('/backlinks/summary/live', { target: domain, include_subdomains: true }, credentials, deps)
    if (!r) return failed(DATAFORSEO_BACKLINKS_SOURCE, 'DataForSEO returned no backlinks summary', deps)
    return ok(DATAFORSEO_BACKLINKS_SOURCE, {
      provider: 'dataforseo',
      domainRank: num(r.rank),
      domainRankScale: 1000,
      backlinks: num(r.backlinks),
      referringDomains: num(r.referring_domains),
      referringMainDomains: num(r.referring_main_domains),
      brokenBacklinks: num(r.broken_backlinks),
      backlinksSpamScore: num(r.backlinks_spam_score),
    }, deps)
  } catch (error) {
    return failed(DATAFORSEO_BACKLINKS_SOURCE, error instanceof Error ? error.message : 'DataForSEO request failed', deps)
  }
}

export async function collectAuthority(domain: string, deps: CollectorDeps = {}): Promise<CollectorResult<AuthorityData>> {
  const provider = seoProvider(deps)
  if (provider === 'moz') {
    const token = envValue(deps, 'MOZ_API_TOKEN')
    return token ? fromMoz(domain, token, deps) : skipped(MOZ_SOURCE, 'MOZ_API_TOKEN is not set', deps)
  }
  if (provider === 'dataforseo') {
    const credentials = dataForSeoCredentials(deps)
    return credentials
      ? fromDataForSeo(domain, credentials, deps)
      : skipped(DATAFORSEO_BACKLINKS_SOURCE, 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set', deps)
  }
  return skipped(AUTHORITY_SOURCE, 'SEO_DATA_PROVIDER is not set (moz | dataforseo)', deps)
}
