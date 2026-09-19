import { Router } from 'express'
import { updatePassword, updateUsername } from '../../controllers/admin/profile.controller.js'
import { requireAdminAuth } from '../../middleware/requireAdminAuth.js'

export const adminProfileRouter = Router()

// Every profile route is self-service and requires an authenticated
// session; there is no role restriction here on purpose — both admins
// and sub-admins manage their own login ID and password.
adminProfileRouter.use(requireAdminAuth)

adminProfileRouter.put('/username', updateUsername)
adminProfileRouter.put('/password', updatePassword)
