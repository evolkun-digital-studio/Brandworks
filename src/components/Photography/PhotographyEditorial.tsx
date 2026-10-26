'use client'

import { useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

/**
 * Brandworks — a single horizontal photography row.
 * 9:16 portrait | 16:9 landscape | two 4:3 photographs stacked as a column.
 * Every column shares one height (--photo-h), so the edges line up exactly:
 * the stacked pair is two 4:3 frames plus one gap. On desktop the height is
 * derived from the container width, so the whole row scales to fit at every
 * screen size and the layout never crops, scrolls or collapses.
 */
const PHOTO_BASE =
  'https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/'

const DEFAULT_IMAGES = {
  portrait: `${PHOTO_BASE}Copy%20of%20img.png`,
  landscape: `${PHOTO_BASE}Artboard%2014%403x.png`,
  fourThree: `${PHOTO_BASE}Artboard%203.png`,
  fourThreeSecond: `${PHOTO_BASE}Artboard%203.png`,
}

type PhotographyRowProps = {
  className?: string
  images?: Partial<typeof DEFAULT_IMAGES>
}

export default function PhotographyRow({
  className = '',
  images,
}: PhotographyRowProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const photos = { ...DEFAULT_IMAGES, ...images }

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
          className="mx-auto mb-[var(--media-gap)] max-w-[780px] text-center"
        >
          {/* <p className="section-label mb-5">Photography</p> */}
          <h2 id="photography-heading" className="section-heading capitalize" >
            Every frame has a purpose.
          </h2>
          <p className="section-description mx-auto mt-8 max-w-[600px] text-lg leading-7">
            We create commercial, product, lifestyle, and campaign photography
            built around a clear concept, giving brands visuals that
            communicate more than they show.
          </p>
        </header>

      </div>

      {/* The gallery is wider than the text container (small edge margin,
          tight gap) so the row, and therefore its height, is larger. The
          container query lets it size itself to its own content box. */}
      <div className="mx-auto max-w-[var(--media-max-width)] px-[var(--media-pad)]">
        <div className="[container-type:inline-size]">
          <div className="flex w-full flex-nowrap items-start justify-center gap-[var(--photo-gap)] [--photo-gap:clamp(4px,0.5vw,8px)] [--photo-h:calc((100cqw_-_1.34*var(--photo-gap))/3.008)]  ">
            <figure
              data-photo-reveal
              className={`${frameClass} aspect-[9/16] h-[var(--photo-h)]`}
            >
              <Image
                src={photos.portrait}
                alt="Portrait-format Brandworks commercial photograph"
                fill
                priority
                sizes="(max-width: 1440px) 19vw, 250px"
                className="object-cover object-center"
              />
            </figure>

            <figure
              data-photo-reveal
              className={`${frameClass} aspect-[16/9] h-[var(--photo-h)]`}
            >
              <Image
                src={photos.landscape}
                alt="Landscape-format Brandworks campaign photograph"
                fill
                sizes="(max-width: 1440px) 58vw, 770px"
                className="object-cover object-center"
              />
            </figure>

            {/* Two 4:3 frames, each half the row height minus half a gap. */}
            <div className="flex shrink-0 flex-col gap-[var(--photo-gap)]">
              <figure
                data-photo-reveal
                className="relative aspect-[4/3] h-[calc((var(--photo-h)_-_var(--photo-gap))/2)] overflow-hidden bg-[#f4f4f4]"
              >
                <Image
                  src={photos.fourThree}
                  alt="Four-by-three Brandworks product photograph"
                  fill
                  sizes="(max-width: 1440px) 21vw, 280px"
                  className="object-cover object-center"
                />
              </figure>
              <figure
                data-photo-reveal
                className="relative aspect-[4/3] h-[calc((var(--photo-h)_-_var(--photo-gap))/2)] overflow-hidden bg-[#f4f4f4]"
              >
                <Image
                  src={photos.fourThreeSecond}
                  alt="Four-by-three Brandworks lifestyle photograph"
                  fill
                  sizes="(max-width: 1440px) 21vw, 280px"
                  className="object-cover object-center"
                />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
