import 'server-only'

import { getDatabase } from '../db/client'
import type { SiteSettingsDocument } from './types'

export async function getSiteSettingsDocument() {
  return (await getDatabase()).collection<SiteSettingsDocument>('site_settings').findOne({ _id: 'primary' })
}

export async function saveSiteSettings(patch: Omit<SiteSettingsDocument, '_id' | 'updatedAt'>) {
  const updated: SiteSettingsDocument = { ...patch, _id: 'primary', updatedAt: new Date() }
  await (await getDatabase()).collection<SiteSettingsDocument>('site_settings').replaceOne({ _id: 'primary' }, updated, { upsert: true })
  return updated
}
