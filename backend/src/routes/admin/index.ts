import { Router } from 'express'
import { adminAuthRouter } from './auth.routes.js'
import { adminProfileRouter } from './profile.routes.js'
import { adminUsersRouter } from './users.routes.js'
import { adminBlogRouter } from './blog.routes.js'

/** Mounted at /api/admin. */
export const adminRouter = Router()

adminRouter.use('/auth', adminAuthRouter)
adminRouter.use('/profile', adminProfileRouter)
adminRouter.use('/users', adminUsersRouter)
adminRouter.use('/blogs', adminBlogRouter)
