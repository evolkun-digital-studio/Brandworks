import { Router } from 'express'
import {
  createUser,
  listUsers,
  removeUser,
  updateUserStatus,
} from '../../controllers/admin/users.controller.js'
import { requireAdminAuth } from '../../middleware/requireAdminAuth.js'
import { requireAdminRole } from '../../middleware/requireAdminRole.js'

export const adminUsersRouter = Router()

// Every route here manages *other* accounts, so it's admin-only.
// (The service layer enforces the same rule independently — see
// services/admin/admin.service.ts — this is just the fast-fail path.)
adminUsersRouter.use(requireAdminAuth, requireAdminRole('admin'))

adminUsersRouter.get('/', listUsers)
adminUsersRouter.post('/', createUser)
adminUsersRouter.patch('/:id/status', updateUserStatus)
adminUsersRouter.delete('/:id', removeUser)
