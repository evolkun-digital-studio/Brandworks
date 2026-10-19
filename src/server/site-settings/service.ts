import 'server-only'

import { badRequest } from '../http/errors'
import type { AdminDocument } from '../admin/types'
import { getSiteSettingsDocument, saveSiteSettings } from './repository'
import { DEFAULT_SITE_SETTINGS, toPublicSiteSettings, type PublicSiteSettings, type SiteNavigationLabels, type SiteSocialLink } from './types'

function text(value: unknown, name: string, max: number) {
  if (typeof value !== 'string' || !value.trim()) throw badRequest(`${name} is required.`)
  if (value.trim().length > max) throw badRequest(`${name} must be at most ${max} characters.`)
  return value.trim()
}

function email(value: unknown) {
  const result = text(value, 'contactEmail', 160)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw badRequest('contactEmail must be a valid email address.')
  return result
}

function socialLinks(value: unknown): SiteSocialLink[] {
  if (!Array.isArray(value) || value.length > 8) throw badRequest('socialLinks must be an array with at most 8 entries.')
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw badRequest(`socialLinks[${index}] is invalid.`)
    const link = item as Record<string, unknown>
    const label = text(link.label, `socialLinks[${index}].label`, 40)
    const url = text(link.url, `socialLinks[${index}].url`, 500)
    if (url !== '#' && !/^https:\/\//i.test(url)) throw badRequest(`socialLinks[${index}].url must use HTTPS.`)
    return { label, url }
  })
}

function navLabels(value: unknown): SiteNavigationLabels {
  if (!value || typeof value !== 'object') throw badRequest('navLabels is required.')
  const labels = value as Record<string, unknown>
  return {
    home: text(labels.home, 'navLabels.home', 30), about: text(labels.about, 'navLabels.about', 30),
    services: text(labels.services, 'navLabels.services', 30), projects: text(labels.projects, 'navLabels.projects', 30),
    insights: text(labels.insights, 'navLabels.insights', 30),
  }
}

export async function getPublicSiteSettings() {
  try { return toPublicSiteSettings(await getSiteSettingsDocument()) } catch { return DEFAULT_SITE_SETTINGS }
}

export async function getAdminSiteSettings() { return getPublicSiteSettings() }

export async function updateSiteSettings(actor: AdminDocument, input: Record<string, unknown>): Promise<PublicSiteSettings> {
  const current = await getSiteSettingsDocument()
  const next = {
    siteName: text(input.siteName, 'siteName', 100),
    siteDescription: text(input.siteDescription, 'siteDescription', 300),
    contactEmail: email(input.contactEmail),
    footerTagline: text(input.footerTagline, 'footerTagline', 160),
    socialLinks: socialLinks(input.socialLinks),
    navLabels: navLabels(input.navLabels),
  }
  return toPublicSiteSettings(await saveSiteSettings({ ...next, updatedBy: actor._id }))
}
