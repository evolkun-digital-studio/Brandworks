import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../../src/server/admin/http'
import { unscheduleBlog } from '../../../../../../src/server/admin/blog'

export async function PATCH(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async ()=>{const {id}=await context.params;return json({blog:await unscheduleBlog(id)})})
}
