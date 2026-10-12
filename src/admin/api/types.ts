// Mirrors backend/src/types/admin.ts's PublicAdmin shape (never includes
// a password/hash — the API never sends one).
export type AdminRole = 'admin' | 'sub_admin'

export interface AdminAccount {
  _id: string
  username: string
  role: AdminRole
  enabled: boolean
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}
