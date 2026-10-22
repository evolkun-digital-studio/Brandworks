/**
 * Estimated organic search traffic from DataForSEO Labs (Google domain rank
 * overview). Paid and doubly opt-in: SEO_DATA_PROVIDER=dataforseo AND
 * SITE_SCAN_TRAFFIC=true. These are model estimates, never analytics.
 */
import { envValue, failed, num, ok, skipped, type CollectorDeps, type CollectorResult, type TrafficData } from '../types'
import { seoProvider } from './authority'
import { dataForSeoCredentials, dataForSeoLive } from './dataforseo'

export const TRAFFIC_SOURCE = 'DataForSEO Labs (estimated)'
/** From DataForSEO's Labs locations list: 2356 = India; English = "en". */
export const INDIA_LOCATION_CODE = 2356

type DomainRankOverview = {
  items?: { metrics?: { organic?: { etv?: number; count?: number } } }[] | null
}

export async function collectTraffic(
  domain: string,
  deps: CollectorDeps & { locationCode?: number; location?: string; languageCode?: string } = {},
): Promise<CollectorResult<TrafficData>> {
  if (seoProvider(deps) !== 'dataforseo') return skipped(TRAFFIC_SOURCE, 'Needs SEO_DATA_PROVIDER=dataforseo', deps)
  if (envValue(deps, 'SITE_SCAN_TRAFFIC')?.toLowerCase() !== 'true') return skipped(TRAFFIC_SOURCE, 'SITE_SCAN_TRAFFIC is not true', deps)
  const credentials = dataForSeoCredentials(deps)
  if (!credentials) return skipped(TRAFFIC_SOURCE, 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set', deps)

  const locationCode = deps.locationCode ?? INDIA_LOCATION_CODE
  const languageCode = deps.languageCode ?? 'en'
  try {
    const r = await dataForSeoLive<DomainRankOverview>(
      '/dataforseo_labs/google/domain_rank_overview/live',
      { target: domain, location_code: locationCode, language_code: languageCode },
      credentials,
      deps,
    )
    const organic = r?.items?.[0]?.metrics?.organic
    const etv = num(organic?.etv)
    // No items means DataForSEO has no ranking data for this domain: report "not available", not zero.
    return ok(TRAFFIC_SOURCE, {
      estimatedOrganicTraffic: etv === null ? null : Math.round(etv),
      rankingKeywords: num(organic?.count),
      locationCode,
      location: deps.location ?? (locationCode === INDIA_LOCATION_CODE ? 'India' : String(locationCode)),
      languageCode,
    }, deps)
  } catch (error) {
    return failed(TRAFFIC_SOURCE, error instanceof Error ? error.message : 'DataForSEO request failed', deps)
  }
}
