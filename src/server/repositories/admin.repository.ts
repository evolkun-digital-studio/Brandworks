import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import type { AdminDocument, AdminRole } from '../admin/types'

const collection = async () => (await getDatabase()).collection<AdminDocument>('admins')

export async function findAdminByUsername(username: string) {
  return (await collection()).findOne({ username })
}

export async function findAdminById(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await collection()).findOne({ _id: new ObjectId(id) })
}

export async function listAdmins() {
  return (await collection()).find().sort({ createdAt: 1 }).toArray()
}

export async function insertAdmin(input: Pick<AdminDocument, 'username' | 'passwordHash' | 'role' | 'enabled' | 'isPrimary'>) {
  const now = new Date()
  const doc: AdminDocument = {
    _id: new ObjectId(), ...input, createdAt: now, updatedAt: now, lastLoginAt: null,
  }
  await (await collection()).insertOne(doc)
  return doc
}

export async function updateAdminById(id: string, update: Partial<Pick<AdminDocument, 'username' | 'passwordHash' | 'enabled'>>) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await collection()).findOneAndUpdate(
    { _id: new ObjectId(id) }, { $set: { ...update, updatedAt: new Date() } }, { returnDocument: 'after' },
  )
}

export async function recordAdminLogin(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return
  await (await collection()).updateOne({ _id: new ObjectId(id) }, { $set: { lastLoginAt: new Date() } })
}

export async function deleteAdminById(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return false
  return (await collection()).deleteOne({ _id: new ObjectId(id) }).then((result) => result.deletedCount === 1)
}

export async function countAdminsByRole(role: AdminRole) {
  return (await collection()).countDocuments({ role })
}
