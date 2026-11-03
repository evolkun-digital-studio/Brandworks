import type { PublicSiteImage } from '../../config/siteMediaSections'
import type { HeroGalleryImage } from '../../data/heroServices'
import type { ArchiveFrame } from '../../data/photographyArchive'
import { focalPosition } from '../SiteMediaImage'

// Media Manager images reshaped for components that render their own <img>
// or WebGL textures, so they keep their animation code unchanged.

const srcSet = (image: PublicSiteImage) => image.variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ')

/** The largest variant no wider than `max`, or the smallest one. */
function variantUpTo(image: PublicSiteImage, max: number) {
  return [...image.variants].reverse().find((variant) => variant.width <= max)?.url ?? image.variants[0].url
}

export function toHeroGalleryImage(image: PublicSiteImage): HeroGalleryImage {
  return {
    id: `media-${image.id}`,
    src: variantUpTo(image, 1600),
    srcSet: srcSet(image),
    width: image.width,
    height: image.height,
    alt: image.alt,
    position: focalPosition(image),
  }
}

/** Keeps the frame's caption; everything about the picture comes from the upload. */
export function toArchiveFrame(original: ArchiveFrame, image: PublicSiteImage): ArchiveFrame {
  return {
    label: original.label,
    alt: image.alt,
    width: image.width,
    height: image.height,
    src: variantUpTo(image, 1600),
    thumb: image.variants[0].url,
    srcSet: srcSet(image),
    focus: focalPosition(image),
  }
}

/** The archive with each Media Manager › Photography page upload swapped in by frame key. */
export function withManagedFrames<Key extends string>(frames: Record<Key, ArchiveFrame>, managed: Record<string, PublicSiteImage[]> | undefined): Record<Key, ArchiveFrame> {
  if (!managed) return frames
  const merged = { ...frames }
  for (const key of Object.keys(frames) as Key[]) {
    const image = managed[key]?.[0]
    if (image) merged[key] = toArchiveFrame(frames[key], image)
  }
  return merged
}
