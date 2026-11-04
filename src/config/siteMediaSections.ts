// The public-site image slots an admin can manage in Media Manager
// (/admin/media). Shared by the admin UI, the upload API and the public
// pages, so adding a section here is the only change the admin needs:
// add an entry, then read it with getSiteMedia('<id>') where it renders.

import { PHOTOGRAPHY_FRAME_SLOTS, type PhotographyFramePlacement } from '../data/photographyFrameSlots'

export type SiteMediaSectionId = 'hero' | 'photography' | 'photography-page'

export interface SiteMediaRecommendation {
  /** Recommended pixel width; uploads narrower than this get a warning. */
  width?: number
  height?: number
  /** Minimum length of the longer edge; uploads shorter get a warning. */
  longEdge?: number
  label: string
}

export interface SiteMediaSlotConfig {
  id: string
  label: string
  description: string
  /** A gallery holds many ordered images; a single slot holds one. */
  kind: 'single' | 'gallery'
  recommended: SiteMediaRecommendation
  /** Gallery only: the most images it accepts. */
  maxItems?: number
  /** Gallery only: fewer than this and the site keeps its built-in set. */
  minItems?: number
  /** Gallery only: what each position is used for, in order. */
  positions?: string[]
}

export interface SiteMediaSectionConfig {
  id: SiteMediaSectionId
  label: string
  description: string
  /** Cache tag the public page reads under; saves revalidate it. */
  cacheTag: string
  /** Many small slots: show them as a compact grid in the admin. */
  compact?: boolean
  slots: SiteMediaSlotConfig[]
}

const PLACEMENT_NAMES: Record<PhotographyFramePlacement, string> = {
  wall: 'the photo wall',
  sphere: 'the 3D sphere',
  pair: 'the side-by-side pair',
  closing: 'the closing grid',
}
const SHAPE_NAMES = { portrait: 'An upright (portrait)', landscape: 'A wide (landscape)', square: 'A square' }

export const SITE_MEDIA_SECTIONS: SiteMediaSectionConfig[] = [
  {
    id: 'hero',
    label: 'Hero',
    description: 'The top of the homepage: the full-screen image behind the opening film (shown on its own to visitors who turn motion off), and the Photography grid.',
    cacheTag: 'media-hero',
    slots: [
      {
        id: 'main',
        label: 'Main hero image',
        description: 'Full-bleed, cropped to fill any screen. Keep the subject near the focal point.',
        kind: 'single',
        recommended: { width: 2400, height: 1350, label: '2400 × 1350 px (16:9)' },
      },
      {
        id: 'photography',
        label: 'Photography grid',
        description: 'The photos shown when a visitor picks “Photography” in the hero. Add at least 3: they take the built-in photos’ places in order, and the remaining built-in photos keep filling the small grid below. Upright (3:4) photos work best.',
        kind: 'gallery',
        recommended: { longEdge: 1600, label: '1600 px on the long edge, upright 3:4' },
        maxItems: 24,
        minItems: 3,
      },
    ],
  },
  {
    id: 'photography',
    label: 'Photography',
    description: 'The photography row on the homepage ("Every frame has a purpose").',
    cacheTag: 'media-photography',
    slots: [
      {
        id: 'gallery',
        label: 'Photography gallery',
        description: 'The row shows the first four images, in this order. Drag to reorder.',
        kind: 'gallery',
        recommended: { longEdge: 1600, label: '1600 px on the long edge' },
        maxItems: 12,
        positions: ['Portrait (9:16)', 'Landscape (16:9)', 'Top right (4:3)', 'Bottom right (4:3)'],
      },
    ],
  },
  {
    id: 'photography-page',
    label: 'Photography page',
    description: 'Every photograph on the Photography service page (/services/photography). Replacing one changes it everywhere that photo appears; Remove brings the original back.',
    cacheTag: 'media-photography-page',
    compact: true,
    slots: PHOTOGRAPHY_FRAME_SLOTS.map((frame) => ({
      id: frame.key,
      label: frame.alt,
      description: `Shown in ${frame.usedIn.map((place) => PLACEMENT_NAMES[place]).join(' and ')}. ${SHAPE_NAMES[frame.shape]} photo fits best.`,
      kind: 'single' as const,
      recommended: { longEdge: 1600, label: '1600 px on the long edge' },
    })),
  },
]

export function findSiteMediaSlot(sectionId: string, slotId: string) {
  const section = SITE_MEDIA_SECTIONS.find((item) => item.id === sectionId)
  const slot = section?.slots.find((item) => item.id === slotId)
  return section && slot ? { section, slot } : null
}

export function findSiteMediaSection(sectionId: string) {
  return SITE_MEDIA_SECTIONS.find((item) => item.id === sectionId) ?? null
}

/** Below-recommended uploads are allowed; this explains why they may look soft. */
export function recommendationWarning(recommended: SiteMediaRecommendation, width: number, height: number): string | null {
  if (recommended.width && width < recommended.width) {
    return `This image is ${width} × ${height} px. ${recommended.label} is recommended, so it may look soft on large screens.`
  }
  if (recommended.longEdge && Math.max(width, height) < recommended.longEdge) {
    return `This image's long edge is ${Math.max(width, height)} px. ${recommended.label} is recommended, so it may look soft on large screens.`
  }
  return null
}

export const SITE_MEDIA_MAX_BYTES = 10 * 1024 * 1024
export const SITE_MEDIA_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const SITE_MEDIA_VARIANT_WIDTHS = [640, 1024, 1600, 2400] as const
export const SITE_MEDIA_ALT_MAX = 300

/** What the public site needs to render one managed image. */
export interface PublicSiteImage {
  id: string
  alt: string
  width: number
  height: number
  /** Variant URLs keyed by pixel width, ascending. */
  variants: Array<{ width: number; url: string }>
  blurDataURL: string
  dominantColor: string | null
  focalX: number
  focalY: number
}
