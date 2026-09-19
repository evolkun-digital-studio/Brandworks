import {
  findAdminByUsername,
  findAdminById,
  recordAdminLogin,
} from '../../repositories/admin.repository.js'
import { verifyPassword } from '../../lib/password.js'
import { normalizeUsername } from '../../lib/validators.js'
import { signAdminToken } from '../../lib/jwt.js'
import { unauthorized } from '../../lib/httpError.js'
import type { AdminDocument } from '../../types/admin.js'

export interface LoginResult {
  token: string
  admin: AdminDocument
}

/**
 * Verifies credentials and issues a session token. Deliberately uses
 * one generic "invalid username or password" message for every
 * failure case (unknown username, wrong password, disabled account)
 * so a caller can't use the error to enumerate valid usernames or
 * learn an account exists but is disabled.
 */
export async function loginAdmin(
  usernameInput: string,
  password: string,
): Promise<LoginResult> {
  const username = normalizeUsername(usernameInput)
  const admin = await findAdminByUsername(username)

  const genericError = unauthorized('Invalid username or password.')

  if (!admin) throw genericError

  const passwordValid = await verifyPassword(admin.passwordHash, password)
  if (!passwordValid) throw genericError

  if (!admin.enabled) throw genericError

  await recordAdminLogin(admin._id.toHexString())

  const token = signAdminToken(admin._id.toHexString())
  return { token, admin }
}

/**
 * Resolves the admin identified by a verified token's subject. Always
 * re-reads from the database (rather than trusting anything embedded
 * in the token) so a role change, disable, or deletion takes effect
 * immediately on the next request — not only after the token expires.
 */
export async function getActiveAdminById(
  id: string,
): Promise<AdminDocument | null> {
  const admin = await findAdminById(id)
  if (!admin || !admin.enabled) return null
  return admin
}
