import { API_BASE_URL } from '../../config/api'
import { adminApiFormRequest, adminApiRequest, ApiError } from './client'

export interface MediaAsset {
  id: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  kind: 'image' | 'video'
  altText: string
  caption: string
  description: string
  publicUrl: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface MediaListResult {
  assets: MediaAsset[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export function listMedia(params: { search?: string; type?: 'image' | 'video'; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.type) query.set('type', params.type)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  return adminApiRequest<MediaListResult>(`/media?${query.toString()}`)
}

export function uploadMedia(file: File, altText: string, caption: string) {
  const form = new FormData()
  form.set('file', file)
  form.set('altText', altText)
  form.set('caption', caption)
  return adminApiFormRequest<{ asset: MediaAsset }>('/media', form)
}

/** Same upload as `uploadMedia`, over XHR because fetch can't report upload progress. */
export function uploadMediaWithProgress(file: File, altText: string, caption: string, onProgress: (percent: number) => void) {
  const form = new FormData()
  form.set('file', file)
  form.set('altText', altText)
  form.set('caption', caption)
  const request = new XMLHttpRequest()
  const promise = new Promise<{ asset: MediaAsset }>((resolve, reject) => {
    request.open('POST', `${API_BASE_URL}/api/admin/media`)
    request.withCredentials = true
    request.responseType = 'json'
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)) }
    request.onload = () => {
      const data = request.response as { asset?: MediaAsset; error?: string } | null
      if (request.status >= 200 && request.status < 300 && data?.asset) resolve({ asset: data.asset })
      else reject(new ApiError(request.status, data?.error ?? `Upload failed with status ${request.status}.`))
    }
    request.onerror = () => reject(new Error('The connection dropped during the upload.'))
    request.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'))
    request.send(form)
  })
  return { promise, abort: () => request.abort() }
}

export function updateMedia(id: string, input: Pick<MediaAsset, 'altText' | 'caption' | 'description'>) {
  return adminApiRequest<{ asset: MediaAsset }>(`/media/${id}`, { method: 'PATCH', body: input })
}

export function deleteMedia(id: string) {
  return adminApiRequest<undefined>(`/media/${id}`, { method: 'DELETE' })
}
