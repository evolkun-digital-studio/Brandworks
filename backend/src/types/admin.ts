import type { ObjectId } from 'mongodb'

/**
 * Roles for this phase. Deliberately just two, with authorization
 * decided by simple `role === 'admin'` checks in the service layer —
 * see services/admin/admin.service.ts. A future phase (blog
 * permissions) can extend this to a permissions array without
 * touching how authentication itself works.
 */
export type AdminRole = 'admin' | 'sub_admin'

/** The document as stored in the `admins` collection. */
export interface AdminDocument {
  _id: ObjectId
  username: string
  passwordHash: string
  role: AdminRole
  enabled: boolean
  /**
   * True only for the single bootstrap-created admin. Used to block
   * disabling/deleting the one account guaranteed to always have
   * access, so nobody can lock themselves out of the admin panel.
   */
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

/** Never include `passwordHash` in anything sent to a client. */
export type PublicAdmin = Omit<AdminDocument, 'passwordHash'>

/**
 * Explicit allow-list rather than an object-rest omit, so it's
 * impossible for a future field added to AdminDocument to leak
 * through here by accident.
 */
export function toPublicAdmin(doc: AdminDocument): PublicAdmin {
  return {
    _id: doc._id,
    username: doc.username,
    role: doc.role,
    enabled: doc.enabled,
    isPrimary: doc.isPrimary,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastLoginAt: doc.lastLoginAt,
  }
}
