import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../src/server/admin/http'
import { toPublicAdmin } from '../../../../../src/server/admin/types'

export async function GET(request: NextRequest) {
  return withAdmin(request, async (admin) => json({ admin: toPublicAdmin(admin) }))
}
