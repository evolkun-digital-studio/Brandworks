import { adminApiRequest } from './client'

export interface SiteSettings {
  siteName: string
  siteDescription: string
  contactEmail: string
  footerTagline: string
  socialLinks: { label: string; url: string }[]
  navLabels: { home: string; about: string; services: string; projects: string; insights: string }
}

export function getSiteSettings() {
  return adminApiRequest<{ settings: SiteSettings }>('/site-settings')
}

export function updateSiteSettings(settings: SiteSettings) {
  return adminApiRequest<{ settings: SiteSettings }>('/site-settings', { method: 'PUT', body: settings })
}
