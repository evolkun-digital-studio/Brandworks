import path from 'node:path'
import { createCloudflareImagesAdapter } from './cloudflareImages'
import { createCloudinaryAdapter } from './cloudinary'
import { createLocalAdapter } from './local'
import { createS3Adapter } from './s3'
import type { StorageAdapter, StorageProviderName } from './types'

export { IMMUTABLE_CACHE_CONTROL } from './types'
export type { StorageAdapter, StorageProviderName } from './types'

const PROVIDERS: StorageProviderName[] = ['r2', 's3', 'cloudinary', 'cloudflare-images', 'local']

function required(source: NodeJS.ProcessEnv, names: string[], provider: string) {
  const missing = names.filter((name) => !source[name]?.trim())
  // Names only, never values.
  if (missing.length) throw new Error(`STORAGE_PROVIDER=${provider} needs ${missing.join(', ')}.`)
  return Object.fromEntries(names.map((name) => [name, source[name]!.trim()])) as Record<string, string>
}

const R2_VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL']

/**
 * Picks the provider from STORAGE_PROVIDER, R2 by default. Outside
 * production, an unset STORAGE_PROVIDER without R2 credentials falls back
 * to local disk so the admin works on a fresh checkout.
 */
export function resolveStorageProvider(source: NodeJS.ProcessEnv = process.env): StorageProviderName {
  const configured = source.STORAGE_PROVIDER?.trim().toLowerCase()
  if (configured) {
    if (!PROVIDERS.includes(configured as StorageProviderName)) throw new Error(`STORAGE_PROVIDER must be one of ${PROVIDERS.join(', ')}.`)
    return configured as StorageProviderName
  }
  const hasR2 = R2_VARS.every((name) => source[name]?.trim())
  return hasR2 || source.NODE_ENV === 'production' ? 'r2' : 'local'
}

export function createStorageAdapter(source: NodeJS.ProcessEnv = process.env): StorageAdapter {
  const provider = resolveStorageProvider(source)
  if (provider === 'r2') {
    const env = required(source, R2_VARS, provider)
    return createS3Adapter({
      name: 'r2',
      bucket: env.R2_BUCKET,
      publicUrl: env.R2_PUBLIC_URL,
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      privateBucket: source.R2_ORIGINALS_BUCKET?.trim() || undefined,
    })
  }
  if (provider === 's3') {
    const env = required(source, ['S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_PUBLIC_URL'], provider)
    return createS3Adapter({
      name: 's3',
      bucket: env.S3_BUCKET,
      publicUrl: env.S3_PUBLIC_URL,
      region: env.S3_REGION,
      endpoint: source.S3_ENDPOINT?.trim() || undefined,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      privateBucket: source.S3_ORIGINALS_BUCKET?.trim() || undefined,
    })
  }
  if (provider === 'cloudinary') {
    const env = required(source, ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], provider)
    return createCloudinaryAdapter({ cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET })
  }
  if (provider === 'cloudflare-images') {
    const env = required(source, ['CF_IMAGES_ACCOUNT_ID', 'CF_IMAGES_API_TOKEN', 'CF_IMAGES_DELIVERY_HASH'], provider)
    return createCloudflareImagesAdapter({
      accountId: env.CF_IMAGES_ACCOUNT_ID, apiToken: env.CF_IMAGES_API_TOKEN,
      deliveryHash: env.CF_IMAGES_DELIVERY_HASH, variant: source.CF_IMAGES_VARIANT?.trim() || 'public',
    })
  }
  return createLocalAdapter(localStorageRoot(source))
}

export function localStorageRoot(source: NodeJS.ProcessEnv = process.env) {
  // Development-only folder; the ignore keeps the build from tracing the whole project.
  return path.resolve(/*turbopackIgnore: true*/ source.LOCAL_MEDIA_DIR?.trim() || '.media-storage')
}

type StorageGlobal = typeof globalThis & { __brandworksStorage?: StorageAdapter }

/** One adapter per warm process, built on first use so a missing variable fails the request, not the build. */
export function getStorage(): StorageAdapter {
  const state = globalThis as StorageGlobal
  return state.__brandworksStorage ?? (state.__brandworksStorage = createStorageAdapter())
}
