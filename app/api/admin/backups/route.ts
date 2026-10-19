import type { NextRequest } from 'next/server'
import { withAdmin, json, readJsonObject, requireAdminRole } from '../../../../src/server/admin/http'
import { exportBlogBackup, restoreBlogBackup } from '../../../../src/server/admin/backup'

export async function GET(request: NextRequest) { return withAdmin(request, async (actor) => { requireAdminRole(actor); return json(await exportBlogBackup(actor)) }) }
export async function POST(request: NextRequest) { return withAdmin(request, async (actor) => { requireAdminRole(actor); return json({ restored: await restoreBlogBackup(actor, await readJsonObject(request)) }) }) }
