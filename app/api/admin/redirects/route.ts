import type { NextRequest } from 'next/server'
import { withAdmin, json, readJsonObject, requireAdminRole } from '../../../../src/server/admin/http'
import { createRedirect, listRedirects } from '../../../../src/server/seo/redirects.service'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json({ redirects: await listRedirects() }))
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    return json({ redirect: await createRedirect(actor, await readJsonObject(request)) }, 201)
  })
}
