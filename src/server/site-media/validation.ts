import {
  findSiteMediaSlot, SITE_MEDIA_ACCEPTED_TYPES, SITE_MEDIA_ALT_MAX, SITE_MEDIA_MAX_BYTES,
} from '../../config/siteMediaSections'
import { ApiError, badRequest } from '../http/errors'
import { detectImageType, type DetectedImageType } from './pipeline'

const MIME_FOR: Record<DetectedImageType, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
/** Multipart framing on top of the file itself. */
const FORM_OVERHEAD_BYTES = 256 * 1024

/** Rejects an oversized body from its Content-Length, before any of it is read. */
export function assertUploadLength(contentLength: string | null) {
  const length = Number(contentLength)
  if (contentLength && Number.isFinite(length) && length > SITE_MEDIA_MAX_BYTES + FORM_OVERHEAD_BYTES) {
    throw new ApiError(413, 'Images must be 10 MB or smaller.')
  }
}

export function parseSlot(section: unknown, slot: unknown) {
  if (typeof section !== 'string' || typeof slot !== 'string') throw badRequest('Choose a section and slot.')
  const found = findSiteMediaSlot(section, slot)
  if (!found) throw badRequest('Unknown section or slot.')
  return found
}

export function parseAltText(value: unknown) {
  const altText = typeof value === 'string' ? value.trim() : ''
  if (!altText) throw badRequest('Alt text is required. Describe the image for people who can’t see it.')
  if (altText.length > SITE_MEDIA_ALT_MAX) throw badRequest(`Alt text must be at most ${SITE_MEDIA_ALT_MAX} characters.`)
  return altText
}

/** Focal points are fractions of the width and height (0–1); the default is the centre. */
export function parseFocal(value: unknown, name: string) {
  if (value === undefined || value === null || value === '') return 0.5
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 1) throw badRequest(`${name} must be between 0 and 1.`)
  return Math.round(number * 1000) / 1000
}

function looksLikeSvg(buffer: Buffer) {
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(buffer.subarray(0, 1024).toString('utf8').replace(/^﻿/, ''))
}

/**
 * Checks the declared type, the size and the actual bytes. The magic bytes
 * decide: a renamed file or an SVG is refused whatever it claims to be.
 */
export function validateImageFile(file: { type: string; size: number }, buffer: Buffer): DetectedImageType {
  if (file.size <= 0) throw badRequest('This file is empty.')
  if (file.size > SITE_MEDIA_MAX_BYTES || buffer.length > SITE_MEDIA_MAX_BYTES) {
    throw new ApiError(413, 'Images must be 10 MB or smaller.')
  }
  if (file.type === 'image/svg+xml' || looksLikeSvg(buffer)) throw badRequest('SVG files aren’t accepted. Upload a JPG, PNG or WebP.')
  // Some systems send no type at all; the bytes still have to match.
  if (file.type && !(SITE_MEDIA_ACCEPTED_TYPES as readonly string[]).includes(file.type)) throw badRequest('Only JPG, PNG and WebP images are accepted.')
  const detected = detectImageType(buffer)
  if (!detected) throw badRequest('This file isn’t a valid JPG, PNG or WebP image.')
  if (file.type && MIME_FOR[detected] !== file.type) throw badRequest('The file’s contents don’t match its type. Re-export it and try again.')
  return detected
}
