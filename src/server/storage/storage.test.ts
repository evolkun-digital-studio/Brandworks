// @vitest-environment node
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStorageAdapter, resolveStorageProvider } from './index'
import { resolveLocalKey } from './local'

const R2 = { R2_ACCOUNT_ID: 'acc', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret', R2_BUCKET: 'bucket', R2_PUBLIC_URL: 'https://media.example.com/' }
const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv

describe('storage provider selection', () => {
  it('defaults to R2', () => {
    expect(resolveStorageProvider(env({ ...R2, NODE_ENV: 'development' }))).toBe('r2')
    expect(resolveStorageProvider(env({ NODE_ENV: 'production' }))).toBe('r2')
  })

  it('falls back to local disk outside production when R2 is not configured', () => {
    expect(resolveStorageProvider(env({ NODE_ENV: 'development' }))).toBe('local')
  })

  it('honours STORAGE_PROVIDER and rejects unknown names', () => {
    expect(resolveStorageProvider(env({ STORAGE_PROVIDER: 'cloudinary', NODE_ENV: 'production' }))).toBe('cloudinary')
    expect(() => resolveStorageProvider(env({ STORAGE_PROVIDER: 'ftp', NODE_ENV: 'test' }))).toThrow(/must be one of/)
  })

  it('names missing variables without revealing any values', () => {
    const partial = env({ STORAGE_PROVIDER: 'r2', R2_SECRET_ACCESS_KEY: 'do-not-print', NODE_ENV: 'test' })
    expect(() => createStorageAdapter(partial)).toThrow(/R2_ACCOUNT_ID/)
    expect(() => createStorageAdapter(partial)).not.toThrow(/do-not-print/)
  })

  it('builds public R2 URLs from R2_PUBLIC_URL and keeps no originals without a private bucket', () => {
    const storage = createStorageAdapter(env({ ...R2, STORAGE_PROVIDER: 'r2', NODE_ENV: 'test' }))
    expect(storage.getPublicUrl('media/hero/main/abc-1600.webp')).toBe('https://media.example.com/media/hero/main/abc-1600.webp')
    expect(storage.uploadPrivate).toBeUndefined()
  })
})

describe('local storage keys', () => {
  const root = path.resolve('tmp-root')
  it('stay inside their folder', () => {
    expect(resolveLocalKey(root, 'media/hero/main/a-640.webp')).toBe(path.join(root, 'media', 'hero', 'main', 'a-640.webp'))
    for (const key of ['../secret', 'media/../../x', '/etc/passwd', 'media//x', '']) {
      expect(() => resolveLocalKey(root, key)).toThrow(/Invalid storage key/)
    }
  })
})
