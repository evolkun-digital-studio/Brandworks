import type { ObjectId } from 'mongodb'

export type MediaKind = 'image' | 'video'

export interface MediaAssetDocument {
  _id: ObjectId
  fileId: ObjectId
  originalName: string
  storageName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  kind: MediaKind
  altText: string
  caption: string
  description: string
  publicUrl: string
  uploadedBy: ObjectId
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface MediaAssetResponse {
  id: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  kind: MediaKind
  altText: string
  caption: string
  description: string
  publicUrl: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export function toMediaAssetResponse(asset: MediaAssetDocument, usageCount = 0): MediaAssetResponse {
  return {
    id: asset._id.toHexString(),
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    kind: asset.kind,
    altText: asset.altText,
    caption: asset.caption,
    description: asset.description,
    publicUrl: asset.publicUrl,
    usageCount,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }
}
