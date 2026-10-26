'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP } from '@gsap/react'
import { heroServices } from '../../data/heroServices'
import { SOCIAL_REELS } from '../../data/socialMedia'
import './SocialContentSection.css'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const REVEAL_EASE = CustomEase.create('cultureReveal', '0.22,1,0.36,1')

// Same copy as the hero's Social & Content state, so the two never drift apart.
const SOCIAL = heroServices.social
const REELS = SOCIAL_REELS.slice(0, 4)

// Short card labels: the category names the reels were published under.
const REEL_LABELS: Record<string, string> = {
  '01': 'Social Reel',
  '02': 'Brand Content',
  '03': 'Campaign',
  '04': 'Product Drop',
}

/**
 * "Culture Moves Through Content" — a static 9:16 reel grid. As the section
 * enters the viewport each card is revealed with a clip-path inset and its
 * video eases from 1.08 to 1. The card boxes never change size, so nothing
 * stretches. Mobile (a swipe row) and reduced motion get no animation.
 */
export default function SocialContentSection() {
  const trackRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion() ?? false

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return
      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-culture-card]', track)
        const videos = gsap.utils.toArray<HTMLVideoElement>('[data-culture-video]', track)
        if (cards.length === 0) return

        const tl = gsap.timeline({
          defaults: { ease: REVEAL_EASE },
          scrollTrigger: {
            trigger: track,
            start: 'top 80%',
            end: 'top 20%',
            scrub: true,
            // Runs once: at the end the trigger is dropped and the cards
            // stay fully revealed, so scrolling back never re-clips them.
            once: true,
          },
        })

        tl.fromTo(
          cards,
          { clipPath: 'inset(10% 0% 10% 0% round 20px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 20px)' },
          0,
        ).fromTo(videos, { scale: 1.08 }, { scale: 1 }, 0)
      })

      return () => mm.revert()
    },
    { scope: trackRef },
  )

  // Attach each reel's source as it nears the viewport, then play only
  // while it is on screen (autoplay is skipped for reduced motion).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const videos = Array.from(track.querySelectorAll<HTMLVideoElement>('[data-culture-video]'))
    // Set here rather than in JSX so server and client markup match; no
    // reel has a source yet, so nothing can have started playing.
    videos.forEach((video) => { video.autoplay = !reduceMotion })

    const loader = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const video = entry.target as HTMLVideoElement
        if (!video.src && video.dataset.src) video.src = video.dataset.src
        loader.unobserve(video)
      }
    }, { rootMargin: '50% 0px' })

    const player = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (!entry.isIntersecting) video.pause()
        else if (!reduceMotion) void video.play().catch(() => undefined)
      }
    }, { threshold: 0.25 })

    videos.forEach((video) => {
      loader.observe(video)
      player.observe(video)
    })
    return () => {
      loader.disconnect()
      player.disconnect()
    }
  }, [reduceMotion])

  const togglePlayback = (button: HTMLButtonElement) => {
    const video = button.parentElement?.querySelector('video')
    if (!video) return
    if (!video.src && video.dataset.src) video.src = video.dataset.src
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  return (
    <section
      ref={trackRef}
      aria-labelledby="culture-heading"
      className="culture-reels"
    >
      <div className="culture-reels__container">
        <header className="culture-reels__heading">
          <h2 id="culture-heading" className="section-heading capitalize">
            {SOCIAL.headline}
          </h2>
          <p className="section-description mx-auto mt-8 max-w-[600px] text-lg leading-7">
            {SOCIAL.text}
          </p>
        </header>

        <ul data-culture-row className="culture-reels__row">
          {REELS.map((reel) => {
            const label = REEL_LABELS[reel.id] ?? reel.caption
            return (
              <li key={reel.id} data-culture-card className="culture-reels__card">
                <video
                  data-culture-video
                  className="culture-reels__video"
                  data-src={reel.src}
                  poster={reel.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={`${label}: ${reel.caption}`}
                />
                <span className="culture-reels__label" aria-hidden="true">{label}</span>
                {/* Shown only under reduced motion (see the stylesheet). */}
                <button
                  type="button"
                  className="culture-reels__tap"
                  aria-label={`Play or pause ${label}`}
                  onClick={(event) => togglePlayback(event.currentTarget)}
                />

              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
