import 'server-only'

import { revalidateTag } from 'next/cache'
import { ObjectId } from 'mongodb'
import {
  findSiteMediaSection, recommendationWarning, SITE_MEDIA_SECTIONS, type SiteMediaSlotConfig,
} from '../../config/siteMediaSections'
import type { AdminDocument } from '../admin/types'
import { getDatabase } from '../db/client'
import { ApiError, badRequest, notFound } from '../http/errors'
import { allow } from '../questionnaire/rateLimit'
import { getStorage } from '../storage'
import { processImage, type ProcessedImage } from './pipeline'
import { deleteFiles, publishVariants } from './publish'
import {
  activateVersion, countActiveItems, deactivateItem, deleteItemVersions, findSiteMediaById, insertActiveVersion,
  listSlotVersions, nextItemOrder, nextVersion, pruneVersions, reorderItems, updateSiteMediaMeta,
} from './repository'
import { SITE_MEDIA_VERSIONS_KEPT, toSiteMediaResponse, type SiteMediaAssetDocument } from './types'
import { parseAltText, parseFocal, parseSlot, validateImageFile } from './validation'

const UPLOADS_PER_WINDOW = 30
const UPLOAD_WINDOW_MS = 10 * 60 * 1000

/** Per admin, per process: 30 uploads every 10 minutes. */
export function checkUploadRateLimit(actor: AdminDocument) {
  if (!allow('site-media-upload', actor._id.toHexString(), UPLOADS_PER_WINDOW, UPLOAD_WINDOW_MS)) {
    throw new ApiError(429, 'Too many uploads in a short time. Wait a few minutes and try again.')
  }
}

/** Expires the public section at once, so the next visit renders the new image. */
export function revalidateSiteMediaSection(sectionId: string) {
  const section = findSiteMediaSection(sectionId)
  if (section) revalidateTag(section.cacheTag, { expire: 0 })
}

async function resolveItem(slot: SiteMediaSlotConfig, sectionId: string, rawItemId: unknown) {
  const db = await getDatabase()
  if (slot.kind === 'single') return { itemId: slot.id, isNew: false }
  if (typeof rawItemId === 'string' && rawItemId) {
    const versions = await listSlotVersions(db, sectionId, slot.id)
    if (!versions.some((doc) => doc.itemId === rawItemId)) throw notFound('That gallery image no longer exists.')
    return { itemId: rawItemId, isNew: false }
  }
  if (slot.maxItems && await countActiveItems(db, sectionId, slot.id) >= slot.maxItems) {
    throw badRequest(`This gallery holds at most ${slot.maxItems} images. Remove one first.`)
  }
  return { itemId: crypto.randomUUID(), isNew: true }
}

export async function uploadSiteMedia(actor: AdminDocument, form: FormData) {
  const { section, slot } = parseSlot(form.get('section'), form.get('slot'))
  const altText = parseAltText(form.get('altText'))
  const focalX = parseFocal(form.get('focalX'), 'focalX')
  const focalY = parseFocal(form.get('focalY'), 'focalY')
  const file = form.get('file')
  if (!(file instanceof File)) throw badRequest('Choose an image to upload.')
  const buffer = Buffer.from(await file.arrayBuffer())
  const sourceType = validateImageFile(file, buffer)
  const { itemId, isNew } = await resolveItem(slot, section.id, form.get('itemId'))

  let processed: ProcessedImage
  try { processed = await processImage(buffer) } catch { throw badRequest('This image couldn’t be read. It may be damaged; re-export it and try again.') }

  const storage = getStorage()
  const published = await publishVariants(storage, section.id, slot.id, processed, {
    buffer, contentType: file.type || `image/${sourceType}`, extension: sourceType === 'jpeg' ? 'jpg' : sourceType,
  })
  const db = await getDatabase()
  const now = new Date()
  let asset: SiteMediaAssetDocument | null
  try {
    asset = await insertActiveVersion(db, {
      section: section.id, slot: slot.id, itemId,
      order: isNew ? await nextItemOrder(db, section.id, slot.id) : 0,
      altText, ...published, storageProvider: storage.name,
      width: processed.width, height: processed.height, blurDataURL: processed.blurDataURL, dominantColor: processed.dominantColor,
      focalX, focalY, sizeBytes: processed.variants[processed.variants.length - 1].size, format: 'webp',
      version: await nextVersion(db, section.id, slot.id, itemId),
      createdAt: now, updatedAt: now, uploadedBy: actor._id,
    })
  } catch (error) {
    await deleteFiles(storage, [published])
    throw error
  }
  await deleteFiles(storage, await pruneVersions(db, section.id, slot.id, itemId, SITE_MEDIA_VERSIONS_KEPT))
  revalidateSiteMediaSection(section.id)
  return { asset: toSiteMediaResponse(asset!), warning: recommendationWarning(slot.recommended, processed.width, processed.height) }
}

/** Every configured slot with its items, each item's active version first. */
export async function listSiteMedia() {
  const db = await getDatabase()
  return Promise.all(SITE_MEDIA_SECTIONS.map(async (section) => ({
    id: section.id,
    slots: await Promise.all(section.slots.map(async (slot) => {
      const versions = await listSlotVersions(db, section.id, slot.id)
      const items = new Map<string, SiteMediaAssetDocument[]>()
      for (const doc of versions) items.set(doc.itemId, [...(items.get(doc.itemId) ?? []), doc])
      return {
        id: slot.id,
        items: [...items.entries()].map(([itemId, docs]) => {
          const active = docs.find((doc) => doc.isActive) ?? null
          return {
            itemId,
            order: active?.order ?? docs[0].order,
            active: active ? toSiteMediaResponse(active) : null,
            versions: docs.map(toSiteMediaResponse),
          }
        }).sort((a, b) => a.order - b.order),
      }
    })),
  })))
}

async function requireAsset(id: string) {
  const asset = await findSiteMediaById(await getDatabase(), id)
  if (!asset) throw notFound('Image not found.')
  return asset
}

export async function updateSiteMediaAsset(id: string, input: Record<string, unknown>) {
  const asset = await requireAsset(id)
  const patch: Partial<Pick<SiteMediaAssetDocument, 'altText' | 'focalX' | 'focalY'>> = {}
  if ('altText' in input) patch.altText = parseAltText(input.altText)
  if ('focalX' in input) patch.focalX = parseFocal(input.focalX, 'focalX')
  if ('focalY' in input) patch.focalY = parseFocal(input.focalY, 'focalY')
  if (!Object.keys(patch).length) throw badRequest('Nothing to update.')
  const updated = await updateSiteMediaMeta(await getDatabase(), new ObjectId(id), patch)
  if (!updated) throw notFound('Image not found.')
  revalidateSiteMediaSection(asset.section)
  return toSiteMediaResponse(updated)
}

export async function restoreSiteMediaVersion(id: string) {
  const asset = await requireAsset(id)
  const restored = await activateVersion(await getDatabase(), asset)
  if (!restored) throw notFound('Image not found.')
  revalidateSiteMediaSection(asset.section)
  return toSiteMediaResponse(restored)
}

/**
 * Single slots are only switched off, so the default image returns and
 * the versions stay restorable. Gallery images are deleted outright.
 */
export async function removeSiteMediaItem(id: string) {
  const asset = await requireAsset(id)
  const found = parseSlot(asset.section, asset.slot)
  const db = await getDatabase()
  if (found.slot.kind === 'single') {
    await deactivateItem(db, asset.section, asset.slot, asset.itemId)
  } else {
    await deleteFiles(getStorage(), await deleteItemVersions(db, asset.section, asset.slot, asset.itemId))
  }
  revalidateSiteMediaSection(asset.section)
}

export async function reorderSiteMedia(input: Record<string, unknown>) {
  const { section, slot } = parseSlot(input.section, input.slot)
  if (slot.kind !== 'gallery') throw badRequest('Only galleries can be reordered.')
  const itemIds = input.itemIds
  if (!Array.isArray(itemIds) || itemIds.some((value) => typeof value !== 'string') || new Set(itemIds).size !== itemIds.length) {
    throw badRequest('itemIds must be a list of distinct gallery image ids.')
  }
  const db = await getDatabase()
  const known = new Set((await listSlotVersions(db, section.id, slot.id)).map((doc) => doc.itemId))
  if (itemIds.some((itemId) => !known.has(itemId))) throw badRequest('The gallery changed. Reload and try again.')
  await reorderItems(db, section.id, slot.id, itemIds as string[])
  revalidateSiteMediaSection(section.id)
}
