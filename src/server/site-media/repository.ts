import { ObjectId, type Db } from 'mongodb'
import { SITE_MEDIA_COLLECTION, type SiteMediaAssetDocument } from './types'

// Takes the Db explicitly (like repositories/blog-jobs) so the seed script
// can use it outside Next.

const collection = (db: Db) => db.collection<SiteMediaAssetDocument>(SITE_MEDIA_COLLECTION)

export function isSiteMediaId(value: string) { return /^[a-f\d]{24}$/i.test(value) }

export async function ensureSiteMediaIndexes(db: Db) {
  await collection(db).createIndex({ section: 1, isActive: 1, slot: 1, order: 1 })
  await collection(db).createIndex({ section: 1, slot: 1, itemId: 1, version: -1 }, { unique: true })
}

export async function findSiteMediaById(db: Db, id: string) {
  if (!isSiteMediaId(id)) return null
  return collection(db).findOne({ _id: new ObjectId(id) })
}

/** Every version in a slot, newest first within each item. */
export async function listSlotVersions(db: Db, section: string, slot: string) {
  return collection(db).find({ section, slot }).sort({ order: 1, itemId: 1, version: -1 }).toArray()
}

export async function listActiveSectionMedia(db: Db, section: string) {
  return collection(db).find({ section, isActive: true }).sort({ slot: 1, order: 1, createdAt: 1 }).toArray()
}

export async function countActiveItems(db: Db, section: string, slot: string) {
  return collection(db).countDocuments({ section, slot, isActive: true })
}

export async function nextItemOrder(db: Db, section: string, slot: string) {
  const last = await collection(db).find({ section, slot }).sort({ order: -1 }).limit(1).next()
  return last ? last.order + 1 : 0
}

export async function nextVersion(db: Db, section: string, slot: string, itemId: string) {
  const latest = await collection(db).find({ section, slot, itemId }).sort({ version: -1 }).limit(1).next()
  return latest ? latest.version + 1 : 1
}

/** Adds a version and makes it the item's only active one. */
export async function insertActiveVersion(db: Db, asset: Omit<SiteMediaAssetDocument, '_id' | 'isActive'>) {
  const created: SiteMediaAssetDocument = { ...asset, _id: new ObjectId(), isActive: false }
  await collection(db).insertOne(created)
  return activateVersion(db, created)
}

export async function activateVersion(db: Db, asset: SiteMediaAssetDocument) {
  const { section, slot, itemId } = asset
  const current = await collection(db).findOne({ section, slot, itemId, isActive: true })
  await collection(db).updateMany({ section, slot, itemId, _id: { $ne: asset._id } }, { $set: { isActive: false } })
  return collection(db).findOneAndUpdate(
    { _id: asset._id },
    // A restored version keeps the item's current place in a gallery.
    { $set: { isActive: true, order: current?.order ?? asset.order, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

export async function deactivateItem(db: Db, section: string, slot: string, itemId: string) {
  await collection(db).updateMany({ section, slot, itemId }, { $set: { isActive: false, updatedAt: new Date() } })
}

/** Deletes all but the newest `keep` versions of an item and returns them, for file cleanup. */
export async function pruneVersions(db: Db, section: string, slot: string, itemId: string, keep: number) {
  const stale = await collection(db).find({ section, slot, itemId, isActive: false }).sort({ version: -1 }).toArray()
  const newest = await collection(db).find({ section, slot, itemId }).sort({ version: -1 }).limit(keep).project({ _id: 1 }).toArray()
  const keepIds = new Set(newest.map((doc) => doc._id.toHexString()))
  const remove = stale.filter((doc) => !keepIds.has(doc._id.toHexString()))
  if (remove.length) await collection(db).deleteMany({ _id: { $in: remove.map((doc) => doc._id) } })
  return remove
}

export async function deleteItemVersions(db: Db, section: string, slot: string, itemId: string) {
  const docs = await collection(db).find({ section, slot, itemId }).toArray()
  if (docs.length) await collection(db).deleteMany({ section, slot, itemId })
  return docs
}

export async function updateSiteMediaMeta(db: Db, id: ObjectId, patch: Partial<Pick<SiteMediaAssetDocument, 'altText' | 'focalX' | 'focalY'>>) {
  return collection(db).findOneAndUpdate({ _id: id }, { $set: { ...patch, updatedAt: new Date() } }, { returnDocument: 'after' })
}

export async function reorderItems(db: Db, section: string, slot: string, itemIds: string[]) {
  if (!itemIds.length) return
  await collection(db).bulkWrite(itemIds.map((itemId, order) => ({
    updateMany: { filter: { section, slot, itemId }, update: { $set: { order } } },
  })))
}
