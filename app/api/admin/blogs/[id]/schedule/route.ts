import type { NextRequest } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../../src/server/admin/http'
import { scheduleBlog } from '../../../../../../src/server/admin/blog'
import { revalidatePublicBlogContent } from '../../../../../../src/server/seo/revalidate-public-blog'

export async function PATCH(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;const body=await readJsonObject(request);const blog=await scheduleBlog(actor,id,body.scheduledAt);revalidatePublicBlogContent();return json({blog})})
}
