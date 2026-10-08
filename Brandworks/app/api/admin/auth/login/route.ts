import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, badRequest } from '../../../../../src/server/http/errors'
import { loginAdmin } from '../../../../../src/server/admin/auth'
import { checkLoginRateLimit, readJsonObject, setSessionCookie, json } from '../../../../../src/server/admin/http'
import { toPublicAdmin } from '../../../../../src/server/admin/types'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const limited = checkLoginRateLimit(request)
  if (limited) return limited
  try {
    const body = await readJsonObject(request)
    if (typeof body.username !== 'string' || typeof body.password !== 'string') throw badRequest('Username and password are required.')
    const { token, admin } = await loginAdmin(body.username, body.password)
    return setSessionCookie(json({ admin: toPublicAdmin(admin) }) as NextResponse, token)
  } catch (error) { return errorResponse(error) }
}
