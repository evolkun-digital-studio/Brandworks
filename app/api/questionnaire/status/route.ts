import { activeModel, activeProvider } from '../../../../src/server/questionnaire/ai'
import { seoProvider } from '../../../../src/server/site-scan/collectors/authority'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const set = (name: string) => Boolean(process.env[name]?.trim())

/**
 * Development-only health check of the questionnaire's AI and site-scan
 * configuration: which provider/model is active and which data sources are
 * configured. Booleans and names only — never a key. 404 in production.
 */
export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') return Response.json({ error: 'Not found.' }, { status: 404 })
  const provider = seoProvider({})
  return Response.json(
    {
      aiProvider: activeProvider(),
      model: activeModel(),
      siteScanProviders: {
        pageSpeedInsights: { configured: true, apiKey: set('GOOGLE_PSI_API_KEY') },
        seoDataProvider: provider,
        moz: { configured: provider === 'moz' && set('MOZ_API_TOKEN') },
        dataforseo: { configured: provider === 'dataforseo' && set('DATAFORSEO_LOGIN') && set('DATAFORSEO_PASSWORD') },
        traffic: { configured: provider === 'dataforseo' && process.env.SITE_SCAN_TRAFFIC?.trim().toLowerCase() === 'true' },
      },
      streaming: true,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
