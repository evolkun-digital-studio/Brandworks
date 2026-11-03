// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { detectImageType, processImage, variantWidths, WEBP_PASSTHROUGH_MAX_BYTES } from './pipeline'

const solid = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 30 } } })

describe('detectImageType', () => {
  it('reads JPEG, PNG and WebP from their magic bytes', async () => {
    expect(detectImageType(await solid(8, 8).jpeg().toBuffer())).toBe('jpeg')
    expect(detectImageType(await solid(8, 8).png().toBuffer())).toBe('png')
    expect(detectImageType(await solid(8, 8).webp().toBuffer())).toBe('webp')
  })

  it('refuses SVG, GIF and anything else', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })
})

describe('variantWidths', () => {
  it('keeps the standard widths no wider than the original', () => {
    expect(variantWidths(3000)).toEqual([640, 1024, 1600, 2400])
    expect(variantWidths(1700)).toEqual([640, 1024, 1600])
    expect(variantWidths(1024)).toEqual([640, 1024])
  })

  it('keeps a tiny original at its own width', () => {
    expect(variantWidths(400)).toEqual([400])
  })
})

describe('processImage', () => {
  it('converts a JPEG to WebP variants, auto-rotated from EXIF and without metadata', async () => {
    // Stored 2600×1800 with orientation 6: upright it is 1800×2600.
    const jpeg = await solid(2600, 1800).jpeg().withMetadata({ orientation: 6 }).toBuffer()
    const result = await processImage(jpeg)

    expect(result.sourceType).toBe('jpeg')
    expect({ width: result.width, height: result.height }).toEqual({ width: 1800, height: 2600 })
    expect(result.variants.map((variant) => variant.width)).toEqual([640, 1024, 1600])
    for (const variant of result.variants) {
      expect(detectImageType(variant.buffer)).toBe('webp')
      const meta = await sharp(variant.buffer).metadata()
      expect(meta.width).toBe(variant.width)
      expect(meta.height).toBeGreaterThan(meta.width!)
      expect(meta.exif).toBeUndefined()
      expect(meta.orientation ?? 1).toBe(1)
      expect(variant.size).toBe(variant.buffer.length)
    }
  })

  it('makes a tiny blur placeholder and a dominant colour', async () => {
    const result = await processImage(await solid(1200, 800).png().toBuffer())
    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)
    expect(result.blurDataURL.length).toBeLessThan(1000)
    const blur = await sharp(Buffer.from(result.blurDataURL.split(',')[1], 'base64')).metadata()
    expect(Math.max(blur.width!, blur.height!)).toBeLessThanOrEqual(16)
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('never upscales: a small PNG keeps one variant at its own width', async () => {
    const result = await processImage(await solid(500, 300).png().toBuffer())
    expect(result.variants.map((variant) => [variant.width, variant.height])).toEqual([[500, 300]])
  })

  it('publishes a lean, metadata-free WebP as-is at its own width', async () => {
    const webp = await solid(1800, 1000).webp({ quality: 60 }).toBuffer()
    expect(webp.length).toBeLessThan(WEBP_PASSTHROUGH_MAX_BYTES)
    const result = await processImage(webp)
    expect(result.variants.map((variant) => variant.width)).toEqual([640, 1024, 1600, 1800])
    expect(result.variants[3].buffer.equals(webp)).toBe(true)
  })

  it('re-encodes a WebP that carries metadata', async () => {
    const webp = await solid(1800, 1000).webp().withMetadata({ exif: { IFD0: { Copyright: 'x' } } }).toBuffer()
    const result = await processImage(webp)
    expect(result.variants.map((variant) => variant.width)).toEqual([640, 1024, 1600])
  })

  it('rejects bytes that are not an image', async () => {
    await expect(processImage(Buffer.from('<svg></svg>'))).rejects.toThrow()
  })
})
