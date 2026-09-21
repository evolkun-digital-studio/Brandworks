import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'

gsap.registerPlugin(ScrollTrigger)

// TEMPORARY ARCHITECTURAL IMAGE.
// Replace with final BrandWorks architectural/concrete photography.
const TEMPORARY_IMAGE = 'https://res.cloudinary.com/dmzo1kt0d/image/upload/v1789995717/hero-architecture-DRSGJqBP.jpg'

function HumanLedBrandIntelligence() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const italicRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const backgroundWordsRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useGSAP(() => {
    if (reduce || !sectionRef.current) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top center',
        end: 'center center',
        scrub: 0.6,
        markers: false,
      },
    })

    // Eyebrow
    tl.to(
      eyebrowRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
      },
      0,
    )

    // Headline lines
    const headlineLines = headlineRef.current?.querySelectorAll('.headline-line')
    if (headlineLines) {
      headlineLines.forEach((line, idx) => {
        tl.to(
          line,
          {
            opacity: 1,
            yPercent: 0,
            duration: 0.8,
          },
          idx * 0.1,
        )
      })
    }

    // Italic statement
    tl.to(
      italicRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
      },
      0.2,
    )

    // Image reveal
    tl.to(
      imageRef.current,
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.2,
      },
      0.2,
    )

    tl.to(
      imageRef.current,
      {
        scale: 1,
        duration: 1.2,
      },
      0.2,
    )

    // Background words - very subtle movement
    const bgWords = backgroundWordsRef.current?.querySelectorAll('.bg-word')
    if (bgWords) {
      bgWords.forEach((word, idx) => {
        const direction = idx % 2 === 0 ? -3 : 3
        tl.to(
          word,
          {
            yPercent: direction,
            duration: 1,
          },
          0,
        )
      })
    }
  }, { scope: sectionRef, dependencies: [reduce] })

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] bg-white overflow-hidden"
      aria-labelledby="hlbi-heading"
    >
      {/* Background oversized words */}
      <div
        ref={backgroundWordsRef}
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="bg-word absolute top-[5%] left-[-10%] opacity-[0.035]" style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(120px, 17vw, 320px)' }}>
          TRUST
        </div>
        <div className="bg-word absolute top-[20%] right-[5%] opacity-[0.035]" style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(120px, 17vw, 320px)' }}>
          STORY
        </div>
        <div className="bg-word absolute top-[35%] right-[-8%] opacity-[0.035]" style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(120px, 17vw, 320px)' }}>
          PERCEPTION
        </div>
        <div className="bg-word absolute bottom-[25%] left-[8%] opacity-[0.035]" style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(120px, 17vw, 320px)' }}>
          INFLUENCE
        </div>
        <div className="bg-word absolute bottom-[10%] left-[-5%] opacity-[0.035]" style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(120px, 17vw, 320px)' }}>
          MEANING
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen items-center">
        <div className="w-full max-w-[1760px] mx-auto px-12 flex gap-12 items-center relative z-10">
          {/* Left Content - 74-78% */}
          <div className="flex-1">
            {/* Eyebrow */}
            <div
              ref={eyebrowRef}
              className="mb-8 lg:mb-12 opacity-0"
              style={{ y: 10 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-px" style={{ backgroundColor: 'var(--ink-muted)' }} />
                <p
                  className="text-[10px] lg:text-[11px] uppercase tracking-[0.26em] font-medium"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  HUMAN-LED BRAND INTELLIGENCE
                </p>
              </div>
            </div>

            {/* Main Headline */}
            <div ref={headlineRef} className="mb-8 lg:mb-12 overflow-hidden">
              <h2
                id="hlbi-heading"
                style={{ fontFamily: 'var(--font-primary)', color: 'var(--ink)' }}
                className="text-[clamp(38px,8.3vw,58px)] leading-[0.82] font-semibold tracking-[-0.065em]"
              >
                {['Your brand', "isn't competing", 'for attention.'].map((line, idx) => (
                  <div key={idx} className="headline-line overflow-hidden opacity-0" style={{ transform: 'translateY(105%)' }}>
                    {line}
                  </div>
                ))}
              </h2>
            </div>

            {/* Italic Statement */}
            <div
              ref={italicRef}
              className="opacity-0"
              style={{ y: 25 }}
            >
              <p
                style={{ fontFamily: 'var(--font-instrument)', color: '#686868' }}
                className="text-[clamp(48px,7vw,68px)] leading-[0.88] font-normal italic tracking-[-0.04em]"
              >
                It's competing for
                <br />
                understanding.
              </p>
            </div>
          </div>

          {/* Right Image - 22-26% */}
          <div className="flex-shrink-0 h-[90vh] w-[24vw] max-w-[470px] overflow-hidden relative" style={{ borderRadius: 'clamp(100px, 12vw, 220px) 0 0 0' }}>
            <div
              ref={imageRef}
              className="absolute inset-0 scale-[1.035]"
              style={{
                clipPath: 'inset(0 0 100% 0)',
              }}
            >
              <img
                src={TEMPORARY_IMAGE}
                alt="Architectural photograph - Human-Led Brand Intelligence"
                className="w-full h-full object-cover grayscale"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col px-4 py-16 pt-12 pb-20">
        {/* Background words - minimal set */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035]" aria-hidden="true">
          <div style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(80px, 25vw, 200px)', position: 'absolute', top: '10%', left: '-15%' }}>
            TRUST
          </div>
          <div style={{ fontFamily: 'var(--font-primary)', fontWeight: 600, letterSpacing: '-0.06em', lineHeight: 0.8, fontSize: 'clamp(80px, 25vw, 200px)', position: 'absolute', bottom: '15%', right: '-20%' }}>
            MEANING
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Eyebrow */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-px" style={{ backgroundColor: 'var(--ink-muted)' }} />
              <p
                className="text-[9px] uppercase tracking-[0.22em] font-medium"
                style={{ color: 'var(--ink-muted)' }}
              >
                HUMAN-LED BRAND
              </p>
            </div>
            <p
              className="text-[9px] uppercase tracking-[0.22em] font-medium mt-1"
              style={{ color: 'var(--ink-muted)' }}
            >
              INTELLIGENCE
            </p>
          </div>

          {/* Headline */}
          <h2
            style={{ fontFamily: 'var(--font-primary)', color: 'var(--ink)' }}
            className="text-[clamp(48px,14vw,64px)] leading-[0.82] font-semibold tracking-[-0.065em] mb-6"
          >
            Your brand isn't competing for attention.
          </h2>

          {/* Italic Statement */}
          <p
            style={{ fontFamily: 'var(--font-instrument)', color: '#686868' }}
            className="text-[clamp(44px,12vw,58px)] leading-[0.88] font-normal italic tracking-[-0.04em] mb-12"
          >
            It's competing for understanding.
          </p>

          {/* Image */}
          <div className="w-full h-[55vh] overflow-hidden rounded-tl-[clamp(80px,10vw,160px)] bg-black">
            <img
              src={TEMPORARY_IMAGE}
              alt="Architectural photograph - Human-Led Brand Intelligence"
              className="w-full h-full object-cover grayscale"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default HumanLedBrandIntelligence
