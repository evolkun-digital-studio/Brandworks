/**
 * Google PageSpeed Insights v5 (runPagespeed), mobile. Free; the key is
 * optional and only raises the quota. PSI runs a full Lighthouse audit, so it
 * routinely takes 20–40 s — hence the long timeout.
 */
import { envValue, failed, num, ok, type CollectorDeps, type CollectorResult, type CwvCategory, type FieldMetric, type PerformanceData } from '../types'

export const PERFORMANCE_SOURCE = 'Google PageSpeed Insights'
export const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
export const PSI_TIMEOUT_MS = 45_000

type PsiMetric = { percentile?: number; category?: string }
type PsiResponse = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>
    audits?: Record<string, { numericValue?: number }>
  }
  loadingExperience?: {
    overall_category?: string
    origin_fallback?: boolean
    metrics?: Record<string, PsiMetric>
  }
}

const CATEGORY: Record<string, CwvCategory> = { FAST: 'good', AVERAGE: 'needs-improvement', SLOW: 'poor' }

const score = (s: { score?: number | null } | undefined) => (num(s?.score) === null ? null : Math.round((s!.score as number) * 100))
const ms = (v: unknown) => (num(v) === null ? null : Math.round(v as number))

function field(metric: PsiMetric | undefined, scale = 1): FieldMetric | null {
  const percentile = num(metric?.percentile)
  if (percentile === null) return null
  return { value: percentile / scale, category: CATEGORY[metric?.category ?? ''] ?? null }
}

export function parsePsi(body: PsiResponse): PerformanceData {
  const cats = body.lighthouseResult?.categories ?? {}
  const audits = body.lighthouseResult?.audits ?? {}
  const cls = num(audits['cumulative-layout-shift']?.numericValue)
  const exp = body.loadingExperience
  const metrics = exp?.metrics
  return {
    strategy: 'mobile',
    scores: {
      performance: score(cats.performance),
      seo: score(cats.seo),
      accessibility: score(cats.accessibility),
      bestPractices: score(cats['best-practices']),
    },
    lab: {
      lcpMs: ms(audits['largest-contentful-paint']?.numericValue),
      fcpMs: ms(audits['first-contentful-paint']?.numericValue),
      tbtMs: ms(audits['total-blocking-time']?.numericValue),
      cls: cls === null ? null : Math.round(cls * 1000) / 1000,
      speedIndexMs: ms(audits['speed-index']?.numericValue),
    },
    field: metrics && Object.keys(metrics).length > 0
      ? {
          scope: exp?.origin_fallback ? 'origin' : 'url',
          overall: CATEGORY[exp?.overall_category ?? ''] ?? null,
          lcpMs: field(metrics.LARGEST_CONTENTFUL_PAINT_MS),
          inpMs: field(metrics.INTERACTION_TO_NEXT_PAINT),
          // CrUX reports CLS ×100 (5 means 0.05).
          cls: field(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE, 100),
        }
      : null,
  }
}

export async function collectPerformance(url: URL, deps: CollectorDeps & { timeoutMs?: number } = {}): Promise<CollectorResult<PerformanceData>> {
  const request = new URL(PSI_URL)
  request.searchParams.set('url', url.href)
  request.searchParams.set('strategy', 'mobile')
  for (const c of ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES']) request.searchParams.append('category', c)
  const key = envValue(deps, 'GOOGLE_PSI_API_KEY')
  if (key) request.searchParams.set('key', key)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? PSI_TIMEOUT_MS)
  try {
    const response = await (deps.fetch ?? fetch)(request, { signal: controller.signal })
    if (!response.ok) {
      const detail = await response.json().then((b: { error?: { message?: string } }) => b?.error?.message ?? '', () => '')
      return failed(PERFORMANCE_SOURCE, `PageSpeed Insights responded ${response.status}${detail ? `: ${detail}` : ''}`, deps)
    }
    const data = parsePsi((await response.json()) as PsiResponse)
    if (data.scores.performance === null && data.lab.lcpMs === null) {
      return failed(PERFORMANCE_SOURCE, 'PageSpeed Insights returned no Lighthouse result', deps)
    }
    return ok(PERFORMANCE_SOURCE, data, deps)
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return failed(PERFORMANCE_SOURCE, aborted ? 'PageSpeed Insights timed out' : 'PageSpeed Insights request failed', deps)
  } finally {
    clearTimeout(timer)
  }
}
