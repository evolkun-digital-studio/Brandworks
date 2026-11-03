import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { StorageAdapter } from './types'

export const LOCAL_PUBLIC_ROUTE = '/api/media-files'

/** Resolves a key inside `root`, refusing anything that would escape it. */
export function resolveLocalKey(root: string, key: string): string {
  if (!key || key.includes('\0') || path.isAbsolute(key) || key.split(/[\\/]/).some((part) => part === '..' || part === '')) {
    throw new Error('Invalid storage key.')
  }
  const resolved = path.resolve(root, key)
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid storage key.')
  return resolved
}

/**
 * Development storage on the local disk, served by /api/media-files.
 * Files under `public/` are not picked up by a production build after the
 * fact, so a route serves them instead. Not for multi-instance hosting.
 */
export function createLocalAdapter(root: string): StorageAdapter {
  const publicRoot = path.join(root, 'public')
  const privateRoot = path.join(root, 'private')
  const write = async (base: string, key: string, body: Buffer) => {
    const target = resolveLocalKey(base, key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, body)
  }
  return {
    name: 'local',
    upload: (key, body) => write(publicRoot, key, body),
    delete: (key) => rm(resolveLocalKey(publicRoot, key), { force: true }),
    getPublicUrl: (key) => `${LOCAL_PUBLIC_ROUTE}/${key.split('/').map(encodeURIComponent).join('/')}`,
    uploadPrivate: (key, body) => write(privateRoot, key, body),
    deletePrivate: (key) => rm(resolveLocalKey(privateRoot, key), { force: true }),
  }
}

export function localPublicRoot(root: string) { return path.join(root, 'public') }
