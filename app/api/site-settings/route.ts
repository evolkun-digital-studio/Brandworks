import { getPublicSiteSettings } from '../../../src/server/site-settings/service'

export async function GET() {
  return Response.json({ settings: await getPublicSiteSettings() }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
}
