import type { ObjectId } from 'mongodb'
import type { PublicSiteImage } from '../../config/siteMediaSections'

export const SITE_MEDIA_COLLECTION = 'site_media'
/** Versions kept per item for "Restore previous version"; older ones are deleted. */
export const SITE_MEDIA_VERSIONS_KEPT = 3

/**
 * One uploaded version of one image on the public site. A slot item
 * (`itemId`: the slot id for single slots, a uuid per gallery image) has up
 * to three versions; at most one is active.
 */
export interface SiteMediaAssetDocument {
  _id: ObjectId
  section: string
  slot: string
  itemId: string
  order: number
  altText: string
  /** Public WebP URLs keyed by pixel width (640, 1024, 1600, 2400). */
  urls: Record<string, string>
  /** Storage keys for every published file, so they can be deleted. */
  storageKeys: string[]
  /** Private original upload, when kept. */
  originalKey: string | null
  storageProvider: string
  width: number
  height: number
  blurDataURL: string
  dominantColor: string | null
  focalX: number
  focalY: number
  /** Size of the largest WebP variant, in bytes. */
  sizeBytes: number
  format: 'webp'
  isActive: boolean
  version: number
  createdAt: Date
  updatedAt: Date
  uploadedBy: ObjectId | null
}

export interface SiteMediaAssetResponse {
  id: string
  section: string
  slot: string
  itemId: string
  order: number
  altText: string
  urls: Record<string, string>
  previewUrl: string
  width: number
  height: number
  blurDataURL: string
  dominantColor: string | null
  focalX: number
  focalY: number
  sizeBytes: number
  format: 'webp'
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

function sortedVariants(urls: Record<string, string>) {
  return Object.entries(urls).map(([width, url]) => ({ width: Number(width), url })).filter((item) => item.width > 0).sort((a, b) => a.width - b.width)
}

export function toSiteMediaResponse(asset: SiteMediaAssetDocument): SiteMediaAssetResponse {
  const variants = sortedVariants(asset.urls)
  return {
    id: asset._id.toHexString(),
    section: asset.section, slot: asset.slot, itemId: asset.itemId, order: asset.order,
    altText: asset.altText, urls: asset.urls,
    // The 1024 variant is plenty for an admin thumbnail.
    previewUrl: (variants.find((item) => item.width >= 1024) ?? variants[variants.length - 1])?.url ?? '',
    width: asset.width, height: asset.height, blurDataURL: asset.blurDataURL, dominantColor: asset.dominantColor,
    focalX: asset.focalX, focalY: asset.focalY, sizeBytes: asset.sizeBytes, format: asset.format,
    isActive: asset.isActive, version: asset.version,
    createdAt: asset.createdAt.toISOString(), updatedAt: asset.updatedAt.toISOString(),
  }
}

export function toPublicSiteImage(asset: SiteMediaAssetDocument): PublicSiteImage {
  return {
    id: asset._id.toHexString(), alt: asset.altText, width: asset.width, height: asset.height,
    variants: sortedVariants(asset.urls), blurDataURL: asset.blurDataURL, dominantColor: asset.dominantColor,
    focalX: asset.focalX, focalY: asset.focalY,
  }
}
