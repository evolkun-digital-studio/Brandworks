import { useCallback, useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const photographyImages = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=2400&q=85',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=2400&q=85',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=2400&q=85',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=85',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=2400&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=85',
]

const TOTAL = photographyImages.length
const AUTO_CHANGE_DELAY = 3200
const pad = (value: number) => String(value).padStart(2, '0')

type Direction = 1 | -1
type Viewport = 'desktop' | 'tablet' | 'mobile'

const HOLD_SCROLL_SCREENS = 2

type RevealLayout = {
  startScale: number
  startY: number
  revealScreens: number
  exitScreens: number
  scrub: number
}

const REVEAL_LAYOUT: Record<Viewport, RevealLayout> = {
  desktop: { startScale: 0.56, startY: 0.78, revealScreens: 1.3, exitScreens: 0.45, scrub: 0.95 },
  tablet: { startScale: 0.64, startY: 0.72, revealScreens: 1.15, exitScreens: 0.42, scrub: 0.78 },
  mobile: { startScale: 0.74, startY: 0.64, revealScreens: 1, exitScreens: 0.38, scrub: 0.62 },
}

export default function PhotographyGallery() {
  const sectionRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const ipadRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLImageElement | null)[]>([])

  const currentRef = useRef(0)
  const transitionRef = useRef<gsap.core.Timeline | null>(null)
  const autoplayRef = useRef<number | null>(null)
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const galleryReadyRef = useRef(false)
  const visibleRef = useRef(false)
  const interactingRef = useRef(false)

  const [active, setActive] = useState(0)

  const { contextSafe } = useGSAP({ scope: sectionRef })

  const transitionTo = useCallback(
    (index: number, direction: Direction) =>
      contextSafe(() => {
        if (index === currentRef.current) return

        transitionRef.current?.progress(1)

        const from = currentRef.current
        const outgoing = slideRefs.current[from]
        const incoming = slideRefs.current[index]
        if (!outgoing || !incoming) return

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        currentRef.current = index
        setActive(index)

        const tl = gsap.timeline({
          defaults: { duration: reduced ? 0.25 : 0.78, ease: 'power3.inOut' },
          onComplete: () => {
            gsap.set(outgoing, { opacity: 0, scale: 1, xPercent: 0, zIndex: 0 })
            gsap.set(incoming, { opacity: 1, scale: 1, xPercent: 0, zIndex: 1 })
            transitionRef.current = null
          },
        })

        transitionRef.current = tl
        tl.set(incoming, { zIndex: 2 })
        tl.fromTo(
          outgoing,
          { opacity: 1, scale: 1, xPercent: 0 },
          { opacity: 0, scale: reduced ? 1 : 1.022, xPercent: reduced ? 0 : direction * -2 },
          0,
        )
        tl.fromTo(
          incoming,
          { opacity: 0, scale: reduced ? 1 : 0.986, xPercent: reduced ? 0 : direction * 2 },
          { opacity: 1, scale: 1, xPercent: 0 },
          0,
        )
      })(),
    [contextSafe],
  )

  const show = useCallback(
    (direction: Direction) => {
      const index = (currentRef.current + direction + TOTAL) % TOTAL
      transitionTo(index, direction)
    },
    [transitionTo],
  )

  const jumpTo = useCallback(
    (index: number) => {
      const current = currentRef.current
      if (index === current) return

      const forward = (index - current + TOTAL) % TOTAL
      const backward = (current - index + TOTAL) % TOTAL
      transitionTo(index, forward <= backward ? 1 : -1)
    },
    [transitionTo],
  )

  const syncAutoplay = useCallback(() => {
    if (autoplayRef.current !== null) window.clearTimeout(autoplayRef.current)
    autoplayRef.current = null

    if (!galleryReadyRef.current || !visibleRef.current || interactingRef.current || document.hidden) return

    autoplayRef.current = window.setTimeout(() => {
      show(1)
      syncAutoplay()
    }, AUTO_CHANGE_DELAY)
  }, [show])

  const go = useCallback(
    (direction: Direction) => {
      show(direction)
      syncAutoplay()
    },
    [show, syncAutoplay],
  )

  const goTo = useCallback(
    (index: number) => {
      jumpTo(index)
      syncAutoplay()
    },
    [jumpTo, syncAutoplay],
  )

  useGSAP(
    () => {
      const section = sectionRef.current
      const intro = introRef.current
      const ipad = ipadRef.current
      const controls = controlsRef.current
      const slides = slideRefs.current.filter(Boolean) as HTMLImageElement[]

      if (!section || !intro || !ipad || !controls || slides.length === 0) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          desktop: '(min-width: 1024px)',
          tablet: '(min-width: 768px) and (max-width: 1023px)',
          mobile: '(max-width: 767px)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const conditions = context.conditions as Record<string, boolean>
          const mobile = Boolean(conditions.mobile)
          const tablet = Boolean(conditions.tablet)
          const reduce = Boolean(conditions.reduce)
          const viewport: Viewport = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop'
          const layout = REVEAL_LAYOUT[viewport]

          if (reduce) {
            gsap.set(intro, { autoAlpha: 0 })
            gsap.set(ipad, { xPercent: -50, yPercent: -50, y: 0, scale: 1, autoAlpha: 1 })
            gsap.set(controls, { autoAlpha: 1, y: 0, scale: 1, pointerEvents: 'auto' })
            gsap.set(slides, { scale: 1 })
            galleryReadyRef.current = true
            syncAutoplay()
            return
          }

          const startY = () => section.clientHeight * layout.startY
          const exitY = () => -section.clientHeight * (mobile ? 0.035 : 0.065)

          // Timeline units intentionally map to viewport-height scroll units.
          // The device reveal finishes first, then the centred iPad is held
          // completely still for exactly two viewport scroll lengths.
          const revealEnd = layout.revealScreens
          const holdStart = revealEnd
          const holdEnd = holdStart + HOLD_SCROLL_SCREENS
          const exitEnd = holdEnd + layout.exitScreens
          const totalScrollScreens = exitEnd

          gsap.set(intro, { autoAlpha: 1, y: 0, filter: 'blur(0px)' })
          gsap.set(ipad, {
            xPercent: -50,
            yPercent: -50,
            y: startY,
            scale: layout.startScale,
            autoAlpha: 1,
            transformOrigin: '50% 50%',
            force3D: true,
          })
          gsap.set(slides, { scale: 1.065, transformOrigin: '50% 50%' })
          gsap.set(controls, { autoAlpha: 0, y: 14, scale: 0.96, pointerEvents: 'none' })

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${window.innerHeight * totalScrollScreens}`,
              pin: true,
              scrub: layout.scrub,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: () => {
                const time = tl.time()
                const ready = time >= revealEnd * 0.82 && time < holdEnd

                if (ready !== galleryReadyRef.current) {
                  galleryReadyRef.current = ready
                  syncAutoplay()
                }
              },
            },
          })

          // 01 — Intro leaves while the iPad begins entering.
          tl.to(
            intro,
            {
              autoAlpha: 0,
              y: -32,
              filter: 'blur(5px)',
              duration: revealEnd * 0.18,
              ease: 'power2.in',
            },
            revealEnd * 0.02,
          )

          // 02 — iPad reaches its exact final centered pose.
          tl.to(
            ipad,
            {
              y: 0,
              scale: 1,
              duration: revealEnd * 0.72,
              ease: 'power3.inOut',
            },
            revealEnd * 0.04,
          )

          // 03 — Photo settles inside the screen while the device approaches.
          tl.to(
            slides,
            {
              scale: 1,
              duration: revealEnd * 0.6,
              ease: 'sine.out',
            },
            revealEnd * 0.12,
          )

          // 04 — Tiny physical settle before the hold starts.
          tl.to(
            ipad,
            {
              scale: 1.008,
              duration: revealEnd * 0.045,
              ease: 'sine.out',
            },
            revealEnd * 0.78,
          )

          tl.to(
            ipad,
            {
              scale: 1,
              duration: revealEnd * 0.065,
              ease: 'sine.inOut',
            },
            revealEnd * 0.825,
          )

          // 05 — Controller appears before the centre hold.
          tl.to(
            controls,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              pointerEvents: 'auto',
              duration: revealEnd * 0.12,
              ease: 'power3.out',
            },
            revealEnd * 0.82,
          )

          // 06 — EXACT TWO-SCREEN HOLD.
          // Nothing on the iPad moves here. The section remains pinned,
          // so Videography / the next section cannot start yet.
          tl.to({}, { duration: HOLD_SCROLL_SCREENS }, holdStart)

          // 07 — Only after those two full scroll screens do we begin exit.
          tl.to(
            controls,
            {
              autoAlpha: 0,
              y: 10,
              scale: 0.97,
              pointerEvents: 'none',
              duration: layout.exitScreens * 0.24,
              ease: 'power2.in',
            },
            holdEnd,
          )

          tl.to(
            ipad,
            {
              y: exitY,
              scale: 0.94,
              autoAlpha: 0,
              duration: layout.exitScreens * 0.92,
              ease: 'power2.in',
            },
            holdEnd + layout.exitScreens * 0.08,
          )

          // Guarantees the pin lasts through the entire exit distance.
          tl.to({}, { duration: 0.001 }, exitEnd)

          return () => {
            galleryReadyRef.current = false
            syncAutoplay()
            gsap.set([intro, ipad, controls, ...slides], { clearProps: 'all' })
          }
        },
      )

      return () => mm.revert()
    },
    { scope: sectionRef, dependencies: [syncAutoplay] },
  )

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
        syncAutoplay()
      },
      { threshold: 0.1 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [syncAutoplay])

  useEffect(() => {
    const onVisibility = () => syncAutoplay()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [syncAutoplay])

  useEffect(
    () => () => {
      transitionRef.current?.kill()
      if (autoplayRef.current !== null) window.clearTimeout(autoplayRef.current)
    },
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!galleryReadyRef.current) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go])

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1)
  }

  return (
    <section
      ref={sectionRef}
      id="photography"
      aria-roledescription="carousel"
      aria-label="Photography"
      className="relative h-svh min-h-[560px] w-full overflow-hidden bg-white text-[#111] sm:min-h-[600px] lg:min-h-[620px]"
    >
      {/* INTRO */}
      <div ref={introRef} className="pointer-events-none absolute inset-x-0 top-[clamp(42px,8vh,88px)] z-10 flex flex-col items-center px-5 text-center">
        <span className="font-primary text-[9px] uppercase tracking-[0.18em] text-black/40 sm:text-[10px]">BrandWorks / Stills</span>
        <h2 className="mt-3 font-primary text-[clamp(34px,4vw,48px)] font-medium leading-[0.96] tracking-[-0.045em]">Photography</h2>
        <p className="mt-3 max-w-[420px] font-secondary text-[12px] leading-[1.5] text-black/45 sm:text-[13px]">Still images built with the same intent as moving ones.</p>
      </div>

      {/* CSS IPAD — no fake checkerboard PNG */}
      <div
        ref={ipadRef}
        className="absolute left-1/2 top-1/2 z-20 aspect-[4/3] w-[min(94vw,112svh,1280px)] opacity-0 will-change-transform"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative h-full w-full rounded-[clamp(20px,2.4vw,38px)] bg-[#0b0b0b] p-[clamp(8px,1.1vw,16px)] shadow-[0_30px_90px_rgba(0,0,0,0.16)] ring-1 ring-black/20">
          <span className="pointer-events-none absolute left-[5px] top-1/2 z-30 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#171717] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:left-[7px]" aria-hidden="true" />

          <div className="relative h-full w-full overflow-hidden rounded-[clamp(13px,1.7vw,27px)] bg-[#111] touch-pan-y">
            {photographyImages.map((image, index) => (
              <img
                key={image}
                ref={(element) => {
                  slideRefs.current[index] = element
                }}
                src={image}
                alt={`BrandWorks photography project ${index + 1}`}
                aria-hidden={index !== active}
                draggable={false}
                decoding="async"
                loading={index <= 1 ? 'eager' : 'lazy'}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center will-change-[transform,opacity]"
                style={{ opacity: index === 0 ? 1 : 0, zIndex: index === 0 ? 1 : 0 }}
              />
            ))}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[32%] bg-gradient-to-t from-black/30 via-black/5 to-transparent" />

            {/* CONTROLLER */}
            <div
              ref={controlsRef}
              className="absolute bottom-[clamp(12px,3%,28px)] left-1/2 z-30 flex max-w-[calc(100%-18px)] -translate-x-1/2 items-center gap-1.5 opacity-0 md:gap-2"
              onPointerEnter={() => {
                interactingRef.current = true
                syncAutoplay()
              }}
              onPointerLeave={() => {
                interactingRef.current = false
                syncAutoplay()
              }}
              onFocus={() => {
                interactingRef.current = true
                syncAutoplay()
              }}
              onBlur={() => {
                interactingRef.current = false
                syncAutoplay()
              }}
            >
              <button
                type="button"
                aria-label="Previous photograph"
                onClick={() => go(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-[0.94] sm:h-11 sm:w-11"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex h-10 items-center gap-[3px] rounded-[12px] border border-white/10 bg-black/65 p-[3px] backdrop-blur-xl sm:h-12 sm:gap-1 sm:rounded-[15px] sm:p-1">
                {photographyImages.map((image, index) => (
                  <button
                    key={`${image}-thumb`}
                    type="button"
                    aria-label={`View photograph ${index + 1}`}
                    aria-current={index === active ? 'true' : undefined}
                    onClick={() => goTo(index)}
                    className={`relative h-[32px] w-[26px] overflow-hidden rounded-[7px] border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-[46px] sm:rounded-[9px] ${index === active ? 'scale-[1.02] border-white/90 opacity-100' : 'border-transparent opacity-55 hover:scale-[1.02] hover:opacity-90'}`}
                  >
                    <img src={image} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="hidden h-12 min-w-[76px] items-center justify-center gap-1.5 rounded-[15px] border border-white/10 bg-black/70 px-3 font-primary text-[9px] font-medium tracking-[0.08em] text-white backdrop-blur-xl min-[390px]:flex sm:min-w-[88px] sm:text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9c9c38]" aria-hidden="true" />
                <span>{pad(active + 1)}</span>
                <span className="text-white/30">/</span>
                <span className="text-white/55">{pad(TOTAL)}</span>
              </div>

              <button
                type="button"
                aria-label="Next photograph"
                onClick={() => go(1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-[0.94] sm:h-11 sm:w-11"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <span className="pointer-events-none absolute bottom-[5px] left-1/2 z-30 h-[3px] w-[12%] -translate-x-1/2 rounded-full bg-white/35 sm:bottom-[7px]" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
