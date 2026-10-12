import 'server-only'

import argon2 from 'argon2'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { requireJwtSecret, jwtExpiresIn } from '../config/env'
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../http/errors'
import {
  deleteAdminById, findAdminById, findAdminByUsername, insertAdmin, listAdmins,
  recordAdminLogin, updateAdminById,
} from '../repositories/admin.repository'
import type { AdminDocument, AdminRole } from './types'

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export function normalizeUsername(value: string) { return value.trim().toLowerCase() }

export function validateUsername(value: string) {
  const normalized = normalizeUsername(value)
  return USERNAME_PATTERN.test(normalized) || (normalized.length <= 254 && EMAIL_PATTERN.test(normalized))
    ? null : 'Login ID must be a 3-32 character username or a valid email address.'
}

export function validatePassword(value: string) {
  if (!value) return 'Password is required.'
  if (value.length < 10) return 'Password must be at least 10 characters long.'
  if (value.length > 128) return 'Password must be at most 128 characters long.'
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) return 'Password must include at least one letter and one number.'
  return null
}

export interface SessionPayload { sub: string }

export function signAdminToken(adminId: string) {
  return jwt.sign({ sub: adminId }, requireJwtSecret(), { expiresIn: jwtExpiresIn() as SignOptions['expiresIn'] })
}

export function verifyAdminToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, requireJwtSecret())
    if (typeof payload === 'object' && payload !== null && typeof payload.sub === 'string') return { sub: payload.sub }
    return null
  } catch { return null }
}

export async function loginAdmin(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput)
  const admin = await findAdminByUsername(username)
  const genericError = unauthorized('Invalid username or password.')
  if (!admin) throw genericError
  let valid = false
  try { valid = await argon2.verify(admin.passwordHash, password) } catch { valid = false }
  if (!valid || !admin.enabled) throw genericError
  await recordAdminLogin(admin._id.toHexString())
  return { token: signAdminToken(admin._id.toHexString()), admin }
}

export async function getActiveAdmin(id: string) {
  const admin = await findAdminById(id)
  return admin?.enabled ? admin : null
}

async function assertCurrentPassword(admin: AdminDocument, password: string) {
  let valid = false
  try { valid = await argon2.verify(admin.passwordHash, password) } catch { valid = false }
  if (!valid) throw unauthorized('Current password is incorrect.')
}

export async function changeUsername(admin: AdminDocument, usernameInput: string, currentPassword: string) {
  await assertCurrentPassword(admin, currentPassword)
  const issue = validateUsername(usernameInput)
  if (issue) throw badRequest(issue)
  const username = normalizeUsername(usernameInput)
  if (username === admin.username) throw badRequest('That is already your current username.')
  if (await findAdminByUsername(username)) throw conflict('That username is already taken.')
  try {
    const updated = await updateAdminById(admin._id.toHexString(), { username })
    if (!updated) throw badRequest('Unable to update username.')
    return updated
  } catch (error) { if (isDuplicate(error)) throw conflict('That username is already taken.'); throw error }
}

export async function changePassword(admin: AdminDocument, currentPassword: string, newPassword: string, confirmPassword: string) {
  await assertCurrentPassword(admin, currentPassword)
  if (newPassword !== confirmPassword) throw badRequest('New password and confirmation do not match.')
  const issue = validatePassword(newPassword)
  if (issue) throw badRequest(issue)
  try { if (await argon2.verify(admin.passwordHash, newPassword)) throw badRequest('New password must be different from the current password.') } catch (error) { if (error instanceof Error && error.message.startsWith('New password')) throw error }
  await updateAdminById(admin._id.toHexString(), { passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }) })
}

function isDuplicate(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && (error as {code?:number}).code === 11000 }
function assertAdmin(actor: AdminDocument) { if (actor.role !== 'admin') throw forbidden('Only admins can manage other accounts.') }
function assertObjectId(id: string, label: string) { if (!OBJECT_ID_PATTERN.test(id)) throw badRequest(`Invalid ${label} id.`) }

export async function listUsers(actor: AdminDocument) { assertAdmin(actor); return listAdmins() }

export async function createSubAdmin(actor: AdminDocument, usernameInput: string, password: string) {
  assertAdmin(actor)
  const usernameIssue = validateUsername(usernameInput)
  if (usernameIssue) throw badRequest(usernameIssue)
  const passwordIssue = validatePassword(password)
  if (passwordIssue) throw badRequest(passwordIssue)
  const username = normalizeUsername(usernameInput)
  if (await findAdminByUsername(username)) throw conflict('That username is already taken.')
  try {
    return await insertAdmin({ username, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), role: 'sub_admin', enabled: true, isPrimary: false })
  } catch (error) { if (isDuplicate(error)) throw conflict('That username is already taken.'); throw error }
}

async function manageableSubAdmin(actor: AdminDocument, targetId: string) {
  assertAdmin(actor)
  assertObjectId(targetId, 'admin')
  const target = await findAdminById(targetId)
  if (!target) throw notFound('Admin account not found.')
  if (target.isPrimary) throw forbidden('The primary admin account cannot be modified this way.')
  if (target.role !== 'sub_admin') throw forbidden('Only sub-admin accounts can be managed here.')
  return target
}

export async function setSubAdminEnabled(actor: AdminDocument, id: string, enabled: boolean) {
  const target = await manageableSubAdmin(actor, id)
  const updated = await updateAdminById(target._id.toHexString(), { enabled })
  if (!updated) throw notFound('Admin account not found.')
  return updated
}

export async function removeSubAdmin(actor: AdminDocument, id: string) {
  const target = await manageableSubAdmin(actor, id)
  if (!await deleteAdminById(target._id.toHexString())) throw notFound('Admin account not found.')
}

export function isAdminRole(role: AdminRole) { return role === 'admin' }
