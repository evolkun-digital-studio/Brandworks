import type { NextRequest } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../../src/server/admin/http'
import { scheduleBlog } from '../../../../../../src/server/admin/blog'

export async function PATCH(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async ()=>{const {id}=await context.params;const body=await readJsonObject(request);return json({blog:await scheduleBlog(id,body.scheduledAt)})})
}
