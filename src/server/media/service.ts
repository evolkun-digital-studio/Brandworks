import 'server-only'

import { badRequest, notFound } from '../http/errors'
import type { AdminDocument } from '../admin/types'
import { countMediaUsage, deleteStoredFile, downloadStoredFile, findMediaAssetByPublicId, insertMediaAsset, queryMediaAssets, restoreMediaAsset, softDeleteMediaAsset, updateMediaAsset, uploadStoredFile } from './repository'
import { toMediaAssetResponse, type MediaKind } from './types'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'])

function cleanName(name: string) {
  const base = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return base.slice(0, 180) || 'upload'
}

function hasSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimeType === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (mimeType === 'image/avif') return buffer.subarray(4, 8).toString('ascii') === 'ftyp' && buffer.subarray(8, 12).toString('ascii').includes('avif')
  if (mimeType === 'video/mp4') return buffer.subarray(4, 8).toString('ascii') === 'ftyp'
  if (mimeType === 'video/webm') return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  return false
}

function readPngDimensions(buffer: Buffer) { return buffer.length >= 24 ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null }

function readJpegDimensions(buffer: Buffer) {
  let offset = 2
  while (offset + 9 < buffer.length && buffer[offset] === 0xff) {
    const marker = buffer[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    if (offset + 2 > buffer.length) break
    const length = buffer.readUInt16BE(offset)
    if (marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf) {
      if (offset + 7 <= buffer.length) return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) }
      break
    }
    offset += length
  }
  return null
}

function readWebpDimensions(buffer: Buffer) {
  if (buffer.subarray(12, 16).toString('ascii') === 'VP8X' && buffer.length >= 30) {
    return { width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16), height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16) }
  }
  return null
}

function readDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') return readPngDimensions(buffer)
  if (mimeType === 'image/jpeg') return readJpegDimensions(buffer)
  if (mimeType === 'image/webp') return readWebpDimensions(buffer)
  return null
}

export async function uploadMedia(actor: AdminDocument, form: FormData) {
  const file = form.get('file')
  if (!(file instanceof File)) throw badRequest('Choose a file to upload.')
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw badRequest('Files must be between 1 byte and 20 MB.')
  if (!ALLOWED_TYPES.has(file.type)) throw badRequest('Only JPEG, PNG, WebP, AVIF, GIF, MP4, and WebM files are supported.')
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasSignature(buffer, file.type)) throw badRequest('The file signature does not match its declared type.')
  const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim() : ''
  const caption = typeof form.get('caption') === 'string' ? String(form.get('caption')).trim() : ''
  if (altText.length > 300) throw badRequest('Alt text must be at most 300 characters.')
  if (caption.length > 500) throw badRequest('Caption must be at most 500 characters.')
  const now = new Date()
  const originalName = cleanName(file.name)
  const storageName = `${now.toISOString().replace(/[-:.TZ]/g, '')}-${crypto.randomUUID()}-${originalName}`
  const fileId = await uploadStoredFile(storageName, buffer, file.type, { originalName, uploadedBy: actor._id.toHexString() })
  try {
    const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image'
    const dimensions = kind === 'image' ? readDimensions(buffer, file.type) : null
    const asset = await insertMediaAsset({
      fileId, originalName, storageName, mimeType: file.type, size: file.size,
      width: dimensions?.width ?? null, height: dimensions?.height ?? null, kind,
      altText, caption, description: '', publicUrl: `/api/media/${fileId.toHexString()}`,
      uploadedBy: actor._id, createdAt: now, updatedAt: now, deletedAt: null,
    })
    return toMediaAssetResponse(asset)
  } catch (error) {
    await deleteStoredFile(fileId).catch(() => undefined)
    throw error
  }
}

export async function listMedia(params: URLSearchParams) {
  const rawPage = Number(params.get('page')); const rawLimit = Number(params.get('limit'))
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 60) : 24
  const rawKind = params.get('type')
  if (rawKind && rawKind !== 'image' && rawKind !== 'video') throw badRequest('type must be image or video.')
  const result = await queryMediaAssets({ page, limit, search: params.get('search')?.trim() || undefined, kind: rawKind as MediaKind | undefined })
  return { ...result, assets: await Promise.all(result.items.map(async (asset) => toMediaAssetResponse(asset, await countMediaUsage(asset.publicUrl)))) }
}

export async function updateMedia(id: string, input: Record<string, unknown>) {
  const text = (key: string, max: number) => {
    const value = input[key]
    if (typeof value !== 'string') throw badRequest(`${key} must be text.`)
    if (value.length > max) throw badRequest(`${key} must be at most ${max} characters.`)
    return value.trim()
  }
  const updated = await updateMediaAsset(id, { altText: text('altText', 300), caption: text('caption', 500), description: text('description', 1000) })
  if (!updated) throw notFound('Media asset not found.')
  return toMediaAssetResponse(updated, await countMediaUsage(updated.publicUrl))
}

export async function deleteMedia(id: string) {
  const deleted = await softDeleteMediaAsset(id)
  if (!deleted) throw notFound('Media asset not found.')
}

export async function restoreMedia(id: string) {
  const restored = await restoreMediaAsset(id)
  if (!restored) throw notFound('Media asset not found.')
  return toMediaAssetResponse(restored, await countMediaUsage(restored.publicUrl))
}

export async function getMediaStream(id: string) {
  const asset = await findMediaAssetByPublicId(id)
  if (!asset) throw notFound('Media asset not found.')
  return { asset, stream: await downloadStoredFile(asset.fileId) }
}

