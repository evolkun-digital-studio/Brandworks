import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../../../../src/server/admin/http'
import { restoreBlogRevision } from '../../../../../../../../src/server/admin/blog'
import { revalidatePublicBlogContent } from '../../../../../../../../src/server/seo/revalidate-public-blog'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; revisionId: string }> }) {
  return withAdmin(request, async (actor) => {
    const { id, revisionId } = await context.params
    const blog = await restoreBlogRevision(actor, id, revisionId)
    revalidatePublicBlogContent()
    return json({ blog })
  })
}
