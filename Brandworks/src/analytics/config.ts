/**
 * All analytics/measurement configuration comes from VITE_* env vars —
 * never hardcoded IDs (Phase 12, Part 2). An empty/unset value means
 * that provider is disabled, and the app must work identically either
 * way — nothing here is required for the site to function.
 *
 * VITE_* values are bundled into the public client build and are
 * never secret (same convention already established by
 * VITE_API_BASE_URL in src/blog/api/client.ts) — only identifiers
 * meant to be publicly visible belong here. No API keys, OAuth
 * secrets, or credentials of any kind are read this way.
 */

function readEnvValue(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export interface AnalyticsConfig {
  gaMeasurementId: string | null
  clarityProjectId: string | null
  gtmContainerId: string | null
  metaPixelId: string | null
  gscVerification: string | null
}

export const analyticsConfig: AnalyticsConfig = {
  gaMeasurementId: readEnvValue(import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined),
  clarityProjectId: readEnvValue(import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined),
  gtmContainerId: readEnvValue(import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined),
  metaPixelId: readEnvValue(import.meta.env.VITE_META_PIXEL_ID as string | undefined),
  gscVerification: readEnvValue(import.meta.env.VITE_GSC_VERIFICATION as string | undefined),
}

/**
 * When both GTM and GA4 are configured, GTM owns GA4 delivery (Phase
 * 12, Part 8): the direct GA4 provider never also loads gtag.js in
 * that case. A GTM container can itself be configured — in the GTM
 * UI, entirely outside this codebase — to forward events to GA4;
 * loading both independently here would double-count every event.
 */
export const gaOwnedByGtm = analyticsConfig.gtmContainerId !== null && analyticsConfig.gaMeasurementId !== null

export const gaDirectEnabled = analyticsConfig.gaMeasurementId !== null && !gaOwnedByGtm
export const gtmEnabled = analyticsConfig.gtmContainerId !== null
export const clarityEnabled = analyticsConfig.clarityProjectId !== null
export const metaPixelEnabled = analyticsConfig.metaPixelId !== null
export const gscEnabled = analyticsConfig.gscVerification !== null

/** True if any measurement provider is actually configured — used only to skip work entirely when nothing is enabled. */
export const anyProviderEnabled = gaDirectEnabled || gtmEnabled || clarityEnabled || metaPixelEnabled
