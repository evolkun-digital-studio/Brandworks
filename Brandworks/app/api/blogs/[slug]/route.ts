import { withApiErrors } from '../../../../src/server/http/errors'
import { publicJsonResponse } from '../../../../src/server/http/responses'
import { getPublicBlogBySlug } from '../../../../src/server/services/public-blog.service'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  return withApiErrors(async () => {
    const { slug } = await context.params
    const blog = await getPublicBlogBySlug(slug)
    return publicJsonResponse({ blog })
  })
}
