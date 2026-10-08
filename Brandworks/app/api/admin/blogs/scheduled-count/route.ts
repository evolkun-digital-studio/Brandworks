import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../src/server/admin/http'
import { scheduledBlogCount } from '../../../../../src/server/admin/blog'

export async function GET(request: NextRequest) {
  return withAdmin(request,async ()=>json({scheduled:await scheduledBlogCount()}))
}
