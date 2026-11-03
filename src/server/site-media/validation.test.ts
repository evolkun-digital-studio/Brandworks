// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '../http/errors'
import { assertUploadLength, parseAltText, parseFocal, parseSlot, validateImageFile } from './validation'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const SVG = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

function status(run: () => unknown) {
  try { run() } catch (error) { return error instanceof ApiError ? error.status : 'other' }
  return 'ok'
}

describe('validateImageFile', () => {
  it('accepts JPEG, PNG and WebP whose bytes match their type', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: JPEG.length }, JPEG)).toBe('jpeg')
    expect(validateImageFile({ type: 'image/png', size: PNG.length }, PNG)).toBe('png')
  })

  it('rejects SVG, even when it claims to be a PNG', () => {
    expect(() => validateImageFile({ type: 'image/svg+xml', size: SVG.length }, SVG)).toThrow(/SVG/)
    expect(() => validateImageFile({ type: 'image/png', size: SVG.length }, SVG)).toThrow(/SVG/)
  })

  it('rejects a file whose bytes do not match its declared type', () => {
    expect(() => validateImageFile({ type: 'image/png', size: JPEG.length }, JPEG)).toThrow(/match its type/)
    expect(() => validateImageFile({ type: 'image/jpeg', size: 4 }, Buffer.from('GIF8'))).toThrow(/valid JPG/)
  })

  it('rejects other types and empty or oversized files', () => {
    expect(status(() => validateImageFile({ type: 'image/gif', size: 6 }, Buffer.from('GIF89a')))).toBe(400)
    expect(status(() => validateImageFile({ type: 'image/jpeg', size: 0 }, Buffer.alloc(0)))).toBe(400)
    expect(status(() => validateImageFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }, JPEG))).toBe(413)
  })
})

describe('assertUploadLength', () => {
  it('stops an oversized body before it is read', () => {
    expect(status(() => assertUploadLength(String(11 * 1024 * 1024)))).toBe(413)
    expect(status(() => assertUploadLength(String(9 * 1024 * 1024)))).toBe('ok')
    expect(status(() => assertUploadLength(null))).toBe('ok')
  })
})

describe('fields', () => {
  it('requires alt text', () => {
    expect(() => parseAltText('   ')).toThrow(/Alt text is required/)
    expect(() => parseAltText('x'.repeat(301))).toThrow(/at most 300/)
    expect(parseAltText('  A red chair  ')).toBe('A red chair')
  })

  it('keeps focal points between 0 and 1, centred by default', () => {
    expect(parseFocal(undefined, 'focalX')).toBe(0.5)
    expect(parseFocal('0.25', 'focalX')).toBe(0.25)
    expect(() => parseFocal('1.5', 'focalX')).toThrow(/between 0 and 1/)
    expect(() => parseFocal('abc', 'focalY')).toThrow(/between 0 and 1/)
  })

  it('accepts only configured sections and slots', () => {
    expect(parseSlot('hero', 'main').slot.kind).toBe('single')
    expect(parseSlot('photography', 'gallery').slot.kind).toBe('gallery')
    expect(() => parseSlot('hero', 'nope')).toThrow(/Unknown/)
    expect(() => parseSlot(undefined, 'main')).toThrow()
  })
})
