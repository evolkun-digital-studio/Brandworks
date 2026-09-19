import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { badRequest } from '../../lib/httpError.js'
import { loginAdmin } from '../../services/admin/auth.service.js'
import { setAdminSessionCookie, clearAdminSessionCookie } from '../../lib/authCookie.js'
import { toPublicAdmin } from '../../types/admin.js'

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {}

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw badRequest('Username and password are required.')
  }

  const { token, admin } = await loginAdmin(username, password)
  setAdminSessionCookie(res, token)

  res.status(200).json({ admin: toPublicAdmin(admin) })
})

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAdminSessionCookie(res)
  res.status(200).json({ ok: true })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  // requireAdminAuth has already loaded and attached the current admin.
  res.status(200).json({ admin: toPublicAdmin(req.admin!) })
})
