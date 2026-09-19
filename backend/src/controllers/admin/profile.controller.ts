import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { badRequest } from '../../lib/httpError.js'
import { changeOwnPassword, changeOwnUsername } from '../../services/admin/profile.service.js'
import { toPublicAdmin } from '../../types/admin.js'

export const updateUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username, currentPassword } = req.body ?? {}

  if (typeof username !== 'string' || typeof currentPassword !== 'string') {
    throw badRequest('New username and current password are required.')
  }

  const updated = await changeOwnUsername(req.admin!, username, currentPassword)
  res.status(200).json({ admin: toPublicAdmin(updated) })
})

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {}

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    throw badRequest('Current password, new password, and confirmation are required.')
  }

  await changeOwnPassword(req.admin!, currentPassword, newPassword, confirmPassword)
  res.status(200).json({ ok: true })
})
