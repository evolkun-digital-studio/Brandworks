import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * config.ts reads import.meta.env once at module load, so each
 * scenario here stubs the env, resets the module cache, and
 * dynamically re-imports — the only reliable way to test several
 * env-driven outcomes in one process (same pattern used by the
 * backend's config/env.test.ts in Phase 9, adapted for Vite's
 * import.meta.env via vi.stubEnv rather than child-process spawning,
 * since these values are read directly rather than validated at
 * startup with a possible throw).
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

function stubAllEnvsEmpty() {
  for (const key of [
    'VITE_GA_MEASUREMENT_ID',
    'VITE_CLARITY_PROJECT_ID',
    'VITE_GTM_CONTAINER_ID',
    'VITE_META_PIXEL_ID',
    'VITE_GSC_VERIFICATION',
  ]) {
    vi.stubEnv(key, '')
  }
}

describe('analyticsConfig — provider disabled when env value absent', () => {
  it('every provider is disabled and null when nothing is configured', async () => {
    stubAllEnvsEmpty()
    const { analyticsConfig, anyProviderEnabled } = await import('./config')
    expect(analyticsConfig.gaMeasurementId).toBeNull()
    expect(analyticsConfig.clarityProjectId).toBeNull()
    expect(analyticsConfig.gtmContainerId).toBeNull()
    expect(analyticsConfig.metaPixelId).toBeNull()
    expect(analyticsConfig.gscVerification).toBeNull()
    expect(anyProviderEnabled).toBe(false)
  })

  it('whitespace-only values are also treated as unset', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '   ')
    const { analyticsConfig } = await import('./config')
    expect(analyticsConfig.gaMeasurementId).toBeNull()
  })
})

describe('analyticsConfig — GA4 initialization when configured', () => {
  it('gaDirectEnabled is true when a measurement ID is set and GTM is not configured', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { analyticsConfig, gaDirectEnabled, anyProviderEnabled } = await import('./config')
    expect(analyticsConfig.gaMeasurementId).toBe('G-TEST123')
    expect(gaDirectEnabled).toBe(true)
    expect(anyProviderEnabled).toBe(true)
  })
})

describe('analyticsConfig — GTM owns GA4 when both are configured (Part 8)', () => {
  it('gaOwnedByGtm is true and gaDirectEnabled is false when both IDs are set', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { gaOwnedByGtm, gaDirectEnabled, gtmEnabled } = await import('./config')
    expect(gaOwnedByGtm).toBe(true)
    expect(gaDirectEnabled).toBe(false)
    expect(gtmEnabled).toBe(true)
  })

  it('gaDirectEnabled is true when GA4 is set but GTM is not', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { gaOwnedByGtm, gaDirectEnabled } = await import('./config')
    expect(gaOwnedByGtm).toBe(false)
    expect(gaDirectEnabled).toBe(true)
  })

  it('gtmEnabled is true when only GTM is set, independent of GA4', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { gtmEnabled, gaOwnedByGtm, gaDirectEnabled } = await import('./config')
    expect(gtmEnabled).toBe(true)
    expect(gaOwnedByGtm).toBe(false)
    expect(gaDirectEnabled).toBe(false)
  })
})

describe('analyticsConfig — Clarity / Meta Pixel / GSC independence', () => {
  it('each provider can be enabled independently of the others', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    const { clarityEnabled, gaDirectEnabled, metaPixelEnabled, gscEnabled } = await import('./config')
    expect(clarityEnabled).toBe(true)
    expect(gaDirectEnabled).toBe(false)
    expect(metaPixelEnabled).toBe(false)
    expect(gscEnabled).toBe(false)
  })

  it('gscEnabled reflects VITE_GSC_VERIFICATION alone', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GSC_VERIFICATION', 'token-value')
    const { analyticsConfig, gscEnabled } = await import('./config')
    expect(gscEnabled).toBe(true)
    expect(analyticsConfig.gscVerification).toBe('token-value')
  })
})
