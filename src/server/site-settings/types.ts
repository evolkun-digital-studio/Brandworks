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

export interface SiteSettingsDocument {
  _id: 'primary'
  siteName: string
  siteDescription: string
  contactEmail: string
  footerTagline: string
  socialLinks: SiteSocialLink[]
  navLabels: SiteNavigationLabels
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
}

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  siteName: 'BRANDWORKS',
  siteDescription: 'We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.',
  contactEmail: 'hello@brandworks.com',
  footerTagline: 'Based in India, working worldwide.',
  socialLinks: [
    { label: 'Instagram', url: '#' },
    { label: 'LinkedIn', url: '#' },
    { label: 'X', url: '#' },
  ],
  navLabels: { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', insights: 'Insights' },
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
  }
}
