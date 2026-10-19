import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../src/server/admin/http'
import { getPublishDueJobStatus } from '../../../../../src/server/repositories/job-status'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json(await getPublishDueJobStatus()))
}

