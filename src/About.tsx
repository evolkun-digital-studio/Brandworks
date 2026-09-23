import { useEffect, useRef, useState } from 'react'
import brandVideo2 from './assets/Brand2.mp4'
import LazyBackgroundVideo from './LazyBackgroundVideo'

const ABOUT_TEXT =
  'Minimal Brandworks is a creative studio that brings strategy, creativity and digital expertise together to build distinctive brands and meaningful experiences.'

const ABOUT_WORDS = ABOUT_TEXT.split(' ')

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

      const start = viewportHeight * 0.88
      const end = viewportHeight * 0.28
      const next = (start - top) / (start - end)

      setProgress(Math.min(1, Math.max(0, next)))
    }

    const onScroll = () => {
      if (ticking) return

      ticking = true
      requestAnimationFrame(updateProgress)
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
  const band = 2.5

  return (
    <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 bg-white px-4 py-14 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-12 lg:px-10 lg:py-24 xl:gap-16 xl:px-12 xl:py-28 2xl:max-w-[1600px] 2xl:gap-20 2xl:px-14">
      {/* TEXT */}
      <div className="flex w-full flex-col items-start text-left">
        <span className="site-kicker text-[10px] uppercase tracking-[0.16em] text-neutral-500 sm:text-[11px]">
          About
        </span>

        <h2
          ref={headingRef}
          className="mt-4 w-full max-w-[680px] text-[20px] font-normal leading-[1.4] tracking-[-0.02em] sm:mt-5 sm:text-[22px] sm:leading-[1.38] md:text-[24px] md:leading-[1.35] lg:max-w-[620px] lg:text-[26px] xl:max-w-[680px] xl:text-[27px] 2xl:text-[28px]"
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
          className="group mt-8 inline-flex h-[42px] min-w-[148px] items-center justify-center rounded-[3px] border border-neutral-900 bg-neutral-900 px-5 transition-all duration-300 hover:bg-white hover:text-neutral-900 active:scale-[0.98] sm:mt-9 sm:h-[44px] sm:min-w-[154px] lg:mt-10"
        >
          <span className="site-ui whitespace-nowrap text-[12px] text-white transition-colors duration-300 group-hover:text-neutral-900 sm:text-[13px]">
            Get to know us
          </span>
        </a>
      </div>

      {/* VIDEO */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[6px] bg-neutral-100 sm:aspect-[16/9] sm:rounded-[8px] md:max-h-[520px] lg:ml-auto lg:aspect-[1.52/1] lg:max-h-none lg:min-h-[360px] xl:min-h-[390px] 2xl:min-h-[430px]">
        <LazyBackgroundVideo
          src={brandVideo2}
          className="h-full w-full object-cover opacity-100"
        />

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={1.5}
          className="absolute bottom-3 left-3 h-5 w-5 sm:bottom-4 sm:left-4 sm:h-6 sm:w-6"
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