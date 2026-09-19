import { ObjectId } from 'mongodb'
import type { Collection } from 'mongodb'
import { getDb } from '../config/database.js'
import type { AdminDocument, AdminRole } from '../types/admin.js'

const COLLECTION_NAME = 'admins'

function collection(): Collection<AdminDocument> {
  return getDb().collection<AdminDocument>(COLLECTION_NAME)
}

/**
 * Creates the unique index on `username` if it doesn't already exist.
 * Safe to call every startup — `createIndex` is idempotent.
 */
export async function ensureAdminIndexes(): Promise<void> {
  await collection().createIndex({ username: 1 }, { unique: true })
}

export function findAdminByUsername(
  username: string,
): Promise<AdminDocument | null> {
  return collection().findOne({ username })
}

export function findAdminById(id: string): Promise<AdminDocument | null> {
  if (!ObjectId.isValid(id)) return Promise.resolve(null)
  return collection().findOne({ _id: new ObjectId(id) })
}

export function listAdmins(): Promise<AdminDocument[]> {
  return collection().find().sort({ createdAt: 1 }).toArray()
}

export function countAdminsByRole(role: AdminRole): Promise<number> {
  return collection().countDocuments({ role })
}

export interface InsertAdminInput {
  username: string
  passwordHash: string
  role: AdminRole
  enabled: boolean
  isPrimary: boolean
}

export async function insertAdmin(
  input: InsertAdminInput,
): Promise<AdminDocument> {
  const now = new Date()
  const doc: AdminDocument = {
    _id: new ObjectId(),
    username: input.username,
    passwordHash: input.passwordHash,
    role: input.role,
    enabled: input.enabled,
    isPrimary: input.isPrimary,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  }
  await collection().insertOne(doc)
  return doc
}

export async function updateAdminById(
  id: string,
  update: Partial<
    Pick<AdminDocument, 'username' | 'passwordHash' | 'enabled'>
  >,
): Promise<AdminDocument | null> {
  if (!ObjectId.isValid(id)) return null
  const result = await collection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  return result
}

export async function recordAdminLogin(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return
  await collection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { lastLoginAt: new Date() } },
  )
}

export async function deleteAdminById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const result = await collection().deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}
