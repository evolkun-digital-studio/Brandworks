import { createHash } from 'node:crypto'
import type { StorageAdapter } from './types'

export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string }

/** Cloudinary public ids carry no extension; the delivery URL adds it back. */
function publicId(key: string) { return key.replace(/\.[a-z0-9]+$/i, '') }

function sign(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params).sort().map((name) => `${name}=${params[name]}`).join('&')
  return createHash('sha1').update(payload + secret).digest('hex')
}

/** Uploads through Cloudinary's signed REST API; no SDK needed. */
export function createCloudinaryAdapter(config: CloudinaryConfig): StorageAdapter {
  const api = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image`
  const call = async (action: 'upload' | 'destroy', params: Record<string, string>, file?: Buffer) => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signed = { ...params, timestamp }
    const form = new FormData()
    for (const [name, value] of Object.entries(signed)) form.set(name, value)
    form.set('api_key', config.apiKey)
    form.set('signature', sign(signed, config.apiSecret))
    if (file) form.set('file', new Blob([new Uint8Array(file)], { type: 'image/webp' }))
    const response = await fetch(`${api}/${action}`, { method: 'POST', body: form })
    if (!response.ok) throw new Error(`Cloudinary ${action} failed with status ${response.status}.`)
  }
  return {
    name: 'cloudinary',
    upload: (key, body) => call('upload', { public_id: publicId(key), overwrite: 'true' }, body),
    delete: (key) => call('destroy', { public_id: publicId(key), invalidate: 'true' }),
    getPublicUrl: (key) => `https://res.cloudinary.com/${encodeURIComponent(config.cloudName)}/image/upload/${publicId(key)}.webp`,
  }
}
