'use client'

import { useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import SiteMediaImage from '../SiteMediaImage'
import type { PublicSiteImage } from '../../config/siteMediaSections'
import { DEFAULT_PHOTOGRAPHY_IMAGES } from '../../data/siteMediaDefaults'

gsap.registerPlugin(ScrollTrigger)

// Media Manager › Photography fills the four frames in gallery order; any
// frame without an uploaded image keeps its built-in photograph.
// Phone: 2-col mosaic · tablet: 3-col mosaic · desktop: the single row.
const FRAME_SIZES = [
  '(max-width: 767px) 50vw, (max-width: 1023px) 34vw, (max-width: 1440px) 19vw, 250px',
  '(max-width: 767px) 100vw, (max-width: 1023px) 67vw, (max-width: 1440px) 58vw, 770px',
  '(max-width: 767px) 50vw, (max-width: 1023px) 34vw, (max-width: 1440px) 21vw, 280px',
  '(max-width: 767px) 50vw, (max-width: 1023px) 34vw, (max-width: 1440px) 21vw, 280px',
]

type PhotographyRowProps = {
  className?: string
  images?: PublicSiteImage[]
}

/** Lazy, never preloaded: the row sits well below the hero. */
function FramePhoto({ index, images }: { index: number; images: PublicSiteImage[] }) {
  const managed = images[index]
  if (managed) return <SiteMediaImage image={managed} sizes={FRAME_SIZES[index]} />
  const fallback = DEFAULT_PHOTOGRAPHY_IMAGES[index]
  return (
    <Image
      src={fallback.src}
      alt={fallback.alt}
      fill
      loading="lazy"
      sizes={FRAME_SIZES[index]}
      className="object-cover object-center"
    />
  )
}

/**
 * Brandworks — a single horizontal photography row.
 * 9:16 portrait | 16:9 landscape | two 4:3 photographs stacked as a column.
 * Every column shares one height (--photo-h), so the edges line up exactly:
 * the stacked pair is two 4:3 frames plus one gap. On desktop the height is
 * derived from the container width, so the whole row scales to fit at every
 * screen size and the layout never crops, scrolls or collapses.
 *
 * Below lg a single row would shrink every photo to a thumbnail, so the same
 * four frames regroup into a mosaic instead:
 *   phone   the landscape runs full width on top; beneath it the portrait
 *           (left) sets the height and the two 4:3s split the right column.
 *   tablet  the portrait spans both rows on the left; the landscape sits
 *           top-right over the two 4:3s side by side.
 */
export default function PhotographyRow({
  className = '',
  images = [],
}: PhotographyRowProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const targets = gsap.utils.toArray<HTMLElement>(
          '[data-photo-reveal]',
          section,
        )
        targets.forEach((target, index) => {
          gsap.fromTo(
            target,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              delay: Math.min(index * 0.1, 0.3),
              ease: 'power3.out',
              scrollTrigger: {
                trigger: target,
                start: 'top 90%',
                once: true,
              },
            },
          )
        })
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  const frameClass =
    'relative shrink-0 overflow-hidden bg-[#f4f4f4]'

  return (
    <section
      ref={sectionRef}
      id="photography"
      aria-labelledby="photography-heading"
      className={`w-full bg-white text-[#111] ${className}`}
    >
      <div className="mx-auto max-w-[var(--media-max-width)] px-[var(--media-pad)]">
        <header
          data-photo-reveal
          className="mb-[var(--heading-gap)] max-w-[780px] max-md:mx-auto max-md:text-center"
        >
          {/* <p className="section-label mb-5">Photography</p> */}
          <h1 id="photography-heading" className="section-heading capitalize" >
            Every frame has a purpose
          </h1>
          <p className="section-description mt-4 max-w-[600px] text-lg leading-7 max-md:mx-auto max-md:max-w-[34ch] md:mt-8">
            {/* Phones get the short read; the full sentence from tablet up. */}
            <span className="md:hidden">
              Commercial, editorial and brand photography developed around a
              defined visual direction
            </span>
            <span className="hidden md:inline">
              We create commercial, product, lifestyle, and campaign photography
              built around a clear concept, giving brands visuals that
              communicate more than they show.
            </span>
          </p>
        </header>

      </div>

      {/* The gallery is wider than the text container (small edge margin,
          tight gap) so the row, and therefore its height, is larger. The
          container query lets it size itself to its own content box. */}
      <div className="mx-auto max-w-[var(--media-max-width)] px-[var(--media-pad)]">
        <div className="[container-type:inline-size]">
          <div className="grid w-full grid-cols-2 gap-[var(--photo-gap)] [--photo-gap:6px] md:grid-cols-3 md:[--photo-gap:8px] lg:flex lg:flex-nowrap lg:items-start lg:justify-center lg:[--photo-gap:clamp(4px,0.5vw,8px)] [--photo-h:calc((100cqw_-_1.34*var(--photo-gap))/3.008)]">
            {/* Portrait: phone row 2-3 left · tablet rows 1-2 left (stretches) · desktop 9:16 */}
            <figure
              data-photo-reveal
              className={`${frameClass} col-start-1 row-span-2 row-start-2 aspect-[9/16] md:row-start-1 md:aspect-auto lg:aspect-[9/16] lg:h-[var(--photo-h)]`}
            >
              <FramePhoto index={0} images={images} />
            </figure>

            {/* Landscape: the lead image — full width on phone, top-right on tablet */}
            <figure
              data-photo-reveal
              className={`${frameClass} col-span-2 row-start-1 aspect-[16/10] md:col-span-2 md:col-start-2 md:aspect-[16/9] lg:h-[var(--photo-h)]`}
            >
              <FramePhoto index={1} images={images} />
            </figure>

            {/* Two 4:3 frames. Below lg the wrapper dissolves into the grid;
                on desktop each is half the row height minus half a gap. */}
            <div className="contents lg:flex lg:shrink-0 lg:flex-col lg:gap-[var(--photo-gap)]">
              <figure
                data-photo-reveal
                className="relative col-start-2 row-start-2 min-h-0 overflow-hidden bg-[#f4f4f4] md:aspect-[4/3] lg:h-[calc((var(--photo-h)_-_var(--photo-gap))/2)]"
              >
                <FramePhoto index={2} images={images} />
              </figure>
              <figure
                data-photo-reveal
                className="relative col-start-2 row-start-3 min-h-0 overflow-hidden bg-[#f4f4f4] md:col-start-3 md:row-start-2 md:aspect-[4/3] lg:h-[calc((var(--photo-h)_-_var(--photo-gap))/2)]"
              >
                <FramePhoto index={3} images={images} />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
