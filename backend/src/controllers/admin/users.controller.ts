import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { badRequest } from '../../lib/httpError.js'
import {
  createSubAdmin,
  deleteSubAdmin,
  listAllAdmins,
  setSubAdminEnabled,
} from '../../services/admin/admin.service.js'
import { toPublicAdmin } from '../../types/admin.js'

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const admins = await listAllAdmins(req.admin!)
  res.status(200).json({ admins: admins.map(toPublicAdmin) })
})

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {}

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw badRequest('Username and password are required.')
  }

  const created = await createSubAdmin(req.admin!, username, password)
  res.status(201).json({ admin: toPublicAdmin(created) })
})

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { enabled } = req.body ?? {}
  const { id } = req.params

  if (typeof enabled !== 'boolean') {
    throw badRequest('`enabled` must be a boolean.')
  }

  const updated = await setSubAdminEnabled(req.admin!, id, enabled)
  res.status(200).json({ admin: toPublicAdmin(updated) })
})

export const removeUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  await deleteSubAdmin(req.admin!, id)
  res.status(204).send()
})
