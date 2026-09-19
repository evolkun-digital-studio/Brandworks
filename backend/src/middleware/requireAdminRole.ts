import type { NextFunction, Request, Response } from 'express'
import { forbidden } from '../lib/httpError.js'
import type { AdminRole } from '../types/admin.js'

/**
 * First line of defense for role-restricted routes — must run after
 * requireAdminAuth. The service layer re-checks the same rule (see
 * services/admin/admin.service.ts), so a mistake here can't turn into
 * a privilege escalation on its own; this just fails fast and keeps
 * the intent visible in the route definitions.
 */
export function requireAdminRole(role: AdminRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.admin?.role !== role) {
      throw forbidden('Only admins can perform this action.')
    }
    next()
  }
}
