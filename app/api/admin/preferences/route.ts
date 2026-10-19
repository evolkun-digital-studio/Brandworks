import type { NextRequest } from 'next/server'
import { withAdmin, json, readJsonObject } from '../../../../src/server/admin/http'
import { getAdminNotificationPreferences, saveAdminNotificationPreferences } from '../../../../src/server/admin/preferences'

export async function GET(request: NextRequest) { return withAdmin(request, async (actor) => json({ preferences: await getAdminNotificationPreferences(actor) })) }
export async function PUT(request: NextRequest) { return withAdmin(request, async (actor) => json({ preferences: await saveAdminNotificationPreferences(actor, await readJsonObject(request)) })) }
