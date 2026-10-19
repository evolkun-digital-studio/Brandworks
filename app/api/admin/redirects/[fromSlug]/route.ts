import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, requireAdminRole } from '../../../../../src/server/admin/http'
import { removeRedirect } from '../../../../../src/server/seo/redirects.service'

export async function DELETE(request: NextRequest, context: { params: Promise<{ fromSlug: string }> }) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    await removeRedirect((await context.params).fromSlug)
    return new NextResponse(null, { status: 204 })
  })
}
