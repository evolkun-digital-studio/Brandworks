import type { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { withAdmin, json, readJsonObject, requireAdminRole } from '../../../../src/server/admin/http'
import { getAdminSiteSettings, updateSiteSettings } from '../../../../src/server/site-settings/service'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json({ settings: await getAdminSiteSettings() }))
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const settings = await updateSiteSettings(actor, await readJsonObject(request))
    // Every public page renders these settings (header, footer, tracking tags), so refresh them all.
    revalidatePath('/', 'layout')
    return json({ settings })
  })
}
