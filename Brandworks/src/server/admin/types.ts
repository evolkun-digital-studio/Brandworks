import type { ObjectId } from 'mongodb'

export type AdminRole = 'admin' | 'sub_admin'

export interface AdminDocument {
  _id: ObjectId
  username: string
  passwordHash: string
  role: AdminRole
  enabled: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

export type PublicAdmin = Omit<AdminDocument, 'passwordHash'>

export function toPublicAdmin(admin: AdminDocument): PublicAdmin {
  return {
    _id: admin._id,
    username: admin.username,
    role: admin.role,
    enabled: admin.enabled,
    isPrimary: admin.isPrimary,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    lastLoginAt: admin.lastLoginAt,
  }
}
