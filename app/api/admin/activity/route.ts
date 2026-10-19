import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../src/server/admin/http'
import { listActivity } from '../../../../src/server/admin/activity'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json({ activities: await listActivity(Number(new URL(request.url).searchParams.get('limit')) || 100) }))
}
