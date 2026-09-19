import {
  countAdminsByRole,
  deleteAdminById,
  findAdminById,
  findAdminByUsername,
  insertAdmin,
  listAdmins,
  updateAdminById,
} from '../../repositories/admin.repository.js'
import { hashPassword, validatePassword } from '../../lib/password.js'
import { normalizeUsername, validateUsername } from '../../lib/validators.js'
import { badRequest, conflict, forbidden, notFound } from '../../lib/httpError.js'
import type { AdminDocument } from '../../types/admin.js'

/**
 * Everything in this module assumes the caller has already been
 * authenticated (see middleware/requireAuth.ts). The `actor` passed in
 * is always the database-verified admin performing the action — never
 * a client-supplied id/role — so these checks can't be bypassed by
 * tampering with a request body.
 */

function assertIsAdmin(actor: AdminDocument) {
  if (actor.role !== 'admin') {
    throw forbidden('Only admins can manage other accounts.')
  }
}

export async function listAllAdmins(actor: AdminDocument): Promise<AdminDocument[]> {
  assertIsAdmin(actor)
  return listAdmins()
}

export async function createSubAdmin(
  actor: AdminDocument,
  usernameInput: string,
  password: string,
): Promise<AdminDocument> {
  assertIsAdmin(actor)

  const usernameError = validateUsername(usernameInput)
  if (usernameError) throw badRequest(usernameError)

  const passwordError = validatePassword(password)
  if (passwordError) throw badRequest(passwordError)

  const username = normalizeUsername(usernameInput)
  const existing = await findAdminByUsername(username)
  if (existing) throw conflict('That username is already taken.')

  const passwordHash = await hashPassword(password)

  // role is always 'sub_admin' here — never taken from the request —
  // so this endpoint can never be used to mint another primary admin.
  return insertAdmin({
    username,
    passwordHash,
    role: 'sub_admin',
    enabled: true,
    isPrimary: false,
  })
}

/** Loads the target account and enforces the shared "can this be touched?" rules. */
async function loadManageableSubAdmin(
  actor: AdminDocument,
  targetId: string,
): Promise<AdminDocument> {
  assertIsAdmin(actor)

  const target = await findAdminById(targetId)
  if (!target) throw notFound('Admin account not found.')

  if (target.isPrimary) {
    throw forbidden('The primary admin account cannot be modified this way.')
  }
  if (target.role !== 'sub_admin') {
    throw forbidden('Only sub-admin accounts can be managed here.')
  }
  return target
}

export async function setSubAdminEnabled(
  actor: AdminDocument,
  targetId: string,
  enabled: boolean,
): Promise<AdminDocument> {
  const target = await loadManageableSubAdmin(actor, targetId)

  const updated = await updateAdminById(target._id.toHexString(), { enabled })
  if (!updated) throw notFound('Admin account not found.')
  return updated
}

export async function deleteSubAdmin(
  actor: AdminDocument,
  targetId: string,
): Promise<void> {
  const target = await loadManageableSubAdmin(actor, targetId)

  const deleted = await deleteAdminById(target._id.toHexString())
  if (!deleted) throw notFound('Admin account not found.')
}

/**
 * Not currently used by a route (bootstrap owns primary-admin creation),
 * kept here as the one place that would enforce "only one primary admin"
 * if that ever needs to be checked outside the CLI script.
 */
export async function primaryAdminExists(): Promise<boolean> {
  return (await countAdminsByRole('admin')) > 0
}
