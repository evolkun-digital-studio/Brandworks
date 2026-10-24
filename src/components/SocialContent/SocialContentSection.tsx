'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { heroServices } from '../../data/heroServices'
import { SOCIAL_REELS } from '../../data/socialMedia'

// Same copy and photos as the hero's Social & Content state, so the two never drift apart.
const SOCIAL = heroServices.social
const COLLAGE = SOCIAL.media.kind === 'showcase' ? SOCIAL.media.grid.slice(0, 6) : []
const REEL = SOCIAL_REELS[0]

export default function SocialContentSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduceMotion = useReducedMotion() ?? false

  // Muted autoplay, only while the reel is on screen.
  useEffect(() => {
    const video = videoRef.current
    if (!video || reduceMotion) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined)
      else video.pause()
    }, { threshold: 0.25 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [reduceMotion])

  return (
    <section aria-labelledby="social-content-heading" className="w-full bg-transparent text-[#111]">
      <div className="section-container">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,56fr)_minmax(0,38fr)] md:gap-[clamp(40px,6vw,96px)]">
          <div>
            <h2 id="social-content-heading" className="section-heading mb-[clamp(12px,1.2vw,20px)] text-left">
              {SOCIAL.headline}
            </h2>
            {/* 3 × 2 square collage, no gaps, rounded only on the outer corners. */}
            <div className="grid grid-cols-3 overflow-hidden rounded-[14px] sm:rounded-[18px]">
              {COLLAGE.map((image) => (
                <div key={image.src} className="relative aspect-square overflow-hidden bg-[#f4f4f4]">
                  <img
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="relative aspect-[9/16] w-full max-w-[min(300px,62vw)] overflow-hidden rounded-[14px] bg-[#111] sm:rounded-[18px] md:max-w-[min(300px,100%)]">
              {REEL && (
                <video
                  ref={videoRef}
                  className="absolute inset-0 size-full object-cover"
                  src={REEL.src}
                  poster={REEL.poster}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  controls={reduceMotion}
                  aria-label={REEL.caption}
                />
              )}
            </div>

            <p className="section-description mt-[clamp(24px,3vw,40px)] max-w-[42ch] text-left text-[#111]/60">
              {SOCIAL.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
