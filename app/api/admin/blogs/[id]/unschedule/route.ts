import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../../src/server/admin/http'
import { unscheduleBlog } from '../../../../../../src/server/admin/blog'
import { revalidatePublicBlogContent } from '../../../../../../src/server/seo/revalidate-public-blog'

export async function PATCH(request: NextRequest, context: {params:Promise<{id:string}>}) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;const blog=await unscheduleBlog(actor,id);revalidatePublicBlogContent();return json({blog})})
}
