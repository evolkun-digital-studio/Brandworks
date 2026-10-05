import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
} from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SOCIAL_REELS, type SocialReel } from '../../data/socialMedia'
import { mediaUrl } from '../../lib/media'
import './SocialMediaPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)
// no re-layout jumps when the mobile URL bar shows/hides
ScrollTrigger.config({ ignoreMobileResize: true })

const EASE = [0.22, 1, 0.36, 1] as const
// Motion is intentionally scroll-led; media never preloads before it is needed.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const APPLE_EMOJI_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64'
const APPLE_EMOJI = {
 desktop: '1f4bb',        // 💻
bolt: '2728',            // ✨
headphones: '1f3b5',     // 🎵
movieCamera: '1f3ac',    // 🎬
fist: '270a',            // ✊
phone: '260e-fe0f',      // ☎️
playful: '1f92a',        // 🤪
camera: '1f4f7',         // 📷
heart: '2764-fe0f',      // ❤️
sunglasses: '1f576-fe0f',// 🕶️
chart: '1f4c8',          // 📈
} as const

type AppleEmojiName = keyof typeof APPLE_EMOJI

function AppleEmoji({ name, className = 'size-[1em]' }: { name: AppleEmojiName; className?: string }) {
  return (
    <img
      src={`${APPLE_EMOJI_BASE}/${APPLE_EMOJI[name]}.png`}
      alt=""
      draggable={false}
      className={`inline-block shrink-0 object-contain ${className}`}
      aria-hidden="true"
    />
  )
}

function AppleEmojiRow({ names, className = '', ...props }: { names: readonly AppleEmojiName[] } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props} className={`inline-flex items-center gap-[0.22em] ${className}`} aria-hidden="true">
      {names.map((name, index) => <AppleEmoji key={`${name}-${index}`} name={name} />)}
    </span>
  )
}

type ViewerSelection = { reel: SocialReel; trigger: HTMLElement }
type StoryGroup = { id: string; reels: SocialReel[] }

const expertise = [
  {
    title: 'Social media strategy',
    copy: 'Turn audience insight, brand direction and channel behavior into one useful plan.',
    image: mediaUrl('Strategy.jpg'),
    services: ['Audience research', 'Channel strategy', 'Content pillars', 'Benchmarking'],
  },
  {
    title: 'Content creation',
    copy: 'Create platform-native photography, reels, interviews and campaigns with one visual language.',
    image: mediaUrl('content_creation.avif'),
    services: ['Reels', 'Photography', 'Campaigns', 'Art direction'],
  },
  {
    title: 'Community & growth',
    copy: 'Publish, listen, respond and learn—so every cycle is sharper than the last.',
    image: mediaUrl('enga.webp'),
    services: ['Publishing', 'Community', 'Reporting', 'Optimization'],
  },
]

const processSteps = [
  ['01', 'Strategy', 'Define the audience, objectives and role social should play for the brand.'],
  ['02', 'Art direction', 'Build a recognizable visual and verbal system before production begins.'],
  ['03', 'Content creation', 'Produce the photography, films, reels and campaign assets the plan needs.'],
  ['04', 'Community', 'Publish, schedule, respond and keep the account culturally alive.'],
  ['05', 'Learn & refine', 'Turn performance signals into a smarter next cycle.'],
] as const

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function Label({ children }: { children: ReactNode }) {
  return <p className="bwsm-label">{children}</p>
}

function Arrow() {
  return <span className="bwsm-arrow" aria-hidden="true">↗</span>
}

/** Masked line reveal: each line slides up from behind its own mask. */
function Lines({ lines }: { lines: ReactNode[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <span key={index} className="-my-[0.1em] block overflow-hidden py-[0.1em]">
          <span data-line className="block will-change-transform">{line}</span>
        </span>
      ))}
    </>
  )
}

/** Lime highlight whose background can wipe in (data-hl is scaled by GSAP; visible by default). */
function Hl({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block px-[0.08em] pb-[0.07em] pt-[0.03em] text-[#10110f]">
      <span data-hl className="absolute inset-0 origin-left bg-[#ccff00]" aria-hidden="true" />
      <span className="relative">{children}</span>
    </span>
  )
}

/** Splits a sentence into words that can light up one by one. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span key={index} data-word className="inline-block whitespace-pre">{word} </span>
      ))}
    </>
  )
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Dark overlay that deepens as a face turns away on the cylinder. */
function CylShade({ className = '' }: { className?: string }) {
  return <span data-cyl-shade className={`pointer-events-none absolute inset-0 bg-[#0b0b0b] opacity-0 ${className}`} aria-hidden="true" />
}

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const Icon = {
  Play: () => (
    <svg viewBox="0 0 24 24" className="ml-[2px] size-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.05-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6Z" />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" className="size-[18px] " fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
    </svg>
  ),
  Volume: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18.3 6.5a8 8 0 0 1 0 11" />
    </svg>
  ),
  Muted: () => (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </svg>
  ),
  Heart: ({ filled }: { filled: boolean }) => (
    <svg viewBox="0 0 24 24" className="size-[19px]" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.2s-7.6-4.6-7.6-10.1A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.6 2.7c0 5.5-7.6 10.1-7.6 10.1Z" />
    </svg>
  ),
  Arrow: ({ dir }: { dir: 'left' | 'right' }) => (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6'} />
    </svg>
  ),
  Chevron: ({ dir }: { dir: 'left' | 'right' }) => (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
      <path d="m10 13 4.5-4.5" strokeLinecap="round" />
    </svg>
  ),
}

/* ------------------------------------------------------------------ */
/* Reel viewer (unchanged behaviour)                                   */
/* ------------------------------------------------------------------ */

function MediaFrame({ reel }: { reel: SocialReel }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(reel.poster ? 'ready' : 'loading')
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (!entry.isIntersecting) video.pause()
      },
      { rootMargin: '160px', threshold: 0.12 },
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView) video.play().catch(() => undefined)
    else video.pause()
  }, [inView])
  return (
    <div ref={frameRef} className="bwsm-media" data-status={status} aria-busy={status === 'loading'}>
      <span className="bwsm-skeleton" aria-hidden="true" />
      <video
        ref={videoRef}
        src={inView ? reel.src : undefined}
        poster={reel.poster}
        width={1080}
        height={1920}
        muted
        loop
        playsInline
        // Deliberately avoid network work until the frame enters the viewport.
        preload="none"
        onCanPlay={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
      {status === 'error' && <span className="bwsm-media-error">Video unavailable</span>}
    </div>
  )
}

function ReelViewer({ selection, onDismiss }: { selection: ViewerSelection; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(true)
  const reduced = Boolean(useReducedMotion())
  useBrowserLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (dialog.open) dialog.close()
      document.documentElement.style.overflow = previousOverflow
      if (selection.trigger.isConnected) selection.trigger.focus({ preventScroll: true })
    }
  }, [selection.trigger])
  return (
    <dialog
      ref={dialogRef}
      className="bwsm-dialog"
      aria-labelledby="bwsm-viewer-title"
      data-lenis-prevent="true"
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}
    >
      <AnimatePresence onExitComplete={onDismiss}>
        {open && (
          <motion.div
            className="bwsm-viewer"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => event.target === event.currentTarget && setOpen(false)}
          >
            <div className="bwsm-viewer__bar">
              <div>
                <p id="bwsm-viewer-title" className="sr-only">{selection.reel.caption}</p>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)}>Close ×</button>
            </div>
            <motion.figure
              initial={{ y: reduced ? 0 : 28, scale: reduced ? 1 : 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            >
              <MediaFrame reel={selection.reel} />
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Cylinder transition                                                 */
/*                                                                     */
/* Two faces sit on the surface of one big vertical cylinder whose     */
/* axis is R px BEHIND the card. Turning the cylinder rotates the      */
/* current face away to the left while the next face rolls in from    */
/* the right — their edges touch, so it reads as one solid drum.       */
/* ------------------------------------------------------------------ */

const CYL_ANGLE = 64 // degrees between two neighbouring faces
const CYL_PERSPECTIVE = 1900
const CYL_EASE = 'power3.inOut'

/** radius that makes two faces of width `w` meet edge to edge */
const cylRadius = (w: number) => (w / 2) / Math.tan(((CYL_ANGLE / 2) * Math.PI) / 180)

/**
 * Places a face on the cylinder at `angle` degrees. The axis sits R px behind
 * the card, so a face turned by θ moves sideways by R·sinθ and back by R·(1−cosθ).
 * Done by hand (x / z / rotateY around the card's own centre) instead of a
 * 3D transform-origin: GSAP caches a z-origin offset, and when React StrictMode
 * runs the setup twice that stale offset left the card ~240px off-centre.
 */
function setCylinder(el: HTMLElement, angle: number, width: number, baseX = 0) {
  const R = cylRadius(width)
  const rad = (angle * Math.PI) / 180
  gsap.set(el, { rotateY: angle, x: baseX + R * Math.sin(rad), z: R * (Math.cos(rad) - 1) })
}

/**
 * Swaps the media inside a card on a cylinder: the live video (outRef)
 * turns away while the next clip's poster (inRef) turns in; then the
 * real video switches source underneath and everything resets.
 */
function useCylinderSwap() {
  const outRef = useRef<HTMLDivElement>(null)
  const inRef = useRef<HTMLDivElement>(null)
  const inImgRef = useRef<HTMLImageElement>(null)
  const busy = useRef(false)
  const reduced = Boolean(useReducedMotion())

  useEffect(() => () => { if (outRef.current) gsap.killTweensOf(outRef.current); if (inRef.current) gsap.killTweensOf(inRef.current) }, [])

  const swap = useCallback((dir: 1 | -1, poster: string | undefined, commit: () => void) => {
    const out = outRef.current
    const inc = inRef.current
    const img = inImgRef.current
    if (busy.current) return
    if (reduced || !out || !inc) { commit(); return }
    busy.current = true
    if (img) {
      if (poster) img.src = poster
      else img.removeAttribute('src')
    }
    const width = out.offsetWidth
    const outShade = out.querySelector('[data-cyl-shade]')
    const incShade = inc.querySelector('[data-cyl-shade]')
    const D = 0.95
    gsap.set([out, inc], { transformOrigin: '50% 50%', transformPerspective: CYL_PERSPECTIVE, force3D: true })
    const turn = { a: 0 } // 0 → 1 over the swap
    const place = () => {
      setCylinder(out, -CYL_ANGLE * dir * turn.a, width)
      setCylinder(inc, CYL_ANGLE * dir * (1 - turn.a), width)
    }
    const tl = gsap.timeline({
      defaults: { duration: D, ease: CYL_EASE },
      onComplete: () => {
        commit()
        // let React swap the <video> source before the poster face is removed
        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.set(out, { rotateY: 0, x: 0, z: 0, autoAlpha: 1 })
          gsap.set(inc, { autoAlpha: 0, rotateY: 0, x: 0, z: 0 })
          if (outShade) gsap.set(outShade, { opacity: 0 })
          busy.current = false
        }))
      },
    })
      .fromTo(turn, { a: 0 }, { a: 1, onUpdate: place, onStart: place }, 0)
      .fromTo(inc, { autoAlpha: 0 }, { autoAlpha: 1, duration: D * 0.2, ease: 'none' }, 0)
      .to(out, { autoAlpha: 0, duration: D * 0.2, ease: 'none' }, D * 0.8)
    if (outShade) tl.fromTo(outShade, { opacity: 0 }, { opacity: 0.55, ease: 'power2.in' }, 0)
    if (incShade) tl.fromTo(incShade, { opacity: 0.55 }, { opacity: 0, ease: 'power2.out' }, 0)
  }, [reduced])

  return { outRef, inRef, inImgRef, swap }
}

/** The incoming face used by useCylinderSwap (next clip's poster). */
function CylinderIncomingFace({ faceRef, imgRef }: { faceRef: Ref<HTMLDivElement>; imgRef: Ref<HTMLImageElement> }) {
  return (
    <div ref={faceRef} className="pointer-events-none invisible absolute inset-0 bg-[#151515] opacity-0 [backface-visibility:hidden]" aria-hidden="true">
      <img ref={imgRef} alt="" className="h-full w-full object-cover" />
      <CylShade />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero video player — lives on the BACK of the centre photo.          */
/* Plays the reels as a playlist so the middle content keeps changing. */
/* ------------------------------------------------------------------ */

function HeroVideoPlayer({ reels, takeover = false, autoPlayInView = false }: { reels: SocialReel[]; takeover?: boolean; autoPlayInView?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const resumeRef = useRef(false)
  const [clip, setClip] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [inView, setInView] = useState(!autoPlayInView)
  const count = reels.length
  const reel = reels[clip % Math.max(1, count)]
  const cylinder = useCylinderSwap()

  useEffect(() => {
    if (!autoPlayInView) return
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video) return
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (!entry.isIntersecting) video.pause()
    }, { threshold: 0.45 })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [autoPlayInView])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !autoPlayInView) return
    if (inView && video.dataset.userPaused !== 'true') video.play().catch(() => undefined)
    else if (!inView) video.pause()
  }, [autoPlayInView, inView])

  const goToClip = (next: number) => {
    const video = videoRef.current
    resumeRef.current = Boolean(video && !video.paused) || resumeRef.current
    const target = ((next % count) + count) % count
    cylinder.swap(1, reels[target]?.poster, () => {
      setStatus('loading')
      setTime(0)
      setClip(target)
    })
  }

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      delete video.dataset.userPaused
      video.play().catch(() => undefined)
    } else {
      video.dataset.userPaused = 'true'
      video.pause()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted && video.paused) {
      delete video.dataset.userPaused
      video.play().catch(() => undefined)
    }
  }

  if (!reel) return null
  const takeoverAttr = takeover ? { 'data-social-takeover-video': '' } : {}

  return (
    <div
  ref={wrapRef}
  className="relative h-full w-full overflow-hidden rounded-[clamp(16px,1.35vw,23px)] bg-[#151515] text-white shadow-[0_24px_60px_rgba(16,17,15,0.22)]"
>
      <div ref={cylinder.outRef} className="absolute inset-0 [backface-visibility:hidden]">
      {status === 'loading' && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" aria-hidden="true" />}
      <video
        ref={videoRef}
        {...takeoverAttr}
        src={inView ? reel.src : undefined}
        poster={reel.poster}
        muted={muted}
        loop={count < 2}
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
        onClick={togglePlayback}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { resumeRef.current = true; goToClip(clip + 1) }}
        onCanPlay={(event) => {
          setStatus('ready')
          if (resumeRef.current) {
            resumeRef.current = false
            if (event.currentTarget.dataset.userPaused !== 'true') event.currentTarget.play().catch(() => undefined)
          }
        }}
        onError={() => setStatus('error')}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
      />
      {status === 'error' && <span className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.08em] text-white/60">Video unavailable</span>}
      <CylShade />
      </div>
      <CylinderIncomingFace faceRef={cylinder.inRef} imgRef={cylinder.inImgRef} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

      <span className="pointer-events-none absolute right-5 top-14 z-20 text-[13px] font-semibold tabular-nums text-[#fffaf7]  ">
        -{formatTime(duration - time)}
      </span>

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? 'Pause video' : 'Play video'}
        className="absolute bottom-5 left-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#fff] shadow-[0_10px_28px_rgba(0,0,0,1)] transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {playing ? <Icon.Pause /> : <Icon.Play />}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        aria-pressed={!muted}
        className="absolute bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#075f38] shadow-[0_10px_28px_rgba(0,0,0,1)] transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {muted ? <Icon.Muted /> : <Icon.Volume />}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Team card ("We electrify your networks")                            */
/* ------------------------------------------------------------------ */

const TEAM_MEMBERS = [
  {
    name: 'NAME 01', role: 'Creative director', photo: mediaUrl('photo-1524504388940-b1c1722653e1.jpg'),
    intro: 'Shapes the big idea, the visual language and the energy that makes every campaign feel unmistakably BrandWorks.',
    left: '11%', top: '35%', width: '11%', height: '42%',
  },
  {
    name: 'NAME 02', role: 'Social strategist', photo: mediaUrl('photo-1500648767791-00dcc994a43e.jpg'),
    intro: 'Turns audience insight and culture into clear social strategies that give every post a reason to exist.',
    left: '21%', top: '28%', width: '11%', height: '49%',
  },
  {
    name: 'NAME 03', role: 'Content producer', photo: mediaUrl('photo-1497366754035-f200968a6e72.jpg'),
    intro: 'Keeps shoots, creators and deliverables moving smoothly from the first brief to the final export.',
    left: '31%', top: '31%', width: '11%', height: '46%',
  },
  {
    name: 'NAME 04', role: 'Art director', photo: mediaUrl('photo-1513364776144-60967b0f800f.jpg'),
    intro: 'Builds bold worlds for brands, pairing sharp design instincts with an eye for the smallest details.',
    left: '41%', top: '22%', width: '11%', height: '55%',
  },
  {
    name: 'NAME 05', role: 'Video editor', photo: mediaUrl('photo-1506794778202-cad84cf45f1d.jpg'),
    intro: 'Transforms raw footage into rhythm, emotion and stories people want to watch all the way through.',
    left: '50%', top: '30%', width: '11%', height: '47%',
  },
  {
    name: 'NAME 06', role: 'Photographer', photo: mediaUrl('photo-1516035069371-29a1b244cc32.jpg'),
    intro: 'Finds the human moment in every frame and gives brands a warm, confident and memorable point of view.',
    left: '59%', top: '25%', width: '11%', height: '52%',
  },
  {
    name: 'NAME 07', role: 'Community manager', photo: mediaUrl('photo-1519389950473-47ba0277781c.jpg'),
    intro: 'Listens closely, starts real conversations and makes sure every community feels seen, heard and valued.',
    left: '68%', top: '31%', width: '11%', height: '46%',
  },
  {
    name: 'NAME 08', role: 'Motion designer', photo: mediaUrl('photo-1545235617-9465d2a55698.jpg'),
    intro: 'Adds movement, character and playful timing to ideas so they stop thumbs and stay in people’s minds.',
    left: '77%', top: '27%', width: '10%', height: '50%',
  },
  {
    name: 'NAME 09', role: 'Client partner', photo: mediaUrl('photo-1560250097-0b93528c311a.jpg'),
    intro: 'Connects people, priorities and possibilities to keep ambitious projects clear, collaborative and on course.',
    left: '86%', top: '34%', width: '9%', height: '43%',
  },
] as const

type TeamMember = (typeof TEAM_MEMBERS)[number]
type TeamSelection = { member: TeamMember; index: number; trigger: HTMLButtonElement }

function TeamProfileDialog({ selection, onDismiss }: { selection: TeamSelection; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(true)
  const reduced = Boolean(useReducedMotion())
  const { member, index, trigger } = selection

  useBrowserLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (dialog.open) dialog.close()
      document.documentElement.style.overflow = previousOverflow
      if (trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [trigger])

  return (
    <dialog
      ref={dialogRef}
      className="bwsm-team-dialog"
      aria-labelledby="bwsm-team-name"
      aria-describedby="bwsm-team-intro"
      data-lenis-prevent="true"
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}
    >
      <AnimatePresence onExitComplete={onDismiss}>
        {open && (
          <motion.div
            className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-[#3f3f3f]/65 p-5 backdrop-blur-[4px] sm:p-8 lg:p-14"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28 }}
            onClick={(event) => event.target === event.currentTarget && setOpen(false)}
          >
            <motion.button
              ref={closeRef}
              type="button"
              aria-label={`Close ${member.name}'s profile`}
              onClick={() => setOpen(false)}
              className="fixed right-5 top-5 z-30 grid size-12 place-items-center rounded-full bg-white text-[#0a5935] shadow-[0_12px_35px_rgba(16,17,15,.12)] transition-transform hover:rotate-90 sm:right-8 sm:top-8 sm:size-14"
              initial={{ scale: reduced ? 1 : 0.65, rotate: reduced ? 0 : -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: reduced ? 1 : 0.65, rotate: reduced ? 0 : 45 }}
              transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </motion.button>

            <div className="my-auto grid w-full max-w-[1120px] items-center gap-5 pt-14 md:grid-cols-[0.92fr_1.08fr] md:gap-0 md:pt-0">
              <motion.figure
                className="relative z-10 mx-auto aspect-[4/5] w-[min(86vw,470px)] overflow-hidden rounded-[28px] bg-[#f4f0ed] shadow-[0_30px_90px_rgba(88,23,56,.24)] md:mr-[-4%]"
                initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : -70, rotate: reduced ? -2 : -8 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                exit={{ opacity: 0, x: reduced ? 0 : -45, rotate: reduced ? -2 : -6 }}
                transition={{ duration: reduced ? 0 : 0.65, ease: EASE }}
              >
                <img src={member.photo} alt={`${member.name}, ${member.role}`} className="h-full w-full object-cover" />
                <span className="absolute left-5 top-5 rounded-full bg-[#ffe4dc] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#10110f]">
                  Meet the team
                </span>
                <span className="absolute bottom-5 right-5 grid size-12 place-items-center rounded-[16px] bg-[#ffe4dc]" aria-hidden="true">
                  <AppleEmoji name="bolt" className="size-6" />
                </span>
              </motion.figure>

              <motion.article
                className="relative z-20 mx-auto flex min-h-[360px] w-[min(92vw,590px)] flex-col justify-center rounded-[28px] bg-[#b3cd1c] px-7 py-12 text-center text-white shadow-[0_30px_90px_rgba(88,23,56,.2)] sm:px-12 md:min-h-[470px] md:px-16 md:py-16"
                initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 70, scale: reduced ? 1 : 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: reduced ? 0 : 45, scale: reduced ? 1 : 0.96 }}
                transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : 0.06, ease: EASE }}
              > 
                <p className="mt-7 text-[13px] font-semibold">{member.role}</p>
                <h3 id="bwsm-team-name" className="mt-2 font-primary text-[clamp(54px,7vw,98px)] uppercase leading-[0.78] tracking-[-0.045em]">{member.name}</h3>
                <div className="mx-auto my-7 h-px w-12 bg-white/55" />
                <p id="bwsm-team-intro" className="mx-auto max-w-[420px] text-[clamp(15px,1.25vw,18px)] font-semibold leading-[1.5] text-white/95">{member.intro}</p>
              </motion.article>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}

function TeamHoverCard({ image, className = '', style }: { image: string; className?: string; style?: CSSProperties }) {
  const [selection, setSelection] = useState<TeamSelection | null>(null)

  return (
    <>
      <article
        data-social-team-card
        style={style}
        className={`group relative shrink-0 overflow-hidden rounded-[clamp(14px,1.2vw,22px)] bg-[#f0efec] shadow-[0_24px_70px_rgba(16,17,15,0.18)] [will-change:transform,opacity] ${className}`}
      >
        <img src={image} alt="BrandWorks team" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = mediaUrl('Strategy.jpg') }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />
        <CylShade className="z-30" />
        {TEAM_MEMBERS.map((member, index) => (
          <button
            key={member.name}
            type="button"
            data-team-hotspot
            aria-label={`Open profile for ${member.name}, ${member.role}`}
            className="group/member absolute z-20 cursor-pointer outline-none"
            style={{ left: member.left, top: member.top, width: member.width, height: member.height }}
            onClick={(event) => setSelection({ member, index, trigger: event.currentTarget })}
          >
            <span className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 size-3 rounded-full bg-[#db3188] opacity-0 shadow-[0_0_0_6px_rgba(219,49,136,.14)] transition-opacity duration-200 group-hover/member:opacity-100 group-focus-visible/member:opacity-100" />
            <span className="pointer-events-none absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#10110f] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,.16)] transition-all duration-200 group-hover/member:-translate-y-1.5 group-hover/member:opacity-100 group-focus-visible/member:-translate-y-1.5 group-focus-visible/member:opacity-100">
              {member.name}
            </span>
            <span className="sr-only">Team member {index + 1}</span>
          </button>
        ))}
      </article>
      {selection && <TeamProfileDialog selection={selection} onDismiss={() => setSelection(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Simple story card: video + progress bars + prev/next                */
/* ------------------------------------------------------------------ */

const STORY_GROUP_COUNT = 5

function buildStoryGroups(reels: readonly SocialReel[]): StoryGroup[] {
  if (!reels.length) return []
  const perGroup = Math.min(4, reels.length)
  return Array.from({ length: STORY_GROUP_COUNT }, (_, groupIndex) => {
    const size = groupIndex % 2 ? Math.min(3, perGroup) : perGroup
    return {
      id: `story-group-${groupIndex}`,
      reels: Array.from({ length: size }, (_, k) => reels[(groupIndex * 2 + k) % reels.length]),
    }
  })
}

function StoryGroupCard({
  group,
  active,
  onOpen,
  className = 'h-[min(72svh,720px)] w-[clamp(280px,23vw,410px)]',
}: {
  group: StoryGroup
  active: boolean
  onOpen: (reel: SocialReel, trigger: HTMLElement) => void
  className?: string
}) {
  const cardRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const barRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  const [burst, setBurst] = useState(0)

  const count = group.reels.length
  const reel = group.reels[index]
  const cylinder = useCylinderSwap()
  const shouldPlay = active && inView
  const shouldPlayRef = useRef(shouldPlay)
  shouldPlayRef.current = shouldPlay

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 })
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) video.play().catch(() => undefined)
    else video.pause()
  }, [shouldPlay, index])

  // progress bars: done = full, upcoming = empty, current = live
  useBrowserLayoutEffect(() => {
    barRefs.current.forEach((bar, i) => {
      if (bar) bar.style.transform = `scaleX(${i < index ? 1 : 0})`
    })
  }, [index])

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const bar = barRefs.current[index]
      if (video && bar) bar.style.transform = `scaleX(${video.duration ? video.currentTime / video.duration : 0})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, inView])

  const go = useCallback((dir: 1 | -1) => {
    const video = videoRef.current
    const next = dir < 0 && index === 0 ? 0 : (index + dir + count) % count
    if (next === index) {
      if (video) {
        video.currentTime = 0
        if (shouldPlayRef.current) video.play().catch(() => undefined)
      }
      return
    }
    cylinder.swap(dir, group.reels[next]?.poster, () => {
      setStatus('loading')
      setIndex(next)
    })
  }, [index, count, group.reels, cylinder.swap])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
    else if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); onOpen(reel, event.currentTarget) }
  }

  const isLiked = Boolean(liked[index])
  const toggleLike = () => {
    setLiked((value) => ({ ...value, [index]: !value[index] }))
    if (!isLiked) setBurst((value) => value + 1)
  }

  if (!reel) return null

  return (
    <article
      ref={cardRef}
      data-social-card
      data-social-story-card
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="stories"
      aria-label={`Story ${index + 1} of ${count}`}
      className={`group/story relative shrink-0 select-none overflow-hidden rounded-[clamp(14px,1.2vw,22px)] bg-[#161616] text-white shadow-[0_24px_70px_rgba(0,0,0,.18)] outline-none [will-change:transform,opacity] focus-visible:ring-2 focus-visible:ring-white/90 ${className}`}
    >
      <div ref={cylinder.outRef} className="absolute inset-0 [backface-visibility:hidden]">
        {status === 'loading' && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" aria-hidden="true" />}
        <video
          ref={videoRef}
          src={inView ? reel.src : undefined}
          poster={reel.poster}
          muted={muted}
          playsInline
          preload="none"
          onCanPlay={() => setStatus('ready')}
          onError={() => setStatus('error')}
          onEnded={() => go(1)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {status === 'error' && <span className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.08em] text-white/60">Video unavailable</span>}
        <CylShade />
      </div>
      <CylinderIncomingFace faceRef={cylinder.inRef} imgRef={cylinder.inImgRef} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />

      {/* progress segments */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex gap-1" aria-hidden="true">
        {group.reels.map((item, i) => (
          <span key={`${item.id}-${i}`} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
            <span ref={(el) => { barRefs.current[i] = el }} className="block h-full w-full origin-left rounded-full bg-white" />
          </span>
        ))}
      </div>

      {/* tap left / right to move between stories */}
      <div className="absolute inset-0 z-20 flex">
        <button type="button" tabIndex={-1} aria-label="Previous story" className="h-full w-1/3 cursor-w-resize outline-none" onClick={() => go(-1)} />
        <button type="button" tabIndex={-1} aria-label="Next story" className="h-full w-2/3 cursor-e-resize outline-none" onClick={() => go(1)} />
      </div>

      {/* like — white circle with a pink heart; fills and bursts when tapped */}
      <button
        type="button"
        onClick={toggleLike}
        aria-label={isLiked ? 'Unlike story' : 'Like story'}
        aria-pressed={isLiked}
        className="absolute bottom-4 left-4 z-30 grid size-12 place-items-center rounded-full text-[#d72585] shadow-[0_10px_26px_rgba(0,0,0,.18)] transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#fff8f6', color: '#d72585' }}
      >
        <AnimatePresence>
          {burst > 0 && isLiked && (
            <motion.span
              key={burst}
              className="pointer-events-none absolute inset-0 grid place-items-center"
              initial={{ y: 0, scale: 0.6, opacity: 1 }}
              animate={{ y: -46, scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              aria-hidden="true"
            >
              <Icon.Heart filled />
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          key={`heart-${isLiked}`}
          className="grid place-items-center"
          initial={{ scale: isLiked ? 0.55 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        >
          <Icon.Heart filled={isLiked} />
        </motion.span>
      </button>

      {/* mute */}
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        aria-label={muted ? 'Unmute stories' : 'Mute stories'}
        aria-pressed={!muted}
        className="absolute bottom-4 right-4 z-30 grid size-10 place-items-center rounded-full text-white transition-colors"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.38)', color: '#fff' }}
      >
        {muted ? <Icon.Muted /> : <Icon.Volume />}
      </button>

      {/* left / right CTAs — frosted white circles with white arrows */}
      {(['left', 'right'] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => go(dir === 'left' ? -1 : 1)}
          aria-label={dir === 'left' ? 'Previous story' : 'Next story'}
          className={`absolute top-1/2 z-30 -mt-5 grid size-10 place-items-center rounded-full text-white ring-1 ring-white/25 transition-[transform,background-color] duration-200 hover:scale-105 hover:!bg-white/50 ${dir === 'left' ? 'left-3' : 'right-3'}`}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.32)', color: '#fff' }}
        >
          <Icon.Arrow dir={dir} />
        </button>
      ))}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Pinned scroll story (desktop)                                       */
/*                                                                     */
/* 1 timeline unit = 1vh of scroll, so text blocks that move 1 unit    */
/* per vh read as plain page scrolling while the card stays centred.   */
/* ------------------------------------------------------------------ */

const WHITE = '#fff'
const RAIL_START = 440
const PER_CARD = 85
const FIRST_STORY_TURN = 70 // scroll length of the team → first story cylinder turn
const LAST_CARD_STOP = 0.57 // last card stops part-way over the previous one

const STAGE_VARS = { '--slot-h': 'min(82svh, 500px)', '--slot-w': 'calc(var(--slot-h) * 0.665)' } as CSSProperties
const SLOT: CSSProperties = { position: 'absolute', width: 'var(--slot-w)', height: 'var(--slot-h)', left: 'calc(50% - var(--slot-w) / 2)', top: 'calc(50% - var(--slot-h) / 2)' }
const RAIL_ITEM: CSSProperties = { position: 'absolute', width: 'var(--slot-w)', height: 'var(--slot-h)', left: 0, top: 'calc(50% - var(--slot-h) / 2)' }

function ProjectRail({ onOpen }: { onOpen: (reel: SocialReel, trigger: HTMLElement) => void }) {
  const desktopRef = useRef<HTMLDivElement>(null)
  const [railIndex, setRailIndex] = useState(0)

  const heroReels = SOCIAL_REELS.slice(0, 3)
  const fallbackImages = [mediaUrl('Strategy.jpg'), mediaUrl('content_creation.avif'), mediaUrl('enga.webp')]
  const heroItems = heroReels.map((reel, index) => ({ reel, image: reel.poster || fallbackImages[index] || fallbackImages[0] }))
  const centerItem = heroItems[1] || heroItems[0]
  const playlist = useMemo(
    () => (centerItem ? [centerItem.reel, ...SOCIAL_REELS.filter((reel) => reel.id !== centerItem.reel.id)].slice(0, 6) : []),
    [centerItem],
  )
  const heroBackdrop = mediaUrl('Strategy.jpg')
  const teamPhoto = mediaUrl('team-04.webp')
  const storyGroups = useMemo(() => buildStoryGroups(SOCIAL_REELS), [])
  const railCount = storyGroups.length + 1
  const total = RAIL_START + railCount * PER_CARD + 40

  useGSAP(() => {
    const root = desktopRef.current
    if (!root) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)
      const qa = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, root)

      const stage = q('[data-stage]')
      const railBg = q('[data-rail-bg]')
      const stageBg = q<HTMLElement>('[data-stage-bg]')
      const backdrop = q('[data-hero-backdrop]')
      const backdropImg = q('[data-hero-backdrop] img')
      const heroLetters = qa('[data-hero-letter]')
      const heroLines = qa('[data-hero-copy] [data-line]')
      const heroHl = qa('[data-hero-copy] [data-hl]')
      const stickers = qa('[data-social-emoji]')
      const shells = qa('[data-social-photo-shell]')
      const shellIntro = qa('[data-shell-intro]')
      const magnets = qa('[data-social-magnet]')
      const flipFront = q('[data-flip-front]')
      const flipBack = q('[data-flip-back]')
      const teamCard = q('[data-social-team-card]')
      const railItems = qa('[data-rail-item]')
      const flowHeroBack = q('[data-flow="hero-back"]')
      const flowHeroCopy = q('[data-flow="hero-copy"]')
      const flowPinkL = q('[data-flow="pink-left"]')
      const flowPinkR = q('[data-flow="pink-right"]')
      const flowElectricL = q('[data-flow="electric-left"]')
      const flowElectricR = q('[data-flow="electric-right"]')
      const flowSocial = q('[data-flow="social"]')
      const socialMeta = qa('[data-flow="social"] [data-social-fade]')
      const video = q<HTMLVideoElement>('[data-social-takeover-video]')

      if (!stage || !railBg || !stageBg || !backdrop || shells.length < 3 || !flipFront || !flipBack || !teamCard || !railItems.length) return

      const centerShell = shells[1]
      const leftShell = shells[0]
      const backCard = shells[2] // reused as the card peeking behind the team card
      const cardW = () => teamCard.offsetWidth
      const cylFace = { transformOrigin: '50% 50%', transformPerspective: CYL_PERSPECTIVE, force3D: true }
      // each cylinder face keeps its own angle; `base` is its resting x (only the first story has one)
      const cylAngle = new Map<HTMLElement, { a: number; base: () => number }>()
      const placeOnCylinder = (el: HTMLElement) => {
        const st = cylAngle.get(el)
        if (st) setCylinder(el, st.a, cardW(), st.base())
      }
      const firstStory = railItems[0]
      const restItems = railItems.slice(1) // these still slide in from the right

      /* ---------- initial state ---------- */
      gsap.set(stageBg, { backgroundColor: WHITE })
      gsap.set(railBg, { backgroundColor: '#284c58' })
      gsap.set(shells, { transformOrigin: '50% 50%', force3D: true })
      gsap.set(centerShell, { scale: 1, zIndex: 30 })
      gsap.set(leftShell, { x: () => -window.innerWidth * 0.175, y: () => window.innerHeight * 0.09, scale: 1, rotation: -5.5, zIndex: 10 })
      gsap.set(backCard, { x: () => window.innerWidth * 0.175, y: () => window.innerHeight * 0.08, scale: 1, rotation: 5.2, zIndex: 10 })
      // photo, video, team card and first story all sit on the same cylinder
      gsap.set(flipFront, { ...cylFace, pointerEvents: 'auto' })
      gsap.set(flipBack, { ...cylFace, autoAlpha: 0, pointerEvents: 'none' })
      gsap.set(teamCard, { ...cylFace, autoAlpha: 0 })
      gsap.set(firstStory, { ...cylFace, autoAlpha: 0 })
      cylAngle.set(flipFront, { a: 0, base: () => 0 })
      cylAngle.set(flipBack, { a: CYL_ANGLE, base: () => 0 })
      cylAngle.set(teamCard, { a: CYL_ANGLE, base: () => 0 })
      cylAngle.set(firstStory, { a: CYL_ANGLE, base: () => geom.x0 })
      gsap.set(restItems, { transformOrigin: '0% 50%', transformPerspective: 1600, force3D: true })

      /* ---------- magnetic hover on hero photos ---------- */
      const cleanups: Array<() => void> = []
      magnets.forEach((card, index) => {
        let bounds = card.getBoundingClientRect()
        const xTo = gsap.quickTo(card, 'x', { duration: 0.35, ease: 'power3.out' })
        const yTo = gsap.quickTo(card, 'y', { duration: 0.35, ease: 'power3.out' })
        const rotateTo = gsap.quickTo(card, 'rotate', { duration: 0.4, ease: 'power3.out' })
        const strength = index === 1 ? 18 : 12
        const onEnter = () => { bounds = card.getBoundingClientRect() }
        const onMove = (event: PointerEvent) => {
          const nx = gsap.utils.clamp(-1, 1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)
          const ny = gsap.utils.clamp(-1, 1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)
          xTo(nx * strength); yTo(ny * strength * 0.72); rotateTo(nx * 1.2)
        }
        const onLeave = () => { xTo(0); yTo(0); rotateTo(0) }
        card.addEventListener('pointerenter', onEnter)
        card.addEventListener('pointermove', onMove, { passive: true })
        card.addEventListener('pointerleave', onLeave)
        cleanups.push(() => {
          card.removeEventListener('pointerenter', onEnter)
          card.removeEventListener('pointermove', onMove)
          card.removeEventListener('pointerleave', onLeave)
        })
      })

      /* ---------- page-load intro ---------- */
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } })
      intro
        .fromTo(backdrop, { clipPath: 'inset(9% 9% 9% 9% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.5 }, 0)
        .fromTo(backdropImg, { scale: 1.25 }, { scale: 1.03, duration: 1.8 }, 0)
        .fromTo(heroLetters, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.035 }, 0.1)
        .fromTo(shellIntro, { y: 140, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.3, stagger: 0.09 }, 0.25)
        .fromTo(heroLines, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.07 }, 0.5)
        .fromTo(heroHl, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, 0.95)
        .fromTo(stickers, { scale: 0, rotation: -25 }, { scale: 1, rotation: (_i: number, el: HTMLElement) => Number(el.dataset.tilt || 0), duration: 0.8, stagger: 0.07, ease: 'back.out(2)' }, 0.85)

      /* ---------- horizontal stacking rail ---------- */
      const geom = { vw: 0, W: 0, x0: 0, gap: 14, natural: [] as number[], max: 0 }
      const measure = () => {
        geom.vw = stage.clientWidth
        geom.W = cardW()
        geom.x0 = (geom.vw - geom.W) / 2
        geom.natural = restItems.map((_, k) => geom.vw + 30 + k * (geom.W + geom.gap))
        geom.max = restItems.length ? geom.natural[restItems.length - 1] - (geom.x0 + geom.W * LAST_CARD_STOP) : 0
      }
      measure()
      // fast per-frame setters instead of gsap.set() on every scroll tick
      const setters = restItems.map((card) => ({
        x: gsap.quickSetter(card, 'x', 'px'),
        ry: gsap.quickSetter(card, 'rotateY', 'deg'),
        rz: gsap.quickSetter(card, 'rotation', 'deg'),
      }))
      const proxy = { o: 0 }
      let firstShown = false
      let restLocked = 0
      let lastActive = -1
      const updateActive = () => {
        const active = firstShown ? 1 + restLocked : 0
        if (active !== lastActive) {
          lastActive = active
          setRailIndex(active)
        }
      }
      const layoutRail = () => {
        const { vw, W, x0, natural } = geom
        placeOnCylinder(firstStory)
        let locked = 0
        restItems.forEach((_, k) => {
          const isLast = k === restItems.length - 1
          const lockX = x0 + (isLast ? W * LAST_CARD_STOP : 0)
          const raw = natural[k] - proxy.o
          const x = Math.max(lockX, raw)
          if (raw <= lockX + 0.5) locked = k + 1
          // a little swing while the card enters from the right edge (eased, not linear)
          const t = gsap.parseEase('power2.in')(gsap.utils.clamp(0, 1, (x - vw * 0.55) / (vw * 0.45)))
          setters[k].x(x)
          setters[k].ry(-24 * t)
          setters[k].rz(5 * t)
        })
        restLocked = locked
        updateActive()
      }
      layoutRail()
      ;[flipFront, flipBack, teamCard].forEach(placeOnCylinder)
      const onRefreshInit = () => measure()
      const onRefresh = () => { layoutRail(); [flipFront, flipBack, teamCard].forEach(placeOnCylinder) }
      ScrollTrigger.addEventListener('refreshInit', onRefreshInit)
      ScrollTrigger.addEventListener('refresh', onRefresh)
      cleanups.push(() => {
        ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
        ScrollTrigger.removeEventListener('refresh', onRefresh)
      })

      /* ---------- the scrubbed timeline ---------- */
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          pin: stage,
          pinSpacing: false,
          scrub: 1.1, // a touch more inertia = silkier catch-up
          anticipatePin: 1,
          fastScrollEnd: true,
          invalidateOnRefresh: true,
        },
      })
      tl.set({}, {}, total) // timeline length = scroll length in vh

      // text blocks: move 1 viewport-% per unit → plain native-feeling scroll
      const flow = (el: HTMLElement | null, from: number, to: number, at: number) => {
        if (el) tl.fromTo(el, { yPercent: from }, { yPercent: to, duration: Math.abs(from - to), ease: 'none' }, at)
      }

      // same, with its own speed — two speeds side by side give the text depth (parallax)
      const flowAt = (el: HTMLElement | null, from: number, to: number, at: number, duration: number) => {
        if (el) tl.fromTo(el, { yPercent: from }, { yPercent: to, duration, ease: 'none' }, at)
      }

      // headline lines rise out of their masks, then the lime highlight wipes across
      const reveal = (el: HTMLElement | null, at: number) => {
        if (!el) return
        const lines = gsap.utils.toArray<HTMLElement>('[data-line]', el)
        const hls = gsap.utils.toArray<HTMLElement>('[data-hl]', el)
        if (lines.length) tl.fromTo(lines, { yPercent: 118, rotation: 2.5, transformOrigin: '0% 100%' }, { yPercent: 0, rotation: 0, duration: 26, stagger: 6, ease: 'power3.out' }, at)
        if (hls.length) tl.fromTo(hls, { scaleX: 0 }, { scaleX: 1, duration: 20, ease: 'power2.inOut' }, at + 10 + lines.length * 4)
      }

      // emoji bubbles / pills pop in with a little overshoot
      const pop = (el: HTMLElement | null, at: number) => {
        const items = el ? gsap.utils.toArray<HTMLElement>('[data-pop]', el) : []
        if (items.length) tl.fromTo(items, { scale: 0, rotation: -14 }, { scale: 1, rotation: 0, duration: 16, stagger: 3, ease: 'back.out(2.2)' }, at)
      }

      // paragraph words light up one after another
      const lightWords = (el: HTMLElement | null, at: number, duration: number) => {
        const words = el ? gsap.utils.toArray<HTMLElement>('[data-word]', el) : []
        if (!words.length) return
        const step = duration / words.length
        tl.fromTo(words, { opacity: 0.14 }, { opacity: 1, duration: step * 3, stagger: step, ease: 'none' }, at)
      }

      // one turn of the cylinder: `out` rolls away to the left, `inc` rolls in from the right.
      // Faces fade at the far edges and darken as they turn away, so it reads as a solid drum.
      const shadeOf = (el: HTMLElement) => el.querySelector<HTMLElement>(':scope > [data-cyl-shade]') ?? el.querySelector<HTMLElement>('[data-cyl-shade]')
      const cylinder = (out: HTMLElement, inc: HTMLElement, at: number, duration: number) => {
        const fade = duration * 0.16
        const outState = cylAngle.get(out)!
        const incState = cylAngle.get(inc)!
        tl.fromTo(outState, { a: 0 }, { a: -CYL_ANGLE, duration, ease: 'power2.inOut', immediateRender: false, onUpdate: () => placeOnCylinder(out) }, at)
        tl.fromTo(incState, { a: CYL_ANGLE }, { a: 0, duration, ease: 'power2.inOut', immediateRender: false, onUpdate: () => placeOnCylinder(inc) }, at)
        // plain .to() fades: they record their start values in timeline order, which keeps
        // scrubbing back and forth (and ScrollTrigger refreshes) clean
        tl.to(inc, { autoAlpha: 1, duration: fade, ease: 'none' }, at)
        tl.to(out, { autoAlpha: 0, duration: fade, ease: 'none' }, at + duration - fade)
        const outShade = shadeOf(out)
        const incShade = shadeOf(inc)
        if (outShade) tl.to(outShade, { opacity: 0.5, duration, ease: 'power1.in' }, at)
        if (incShade) tl.fromTo(incShade, { opacity: 0.5 }, { opacity: 0, duration, ease: 'power1.out' }, at)
      }

      // 1. Photos tuck behind the centre one while retaining their size
      flow(flowHeroBack, 0, -100, 0)
      flow(flowHeroCopy, 0, -100, 0)
      tl.to(backdrop, { autoAlpha: 0, duration: 35 }, 10)
      // The page changes atmosphere between chapters instead of hard-cutting.
      tl.to(stageBg, { backgroundColor: '#f2b0b5', duration: 74, ease: 'none' }, 58)
      tl.to(leftShell, { x: 0, y: 0, rotation: -2, duration: 55, ease: 'power2.inOut' }, 0)
      tl.to(backCard, { x: 0, y: 0, rotation: 2, duration: 55, ease: 'power2.inOut' }, 0)
      tl.to(stickers, { autoAlpha: 0, scale: 0.6, duration: 20 }, 10)

      // 2. CYLINDER — the photo rolls away and the reel rolls in
      tl.set([leftShell, backCard], { autoAlpha: 0 }, 55)
      cylinder(flipFront, flipBack, 55, 55)
      tl.set(flipFront, { pointerEvents: 'none' }, 80)
      tl.set(flipBack, { pointerEvents: 'auto' }, 80)

      // 3. "We are the current, / You are the story." — two columns, two speeds
      flowAt(flowPinkL, 100, -45, 80, 145)
      flowAt(flowPinkR, 130, -60, 80, 145)
      pop(flowPinkL, 96)
      reveal(flowPinkL, 102)
      reveal(flowPinkR, 120)

      // 4. CYLINDER — the video rolls away and the TEAM card rolls in
      tl.set(flipBack, { pointerEvents: 'none' }, 225)
      cylinder(flipBack, teamCard, 225, 62)
      // once the team card has landed, the video face returns (hidden underneath) for the stack
      tl.set(cylAngle.get(flipBack)!, { a: 0 }, 289)
      tl.set(flipBack, { autoAlpha: 1 }, 289)
      const backShade = shadeOf(flipBack)
      if (backShade) tl.set(backShade, { opacity: 0 }, 289)
      // the cards underneath splay out as a little stack
      tl.set(backCard, { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1 }, 291)
      tl.to(centerShell, { x: () => -cardW() * 0.07, rotation: -3.5, duration: 35, ease: 'power2.out' }, 291)
      tl.to(backCard, { x: () => cardW() * 0.07, rotation: 4, duration: 35, ease: 'power2.out' }, 291)
      //    "We electrify your networks," + the manifesto line, again on two speeds
      flowAt(flowElectricL, 100, -50, 230, 150)
      flowAt(flowElectricR, 125, -65, 230, 150)
      pop(flowElectricL, 246)
      reveal(flowElectricL, 250)
      lightWords(flowElectricR, 262, 42)
      pop(flowElectricR, 300)
      tl.to(stageBg, { backgroundColor: '#c9dc2f', duration: 82, ease: 'none' }, 225)

      // 5. "We make them social": stack tucks back in, title rises and stays
      tl.to([centerShell, backCard], { x: 0, rotation: 0, duration: 20, ease: 'power2.inOut' }, 380)
      tl.set([centerShell, backCard], { autoAlpha: 0 }, 402)
      flow(flowSocial, 100, 0, 370)
      reveal(flowSocial, 400)
      pop(flowSocial, 414)
      if (socialMeta.length) tl.fromTo(socialMeta, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 18, stagger: 5, ease: 'power2.out' }, 420)
      tl.to(stageBg, { backgroundColor: '#e9e2d8', duration: 34, ease: 'none' }, 370)

      // 6. Stories: background deepens, the title turns light so it stays readable
      tl.to(railBg, { backgroundColor: '#284c58', opacity: 1, duration: 18, ease: 'power2.out' }, RAIL_START - 16)
      tl.to(stageBg, { backgroundColor: '#fff8f6', duration: 18, ease: 'power2.inOut' }, RAIL_START - 16)
      if (flowSocial) tl.to(flowSocial, { color: '#fffaf7', duration: 18, ease: 'power2.inOut' }, RAIL_START - 16)
      //    first story: one cylinder turn off the team card…
      cylinder(teamCard, firstStory, RAIL_START, FIRST_STORY_TURN)
      //    …then every other card follows through from the right
      tl.to(proxy, { o: () => geom.max, duration: (railCount - 1) * PER_CARD, ease: 'none', onUpdate: layoutRail }, RAIL_START + FIRST_STORY_TURN)

      // video only plays while it's the card on show
      tl.eventCallback('onUpdate', () => {
        // keep every cylinder face exactly where its angle says (both scroll directions)
        cylAngle.forEach((_, el) => placeOnCylinder(el))
        const shown = tl.time() >= RAIL_START + FIRST_STORY_TURN * 0.6
        if (shown !== firstShown) { firstShown = shown; updateActive() }
        if (!video) return
        const t = tl.time()
        const visible = t > 80 && t < 285
        if (visible && video.paused && video.dataset.userPaused !== 'true') video.play().catch(() => undefined)
        else if (!visible && !video.paused) video.pause()
      })

      return () => {
        cleanups.forEach((cleanup) => cleanup())
        intro.kill()
        video?.pause()
        setRailIndex(0)
      }
    })

    return () => mm.revert()
  }, { scope: desktopRef, dependencies: [total, railCount] })

  const tiltedSticker = 'bwsm-emoji-bubble bwsm-emoji-float pointer-events-none absolute z-50 rounded-[26px] bg-[#f8ded4] px-6 py-5 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,0.12)]'
  const flowBox = 'pointer-events-none absolute inset-0 z-[30] will-change-transform'
  const textHighlight = 'inline-block bg-[#ccff00] px-[0.08em] pb-[0.07em] pt-[0.03em] text-[#10110f]'

  return (
    <section className="bwsm-hero-rail relative" id="social-work" aria-label="BrandWorks social media">
      {/* ================= DESKTOP (pinned stage) ================= */}
      <div ref={desktopRef} className="relative hidden lg:block lg:motion-reduce:hidden" style={{ height: `${total + 100}vh` }}>
        <div data-stage className="relative h-[100svh] w-full overflow-hidden" style={STAGE_VARS}>
          <div data-stage-bg className="absolute inset-0" style={{ backgroundColor: WHITE }} />
          <div data-rail-bg className="absolute inset-0 opacity-0" style={{ backgroundColor: WHITE }} />

          {/* hero backdrop + wordmark (behind the photos, scrolls away) */}
          <div data-flow="hero-back" className="pointer-events-none absolute inset-0 z-[2] will-change-transform">
            <div className="absolute inset-x-0 top-[4svh] flex justify-center">
              <div data-hero-backdrop className="h-[73svh] w-[91vw] max-w-[1620px] overflow-hidden   ">
                {/* <div className="relative h-full w-full">
                  <img src={heroBackdrop} alt="" className="h-full w-full object-cover object-center opacity-40" loading="eager" />
                  <div className="absolute inset-0 bg-white/50" />
                  <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-white via-white/55 to-transparent" />
                </div> */}
              </div>
            </div>
            <div className="absolute inset-x-0 top-[3svh] flex justify-center">
              <div aria-hidden="true" className="flex whitespace-nowrap font-primary text-[clamp(120px,19vw,150px)] uppercase leading-[1] tracking-[-0.025em] text-[#bfe623] mt-10">
                {'BRANDWORKS.me'.split('').map((letter, index) => (
                  <span key={index} data-hero-letter className="inline-block">{letter}</span>
                ))}
              </div>
            </div>
          </div>

          {/* cards in the centre slot */}
          <div className="pointer-events-none absolute inset-0 z-[10]">
            {heroItems.map(({ reel, image }, index) => {
              const isCenter = index === 1
              return (
                <div key={reel.id} data-social-photo-shell className="pointer-events-auto [will-change:transform,opacity]" style={SLOT}>
                  <div data-shell-intro className="relative h-full w-full">
                    <div data-flip-inner={isCenter ? '' : undefined} className="relative h-full w-full">
                      <div data-flip-front={isCenter ? '' : undefined} className="absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]">
                        <button
                          type="button"
                          data-social-magnet
                          className="group relative block h-full w-full [will-change:transform]"
                          onClick={(event) => onOpen(reel, event.currentTarget)}
                          aria-label={`View ${reel.caption}`}
                        >
                          <span className={`relative block h-full w-full overflow-hidden rounded-[clamp(16px,1.35vw,23px)] bg-[#dedbd6] ${isCenter ? '' : 'shadow-[0_26px_65px_rgba(16,17,15,0.16)]'}`}>
                            <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" loading="lazy" />
                          </span>
                        </button>
                        {isCenter && <CylShade className="z-10 rounded-[clamp(16px,1.35vw,23px)]" />}
                      </div>
                      {isCenter && (
                        <div data-flip-back className="pointer-events-none invisible absolute inset-0 opacity-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]">
                          <HeroVideoPlayer reels={playlist} takeover />
                          <CylShade className="z-50 rounded-[clamp(16px,1.35vw,23px)]" />
                        </div>
                      )}
                    </div>
                    {index === 0 && <AppleEmojiRow names={['desktop', 'bolt', 'headphones']} data-social-emoji data-tilt="-5" className={`${tiltedSticker} -left-10 top-[54%]`} />}
                    {index === 1 && (
                      <span className="pointer-events-none absolute inset-x-0 top-[9%] z-50 flex justify-center">
                        <span data-social-emoji className="bwsm-emoji-bubble bwsm-emoji-float relative rounded-[28px] bg-[#ffe4dc] px-6 py-5 shadow-[0_12px_28px_rgba(16,17,15,0.08)]"><AppleEmoji name="bolt" className="size-8" /></span>
                      </span>
                    )}
                    {index === 2 && <AppleEmojiRow names={['movieCamera', 'bolt', 'fist']} data-social-emoji data-tilt="5" className={`${tiltedSticker} -right-12 top-[54%]`} />}
                  </div>
                </div>
              )
            })}
            <TeamHoverCard image={teamPhoto} className="pointer-events-auto z-40" style={{ ...SLOT, zIndex: 40 }} />
          </div>

          {/* story cards — slide in from the right and stack on the slot */}
          <div className="pointer-events-none absolute inset-0 z-[20]">
            {storyGroups.map((group, g) => (
              <div key={group.id} data-rail-item className="pointer-events-auto [will-change:transform]" style={{ ...RAIL_ITEM, zIndex: g + 1, transform: 'translateX(110vw)' }}>
                <StoryGroupCard group={group} active={railIndex === g + 1} onOpen={onOpen} className="h-full w-full" />
                <CylShade className="z-10 rounded-[clamp(14px,1.2vw,22px)]" />
              </div>
            ))}
            <div data-rail-item className="pointer-events-auto [will-change:transform]" style={{ ...RAIL_ITEM, zIndex: storyGroups.length + 1, transform: 'translateX(110vw)' }}>
              <a
                href="#social-process"
                className="flex h-full w-full flex-col items-center justify-center rounded-[clamp(14px,1.2vw,22px)] bg-[#d72585] p-8 text-center text-white shadow-[0_20px_60px_rgba(0,0,0,.18)]"
              >
                <span className="font-primary text-[clamp(42px,4vw,70px)] uppercase leading-[0.76] tracking-[-0.05em]">More<br />projects?</span>
                <small className="mt-7 rounded-full bg-white px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#111]">Explore <Arrow /></small>
              </a>
            </div>
          </div>

          {/* ---------- text that simply scrolls past ---------- */}
          <div data-flow="hero-copy" className={flowBox}>
            <div data-hero-copy className="absolute bottom-[5vh] left-[clamp(28px,3vw,58px)]">
              {/* <p className="mb-3 text-[11px] font-semibold text-[#10110f]">Social media agency</p> */}
              <h1 className="font-primary text-[clamp(52px,5vw,84px)] font-normal uppercase leading-[0.74] tracking-[-0.06em] text-[#10110f]">
                <Lines lines={[<span key="h" data-hero-human>Human</span>, <Hl key="s">Social Club.</Hl>]} />
              </h1>
            </div>
            {/* <div data-hero-copy className="absolute bottom-[5vh] right-[clamp(28px,3vw,58px)] max-w-[240px] border-t border-black/15 pt-4">
              <p className="text-[12px] font-medium leading-[1.5] text-black/50">Strategy, content and community built around people worth following.</p>
            </div> */}
          </div>

          {/* ---------- We are the current, / You are the story. ---------- */}
          <div data-flow="pink-left" className={`${flowBox} text-[#10110f]`}>
            <span data-pop className="absolute left-[12vw] top-[12vh] block">
              <AppleEmojiRow names={['phone', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float rotate-[5deg] rounded-[26px] bg-[#f8ded4] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            </span>
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[12vh] max-w-[28vw]">
              <span className="mb-4 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(48px,4.8vw,112px)] uppercase leading-[0.8]">
                <Lines lines={['We are the', <Hl key="c">current</Hl>]} />
              </h2>
            </div>
          </div>
          <div data-flow="pink-right" className={`${flowBox} text-[#10110f]`}>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[calc(6vh+44px)] max-w-[28vw] text-left">
              <h2 className="font-primary text-[clamp(44px,4vw,76px)] uppercase leading-[0.8]">
                <Lines lines={['You are', <Hl key="s">the story.</Hl>]} />
              </h2>
            </div>
          </div>

          {/* ---------- We electrify your networks, ---------- */}
          <div data-flow="electric-left" className={`${flowBox} text-[#10110f]`}>
            <span data-pop className="absolute left-[10vw] top-[3vh] block">
              <AppleEmojiRow names={['camera', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float rotate-[6deg] rounded-[26px] bg-[#f8ded4] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            </span>
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[4vh] max-w-[29vw]">
              <span className="mb-5 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(36px,4vw,90px)] uppercase leading-[0.8] tracking-[-0.025em]">
                <Lines lines={['We', 'electrify your', <Hl key="n">networks,</Hl>]} />
              </h2>
            </div>
          </div>
          <div data-flow="electric-right" className={`${flowBox} text-[#10110f]`}>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[8vh] max-w-[min(25vw,320px)]">
              <p className="text-[clamp(15px,1.15vw,18px)] font-semibold leading-[1.4] pb-2">
                <Words text="At BrandWorks, we believe social media is not just about publishing a few posts." />
              </p>
              <p data-pop className="mt-6 inline-flex origin-left items-center gap-2 rounded-full bg-[#10110f] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ccff00] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#ccff00]" />
                </span>
                Hover a face to meet the team
              </p>
            </div>
          </div>

          {/* ---------- We make them social ---------- */}
          <div data-flow="social" className={`${flowBox} z-[60] text-[#10110f]`}>
            <span data-pop className="absolute left-[clamp(170px,12vw,250px)] top-[clamp(65px,13vh,115px)] block">
              <AppleEmojiRow names={['phone', 'heart', 'sunglasses']} className="bwsm-emoji-bubble bwsm-emoji-float -rotate-[7deg] rounded-[28px] bg-[#f8ded4] px-8 py-6 text-[34px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            </span>
            <div className="absolute left-[clamp(28px,2vw,44px)] top-[clamp(150px,25vh,220px)] max-w-[26vw]">
              <h2 className="font-primary text-[clamp(44px,4.6vw,84px)] uppercase leading-[0.8] tracking-[-0.055em]">
                <Lines lines={['We', 'make them', <Hl key="s">social</Hl>]} />
              </h2>
              <p data-social-fade className="mt-6 max-w-[250px] text-[13px] font-semibold leading-[1.45] opacity-80">
                Stories, reels and campaigns made to live on the feed.
              </p>
              <div className="mt-5 flex -space-x-4">
                {SOCIAL_REELS.slice(0, 4).map((reel) => (
                  <span key={reel.id} data-pop className="size-12 overflow-hidden rounded-full border-2 border-white bg-white/20">
                    {reel.poster ? <img src={reel.poster} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                ))}
                <span data-pop className="grid size-12 place-items-center rounded-full border-2 border-white bg-[#db3188] text-[11px] text-white">+{Math.max(2, SOCIAL_REELS.length - 4)}</span>
              </div>
              {/* story counter + progress, synced with the rail */}
              <div data-social-fade className="mt-8 w-[min(240px,20vw)]">
                
             
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden lg:motion-reduce:block">
        <div className="relative min-h-[100svh] overflow-hidden bg-[#f2b0b5] px-5 pb-14 pt-24">
          <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
            <span className="whitespace-nowrap font-primary text-[26vw] uppercase leading-none tracking-[-0.07em] text-[#10110f] lg:text-[16vw]">BRANDWORKS</span>
          </div>
          <div className="relative mx-auto mt-10 h-[min(78svh,500px)] min-h-[430px] w-full max-w-[430px]">
            {heroItems.map(({ reel, image }, index) => {
              const position = [
                'left-0 top-0 h-full w-[67%] -rotate-[6deg]',
                'left-[16.5%] top-0 z-20 h-full w-[67%]',
                'right-0 top-0 h-full w-[67%] rotate-[6deg]',
              ][index]
              return (
                <button key={reel.id} type="button" className={`absolute ${position}`} onClick={(event) => onOpen(reel, event.currentTarget)} aria-label={`View ${reel.caption}`}>
                  <span className={`block h-full w-full overflow-hidden rounded-[20px] bg-[#ddd] ${index === 1 ? '' : 'shadow-[0_22px_55px_rgba(16,17,15,0.18)]'}`}>
                    <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="relative z-30 -mt-10">
            {/* <p className="mb-2 text-[11px] font-semibold text-[#10110f]">Social media agency</p> */}
            <h1 className="font-primary text-[16vw] uppercase leading-[0.75] tracking-[-0.06em] text-[#10110f] lg:text-[8vw]">
              Human<br /><span className={textHighlight}>Social Club.</span>
            </h1>
          </div>
        </div>

        <div className="bg-[#f2b0b5] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[6vw]">We are the<br />current,</h2>
          {playlist.length > 0 && (
            <div className="mx-auto my-10 aspect-[9/16] w-full max-w-[281.25px]">
              <HeroVideoPlayer reels={playlist} autoPlayInView />
            </div>
          )}
          <h2 className="text-right font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] text-[#10110f] lg:text-[7vw]">You are<br /><span className={textHighlight}>the story.</span></h2>
        </div>

        <div className="bg-[#c9dc2f] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[11vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[5vw]">We electrify<br /><span className={`${textHighlight} mt-[0.12em]`}>your networks,</span></h2>
          <p className="mt-6 max-w-[420px] text-[14px] leading-[1.55] text-[#10110f]/75">
            Social is not a few posts a week. It&apos;s a story to tell, a strategy to build and an image to live up to.
          </p>
          <div className="mt-10 flex justify-center">
            <TeamHoverCard image={teamPhoto} className="h-[min(78svh,500px)] w-full max-w-[420px]" />
          </div>
        </div>

        <div className="bg-[#e9e2d8] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.76]  lg:text-[10rem]">We make<br />them social.</h2>
          <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
            {storyGroups.map((group) => (
              <StoryGroupCard key={group.id} group={group} active onOpen={onOpen} className="h-[min(78svh,500px)] w-[82vw] max-w-[380px] snap-center" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
 
function ExpertiseSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [showCaseCard, setShowCaseCard] = useState(true)
  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-expertise-card]', section)
      const panels = gsap.utils.toArray<HTMLElement>('[data-expertise-panel]', section)
      const emojiSticker = section.querySelector<HTMLElement>('[data-expertise-emoji]')
      if (cards.length < 2 || panels.length !== cards.length) return
      cards.forEach((card, index) => {
        gsap.set(card, {
          zIndex: cards.length - index,
          xPercent: index === 0 ? 0 : 5 + index * 2.5,
          yPercent: index === 0 ? 0 : 5 + index * 2,
          scale: index === 0 ? 1 : 0.96 - index * 0.025,
          rotate: index === 0 ? 0 : index % 2 ? 1.8 : -1.4,
          filter: index === 0 ? 'brightness(1)' : `brightness(${0.92 - index * 0.05})`,
          transformOrigin: '50% 88%',
          force3D: true,
          willChange: 'transform, filter',
        })
      })
      panels.forEach((panel, index) => {
        gsap.set(panel, {
          autoAlpha: index === 0 ? 1 : 0,
          y: index === 0 ? 0 : 22,
          pointerEvents: index === 0 ? 'auto' : 'none',
        })
      })
      if (emojiSticker) {
        gsap.set(emojiSticker, { rotate: -7, transformOrigin: '50% 50%' })
      }
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      })
      cards.slice(0, -1).forEach((currentCard, index) => {
        const nextCard = cards[index + 1]
        const currentPanel = panels[index]
        const nextPanel = panels[index + 1]
        const position = index
        timeline
          .to(nextCard, { zIndex: 20 + index, xPercent: 0, yPercent: 0, scale: 1, rotate: 0, filter: 'brightness(1)', duration: 0.82, ease: 'power2.out' }, position)
          .to(currentCard, { xPercent: 7 + index * 1.5, yPercent: -5 - index * 1.2, scale: 0.94 - index * 0.015, rotate: index % 2 ? -1.8 : 1.8, filter: 'brightness(0.82)', duration: 0.82, ease: 'power2.out' }, position)
          .to(currentPanel, {
            autoAlpha: 0,
            y: -16,
            duration: 0.2,
            ease: 'power2.out',
            onStart: () => { currentPanel.style.pointerEvents = 'none' },
            onReverseComplete: () => { currentPanel.style.pointerEvents = 'auto' },
          }, position + 0.06)
          .to(nextPanel, {
            autoAlpha: 1,
            y: 0,
            duration: 0.34,
            ease: 'power3.out',
            onStart: () => { nextPanel.style.pointerEvents = 'auto' },
            onReverseComplete: () => { nextPanel.style.pointerEvents = 'none' },
          }, position + 0.3)
        if (index > 0) {
          timeline.to(cards[index - 1], { xPercent: 11 + index * 1.5, yPercent: -8 - index, scale: 0.89, filter: 'brightness(0.7)', duration: 0.82, ease: 'power2.out' }, position)
        }
        if (emojiSticker) {
          timeline
            .to(emojiSticker, { y: -5, rotate: index % 2 ? -3 : -11, scale: 1.045, duration: 0.26, ease: 'power2.out' }, position + 0.22)
            .to(emojiSticker, { y: 0, rotate: -7, scale: 1, duration: 0.32, ease: 'power2.inOut' }, position + 0.5)
        }
      })
      return () => {
        gsap.set(cards, { clearProps: 'willChange,filter' })
      }
    })
    return () => mm.revert()
  }, { scope: sectionRef })
  return (
    <section ref={sectionRef} className="bwsm-expertise" id="social-expertise" aria-labelledby="bwsm-expertise-title">
      <div className="bwsm-expertise__sticky">
        <div className="bwsm-expertise__intro">
          <Label>Our expertise</Label>
          <h2 id="bwsm-expertise-title">
            Reasoning<br />
            to better:<br />
            <span className="bwsm-expertise__resonating">resonating.</span>
          </h2>
          <span className="bwsm-expertise__emoji-sticker bwsm-emoji-bubble bwsm-emoji-float" data-expertise-emoji aria-hidden="true">
            <AppleEmoji name="camera" />
            <AppleEmoji name="phone" />
            <AppleEmoji name="chart" />
          </span>
        </div>
        <div className="bwsm-expertise__deck">
          {expertise.map((item) => (
            <figure key={item.title} data-expertise-card>
              <img src={item.image} alt="" loading="lazy" />
              <figcaption>{item.title}</figcaption>
            </figure>
          ))}
        </div>
        <div className="bwsm-expertise__details">
          {expertise.map((item, index) => (
            <article key={item.title} data-expertise-panel>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <ul>{item.services.map((service) => <li key={service}>{service}</li>)}</ul>
            </article>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {showCaseCard ? (
            <motion.aside
              key="case-card"
              className="bwsm-case-card"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '120%', opacity: 0 }}
              transition={{ duration: 0.42, ease: EASE }}
              drag="x"
              dragSnapToOrigin
              dragConstraints={{ left: 0, right: 220 }}
              dragElastic={{ left: 0, right: 0.35 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 500) setShowCaseCard(false)
              }}
            >
              <button type="button" className="bwsm-case-card__close" aria-label="Dismiss project note" onClick={() => setShowCaseCard(false)}>
                ×
              </button>
              <span>What we build</span>
              <strong>Connected<br />brand presence.</strong>
              <div className="bwsm-case-card__footer">
                <a href="#social-process">See the method <Arrow /></a>
                <span aria-hidden="true">Drag right →</span>
              </div>
            </motion.aside>
          ) : (
            <motion.button
              key="case-card-restore"
              type="button"
              className="bwsm-case-card__restore"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              onClick={() => setShowCaseCard(true)}
            >
              Show note <span aria-hidden="true">←</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-process-card]', section)
      gsap.set(cards, { zIndex: (index) => index + 1 })
      gsap.set(cards.slice(1), { yPercent: 115, rotate: (index) => index % 2 ? 2 : -2 })
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
      })
      cards.slice(1).forEach((card, index) => {
        timeline
          .to(cards[index], { y: index * -10, scale: 0.96 - index * 0.008, duration: 0.8 }, index)
          .to(card, { yPercent: 0, rotate: 0, duration: 0.8, ease: 'power2.out' }, index)
      })
    })
    return () => mm.revert()
  }, { scope: sectionRef })
  return (
    <section ref={sectionRef} className="bwsm-process" id="social-process" aria-labelledby="bwsm-process-title">
      <div className="bwsm-process__sticky">
        <div className="bwsm-process__intro">
          <h2 id="bwsm-process-title">
            We will<br />always prefer<br /><span>this order.</span>
          </h2>
        </div>
        <div className="bwsm-process__deck">
          {processSteps.map(([number, title, description], index) => (
            <article key={number} data-process-card className={index % 2 ? 'is-dark' : 'is-lime'}>
              <span>{title}</span>
              <strong>{number}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="bwsm-process__note">
          <strong>A clear, structured process.</strong>
          <p>Every post has a reason to exist, a consistent visual system and a lesson for what comes next.</p>
        </div>
      </div>
    </section>
  )
}

function WhySection() {
  const sectionRef = useRef<HTMLElement>(null)
  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    gsap.from('[data-why-card]', {
      yPercent: 110,
      rotate: (index) => [-5, 2, 5][index] ?? 0,
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'center center', scrub: 0.75 },
    })
  }, { scope: sectionRef })
  return (
    <section ref={sectionRef} className="bwsm-why" aria-labelledby="bwsm-why-title">
      <h2 id="bwsm-why-title">Why choose<br />BrandWorks?</h2>
      <div className="bwsm-why__cards">
        {[
          ['Social specialists', 'Strategy and production live in the same room.'],
          ['Made for you', 'No copy-paste calendars or borrowed brand voices.'],
          ['One clear method', 'Creative decisions tied back to a measurable purpose.'],
        ].map(([title, copy]) => (
          <article key={title} data-why-card><h3>{title}</h3><p>{copy}</p></article>
        ))}
      </div>
      <Link to="/contact" className="bwsm-why__cta">Start a conversation <Arrow /></Link>
    </section>
  )
}

function useSocialMediaMetadata(siteUrl?: string) {
  useEffect(() => {
    const previousTitle = document.title
    const title = 'Social Media & Content Strategy | BrandWorks'
    const description = 'Strategic social media, content, reels and community management built as one connected brand system.'
    document.title = title
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = meta?.content
    const descriptionTag = meta ?? document.createElement('meta')
    descriptionTag.name = 'description'
    descriptionTag.content = description
    if (!meta) document.head.appendChild(descriptionTag)
    let canonical: HTMLLinkElement | null = null
    try {
      if (siteUrl) {
        const origin = new URL(siteUrl).origin
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        canonical.href = `${origin}/services/social-media`
        document.head.appendChild(canonical)
      }
    } catch {
      canonical = null
    }
    return () => {
      document.title = previousTitle
      if (meta && previousDescription !== undefined) meta.content = previousDescription
      else descriptionTag.remove()
      canonical?.remove()
    }
  }, [siteUrl])
}

export default function SocialMediaPage({ siteUrl }: { siteUrl?: string }) {
  const [viewer, setViewer] = useState<ViewerSelection | null>(null)
  const openReel = useCallback((reel: SocialReel, trigger: HTMLElement) => setViewer({ reel, trigger }), [])
  const dismissViewer = useCallback(() => setViewer(null), [])
  useSocialMediaMetadata(siteUrl)
  return (
    <main className="bwsm-page">
      <ProjectRail onOpen={openReel} />
      <ExpertiseSection />
      <ProcessSection />
      <WhySection />
      {viewer && <ReelViewer selection={viewer} onDismiss={dismissViewer} />}
    </main>
  )
}