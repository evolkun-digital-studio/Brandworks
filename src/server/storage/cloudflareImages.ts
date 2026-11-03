import type { StorageAdapter } from './types'

export interface CloudflareImagesConfig {
  accountId: string
  apiToken: string
  /** The account hash from imagedelivery.net/<hash>/… */
  deliveryHash: string
  variant: string
}

/**
 * Optional Cloudflare Images provider. Each key becomes a custom image id,
 * served through a named delivery variant (default "public").
 */
export function createCloudflareImagesAdapter(config: CloudflareImagesConfig): StorageAdapter {
  const api = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/images/v1`
  const headers = { Authorization: `Bearer ${config.apiToken}` }
  return {
    name: 'cloudflare-images',
    async upload(key, body, options) {
      const form = new FormData()
      form.set('id', key)
      form.set('file', new Blob([new Uint8Array(body)], { type: options.contentType }), key.split('/').pop())
      const response = await fetch(api, { method: 'POST', headers, body: form })
      if (!response.ok) throw new Error(`Cloudflare Images upload failed with status ${response.status}.`)
    },
    async delete(key) {
      const response = await fetch(`${api}/${encodeURIComponent(key)}`, { method: 'DELETE', headers })
      if (!response.ok && response.status !== 404) throw new Error(`Cloudflare Images delete failed with status ${response.status}.`)
    },
    getPublicUrl: (key) => `https://imagedelivery.net/${encodeURIComponent(config.deliveryHash)}/${key.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(config.variant)}`,
  }
}
