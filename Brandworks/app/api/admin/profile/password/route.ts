import type { NextRequest } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../src/server/admin/http'
import { changePassword } from '../../../../../src/server/admin/auth'
import { badRequest } from '../../../../../src/server/http/errors'

export async function PUT(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    const body = await readJsonObject(request)
    if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string' || typeof body.confirmPassword !== 'string') throw badRequest('Current password, new password, and confirmation are required.')
    await changePassword(admin,body.currentPassword,body.newPassword,body.confirmPassword)
    return json({ ok: true })
  })
}
