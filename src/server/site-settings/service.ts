import 'server-only'

import { badRequest } from '../http/errors'
import type { AdminDocument } from '../admin/types'
import { getSiteSettingsDocument, saveSiteSettings } from './repository'
import { DEFAULT_SITE_SETTINGS, toPublicSiteSettings, type PublicSiteSettings, type SiteNavigationLabels, type SiteSocialLink, type SiteTrackingSettings } from './types'

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

function optionalId(value: unknown, name: string, pattern: RegExp, example: string) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw badRequest(`${name} must be text.`)
  const result = value.trim()
  if (result && !pattern.test(result)) throw badRequest(`${name} doesn't look right. Expected something like ${example}.`)
  return result
}

/** Accepts the bare token or the whole <meta name="google-site-verification" content="…"> tag Search Console shows. */
function gscToken(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : value
  const fromTag = typeof raw === 'string' ? /content\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1] : undefined
  return optionalId(fromTag ?? raw, 'Search Console verification', /^[A-Za-z0-9_-]{10,100}$/, 'the content value of the HTML tag')
}

function tracking(value: unknown): SiteTrackingSettings {
  if (!value || typeof value !== 'object') throw badRequest('tracking is invalid.')
  const ids = value as Record<string, unknown>
  return {
    ga4MeasurementId: optionalId(ids.ga4MeasurementId, 'GA4 measurement ID', /^G-[A-Z0-9]{4,20}$/i, 'G-ABC123XYZ').toUpperCase(),
    gscVerification: gscToken(ids.gscVerification),
    metaPixelId: optionalId(ids.metaPixelId, 'Meta Pixel ID', /^\d{5,20}$/, '1234567890123456'),
  }
}

export async function getPublicSiteSettings() {
  try { return toPublicSiteSettings(await getSiteSettingsDocument()) } catch { return DEFAULT_SITE_SETTINGS }
}

export async function getAdminSiteSettings() { return getPublicSiteSettings() }

/**
 * Each settings card saves only its own part: the website fields are
 * validated together when present, and `tracking` on its own, so saving
 * one card never overwrites the other with a stale copy.
 */
export async function updateSiteSettings(actor: AdminDocument, input: Record<string, unknown>): Promise<PublicSiteSettings> {
  const current = toPublicSiteSettings(await getSiteSettingsDocument())
  const website = 'siteName' in input ? {
    siteName: text(input.siteName, 'siteName', 100),
    siteDescription: text(input.siteDescription, 'siteDescription', 300),
    contactEmail: email(input.contactEmail),
    footerTagline: text(input.footerTagline, 'footerTagline', 160),
    socialLinks: socialLinks(input.socialLinks),
    navLabels: navLabels(input.navLabels),
  } : {}
  const next = { ...current, ...website, ...('tracking' in input ? { tracking: tracking(input.tracking) } : {}) }
  return toPublicSiteSettings(await saveSiteSettings({ ...next, updatedBy: actor._id }))
}
