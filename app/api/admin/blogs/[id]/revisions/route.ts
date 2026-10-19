import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../../../src/server/admin/http'
import { getBlogRevisions } from '../../../../../../src/server/admin/blog'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    const { id } = await context.params
    return json({ revisions: await getBlogRevisions(actor, id) })
  })
}
