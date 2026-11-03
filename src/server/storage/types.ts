export type StorageProviderName = 'r2' | 's3' | 'cloudinary' | 'cloudflare-images' | 'local'

export interface StorageUploadOptions {
  contentType: string
  cacheControl?: string
}

/**
 * Where published files live. Keys are bucket-relative paths such as
 * media/hero/main/<uuid>-1600.webp; every adapter maps one key to one
 * public URL.
 */
export interface StorageAdapter {
  readonly name: StorageProviderName
  upload(key: string, body: Buffer, options: StorageUploadOptions): Promise<void>
  delete(key: string): Promise<void>
  getPublicUrl(key: string): string
  /**
   * Keeps a file out of public reach (the untouched original upload).
   * Adapters without a private location leave this undefined, and
   * originals are then not kept at all.
   */
  uploadPrivate?(key: string, body: Buffer, options: StorageUploadOptions): Promise<void>
  deletePrivate?(key: string): Promise<void>
}

export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
