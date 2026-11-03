import { readFile } from 'node:fs/promises'
import { localPublicRoot, resolveLocalKey } from '../../../../src/server/storage/local'
import { localStorageRoot, resolveStorageProvider } from '../../../../src/server/storage'

export const runtime = 'nodejs'

/** Serves Media Manager files when STORAGE_PROVIDER=local (development). */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const notFound = () => new Response('Not found', { status: 404 })
  try {
    if (resolveStorageProvider() !== 'local') return notFound()
    const { key } = await context.params
    if (!key.join('/').endsWith('.webp')) return notFound()
    const body = await readFile(resolveLocalKey(localPublicRoot(localStorageRoot()), key.join('/')))
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return notFound()
  }
}
