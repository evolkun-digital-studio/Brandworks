import envPackage from '@next/env'
import { MongoClient, type Db } from 'mongodb'
import { findSiteMediaSlot } from '../../config/siteMediaSections'
import { DEFAULT_HERO_IMAGE, DEFAULT_PHOTOGRAPHY_IMAGES, type DefaultSiteImage } from '../../data/siteMediaDefaults'
import { createStorageAdapter, type StorageAdapter } from '../storage'
import { processImage } from '../site-media/pipeline'
import { deleteFiles, publishVariants } from '../site-media/publish'
import { ensureSiteMediaIndexes, insertActiveVersion, listSlotVersions } from '../site-media/repository'

const { loadEnvConfig } = envPackage

/**
 * Migration + seed for Media Manager: creates the site_media indexes, then
 * imports the images the homepage uses today as each empty slot's first
 * version. Slots that already hold images are left alone, so it is safe to
 * run again. Run with `npm run media:seed`.
 */
async function seedSlot(db: Db, storage: StorageAdapter, section: string, slot: string, images: DefaultSiteImage[]) {
  const found = findSiteMediaSlot(section, slot)
  if (!found) throw new Error(`Unknown slot ${section}/${slot}.`)
  if ((await listSlotVersions(db, section, slot)).length) {
    console.log(JSON.stringify({ slot: `${section}/${slot}`, status: 'skipped', reason: 'already has images' }))
    return
  }
  for (const [order, image] of images.entries()) {
    const response = await fetch(image.src)
    if (!response.ok) throw new Error(`Could not download ${image.src} (status ${response.status}).`)
    const processed = await processImage(Buffer.from(await response.arrayBuffer()))
    const published = await publishVariants(storage, section, slot, processed)
    const now = new Date()
    try {
      await insertActiveVersion(db, {
        section, slot, itemId: found.slot.kind === 'single' ? slot : crypto.randomUUID(), order,
        altText: image.alt, ...published, storageProvider: storage.name,
        width: processed.width, height: processed.height, blurDataURL: processed.blurDataURL, dominantColor: processed.dominantColor,
        focalX: 0.5, focalY: 0.5, sizeBytes: processed.variants[processed.variants.length - 1].size, format: 'webp',
        version: 1, createdAt: now, updatedAt: now, uploadedBy: null,
      })
    } catch (error) {
      await deleteFiles(storage, [published])
      throw error
    }
    console.log(JSON.stringify({ slot: `${section}/${slot}`, status: 'seeded', order, width: processed.width, height: processed.height }))
  }
}

async function run() {
  loadEnvConfig(process.cwd())
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required.')
  const storage = createStorageAdapter()
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()
    await ensureSiteMediaIndexes(db)
    await seedSlot(db, storage, 'hero', 'main', [DEFAULT_HERO_IMAGE])
    await seedSlot(db, storage, 'photography', 'gallery', DEFAULT_PHOTOGRAPHY_IMAGES)
    console.log(JSON.stringify({ job: 'seed-site-media', status: 'ok', storage: storage.name }))
  } finally {
    await client.close()
  }
}

run().catch((error: unknown) => {
  console.error(JSON.stringify({ job: 'seed-site-media', status: 'failed', error: error instanceof Error ? error.message : 'Error' }))
  process.exitCode = 1
})
