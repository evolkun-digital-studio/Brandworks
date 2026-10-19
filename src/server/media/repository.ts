import 'server-only'

import { GridFSBucket, ObjectId, type Filter } from 'mongodb'
import { getDatabase } from '../db/client'
import type { MediaAssetDocument, MediaKind } from './types'

const assets = async () => (await getDatabase()).collection<MediaAssetDocument>('media_assets')

async function bucket() {
  return new GridFSBucket(await getDatabase(), { bucketName: 'media' })
}

export function isMediaId(value: string) {
  return /^[a-f\d]{24}$/i.test(value)
}

export async function findMediaAsset(id: string, includeDeleted = false) {
  if (!isMediaId(id)) return null
  return (await assets()).findOne({ _id: new ObjectId(id), ...(includeDeleted ? {} : { deletedAt: null }) })
}

export async function insertMediaAsset(asset: Omit<MediaAssetDocument, '_id'>) {
  const created: MediaAssetDocument = { ...asset, _id: new ObjectId() }
  await (await assets()).insertOne(created)
  return created
}

export async function updateMediaAsset(id: string, patch: Pick<MediaAssetDocument, 'altText' | 'caption' | 'description'>) {
  if (!isMediaId(id)) return null
  return (await assets()).findOneAndUpdate(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

export async function softDeleteMediaAsset(id: string) {
  if (!isMediaId(id)) return null
  return (await assets()).findOneAndUpdate(
    { _id: new ObjectId(id), deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

export async function restoreMediaAsset(id: string) {
  if (!isMediaId(id)) return null
  return (await assets()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: null, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
}

export async function queryMediaAssets(options: { search?: string; kind?: MediaKind; page: number; limit: number }) {
  const filter: Filter<MediaAssetDocument> = { deletedAt: null }
  if (options.kind) filter.kind = options.kind
  if (options.search) {
    const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { originalName: { $regex: escaped, $options: 'i' } },
      { altText: { $regex: escaped, $options: 'i' } },
      { caption: { $regex: escaped, $options: 'i' } },
    ]
  }
  const collection = await assets()
  const [items, total] = await Promise.all([
    collection.find(filter).sort({ createdAt: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).toArray(),
    collection.countDocuments(filter),
  ])
  return { items, total, page: options.page, limit: options.limit, totalPages: options.limit ? Math.ceil(total / options.limit) : 0 }
}

export async function deleteStoredFile(fileId: ObjectId) {
  await (await bucket()).delete(fileId)
}

export async function downloadStoredFile(fileId: ObjectId) {
  return (await bucket()).openDownloadStream(fileId)
}

export async function uploadStoredFile(name: string, buffer: Buffer, contentType: string, metadata: Record<string, unknown>) {
  const stream = (await bucket()).openUploadStream(name, { metadata: { ...metadata, contentType } })
  await new Promise<void>((resolve, reject) => {
    stream.once('finish', () => resolve())
    stream.once('error', reject)
    stream.end(buffer)
  })
  return stream.id as ObjectId
}

export async function countMediaUsage(publicUrl: string) {
  const collection = (await getDatabase()).collection('blogs')
  return collection.countDocuments({ deletedAt: null, $or: [{ coverImage: publicUrl }, { ogImage: publicUrl }] })
}
