import { adminApiRequest } from './client'

export interface TrackingSettings {
  ga4MeasurementId: string
  gscVerification: string
  metaPixelId: string
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  contactEmail: string
  footerTagline: string
  socialLinks: { label: string; url: string }[]
  navLabels: { home: string; about: string; services: string; projects: string; insights: string }
  tracking: TrackingSettings
}

export function getSiteSettings() {
  return adminApiRequest<{ settings: SiteSettings }>('/site-settings')
}

/** Saves the website fields only; tracking IDs are saved separately with updateTrackingSettings. */
export function updateSiteSettings(settings: SiteSettings) {
  const website: Partial<SiteSettings> = { ...settings }
  delete website.tracking
  return adminApiRequest<{ settings: SiteSettings }>('/site-settings', { method: 'PUT', body: website })
}

export function updateTrackingSettings(tracking: TrackingSettings) {
  return adminApiRequest<{ settings: SiteSettings }>('/site-settings', { method: 'PUT', body: { tracking } })
}
