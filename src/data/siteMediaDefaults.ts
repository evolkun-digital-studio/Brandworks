import { mediaUrl } from '../lib/media'

// The images each Media Manager slot shows while it is empty. The public
// components fall back to these, and `npm run media:seed` imports them as
// each slot's first version.

const PHOTO_BASE = 'https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/'

export interface DefaultSiteImage { src: string; alt: string; width?: number; height?: number }

export const DEFAULT_HERO_IMAGE: DefaultSiteImage = {
  src: mediaUrl('first.webp'),
  alt: 'Cinematic brand film by BrandWorks',
  width: 1535,
  height: 862,
}

/** In row order: 9:16 portrait, 16:9 landscape, then the two stacked 4:3 frames. */
export const DEFAULT_PHOTOGRAPHY_IMAGES: DefaultSiteImage[] = [
  { src: `${PHOTO_BASE}Copy%20of%20img.png`, alt: 'Portrait-format Brandworks commercial photograph' },
  { src: `${PHOTO_BASE}Artboard%2014%403x.png`, alt: 'Landscape-format Brandworks campaign photograph' },
  { src: `${PHOTO_BASE}Artboard%202.png`, alt: 'Four-by-three Brandworks product photograph' },
  { src: `${PHOTO_BASE}Artboard%203.png`, alt: 'Four-by-three Brandworks lifestyle photograph' },
]
