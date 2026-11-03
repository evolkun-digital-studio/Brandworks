import envPackage from '@next/env'
import { createStorageAdapter, resolveStorageProvider } from '../storage'

const { loadEnvConfig } = envPackage

/**
 * Checks the Media Manager storage settings without touching the site:
 * uploads a tiny file, reads it back from the public URL, then deletes it.
 * Run with `npm run media:check-storage`. Prints no secrets.
 */
async function run() {
  loadEnvConfig(process.cwd())
  const provider = resolveStorageProvider()
  console.log(`Provider: ${provider}${process.env.STORAGE_PROVIDER?.trim() ? '' : ' (STORAGE_PROVIDER not set)'}`)
  if (provider === 'local') {
    console.log('Uploads are going to the local .media-storage folder, not a CDN. Set STORAGE_PROVIDER=r2 and the R2_* values to use Cloudflare R2.')
    return
  }

  const storage = createStorageAdapter()
  const key = `media/_check/${crypto.randomUUID()}.txt`
  const body = Buffer.from('BrandWorks Media Manager storage check')

  await storage.upload(key, body, { contentType: 'text/plain', cacheControl: 'no-store' })
  console.log('Upload: ok')
  try {
    const url = storage.getPublicUrl(key)
    const response = await fetch(url)
    const text = response.ok ? await response.text() : ''
    if (response.ok && text === body.toString()) console.log(`Public read: ok (${new URL(url).origin})`)
    else throw new Error(`Public read failed with status ${response.status}. Check that public access is on for the bucket and that R2_PUBLIC_URL is its public URL.`)
  } finally {
    await storage.delete(key)
    console.log('Delete: ok')
  }
  console.log('Storage is ready. Restart the dev server so it picks up the new settings.')
}

run().catch((error: unknown) => {
  // SDK errors name the problem (bad key, missing bucket) without echoing credentials.
  const name = error instanceof Error ? error.name : 'Error'
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Storage check failed: ${name}: ${message}`)
  process.exitCode = 1
})
