import sharp from 'sharp'
import { SITE_MEDIA_VARIANT_WIDTHS } from '../../config/siteMediaSections'

export type DetectedImageType = 'jpeg' | 'png' | 'webp'

export const WEBP_OPTIONS = { quality: 80, effort: 4, alphaQuality: 90 } as const
/** A WebP upload at or under this size is published as-is at its own width. */
export const WEBP_PASSTHROUGH_MAX_BYTES = 1.5 * 1024 * 1024
/** Guards sharp against decompression bombs (about a 50 megapixel image). */
const MAX_INPUT_PIXELS = 50_000_000

/**
 * Identifies an upload from its first bytes, never its name or declared
 * type. Anything else, SVG included, returns null and is rejected.
 */
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

/** Standard widths no wider than the original; a tiny original keeps its own width. */
export function variantWidths(originalWidth: number): number[] {
  const widths: number[] = SITE_MEDIA_VARIANT_WIDTHS.filter((width) => width <= originalWidth)
  return widths.length ? widths : [originalWidth]
}

export interface ProcessedVariant {
  width: number
  height: number
  buffer: Buffer
  size: number
}

export interface ProcessedImage {
  sourceType: DetectedImageType
  /** Upright (EXIF-rotated) size of the original. */
  width: number
  height: number
  variants: ProcessedVariant[]
  blurDataURL: string
  dominantColor: string
}

function hex(value: number) { return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0') }

/**
 * Turns an upload into the WebP files the site serves: auto-rotated from
 * EXIF, metadata stripped (sharp drops it unless asked to keep it), one
 * file per responsive width, plus a ~16px blur placeholder.
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const sourceType = detectImageType(buffer)
  if (!sourceType) throw new Error('Unsupported image type.')

  const input = () => sharp(buffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS }).autoOrient()
  const metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS }).metadata()
  const width = metadata.autoOrient?.width ?? metadata.width
  const height = metadata.autoOrient?.height ?? metadata.height
  if (!width || !height) throw new Error('Could not read the image size.')

  // A WebP that's already a sensible size, upright and free of metadata is
  // published untouched at its own width rather than encoded twice.
  const canPassThrough = sourceType === 'webp'
    && buffer.length <= WEBP_PASSTHROUGH_MAX_BYTES
    && (metadata.orientation ?? 1) === 1
    && !metadata.exif && !metadata.xmp && !metadata.icc

  const widths = canPassThrough
    ? [...variantWidths(width).filter((item) => item < width), width]
    : variantWidths(width)
  const variants: ProcessedVariant[] = []
  for (const targetWidth of widths) {
    if (canPassThrough && targetWidth === width) {
      variants.push({ width, height, buffer, size: buffer.length })
      continue
    }
    const { data, info } = await input()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp(WEBP_OPTIONS)
      .toBuffer({ resolveWithObject: true })
    variants.push({ width: info.width, height: info.height, buffer: data, size: data.length })
  }

  const blur = await input().resize({ width: 16, height: 16, fit: 'inside' }).webp({ quality: 40 }).toBuffer()
  const { dominant } = await input().resize({ width: 64, height: 64, fit: 'inside' }).stats()

  return {
    sourceType,
    width,
    height,
    variants,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
  }
}
