import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, badRequest, forbidden } from '../../../../../src/server/http/errors'
import { loginAdmin } from '../../../../../src/server/admin/auth'
import { checkLoginRateLimit, isCrossSiteWrite, readJsonObject, setSessionCookie, json } from '../../../../../src/server/admin/http'
import { toPublicAdmin } from '../../../../../src/server/admin/types'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  if (isCrossSiteWrite(request)) return errorResponse(forbidden('Cross-site request rejected.'))
  const limited = checkLoginRateLimit(request)
  if (limited) return limited
  try {
    const body = await readJsonObject(request)
    if (typeof body.username !== 'string' || typeof body.password !== 'string') throw badRequest('Username and password are required.')
    const { token, admin } = await loginAdmin(body.username, body.password)
    return setSessionCookie(json({ admin: toPublicAdmin(admin) }) as NextResponse, token)
  } catch (error) { return errorResponse(error) }
}
