import {
  findAdminByUsername,
  updateAdminById,
} from '../../repositories/admin.repository.js'
import { hashPassword, validatePassword, verifyPassword } from '../../lib/password.js'
import { normalizeUsername, validateUsername } from '../../lib/validators.js'
import { badRequest, conflict, unauthorized } from '../../lib/httpError.js'
import type { AdminDocument } from '../../types/admin.js'

/**
 * Changing your own login ID or password re-verifies the current
 * password first — a standard guard against a hijacked-but-still-open
 * session (e.g. someone at an unlocked machine) being used to lock the
 * real owner out or silently take over the account.
 */
async function assertCurrentPassword(admin: AdminDocument, currentPassword: string) {
  const valid = await verifyPassword(admin.passwordHash, currentPassword ?? '')
  if (!valid) throw unauthorized('Current password is incorrect.')
}

export async function changeOwnUsername(
  admin: AdminDocument,
  newUsernameInput: string,
  currentPassword: string,
): Promise<AdminDocument> {
  await assertCurrentPassword(admin, currentPassword)

  const usernameError = validateUsername(newUsernameInput)
  if (usernameError) throw badRequest(usernameError)

  const newUsername = normalizeUsername(newUsernameInput)

  if (newUsername === admin.username) {
    throw badRequest('That is already your current username.')
  }

  const existing = await findAdminByUsername(newUsername)
  if (existing) throw conflict('That username is already taken.')

  const updated = await updateAdminById(admin._id.toHexString(), {
    username: newUsername,
  })
  if (!updated) throw badRequest('Unable to update username.')
  return updated
}

export async function changeOwnPassword(
  admin: AdminDocument,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await assertCurrentPassword(admin, currentPassword)

  if (newPassword !== confirmPassword) {
    throw badRequest('New password and confirmation do not match.')
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) throw badRequest(passwordError)

  const samePassword = await verifyPassword(admin.passwordHash, newPassword)
  if (samePassword) {
    throw badRequest('New password must be different from the current password.')
  }

  const passwordHash = await hashPassword(newPassword)
  await updateAdminById(admin._id.toHexString(), { passwordHash })
}
