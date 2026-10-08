import { withApiErrors } from '../../../src/server/http/errors'
import { publicJsonResponse } from '../../../src/server/http/responses'
import { listPublicBlogs } from '../../../src/server/services/public-blog.service'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  return withApiErrors(async () => {
    const result = await listPublicBlogs(new URL(request.url).searchParams)
    return publicJsonResponse(result)
  })
}
