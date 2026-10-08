import type { NextRequest } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../src/server/admin/http'
import { changeUsername } from '../../../../../src/server/admin/auth'
import { toPublicAdmin } from '../../../../../src/server/admin/types'
import { badRequest } from '../../../../../src/server/http/errors'

export async function PUT(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    const body = await readJsonObject(request)
    if (typeof body.username !== 'string' || typeof body.currentPassword !== 'string') throw badRequest('New username and current password are required.')
    return json({ admin: toPublicAdmin(await changeUsername(admin,body.username,body.currentPassword)) })
  })
}
