import { Router } from 'express'
import { login, logout, me } from '../../controllers/admin/auth.controller.js'
import { requireAdminAuth } from '../../middleware/requireAdminAuth.js'
import { loginRateLimiter } from '../../middleware/loginRateLimiter.js'

export const adminAuthRouter = Router()

adminAuthRouter.post('/login', loginRateLimiter, login)
adminAuthRouter.post('/logout', logout)
adminAuthRouter.get('/me', requireAdminAuth, me)
