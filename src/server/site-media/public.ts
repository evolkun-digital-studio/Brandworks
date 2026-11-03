import 'server-only'

import { unstable_cache } from 'next/cache'
import { findSiteMediaSection, type PublicSiteImage, type SiteMediaSectionId } from '../../config/siteMediaSections'
import { getDatabase } from '../db/client'
import { listActiveSectionMedia } from './repository'
import { toPublicSiteImage } from './types'

/**
 * The active images for one section, grouped by slot and in gallery order.
 * Cached under the section's tag (media-hero, media-photography) until an
 * admin save revalidates it. A database failure is not cached: the page
 * falls back to its built-in images and tries again on the next request.
 */
export async function getSiteMedia(sectionId: SiteMediaSectionId): Promise<Record<string, PublicSiteImage[]>> {
  const section = findSiteMediaSection(sectionId)
  if (!section) return {}
  const read = unstable_cache(
    async () => {
      const docs = await listActiveSectionMedia(await getDatabase(), sectionId)
      const bySlot: Record<string, PublicSiteImage[]> = {}
      for (const doc of docs) (bySlot[doc.slot] ??= []).push(toPublicSiteImage(doc))
      return bySlot
    },
    ['site-media', sectionId],
    { tags: [section.cacheTag] },
  )
  try { return await read() } catch { return {} }
}
