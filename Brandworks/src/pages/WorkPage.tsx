import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import { mediaUrl } from '../lib/media'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

interface Project {
  id: number
  title: string
  media: string
  mediaType: 'image' | 'video'
  ratio: 'landscape' | 'portrait' | 'square' | 'cinematic'
  position?: string
  discipline?: string
  year?: string
}

const projects: Project[] = [
  { id: 1, title: 'Delhi-6', media: mediaUrl('campaign-still.webp'), mediaType: 'image', ratio: 'landscape' },
  { id: 2, title: 'Workify Hub', media: mediaUrl('website .png'), mediaType: 'image', ratio: 'portrait', position: 'top center' },
  { id: 3, title: 'India WMS', discipline: 'Identity · Content · Technology', year: '2026', media: mediaUrl('project 2.webp'), mediaType: 'image', ratio: 'square' },
  { id: 4, title: 'Kinikh Infra', media: mediaUrl('3129595-hd_1920_1080_25fps.mp4'), mediaType: 'video', ratio: 'landscape' },
  { id: 5, title: 'Riaaj Vintage', media: mediaUrl('photo-1483985988355-763728e1935b.jpg'), mediaType: 'image', ratio: 'portrait' },
  { id: 6, title: 'BrandWorks', media: mediaUrl('business card mock up.png'), mediaType: 'image', ratio: 'square' },
  { id: 7, title: 'Editorial Series', media: mediaUrl('photo-02.webp'), mediaType: 'image', ratio: 'landscape' },
  { id: 8, title: 'Campaign Film', media: mediaUrl('brandworks_bw_transition_smooth_60fps.mp4'), mediaType: 'video', ratio: 'portrait' },
  { id: 9, title: 'Founder Reputation', media: mediaUrl('PR.jpg'), mediaType: 'image', ratio: 'cinematic' },
  { id: 10, title: 'Growth Campaign', media: mediaUrl('performance.jpg'), mediaType: 'image', ratio: 'square' },
]

const ratioClasses = {
  landscape: 'aspect-[1.42/1]',
  portrait: 'aspect-[0.79/1]',
  square: 'aspect-square',
  cinematic: 'aspect-[1.7/1]',
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const

/* -------------------------------------------------------------------------- */
/*  Smooth scroll (Lenis) — only created if the app hasn't got one already    */
/* -------------------------------------------------------------------------- */

const pageLenis: { current: Lenis | null } = { current: null }

function usePageLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (document.documentElement.classList.contains('lenis')) return // a global Lenis is already running
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    pageLenis.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      pageLenis.current = null
    }
  }, [enabled])
}

function useFinePointer() {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    setFine(mq.matches)
    const onChange = () => setFine(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return fine
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function Chars({ text, attr = 'data-char', className = '' }: { text: string; attr?: string; className?: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span {...{ [attr]: '' }} className={`inline-block will-change-transform ${className}`}>
            {ch === ' ' ? ' ' : ch}
          </span>
        </span>
      ))}
    </>
  )
}

function ProjectMedia({ project, autoPlay = false }: { project: Project; autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video || autoPlay) return
    video.muted = true
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? video.play().catch(() => undefined) : video.pause()),
      { rootMargin: '120px', threshold: 0.12 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [autoPlay])

  if (project.mediaType === 'video') {
    return (
      <video
        ref={ref}
        src={project.media}
        aria-label={`${project.title} project film`}
        muted
        loop
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        className="h-full w-full object-cover"
      />
    )
  }
  return (
    <img
      src={project.media}
      alt={`${project.title} project`}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: project.position }}
      className="h-full w-full object-cover"
    />
  )
}

function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path d="M12 52 52 12M23 12h29v29" stroke="currentColor" strokeWidth="3.5" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page intro curtain                                                        */
/* -------------------------------------------------------------------------- */

function Curtain() {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(false)
  if (reduce || done) return null
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-end bg-[#0b0b0b] px-[clamp(20px,2.4vw,48px)] pb-[clamp(24px,3vw,44px)]"
      initial={{ y: 0 }}
      animate={{ y: '-100%' }}
      transition={{ duration: 1.05, ease: EASE_IN_OUT, delay: 0.55 }}
      onAnimationComplete={() => setDone(true)}
    >
      <motion.span
        className="font-(--font-primary) text-[clamp(40px,6vw,96px)] leading-none tracking-[-0.04em] text-[#CCFF00]"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        Work
      </motion.span>
      <motion.span
        className="absolute bottom-0 left-0 h-[3px] bg-[#CCFF00]"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 0.55, ease: EASE_IN_OUT }}
      />
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

type View = 'grid' | 'index'

function Hero({ view, setView }: { view: View; setView: (v: View) => void }) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-char]', { yPercent: 115, rotate: 8, duration: 1.1, ease: 'expo.out', stagger: 0.035, delay: 1.15 })
      gsap.from('[data-hero-fade]', { autoAlpha: 0, y: 16, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 1.5 })
      gsap.from('[data-thumb]', { yPercent: 120, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay: 1.35 })

      // as the hero leaves: title drifts up, thumbnail reel slides sideways
      gsap.to('[data-hero-title]', { yPercent: -35, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('[data-reel]', { xPercent: -28, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true } })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <section ref={ref} aria-labelledby="work-title" className="relative flex min-h-[86svh] flex-col justify-end overflow-hidden px-[clamp(20px,2.4vw,48px)] pb-[clamp(30px,3.5vw,52px)] pt-[clamp(118px,12vh,150px)] max-md:min-h-[70svh]">
      <div data-hero-fade className="mb-auto flex items-start justify-between gap-6 font-(--font-secondary) text-[11px] tracking-[0.06em] text-black/50">
        <span>{projects.length} projects</span>
        <span className="max-w-[28ch] text-right max-md:hidden">Brand, web, film, social and PR work for the businesses we’ve built alongside.</span>
      </div>

      {/* thumbnail reel */}
      <div aria-hidden="true" className="pointer-events-none mb-[clamp(28px,4vw,56px)] overflow-hidden">
        <div data-reel className="flex w-max gap-3">
          {[...projects, ...projects.slice(0, 4)].map((p, i) => (
            <div key={`${p.id}-${i}`} className="overflow-hidden">
              <div data-thumb className="h-[clamp(64px,7vw,104px)] w-[clamp(52px,5.6vw,84px)] overflow-hidden bg-[#f1f1ed]">
                {p.mediaType === 'image' ? (
                  <img src={p.media} alt="" loading="lazy" className="h-full w-full object-cover grayscale" style={{ objectPosition: p.position }} />
                ) : (
                  <video src={p.media} muted playsInline preload="metadata" className="h-full w-full object-cover grayscale" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h1 id="work-title" data-hero-title className="m-0 max-w-[1100px] font-(--font-primary) text-[clamp(56px,8.4vw,136px)] leading-[0.88] tracking-[-0.045em] text-[#111] max-md:text-[clamp(48px,14vw,72px)]">
        <span className="sr-only">Selected Projects</span>
        <span aria-hidden="true">
          <Chars text="Selected" /> <Chars text="Projects" />
          <Chars text="." className="text-[#CCFF00]" />
        </span>
      </h1>

      <div data-hero-fade className="mt-[clamp(22px,3vw,38px)] flex items-center justify-between gap-6 border-t border-black/15 pt-4 font-(--font-secondary)">
        <div className="relative inline-flex rounded-full border border-black/15 p-1" role="group" aria-label="Choose layout">
          {(['grid', 'index'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`relative z-10 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors duration-300 ${view === v ? 'text-[#111]' : 'text-black/45 hover:text-black'}`}
            >
              {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 -z-10 rounded-full bg-[#CCFF00]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              {v === 'grid' ? 'Grid' : 'Index'}
            </button>
          ))}
        </div>
        <a href="#project-index" className="group inline-flex items-center gap-3 border-b border-black/50 pb-1.5 text-[11px] tracking-[0.08em] text-[#111] no-underline max-md:hidden">
          View projects
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-1">↓</span>
        </a>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Grid view — clip reveal + parallax                                        */
/* -------------------------------------------------------------------------- */

type ProjectHandlers = {
  onHover: (p: Project | null) => void
  onOpen: (index: number) => void
  hiddenId: number | null
}

function ProjectCard({ project, index, onHover, onOpen, hiddenId }: ProjectHandlers & { project: Project; index: number }) {
  return (
    <article
      data-card
      onPointerEnter={() => onHover(project)}
      onPointerLeave={() => onHover(null)}
      className="group relative min-w-0"
    >
      <button
        type="button"
        data-project-media={project.id}
        aria-label={`Open ${project.title}`}
        onClick={() => onOpen(index)}
        onFocus={() => onHover(project)}
        onBlur={() => onHover(null)}
        style={{ opacity: hiddenId === project.id ? 0 : 1 }}
        className={`relative block w-full cursor-pointer overflow-hidden border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-4 focus-visible:ring-offset-black ${ratioClasses[project.ratio]}`}
      >
        <div data-clip className="absolute inset-0 overflow-hidden bg-[#1a1a1a] will-change-[clip-path]">
          <div data-inner className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform">
            <div className="h-full w-full transition-[scale,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] group-hover:saturate-[1.08]">
              <ProjectMedia project={project} />
            </div>
          </div>
        </div>
      </button>

      <div data-label className="mt-4 flex items-baseline justify-between gap-4 font-(--font-secondary) text-white">
        <h2 className="m-0 font-(--font-primary) text-[clamp(20px,1.6vw,26px)] leading-none tracking-[-0.02em] md:opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100">
          {project.title}
        </h2>
        <span className="text-[10px] tracking-[0.06em] text-white/45">{[project.discipline, project.year].filter(Boolean).join(' · ')}</span>
      </div>
    </article>
  )
}

function ProjectGrid(props: ProjectHandlers) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-card]').forEach((card) => {
        const clip = card.querySelector('[data-clip]')
        const inner = card.querySelector('[data-inner]')
        gsap.fromTo(clip, { clipPath: 'inset(16% 14% 16% 14%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: card, start: 'top 98%', end: 'top 42%', scrub: 0.6 } })
        gsap.fromTo(inner, { yPercent: -8, scale: 1.22 }, { yPercent: 8, scale: 1.02, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } })
        gsap.from(card.querySelector('[data-label]'), { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 72%' } })
      })
    })
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      // the two columns travel at different speeds
      gsap.to('[data-col="right"]', { y: -160, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.to('[data-col="left"]', { y: 60, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } })
    })
    return () => mm.revert()
  }, { scope: ref })

  const columns = [
    projects.map((p, i) => ({ p, i })).filter(({ i }) => i % 2 === 0),
    projects.map((p, i) => ({ p, i })).filter(({ i }) => i % 2 === 1),
  ]

  return (
    <div ref={ref} className="grid grid-cols-2 gap-x-[clamp(28px,5vw,80px)] max-md:flex max-md:flex-col max-md:gap-14">
      {columns.map((col, c) => (
        <div key={c} data-col={c === 0 ? 'left' : 'right'} className={`flex min-w-0 flex-col gap-[clamp(80px,9vw,140px)] max-md:contents ${c === 1 ? 'pt-[clamp(120px,12vw,200px)]' : ''}`}>
          {col.map(({ p, i }) => <ProjectCard key={p.id} project={p} index={i} {...props} />)}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Index view — list with a floating preview that follows the cursor         */
/* -------------------------------------------------------------------------- */

function ProjectIndex({ onOpen, hiddenId }: Omit<ProjectHandlers, 'onHover'>) {
  const ref = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const fine = useFinePointer()

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-row-line]', { scaleX: 0, transformOrigin: 'left center', duration: 1.2, ease: 'expo.inOut', stagger: 0.05 })
      gsap.from('[data-row-text]', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.2 })
    })
    return () => mm.revert()
  }, { scope: ref })

  useEffect(() => {
    const el = previewRef.current
    const wrap = ref.current
    if (!el || !wrap || !fine) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.8, ease: 'power3.out' })
    let lastX = 0
    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      rTo(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4))
      lastX = e.clientX
    }
    wrap.addEventListener('pointermove', move)
    return () => wrap.removeEventListener('pointermove', move)
  }, [fine])

  const active = hover === null ? null : projects[hover]

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      <ul className="m-0 list-none p-0">
        {projects.map((p, i) => (
          <li key={p.id} className="relative">
            <span data-row-line className="absolute inset-x-0 top-0 h-px bg-white/20" />
            <button
              type="button"
              data-project-media={p.id}
              onClick={() => onOpen(i)}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              style={{ opacity: hiddenId === p.id ? 0.2 : 1 }}
              className={`group grid w-full cursor-pointer grid-cols-[1fr_auto] items-end gap-6 border-0 bg-transparent py-[clamp(18px,2.2vw,30px)] text-left text-white outline-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-[#CCFF00] ${hover !== null && hover !== i ? 'md:opacity-30' : ''}`}
            >
              <span className="overflow-hidden">
                <span data-row-text className="block">
                  <span className="relative block h-[0.95em] overflow-hidden font-(--font-primary) text-[clamp(34px,6vw,92px)] leading-[0.95] tracking-[-0.04em]">
                    <span className="block transition-transform duration-[700ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full">{p.title}</span>
                    <span className="absolute inset-x-0 top-full block text-[#CCFF00] transition-transform duration-[700ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full">{p.title}</span>
                  </span>
                </span>
              </span>
              <span className="overflow-hidden pb-2 font-(--font-secondary) text-[11px] tracking-[0.06em] text-white/50">
                <span data-row-text className="flex items-center gap-4">
                  <span className="max-md:hidden">{[p.discipline, p.year].filter(Boolean).join(' · ')}</span>
                  <ArrowIcon className="w-4 text-white transition-transform duration-500 group-hover:rotate-45 group-hover:text-[#CCFF00]" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <span className="block h-px bg-white/20" />

      {fine && (
        <div ref={previewRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[60]">
          <AnimatePresence mode="popLayout">
            {active && (
              <motion.div
                key={active.id}
                className={`-translate-x-1/2 -translate-y-1/2 w-[clamp(220px,22vw,360px)] overflow-hidden bg-[#1a1a1a] ${ratioClasses[active.ratio]}`}
                initial={{ clipPath: 'inset(50% 50% 50% 50%)' }}
                animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
                transition={{ duration: 0.55, ease: EASE_IN_OUT }}
              >
                <motion.div className="h-full w-full" initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.9, ease: EASE_OUT }}>
                  <ProjectMedia project={active} autoPlay />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Big centred title while hovering a card                                   */
/* -------------------------------------------------------------------------- */

function HoverTitle({ project }: { project: Project | null }) {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-max max-w-[92vw] -translate-x-1/2 -translate-y-1/2 text-center max-md:hidden">
      <AnimatePresence mode="wait">
        {project && (
          <motion.p
            key={project.id}
            className="m-0 whitespace-nowrap font-(--font-primary) text-[clamp(34px,6vw,140px)] leading-[0.95] tracking-[-0.04em] text-[#CCFF00]"
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {project.title.split('').map((ch, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: { y: reduce ? 0 : '105%', opacity: reduce ? 0 : 1 },
                    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE_OUT, delay: i * 0.018 } },
                    exit: { y: reduce ? 0 : '-105%', opacity: reduce ? 0 : 1, transition: { duration: 0.25, ease: EASE_IN_OUT, delay: i * 0.008 } },
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </motion.span>
              </span>
            ))}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Project overlay — image flies from the card to full screen                */
/* -------------------------------------------------------------------------- */

function flyFrom(src: DOMRect, dst: DOMRect) {
  const x = src.left + src.width / 2 - (dst.left + dst.width / 2)
  const y = src.top + src.height / 2 - (dst.top + dst.height / 2)
  const s = Math.max(1, src.width / dst.width, src.height / dst.height)
  const ix = Math.max(0, (dst.width * s - src.width) / 2) / s
  const iy = Math.max(0, (dst.height * s - src.height) / 2) / s
  return { x, y, scale: s, clipPath: `inset(${iy}px ${ix}px ${iy}px ${ix}px)` }
}

function sourceFor(id: number) {
  const el = document.querySelector<HTMLElement>(`[data-project-media="${id}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight ? r : null
}

function ProjectOverlay({ index, setIndex, onClose }: { index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const project = projects[index]
  const rootRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closing = useRef(false)
  const firstRun = useRef(true)
  const reduce = useReducedMotion()
  const q = gsap.utils.selector(rootRef)

  // lock page scroll while open
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    html.style.overflow = 'hidden'
    pageLenis.current?.stop()
    return () => {
      html.style.overflow = prev
      pageLenis.current?.start()
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [])

  // open
  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const tl = gsap.timeline({ onComplete: () => closeRef.current?.focus({ preventScroll: true }) })
    tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
    const src = sourceFor(project.id)
    if (src && !reduce) {
      tl.fromTo(slot, flyFrom(src, slot.getBoundingClientRect()), { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px)', duration: 1.15, ease: 'expo.inOut' }, 0)
    } else {
      tl.fromTo(slot, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.1)
    }
    tl.fromTo(q('[data-ov-char]'), { yPercent: 115 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.025 }, reduce ? 0 : 0.7)
    tl.fromTo(q('[data-ov-fade]'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, reduce ? 0 : 0.85)
    return () => { tl.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // switching project inside the overlay
  useLayoutEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    const tl = gsap.timeline()
    tl.fromTo(slotRef.current, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, 0)
    tl.fromTo(q('[data-ov-media]'), { scale: 1.25 }, { scale: 1, duration: 1.2, ease: 'expo.out' }, 0)
    tl.fromTo(q('[data-ov-char]'), { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.02 }, 0.25)
    return () => { tl.kill() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const slot = slotRef.current
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(q('[data-ov-fade]'), { autoAlpha: 0, duration: 0.25 }, 0)
    tl.to(q('[data-ov-char]'), { yPercent: -115, duration: 0.45, ease: 'power3.in', stagger: 0.01 }, 0)
    const src = sourceFor(project.id)
    if (slot && src && !reduce) {
      gsap.set(slot, { clearProps: 'transform' })
      tl.to(slot, { ...flyFrom(src, slot.getBoundingClientRect()), duration: 1, ease: 'expo.inOut' }, 0.1)
      tl.to(bgRef.current, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, 0.45)
    } else {
      tl.to(slot, { autoAlpha: 0, scale: 0.96, duration: 0.4 }, 0.1)
      tl.to(bgRef.current, { opacity: 0, duration: 0.45 }, 0.2)
    }
  }, [onClose, project.id, q, reduce])

  const step = useCallback((dir: 1 | -1) => setIndex((index + dir + projects.length) % projects.length), [index, setIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, step])

  const next = projects[(index + 1) % projects.length]

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="overlay-title" data-lenis-prevent className="fixed inset-0 z-[90] overflow-y-auto text-white">
      <div ref={bgRef} className="fixed inset-0 bg-[#0b0b0b]" />

      <div className="relative flex min-h-full flex-col px-[clamp(20px,2.4vw,48px)] py-[clamp(20px,2.2vw,36px)]">
        <div className="flex items-center justify-between font-(--font-secondary) text-[11px] tracking-[0.08em]">
          <button ref={closeRef} data-ov-fade type="button" onClick={close} className="group inline-flex items-center gap-3 uppercase text-white outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]">
            <span className="relative block size-3">
              <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current transition-transform duration-500 group-hover:rotate-[135deg]" />
              <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current transition-transform duration-500 group-hover:rotate-45" />
            </span>
            Close
          </button>
          <span data-ov-fade className="text-white/50">{index + 1} of {projects.length}</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-[clamp(24px,4vh,56px)]">
          <div ref={slotRef} className={`relative h-[min(60vh,700px)] max-w-full overflow-hidden bg-[#1a1a1a] will-change-transform ${ratioClasses[project.ratio]}`}>
            <div data-ov-media key={project.id} className="h-full w-full">
              <ProjectMedia project={project} autoPlay />
            </div>
          </div>
        </div>

        <div className="grid items-end gap-6 border-t border-white/15 pt-6 md:grid-cols-[1fr_auto]">
          <div>
            <h2 id="overlay-title" key={project.id} className="m-0 font-(--font-primary) text-[clamp(44px,7vw,120px)] leading-[0.9] tracking-[-0.045em]">
              <span className="sr-only">{project.title}</span>
              <span aria-hidden="true"><Chars text={project.title} attr="data-ov-char" /></span>
            </h2>
            {(project.discipline || project.year) && (
              <p data-ov-fade className="mt-3 font-(--font-secondary) text-[12px] tracking-[0.06em] text-white/55">
                {[project.discipline, project.year].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div data-ov-fade className="flex items-center gap-3 font-(--font-secondary)">
            <button type="button" onClick={() => step(-1)} aria-label="Previous project" className="grid size-12 place-items-center rounded-full border border-white/25 text-white transition-colors duration-300 hover:border-[#CCFF00] hover:bg-[#CCFF00] hover:text-[#111]">
              <ArrowIcon className="w-4 -rotate-[135deg]" />
            </button>
            <button type="button" onClick={() => step(1)} className="group inline-flex h-12 items-center gap-4 rounded-full bg-[#CCFF00] pl-5 pr-2 text-[12px] font-medium text-[#111]">
              <span className="max-w-[18ch] truncate">Next: {next.title}</span>
              <span className="grid size-8 place-items-center rounded-full bg-[#111] text-[#CCFF00] transition-transform duration-500 group-hover:rotate-45">
                <ArrowIcon className="w-3.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Contact CTA — rolling letters + magnetic button                           */
/* -------------------------------------------------------------------------- */

function RollText({ text, accent }: { text: string; accent?: ReactNode }) {
  return (
    <span className="inline-flex">
      {text.split('').map((ch, i) => (
        <span key={i} className="relative inline-block overflow-hidden">
          <span className="block transition-transform duration-[650ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full" style={{ transitionDelay: `${i * 22}ms` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
          <span className="absolute inset-x-0 top-full block text-[#CCFF00] transition-transform duration-[650ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full" style={{ transitionDelay: `${i * 22}ms` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        </span>
      ))}
      {accent}
    </span>
  )
}

function ContactCta() {
  const ref = useRef<HTMLElement>(null)
  const magnetRef = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-cta-text]', { yPercent: 40, scale: 0.9, opacity: 0, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'top 35%', scrub: true } })
    })
    mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const el = magnetRef.current
      const area = ref.current
      if (!el || !area) return
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const dist = Math.hypot(dx, dy)
        if (dist < 220) { xTo(dx * 0.35); yTo(dy * 0.35) } else { xTo(0); yTo(0) }
      }
      const leave = () => { xTo(0); yTo(0) }
      area.addEventListener('pointermove', move)
      area.addEventListener('pointerleave', leave)
      return () => { area.removeEventListener('pointermove', move); area.removeEventListener('pointerleave', leave) }
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <section ref={ref} aria-labelledby="work-contact-title" className="min-h-[56svh] overflow-hidden bg-[#111] px-[clamp(20px,2.4vw,48px)] py-[clamp(28px,3vw,44px)] text-white max-md:min-h-[42svh]">
      <Link to="/contact" className="group flex min-h-[56svh] items-end justify-between gap-8 text-white no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-4 focus-visible:ring-offset-[#111] max-md:min-h-[42svh]">
        <span id="work-contact-title" data-cta-text className="block origin-bottom-left font-(--font-primary) text-[clamp(56px,9vw,150px)] leading-[0.88] tracking-[-0.045em]">
          <span className="sr-only">Let’s work.</span>
          <span aria-hidden="true">
            <RollText text="Let’s work" accent={<span className="text-[#CCFF00]">.</span>} />
          </span>
        </span>
        <span ref={magnetRef} className="mb-2 flex h-[clamp(64px,7vw,110px)] w-[clamp(64px,7vw,110px)] shrink-0 items-center justify-center rounded-full bg-[#CCFF00] text-[#111] max-md:h-14 max-md:w-14">
          <ArrowIcon className="w-[40%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45" />
        </span>
      </Link>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function WorkPage() {
  const reduce = useReducedMotion()
  usePageLenis(!reduce)

  const [view, setView] = useState<View>('grid')
  const [hovered, setHovered] = useState<Project | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Selected Work — BRANDWORKS'
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      document.title = previousTitle
      window.removeEventListener('load', refresh)
    }
  }, [])

  const changeView = (v: View) => {
    setHovered(null)
    setView(v)
  }

  const openId = openIndex === null ? null : projects[openIndex].id

  return (
    <main className="overflow-clip bg-white text-[#111]">
      <Curtain />

      <Hero view={view} setView={changeView} />

      <section id="project-index" aria-label="Selected project index" className="bg-[#000] px-[clamp(20px,2.4vw,48px)] pb-[clamp(96px,10vw,160px)] pt-[clamp(72px,8vw,120px)] max-md:pb-20 max-md:pt-14">
        <AnimatePresence mode="wait" onExitComplete={() => ScrollTrigger.refresh()}>
          {view === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
              <ProjectGrid onHover={setHovered} onOpen={setOpenIndex} hiddenId={openId} />
            </motion.div>
          ) : (
            <motion.div key="index" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: EASE_OUT }} onPointerEnter={() => setHovered(null)}>
              <ProjectIndex onOpen={setOpenIndex} hiddenId={openId} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <HoverTitle project={view === 'grid' && openIndex === null ? hovered : null} />
      <ContactCta />

      {openIndex !== null && (
        <ProjectOverlay
          index={openIndex}
          setIndex={(i) => setOpenIndex(i)}
          onClose={() => { setOpenIndex(null); setHovered(null) }}
        />
      )}
    </main>
  )
}
