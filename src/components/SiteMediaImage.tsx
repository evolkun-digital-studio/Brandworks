'use client'

import Image, { type ImageLoader } from 'next/image'
import type { CSSProperties } from 'react'
import type { PublicSiteImage } from '../config/siteMediaSections'

/**
 * The upload pipeline already made every WebP width the site needs, so the
 * loader picks the smallest stored variant that covers the requested width
 * instead of sending the image through the optimizer a second time.
 */
export function siteImageLoader(image: Pick<PublicSiteImage, 'variants'>): ImageLoader {
  return ({ width }) => (image.variants.find((variant) => variant.width >= width) ?? image.variants[image.variants.length - 1]).url
}

export function focalPosition(image: Pick<PublicSiteImage, 'focalX' | 'focalY'>) {
  return `${Math.round(image.focalX * 1000) / 10}% ${Math.round(image.focalY * 1000) / 10}%`
}

interface SiteMediaImageProps {
  image: PublicSiteImage
  sizes: string
  className?: string
  /** Only the hero, the page's largest above-the-fold image, preloads. */
  preload?: boolean
  style?: CSSProperties
}

/** A Media Manager image: fills its box, cropped around the admin's focal point. */
export default function SiteMediaImage({ image, sizes, className, preload = false, style }: SiteMediaImageProps) {
  return (
    <Image
      loader={siteImageLoader(image)}
      src={image.variants[image.variants.length - 1].url}
      alt={image.alt}
      fill
      sizes={sizes}
      preload={preload}
      loading={preload ? 'eager' : 'lazy'}
      fetchPriority={preload ? 'high' : undefined}
      placeholder={image.blurDataURL ? 'blur' : 'empty'}
      blurDataURL={image.blurDataURL || undefined}
      draggable={false}
      className={className}
      style={{ objectFit: 'cover', objectPosition: focalPosition(image), backgroundColor: image.dominantColor ?? undefined, ...style }}
    />
  )
}
