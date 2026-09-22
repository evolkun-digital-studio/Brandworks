import { useEffect, useRef, useState } from 'react'
import brandVideo2 from './assets/Brand2.mp4'
import LazyBackgroundVideo from './LazyBackgroundVideo'

const LINE_ONE = "We're not here to make brands louder."
const LINE_TWO = "We're here to make them understood."

const WORDS_ONE = LINE_ONE.split(' ')
const WORDS_TWO = LINE_TWO.split(' ')

const COLOR_FROM: [number, number, number] = [196, 196, 196]
const COLOR_TO: [number, number, number] = [17, 17, 17]

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
  const sectionRef = useRef<HTMLElement>(null)
  const statementRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      setProgress(1)
      return
    }

    let raf = 0

    const update = () => {
      raf = 0

      const element = statementRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      const start = viewportHeight * 0.88
      const end = viewportHeight * 0.28

      const next = (start - rect.top) / (start - end)

      setProgress(Math.min(1, Math.max(0, next)))
    }

    const requestUpdate = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }

    update()

    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      if (raf) cancelAnimationFrame(raf)

      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  const allWords = [...WORDS_ONE, ...WORDS_TWO]
  const totalWords = allWords.length
  const revealBand = 2.8

  const getWordProgress = (index: number) => {
    const wordStart = index / totalWords
    const wordEnd = (index + revealBand) / totalWords

    return (progress - wordStart) / (wordEnd - wordStart)
  }

  return (
    <section ref={sectionRef} id="about" aria-labelledby="about-heading" className="relative overflow-hidden bg-white text-[#111]">
      <div className="mx-auto max-w-[1800px] px-5 py-24 sm:px-7 md:px-10 md:py-28 lg:px-12 lg:py-32">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-black/25" />
            <span className="font-primary text-[10px] font-medium uppercase tracking-[0.22em] text-black/45">About</span>
          </div>

          <span className="hidden font-primary text-[10px] uppercase tracking-[0.18em] text-black/25 md:block">Brand communication studio</span>
        </div>

        {/* MAIN COMPOSITION */}
        <div ref={statementRef} className="mt-16 md:mt-20 lg:mt-24">
          <h2 id="about-heading" className="max-w-[1050px] font-primary text-[clamp(2.7rem,5.4vw,3.1rem)] font-medium leading-[0.9] tracking-[-0.055em]">
            {WORDS_ONE.map((word, index) => (
              <span key={`${word}-${index}`} className="transition-colors duration-100 ease-linear" style={{ color: mixColor(getWordProgress(index)) }}>
                {word}{' '}
              </span>
            ))}
          </h2>

          <div className="mt-4 flex justify-end md:mt-6">
            <h2 className="max-w-[900px] text-right font-primary text-[clamp(2.7rem,5.4vw,3.1rem)] font-medium leading-[0.9] tracking-[-0.055em]">
              {WORDS_TWO.map((word, index) => {
                const globalIndex = WORDS_ONE.length + index

                return (
                  <span key={`${word}-${index}`} className="transition-colors duration-100 ease-linear" style={{ color: mixColor(getWordProgress(globalIndex)) }}>
                    {word}{' '}
                  </span>
                )
              })}
            </h2>
          </div>
        </div>

        {/* LOWER EDITORIAL GRID */}
        <div className="mt-20 grid items-start gap-12 md:mt-24 md:grid-cols-12 lg:mt-28">
          {/* VIDEO */}
          <div className="md:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
              <LazyBackgroundVideo src={brandVideo2} className="h-full w-full object-cover" />

              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/[0.025]" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-6">
                <span className="font-primary text-[10px] uppercase tracking-[0.18em] text-white/65">BrandWorks</span>
                <span className="font-primary text-[10px] uppercase tracking-[0.18em] text-white/45">01 / About</span>
              </div>
            </div>
          </div>

          {/* COPY */}
          <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
            <p className="max-w-[620px] font-primary text-[clamp(1.3rem,1.9vw,1.9rem)] font-normal leading-[1.3] tracking-[-0.035em] text-black">
              BrandWorks is a human-led brand communication studio helping businesses build trust through positioning, communication, creative direction and consistent storytelling.
            </p>

            <div className="mt-10 grid gap-8 border-t border-black/10 pt-8 sm:grid-cols-2">
              <p className="font-primary text-[14px] leading-[1.6] tracking-[-0.01em] text-black/55">
                Brands aren't built through isolated campaigns. They're shaped through thousands of interactions that create one clear perception.
              </p>

              <p className="font-primary text-[14px] leading-[1.6] tracking-[-0.01em] text-black/55">
                Powered by Evolkun, we focus on how businesses are understood by the people they want to reach.
              </p>
            </div>

            <a href="#services" className="group mt-10 inline-flex items-center gap-4 font-primary text-[13px] font-medium tracking-[-0.01em] text-black">
              Explore what we do
              <span aria-hidden="true" className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About