import { notFound } from 'next/navigation'

/*
 * Social Club is switched off: /services/social-club returns a 404.
 * To bring it back, restore the original page below (and its metadata in
 * layout.tsx, its sitemap entry in src/server/seo/sitemap.ts and its entry
 * in src/server/seo/admin-seo.service.ts).
 *
 * 'use client'
 * export { default } from '../../../../src/legacy-pages/services/SocialClubPage'
 */
export default function SocialClubDisabled() {
  notFound()
}
