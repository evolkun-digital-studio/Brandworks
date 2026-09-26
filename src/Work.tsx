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
const HOLD_SCROLL_SCREENS = 1
const EXIT_SCROLL_SCREENS = 0.5
const pad = (value: number) => String(value).padStart(2, '0')

type Direction = 1 | -1
type Viewport = 'desktop' | 'tablet' | 'mobile'

type RevealLayout = {
  startScale: number
  startY: number
  revealScreens: number
}

const REVEAL_LAYOUT: Record<Viewport, RevealLayout> = {
  desktop: { startScale: 0.7, startY: 0.30, revealScreens: 0.72 },
  tablet: { startScale: 0.74, startY: 0.15, revealScreens: 0.78 },
  mobile: { startScale: 0.78, startY: 0.15, revealScreens: 0.84 },
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
          defaults: { duration: reduced ? 0.24 : 0.72, ease: 'power3.inOut' },
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
          {
            opacity: 0,
            scale: reduced ? 1 : 1.018,
            xPercent: reduced ? 0 : direction * -1.8,
          },
          0,
        )

        tl.fromTo(
          incoming,
          {
            opacity: 0,
            scale: reduced ? 1 : 0.988,
            xPercent: reduced ? 0 : direction * 1.8,
          },
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
            gsap.set(ipad, {
              xPercent: -50,
              yPercent: -50,
              y: 0,
              scale: 1,
              rotationX: 0,
              autoAlpha: 1,
            })
            gsap.set(controls, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              pointerEvents: 'auto',
            })
            gsap.set(slides, { scale: 1, yPercent: 0 })

            galleryReadyRef.current = true
            syncAutoplay()
            return
          }

          const startY = () => section.clientHeight * layout.startY
          const revealEnd = layout.revealScreens
          const holdStart = revealEnd
          const holdEnd = holdStart + HOLD_SCROLL_SCREENS
          const exitEnd = holdEnd + EXIT_SCROLL_SCREENS
          const totalScrollScreens = exitEnd

          gsap.set(intro, { autoAlpha: 1, y: 0, filter: 'blur(0px)' })

          gsap.set(ipad, {
            xPercent: -50,
            yPercent: -50,
            y: startY,
            scale: layout.startScale,
            autoAlpha: 1,
            rotationX: mobile ? 0 : 3,
            transformPerspective: 1500,
            transformOrigin: '50% 50%',
            force3D: true,
          })

          gsap.set(slides, {
            scale: 1.055,
            yPercent: 1.2,
            transformOrigin: '50% 50%',
          })

          gsap.set(controls, {
            autoAlpha: 0,
            y: 12,
            scale: 0.96,
            pointerEvents: 'none',
          })

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${window.innerHeight * totalScrollScreens}`,
              pin: true,
              pinSpacing: true,
              scrub: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,

              onUpdate: (self) => {
                const scrollScreens = self.progress * totalScrollScreens
                const ready = scrollScreens >= revealEnd * 0.78 && scrollScreens <= holdEnd

                if (ready !== galleryReadyRef.current) {
                  galleryReadyRef.current = ready
                  syncAutoplay()
                }
              },

              onLeave: () => {
                galleryReadyRef.current = false
                syncAutoplay()
              },
            },
          })

          tl.to(
            intro,
            {
              autoAlpha: 0,
              y: -26,
              filter: 'blur(4px)',
              duration: revealEnd * 0.18,
              ease: 'power2.in',
            },
            0,
          )

          tl.to(
            ipad,
            {
              y: 0,
              scale: 1,
              rotationX: 0,
              duration: revealEnd * 0.78,
              ease: 'power3.inOut',
            },
            0,
          )

          tl.to(
            slides,
            {
              scale: 1,
              yPercent: 0,
              duration: revealEnd * 0.66,
              ease: 'sine.out',
            },
            revealEnd * 0.08,
          )

          tl.to(
            ipad,
            {
              scale: 1.006,
              duration: revealEnd * 0.04,
              ease: 'sine.out',
            },
            revealEnd * 0.78,
          )

          tl.to(
            ipad,
            {
              scale: 1,
              y: 0,
              rotationX: 0,
              duration: revealEnd * 0.055,
              ease: 'sine.inOut',
            },
            revealEnd * 0.82,
          )

          tl.to(
            controls,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              pointerEvents: 'auto',
              duration: revealEnd * 0.1,
              ease: 'power3.out',
            },
            revealEnd * 0.79,
          )

          // Lock the final normal iPad pose before the hold.
          tl.set(
            ipad,
            {
              y: 0,
              scale: 1,
              rotationX: 0,
              autoAlpha: 1,
            },
            holdStart,
          )

          tl.set(
            controls,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              pointerEvents: 'auto',
            },
            holdStart,
          )

          // Hold the iPad exactly as-is.
          tl.to(
            ipad,
            {
              y: 0,
              scale: 1,
              rotationX: 0,
              autoAlpha: 1,
              duration: HOLD_SCROLL_SCREENS,
              ease: 'none',
            },
            holdStart,
          )

          tl.to(
            controls,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              pointerEvents: 'auto',
              duration: HOLD_SCROLL_SCREENS,
              ease: 'none',
            },
            holdStart,
          )

          // Premium recede exit:
          // slight upward movement + subtle shrink + tiny tilt.
          // The iPad never fully fades, so it still feels physical when
          // the pin releases and the next section takes over naturally.
          tl.to(
            controls,
            {
              autoAlpha: 0,
              y: -8,
              scale: 0.97,
              pointerEvents: 'none',
              duration: EXIT_SCROLL_SCREENS * 0.45,
              ease: 'power2.inOut',
            },
            holdEnd,
          )

          tl.to(
            ipad,
            {
              y: mobile ? -36 : -70,
              scale: mobile ? 0.96 : 0.94,
              rotationX: mobile ? -0.5 : -1.25,
              autoAlpha: 0.82,
              duration: EXIT_SCROLL_SCREENS,
              ease: 'power2.inOut',
            },
            holdEnd,
          )

          // Keep the timeline/pin alive through the complete recede.
          tl.set({}, {}, exitEnd)

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

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      go(dx < 0 ? 1 : -1)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="photography"
      aria-roledescription="carousel"
      aria-label="Photography"
      className="relative h-svh min-h-[560px] w-full overflow-hidden bg-white text-[#111] sm:min-h-[600px] lg:min-h-[620px]"
    >
      <div
  ref={introRef}
  className="pointer-events-none absolute inset-x-0 top-[clamp(34px,6vh,72px)] z-10 flex flex-col items-center px-5 pb-20 text-center"
>
  <h2 className="mt-3 font-primary text-[clamp(32px,4.5vw,68px)] font-medium leading-[0.96] tracking-[-0.045em]">
    Photography
  </h2>

  <p className="mt-4 max-w-[720px] font-secondary text-[13px] font-normal leading-[1.55] tracking-[-0.015em] text-neutral-600 sm:text-[14px] md:text-[15px]">
    People notice the image before they read the message.
    <br className="hidden sm:block" />
    We create portraits, products, editorial images and campaign photography
    with a clear visual direction.
  </p>

  <div className="mt-4 flex flex-wrap font-medium items-center justify-center gap-x-4 gap-y-2 font-secondary text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500 sm:text-[11px]">
    <span>Portraits</span>
    <span>Products</span>
    <span>Campaigns</span>
    <span>Editorial</span>
  </div>
</div>

      <div
        ref={ipadRef}
        className="absolute left-1/2 top-1/2 z-20 aspect-[3/4] w-[calc(100vw-16px)] max-w-[560px] opacity-0 [transform-style:preserve-3d] will-change-transform md:aspect-[4/3] md:w-[min(96vw,108svh,1180px)] md:max-w-none lg:w-[min(98vw,120svh,1440px)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <span
          className="pointer-events-none absolute -top-[4px] right-[12%] z-0 hidden h-[5px] w-[64px] rounded-t-[3px] bg-gradient-to-b from-[#626262] to-[#2c2c2c] shadow-[0_-1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.35)] sm:w-[82px] md:block"
          aria-hidden="true"
        />

        <span
          className="pointer-events-none absolute -right-[4px] top-[17%] z-0 hidden h-[56px] w-[5px] rounded-r-[3px] bg-gradient-to-r from-[#222] to-[#595959]  sm:h-[70px] md:block"
          aria-hidden="true"
        />

        <span
          className="pointer-events-none absolute -right-[4px] top-[29%] z-0 hidden h-[56px] w-[5px] rounded-r-[3px] bg-gradient-to-r from-[#222] to-[#595959]  sm:h-[70px] md:block"
          aria-hidden="true"
        />

        <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-transparent p-0 shadow-none ring-0 md:overflow-visible md:rounded-[clamp(22px,2.5vw,42px)] md:bg-gradient-to-br md:from-[#4a4a4a] md:via-[#242424] md:to-[#0f0f0f] md:p-[clamp(5px,0.5vw,8px)] md:shadow-[0_42px_110px_rgba(0,0,0,0.22),0_10px_35px_rgba(0,0,0,0.12)] md:ring-1 md:ring-black/30">
          <div className="relative h-full w-full rounded-[22px] bg-transparent p-0 shadow-none md:rounded-[clamp(18px,2.15vw,36px)] md:bg-[#050505] md:p-[clamp(8px,0.85vw,13px)] md:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
            <span
              className="pointer-events-none absolute left-[6px] top-1/2 z-40 hidden h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#0b0f13] ring-1 ring-white/[0.06] sm:left-[8px] sm:h-[6px] sm:w-[6px] md:block"
              aria-hidden="true"
            >
              <span className="absolute left-1/2 top-1/2 h-[2px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1b3548]/75" />
            </span>

            <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#111] touch-pan-y md:rounded-[clamp(13px,1.7vw,28px)]">
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

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[28%] bg-gradient-to-t from-black/28 via-black/[0.04] to-transparent" />

              <div
                ref={controlsRef}
                className="absolute bottom-[clamp(12px,3%,28px)] left-1/2 z-30 flex max-w-[calc(100%_-_18px)] -translate-x-1/2 items-center gap-1.5 opacity-0 md:gap-2"
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full  bg-black/72 text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-[0.94] sm:h-11 sm:w-11"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="flex h-10 items-center gap-[3px] rounded-[12px] bg-black/62 p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:h-12 sm:gap-1 sm:rounded-[15px] sm:p-1">
                  {photographyImages.map((image, index) => (
                    <button
                      key={`${image}-thumb`}
                      type="button"
                      aria-label={`View photograph ${index + 1}`}
                      aria-current={index === active ? 'true' : undefined}
                      onClick={() => goTo(index)}
                      className={`relative h-[32px] w-[26px] overflow-hidden rounded-[7px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-[46px] sm:rounded-[9px] ${
                        index === active
                          ? 'scale-[1.02]  opacity-100'
                          : ' opacity-55 hover:scale-[1.02] hover:opacity-90'
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <div className="hidden h-12 min-w-[78px] items-center justify-center gap-1.5 rounded-[15px] bg-[rgba(42,28,23,0.72)] px-3 font-primary text-[9px] font-medium tracking-[0.06em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl min-[390px]:flex sm:min-w-[92px] sm:text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8f8a16]" aria-hidden="true" />
                  <span>{pad(active + 1)}</span>
                  <span className="text-white/30">/</span>
                  <span className="text-white/55">{pad(TOTAL)}</span>
                </div>

                <button
                  type="button"
                  aria-label="Next photograph"
                  onClick={() => go(1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/72 text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.05] active:scale-[0.94] sm:h-11 sm:w-11"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <span
              className="pointer-events-none absolute bottom-[4px] left-1/2 z-40 hidden h-[3px] w-[10%] -translate-x-1/2 rounded-full bg-white/30 sm:bottom-[6px] md:block"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
