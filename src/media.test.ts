import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('R2 media URLs', () => {
  it('encodes filenames with spaces and commas for use in srcsets', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', '')
    const { mediaUrl } = await import('./media')
    expect(mediaUrl('ChatGPT Image Sep 21, 2026, 12_05_00 PM.png')).toBe(
      'https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/ChatGPT%20Image%20Sep%2021%2C%202026%2C%2012_05_00%20PM.png',
    )
  })

  it('uses a configurable origin without duplicate slashes', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', 'https://media.example.com/Photography///')
    const { mediaUrl } = await import('./media')
    expect(mediaUrl('Photo1.jpg')).toBe('https://media.example.com/Photography/Photo1.jpg')
  })

  it('maps every registered asset to an original file without CDN transforms', async () => {
    vi.stubEnv('VITE_MEDIA_BASE_URL', '')
    const { MEDIA_FILES, mediaUrl } = await import('./media')
    for (const id of Object.keys(MEDIA_FILES) as (keyof typeof MEDIA_FILES)[]) {
      const url = new URL(mediaUrl(id))
      expect(decodeURIComponent(url.pathname)).toBe('/Photography/' + MEDIA_FILES[id])
      expect(url.search).toBe('')
      expect(url.hash).toBe('')
    }
  })
})
