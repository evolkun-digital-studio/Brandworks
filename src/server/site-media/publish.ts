import type { ProcessedImage } from './pipeline'
import { IMMUTABLE_CACHE_CONTROL, type StorageAdapter } from '../storage'
import type { SiteMediaAssetDocument } from './types'

// Storage side of an upload, shared by the upload route and the seed script.

export async function deleteFiles(storage: StorageAdapter, docs: Array<Pick<SiteMediaAssetDocument, 'storageKeys' | 'originalKey'>>) {
  // Best effort: a leftover file costs storage, never a broken page.
  await Promise.allSettled(docs.flatMap((doc) => [
    ...doc.storageKeys.map((key) => storage.delete(key)),
    ...(doc.originalKey && storage.deletePrivate ? [storage.deletePrivate(doc.originalKey)] : []),
  ]))
}

/** Publishes the processed variants under media/<section>/<slot>/<uuid>-<width>.webp. */
export async function publishVariants(storage: StorageAdapter, section: string, slot: string, processed: ProcessedImage, original?: { buffer: Buffer; contentType: string; extension: string }) {
  const uuid = crypto.randomUUID()
  const keys = processed.variants.map((variant) => `media/${section}/${slot}/${uuid}-${variant.width}.webp`)
  const uploaded: string[] = []
  try {
    await Promise.all(processed.variants.map(async (variant, index) => {
      await storage.upload(keys[index], variant.buffer, { contentType: 'image/webp', cacheControl: IMMUTABLE_CACHE_CONTROL })
      uploaded.push(keys[index])
    }))
    let originalKey: string | null = null
    if (original && storage.uploadPrivate && process.env.MEDIA_KEEP_ORIGINALS === 'true') {
      originalKey = `originals/${section}/${slot}/${uuid}.${original.extension}`
      await storage.uploadPrivate(originalKey, original.buffer, { contentType: original.contentType })
    }
    const urls = Object.fromEntries(processed.variants.map((variant, index) => [String(variant.width), storage.getPublicUrl(keys[index])]))
    return { urls, storageKeys: keys, originalKey }
  } catch (error) {
    await Promise.allSettled(uploaded.map((key) => storage.delete(key)))
    throw error
  }
}
