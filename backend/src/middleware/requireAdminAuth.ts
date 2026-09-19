import type { NextFunction, Request, Response } from 'express'
import { ADMIN_COOKIE_NAME } from '../lib/authCookie.js'
import { verifyAdminToken } from '../lib/jwt.js'
import { getActiveAdminById } from '../services/admin/auth.service.js'
import { unauthorized } from '../lib/httpError.js'
import { asyncHandler } from '../lib/asyncHandler.js'

/**
 * Authenticates the request from the httpOnly session cookie. On
 * success, `req.admin` holds the current database record for that
 * admin (fresh, not decoded from the token) — every downstream
 * handler authorizes off of that, never off of the token itself.
 *
 * Rejects: no cookie, invalid/expired token, or an account that has
 * since been disabled or deleted — all with the same 401 so none of
 * those states are distinguishable to the client.
 */
export const requireAdminAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined
    if (!token) throw unauthorized()

    const payload = verifyAdminToken(token)
    if (!payload) throw unauthorized('Session expired. Please log in again.')

    const admin = await getActiveAdminById(payload.sub)
    if (!admin) throw unauthorized('Session expired. Please log in again.')

    req.admin = admin
    next()
  },
)
