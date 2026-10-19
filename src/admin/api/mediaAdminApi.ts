import { adminApiFormRequest, adminApiRequest } from './client'

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

export function updateMedia(id: string, input: Pick<MediaAsset, 'altText' | 'caption' | 'description'>) {
  return adminApiRequest<{ asset: MediaAsset }>(`/media/${id}`, { method: 'PATCH', body: input })
}

export function deleteMedia(id: string) {
  return adminApiRequest<undefined>(`/media/${id}`, { method: 'DELETE' })
}
