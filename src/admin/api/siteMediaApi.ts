import { API_BASE_URL } from '../../config/api'
import { adminApiRequest, ApiError } from './client'

export interface SiteMediaAsset {
  id: string
  section: string
  slot: string
  itemId: string
  order: number
  altText: string
  urls: Record<string, string>
  previewUrl: string
  width: number
  height: number
  blurDataURL: string
  dominantColor: string | null
  focalX: number
  focalY: number
  sizeBytes: number
  format: 'webp'
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface SiteMediaItem {
  itemId: string
  order: number
  active: SiteMediaAsset | null
  /** Newest first, the active one included. */
  versions: SiteMediaAsset[]
}

export interface SiteMediaSectionState {
  id: string
  slots: Array<{ id: string; items: SiteMediaItem[] }>
}

export interface SiteMediaUploadInput {
  file: File
  section: string
  slot: string
  altText: string
  focalX: number
  focalY: number
  /** Gallery only: replaces this image instead of adding one. */
  itemId?: string
}

export function listSiteMedia() {
  return adminApiRequest<{ sections: SiteMediaSectionState[] }>('/media/site')
}

/** XHR rather than fetch, because fetch can't report upload progress. */
export function uploadSiteMedia(input: SiteMediaUploadInput, onProgress: (percent: number) => void) {
  const form = new FormData()
  form.set('file', input.file)
  form.set('section', input.section)
  form.set('slot', input.slot)
  form.set('altText', input.altText)
  form.set('focalX', String(input.focalX))
  form.set('focalY', String(input.focalY))
  if (input.itemId) form.set('itemId', input.itemId)
  const request = new XMLHttpRequest()
  const promise = new Promise<{ asset: SiteMediaAsset; warning: string | null }>((resolve, reject) => {
    request.open('POST', `${API_BASE_URL}/api/admin/media/upload`)
    request.withCredentials = true
    request.responseType = 'json'
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    // Small files can finish without a progress event; the server is converting from here.
    request.upload.onload = () => onProgress(100)
    request.onload = () => {
      const data = request.response as { asset?: SiteMediaAsset; warning?: string | null; error?: string } | null
      if (request.status >= 200 && request.status < 300 && data?.asset) resolve({ asset: data.asset, warning: data.warning ?? null })
      else reject(new ApiError(request.status, data?.error ?? `Upload failed with status ${request.status}.`))
    }
    request.onerror = () => reject(new Error('The connection dropped during the upload.'))
    request.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'))
    request.send(form)
  })
  return { promise, abort: () => request.abort() }
}

export function updateSiteMedia(id: string, input: Partial<Pick<SiteMediaAsset, 'altText' | 'focalX' | 'focalY'>>) {
  return adminApiRequest<{ asset: SiteMediaAsset }>(`/media/site/${id}`, { method: 'PATCH', body: input })
}

export function removeSiteMedia(id: string) {
  return adminApiRequest<undefined>(`/media/site/${id}`, { method: 'DELETE' })
}

export function restoreSiteMedia(id: string) {
  return adminApiRequest<{ asset: SiteMediaAsset }>(`/media/site/${id}/restore`, { method: 'POST' })
}

export function reorderSiteMedia(section: string, slot: string, itemIds: string[]) {
  return adminApiRequest<undefined>('/media/site/reorder', { method: 'POST', body: { section, slot, itemIds } })
}
