import { useEffect, useRef, useState } from 'react'
import brandVideo2 from './assets/Brand2.mp4'
import LazyBackgroundVideo from './LazyBackgroundVideo'

const ABOUT_TEXT =
  'Minimal Brandworks is a creative studio that brings strategy, creativity and digital expertise together to build distinctive brands and meaningful experiences.'

const ABOUT_WORDS =ABOUT_TEXT.split(' ')

// neutral-400 -> neutral-900
const COLOR_FROM: [number, number, number] = [163, 163, 163]
const COLOR_TO: [number, number, number] = [23, 23, 23]

function mixColor(t: number) {
  const clamped = Math.min(1, Math.max(0, t))
  const [r1, g1, b1] = COLOR_FROM
  const [r2, g2, b2] = COLOR_TO
  const r = Math.round(r1 + (r2 - r1) * clamped)
  const g = Math.round(g1 + (g2 - g1) * clamped)
  const b = Math.round(b1 + (b2 - b1) * clamped)
  return `rgb(${r}, ${g}, ${b})`
}

function About() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      setProgress(1)
      return
    }

    let ticking = false

    const updateProgress = () => {
      ticking = false
      const el = headingRef.current
      if (!el) return

      const { top } = el.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // progress 0: heading top just entering the viewport (bottom area)
      // progress 1: heading has scrolled up into the upper third
      const start = viewportHeight * 0.85
      const end = viewportHeight * 0.3
      const next = (start - top) / (start - end)

      setProgress(Math.min(1, Math.max(0, next)))
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateProgress)
      }
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const total = ABOUT_WORDS.length
  const band = 2.5 // how many words each word takes to fully turn black

  return (
    <section className="mx-auto grid w-full max-w-[1279px] grid-cols-1 items-center gap-[32px] bg-white px-4 pt-8 pb-20 opacity-100 lg:grid-cols-2">
      <div className="flex flex-col items-start text-left">
        <span className="site-kicker font-primary text-neutral-500">
          About
        </span>

        <h2
          ref={headingRef}
          className="mt-4 min-h-[170px] w-[675px] max-w-full text-[26px] leading-[1.35] font-normal tracking-[-0.02em] sm:text-[28px]"
        >
          {ABOUT_WORDS.map((word, index) => {
            const wordStart = index / total
            const wordEnd = (index + band) / total
            const wordProgress = (progress - wordStart) / (wordEnd - wordStart)

            return (
              <span
                key={`${word}-${index}`}
                className="transition-colors duration-150 ease-out"
                style={{ color: mixColor(wordProgress) }}
              >
                {word}{' '}
              </span>
            )
          })}
        </h2>

        <a
          href="#"
          className="mt-12 flex h-[40px] min-w-[153px] items-center justify-center gap-[8px] rounded-[4px] border border-neutral-900 bg-neutral-900 p-[12px] opacity-100 transition-opacity hover:opacity-85"
        >
          <span className="site-ui flex items-center justify-center whitespace-nowrap text-white">
            Get to know us
          </span>
        </a>
      </div>

      {/* Well below the fold and the largest of the three videos
         (~28.1MB) — deferred until it's about to scroll into view
         rather than loaded eagerly (Phase 11, Part 3/4). */}
      <div className="relative h-[365px] w-[572px] max-w-full overflow-hidden rounded-[8px] bg-neutral-100">
        <LazyBackgroundVideo
          src={brandVideo2}
          className="h-full w-full object-cover opacity-100"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={1.5}
          className="absolute bottom-4 left-4 h-6 w-6"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="8" height="8" />
          <rect x="14" y="2" width="8" height="8" />
          <rect x="2" y="14" width="8" height="8" />
          <rect x="14" y="14" width="8" height="8" />
        </svg>
      </div>
    </section>
  )
}

export default About
