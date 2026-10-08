/**
 * Stills for the opening preloader montage — dedicated derivatives of
 * portfolio images already used across the site, in three sizes so no
 * slot ever decodes more pixels than it shows:
 *
 *   lg  1280px  the large single frames (desktop only, 7 files)
 *   md   720px  panels, and every frame on mobile
 *   sm   400px  strip tiles and the photography inside the wordmark
 *
 * All WebP, none over ~160KB. Order is the edit order — neighbours
 * alternate bright/dark and product/people so consecutive cuts read.
 */
import { preloaderFiles as files } from './preloaderAssetManifest'

export type PreloaderImage = { lg?: string; md: string; sm: string }

function image(name: string): PreloaderImage {
  const url = (file: string) => files[`../assets/preloader/${file}.webp`]
  return { lg: url(name), md: url(`${name}-md`), sm: url(`${name}-sm`) }
}

export const PRELOADER_IMAGES: readonly PreloaderImage[] = [
  'can', 'pink', 'fashion', 'studio', 'billboard', 'blur-teal', 'rider', 'soko',
  'shapes', 'tension', 'desk', 'coast', 'drop', 'wave', 'jellystar', 'motion',
  'net', 'jacket', 'office', 'tube', 'softly', 'card', 'halo', 'spectrum',
].map(image)

export const PRELOADER_IMAGES_COMPACT: readonly PreloaderImage[] = [
  'can', 'pink', 'fashion', 'studio', 'blur-teal', 'softly', 'rider', 'soko', 'tension', 'motion',
].map(image)
