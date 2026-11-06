import type { ObjectId } from 'mongodb'

export interface SiteSocialLink {
  label: string
  url: string
}

export interface SiteNavigationLabels {
  home: string
  about: string
  services: string
  projects: string
  insights: string
}

/** Public measurement IDs (never secrets). An empty string turns that tool off. */
export interface SiteTrackingSettings {
  ga4MeasurementId: string
  gscVerification: string
  metaPixelId: string
}

export interface SiteSettingsDocument {
  _id: 'primary'
  siteName: string
  siteDescription: string
  contactEmail: string
  footerTagline: string
  socialLinks: SiteSocialLink[]
  navLabels: SiteNavigationLabels
  tracking?: SiteTrackingSettings
  updatedAt: Date
  updatedBy: ObjectId | null
}

export interface PublicSiteSettings {
  siteName: string
  siteDescription: string
  contactEmail: string
  footerTagline: string
  socialLinks: SiteSocialLink[]
  navLabels: SiteNavigationLabels
  tracking: SiteTrackingSettings
}

export const DEFAULT_TRACKING_SETTINGS: SiteTrackingSettings = { ga4MeasurementId: '', gscVerification: '', metaPixelId: '' }

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  siteName: 'BRANDWORKS',
  siteDescription: 'We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.',
  contactEmail: 'socials@brandworks.me',
  footerTagline: 'Based in India, working worldwide.',
  socialLinks: [
    { label: 'Instagram', url: '#' },
    { label: 'LinkedIn', url: '#' },
    { label: 'X', url: '#' },
  ],
  navLabels: { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', insights: 'Insights' },
  tracking: DEFAULT_TRACKING_SETTINGS,
}

export function toPublicSiteSettings(settings: SiteSettingsDocument | null): PublicSiteSettings {
  if (!settings) return DEFAULT_SITE_SETTINGS
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    contactEmail: settings.contactEmail,
    footerTagline: settings.footerTagline,
    socialLinks: settings.socialLinks,
    navLabels: settings.navLabels,
    tracking: { ...DEFAULT_TRACKING_SETTINGS, ...settings.tracking },
  }
}
