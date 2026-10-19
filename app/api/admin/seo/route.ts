import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../src/server/admin/http'
import { getSeoOverview } from '../../../../src/server/seo/admin-seo.service'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json(await getSeoOverview()))
}
