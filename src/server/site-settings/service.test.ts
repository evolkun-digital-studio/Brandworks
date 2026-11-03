import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

vi.mock('server-only', () => ({}))
vi.mock('./repository', () => ({
  getSiteSettingsDocument: vi.fn(),
  saveSiteSettings: vi.fn(async (patch: Record<string, unknown>) => ({ ...patch, _id: 'primary', updatedAt: new Date() })),
}))

import { getSiteSettingsDocument, saveSiteSettings } from './repository'
import { updateSiteSettings } from './service'
import { DEFAULT_SITE_SETTINGS, toPublicSiteSettings } from './types'
import type { AdminDocument } from '../admin/types'

const actor = { _id: new ObjectId('64b000000000000000000001') } as AdminDocument
const websiteDefaults: Partial<typeof DEFAULT_SITE_SETTINGS> = { ...DEFAULT_SITE_SETTINGS }
delete websiteDefaults.tracking
const ids = { ga4MeasurementId: 'g-abc123xyz', gscVerification: 'abcDEF123_-tokenValue', metaPixelId: '1234567890123456' }

describe('site settings tracking IDs', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getSiteSettingsDocument).mockResolvedValue(null) })

  it('documents saved before tracking existed read back with empty IDs', () => {
    const settings = toPublicSiteSettings({ ...websiteDefaults, _id: 'primary', updatedAt: new Date(), updatedBy: null })
    expect(settings.tracking).toEqual({ ga4MeasurementId: '', gscVerification: '', metaPixelId: '' })
  })

  it('saves tracking on its own without touching the website fields', async () => {
    const result = await updateSiteSettings(actor, { tracking: ids })
    expect(result.tracking).toEqual({ ...ids, ga4MeasurementId: 'G-ABC123XYZ' })
    expect(result.siteName).toBe(DEFAULT_SITE_SETTINGS.siteName)
  })

  it('keeps saved tracking IDs when only the website fields are saved', async () => {
    vi.mocked(getSiteSettingsDocument).mockResolvedValue({ ...DEFAULT_SITE_SETTINGS, tracking: ids, _id: 'primary', updatedAt: new Date(), updatedBy: null })
    const result = await updateSiteSettings(actor, { ...websiteDefaults, siteName: 'BrandWorks' })
    expect(result.siteName).toBe('BrandWorks')
    expect(result.tracking).toEqual(ids)
  })

  it('accepts the whole Search Console meta tag and keeps only its token', async () => {
    const result = await updateSiteSettings(actor, { tracking: { gscVerification: '<meta name="google-site-verification" content="abcDEF123_-tokenValue" />' } })
    expect(result.tracking.gscVerification).toBe('abcDEF123_-tokenValue')
  })

  it('rejects IDs in the wrong format', async () => {
    await expect(updateSiteSettings(actor, { tracking: { ga4MeasurementId: 'UA-12345-1' } })).rejects.toThrow('GA4 measurement ID')
    await expect(updateSiteSettings(actor, { tracking: { metaPixelId: 'fb-123' } })).rejects.toThrow('Meta Pixel ID')
    expect(saveSiteSettings).not.toHaveBeenCalled()
  })
})
