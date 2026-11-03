import type { NextRequest } from 'next/server'
import { withAdmin, json, requireAdminRole } from '../../../../../src/server/admin/http'
import { badRequest } from '../../../../../src/server/http/errors'
import { checkUploadRateLimit, uploadSiteMedia } from '../../../../../src/server/site-media/service'
import { assertUploadLength } from '../../../../../src/server/site-media/validation'

// sharp needs Node, never the edge runtime.
export const runtime = 'nodejs'

/** Media Manager upload: converts to WebP variants and makes the result live. */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    checkUploadRateLimit(actor)
    assertUploadLength(request.headers.get('content-length'))
    let form: FormData
    try { form = await request.formData() } catch { throw badRequest('Send the image as multipart form data.') }
    return json(await uploadSiteMedia(actor, form), 201)
  })
}
