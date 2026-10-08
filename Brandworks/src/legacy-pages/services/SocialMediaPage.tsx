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
import { Link } from '../../routing'
import { useNativeMetadata } from '../../routing/context'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { SOCIAL_REELS, type SocialReel } from '../../data/socialMedia'
import { socialCaseOfMonth } from '../../data/socialMediaPage'
import { mediaUrl } from '../../lib/media'
import { assetUrl } from '../../lib/assetUrl'
import SocialFAQ from '../../components/social/SocialFAQ'
import SocialContact from '../../components/social/SocialContact'
import SocialCaseCard from '../../components/social/SocialCaseCard'
import impactStarImport from '../../assets/Asset 23.svg'
import '@fontsource/anton/latin-400.css'
import './SocialMediaPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)
const impactStarAsset = assetUrl(impactStarImport)
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
type StoryGroup = { id: string; title: string; description: string; reels: SocialReel[] }
type StoryPreviewSelection = { group: StoryGroup; trigger: HTMLElement }

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
function Hl({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span data-hl className="absolute inset-0 origin-left" aria-hidden="true" />
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
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.05-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6Z" />
    </svg>
  ),

  Pause: () => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
    </svg>
  ),

  Volume: () => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
        fill="currentColor"
      />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18.3 6.5a8 8 0 0 1 0 11" />
    </svg>
  ),

  Muted: () => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
        fill="currentColor"
      />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </svg>
  ),

  Heart: ({ filled }: { filled: boolean }) => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-red-500"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.2s-7.6-4.6-7.6-10.1A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.6 2.7c0 5.5-7.6 10.1-7.6 10.1Z" />
    </svg>
  ),

  Arrow: ({ dir }: { dir: 'left' | 'right' }) => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white/30 p-[10px] text-white backdrop-blur-sm"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          dir === 'left'
            ? 'M19 12H5m6-6-6 6 6 6'
            : 'M5 12h14m-6-6 6 6-6 6'
        }
      />
    </svg>
  ),

  Chevron: ({ dir }: { dir: 'left' | 'right' }) => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'}
      />
    </svg>
  ),

  Send: () => (
    <svg
      viewBox="0 0 24 24"
      className="size-[40px] rounded-full bg-white p-[10px] text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true" >
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
const COVER_OFFSET = 60 // px past the covered card's right edge where the arriving sliver starts
const COVER_SHRINK = 0.45 // how much smaller the arriving card starts; it grows to the full card size as it lands
const COVER_TURN = 86 // degrees it starts turned: an almost edge-on sliver, left edge toward the viewer

/**
 * One card covers the other: a positive angle means "still waiting on the right", it slides in
 * small (1 - COVER_SHRINK of full size) and as an almost edge-on sliver just outside the covered card's right edge (half its width + COVER_OFFSET
 * to the right, turned COVER_TURN° with its left edge showing), then swings flat and slides over it
 * as the angle falls to 0; a negative angle means "being covered": the card
 * stays where it is and only settles back a touch. Angles are kept from the old cylinder
 * timeline so scrubbing, refreshes and eases keep working unchanged.
 */
function setCover(el: HTMLElement, angle: number, baseX = 0, offset = COVER_OFFSET) {
  if (angle > 0) {
    const p = Math.min(1, angle / CYL_ANGLE)
    gsap.set(el, { rotateY: p * COVER_TURN, x: baseX + p * (el.offsetWidth / 2 + offset), z: 0, yPercent: 0, rotation: 0, scale: 1 - p * COVER_SHRINK })
  } else {
    const p = Math.min(1, -angle / CYL_ANGLE)
    gsap.set(el, { rotateY: 0, x: baseX, z: 0, yPercent: 0, rotation: 0, scale: 1 })
  }
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

  const swap = useCallback((_dir: 1 | -1, poster: string | undefined, commit: () => void) => {
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
    const outShade = out.querySelector('[data-cyl-shade]')
    const incShade = inc.querySelector('[data-cyl-shade]')
    const D = 0.95
    gsap.set([out, inc], { transformOrigin: '50% 50%', transformPerspective: CYL_PERSPECTIVE, force3D: true })
    const turn = { a: 0 } // 0 → 1 over the swap
    const place = () => {
      setCover(out, -CYL_ANGLE * turn.a)
      setCover(inc, CYL_ANGLE * (1 - turn.a))
    }
    const tl = gsap.timeline({
      defaults: { duration: D, ease: CYL_EASE },
      onComplete: () => {
        commit()
        // let React swap the <video> source before the poster face is removed
        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.set(out, { rotateY: 0, x: 0, z: 0, yPercent: 0, rotation: 0, scale: 1, autoAlpha: 1 })
          gsap.set(inc, { autoAlpha: 0, rotateY: 0, x: 0, z: 0, yPercent: 0, rotation: 0, scale: 1 })
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

/** A quiet Instagram-style story change: cover with the next poster, swap
 * the existing media, swap its source, then reveal it. No permanent overlay
 * or 3D card movement is involved. */
function useInstagramStorySwap() {
  const outRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const reduced = Boolean(useReducedMotion())

  useEffect(() => () => {
    if (outRef.current) {
      gsap.killTweensOf(outRef.current)
      gsap.set(outRef.current, { autoAlpha: 1 })
    }
    busy.current = false
  }, [])

  const swap = useCallback((_dir: 1 | -1, _poster: string | undefined, commit: () => void) => {
    const media = outRef.current
    if (busy.current) return
    if (reduced || !media) { commit(); return }

    busy.current = true
    gsap.killTweensOf(media)
    gsap.timeline({
      onComplete: () => {
        gsap.set(media, { autoAlpha: 1 })
        busy.current = false
      },
    })
      .to(media, { autoAlpha: 0, duration: 0.12, ease: 'power1.out' })
      .call(commit)
      // Give React one short beat to replace the underlying video source.
      .to({}, { duration: 0.04 })
      .to(media, { autoAlpha: 1, duration: 0.2, ease: 'power1.inOut' })
  }, [reduced])

  return { outRef, swap }
}

/** Poster face used while either media-swap mode changes clips. */
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
        className="absolute bottom-5 left-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#fff] transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {playing ? <Icon.Pause /> : <Icon.Play />}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        aria-pressed={!muted}
        className="absolute bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#075f38] transition-transform duration-200 hover:scale-105 active:scale-95"
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
            <span className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 size-3 rounded-full bg-[#cb2486] opacity-0 shadow-[0_0_0_6px_rgba(219,49,136,.14)] transition-opacity duration-200 group-hover/member:opacity-100 group-focus-visible/member:opacity-100" />
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

// The reference rail contains four projects followed by the final CTA.
const STORY_GROUP_COUNT = 4
const STORY_RAIL_BACKGROUNDS = ['#2f89b4', '#b3bdc3', '#424524', '#dc9e06', '#e993bc'] as const
const STORY_PROJECT_TITLES = ['YELLOW!\nVILLAGE', 'SOLTY HOTEL', "THE\nSHEPHERD'S\nBAG", 'GRANDMA'] as const
const STORY_PROJECT_DESCRIPTIONS = [
  'A bright social world built around personality, movement and the people behind the project.',
  'Editorial hospitality stories shaped through product details, atmosphere and a distinctive point of view.',
  'A tactile campaign language connecting craftsmanship, character and everyday moments.',
  'Warm, human storytelling made to feel personal, recognizable and alive in the feed.',
] as const

function buildStoryGroups(reels: readonly SocialReel[]): StoryGroup[] {
  if (!reels.length) return []
  const perGroup = Math.min(4, reels.length)
  return Array.from({ length: STORY_GROUP_COUNT }, (_, groupIndex) => {
    const size = groupIndex % 2 ? Math.min(3, perGroup) : perGroup
    return {
      id: `story-group-${groupIndex}`,
      title: STORY_PROJECT_TITLES[groupIndex] ?? `PROJECT ${pad2(groupIndex + 1)}`,
      description: STORY_PROJECT_DESCRIPTIONS[groupIndex] ?? 'A connected collection of social stories, reels and campaign moments.',
      reels: Array.from({ length: size }, (_, k) => reels[(groupIndex * 2 + k) % reels.length]),
    }
  })
}

function StoryGroupCard({
  group,
  active,
  passed = false,
  onOpen,
  onPreview,
  className = 'h-[min(72svh,720px)] w-[clamp(280px,23vw,410px)]',
  caption,
}: {
  group: StoryGroup
  active: boolean
  passed?: boolean
  onOpen: (reel: SocialReel, trigger: HTMLElement) => void
  onPreview: (group: StoryGroup, trigger: HTMLElement) => void
  className?: string
  caption?: { title: string; tags: readonly string[] }
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
  const {
    outRef: storyOutRef,
    swap: swapStory,
  } = useInstagramStorySwap()
  const shouldPlay = active && inView
  const shouldPlayRef = useRef(shouldPlay)
  const wasActiveRef = useRef(active)
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

  // A rail card activates at the rail's handoff point. Restart its own
  // sequence at that moment, like opening a fresh Instagram story.
  useBrowserLayoutEffect(() => {
    const justActivated = active && !wasActiveRef.current
    wasActiveRef.current = active
    if (!justActivated) return

    barRefs.current.forEach((bar) => {
      if (bar) bar.style.transform = 'scaleX(0)'
    })

    if (index !== 0) {
      setStatus('loading')
      setIndex(0)
      return
    }

    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      if (inView) video.play().catch(() => undefined)
    }
  }, [active, index, inView])

  // progress bars: done = full, upcoming = empty, current = live
  useBrowserLayoutEffect(() => {
    barRefs.current.forEach((bar, i) => {
      if (bar) bar.style.transform = `scaleX(${i < index ? 1 : 0})`
    })
  }, [index])

  useEffect(() => {
    if (!shouldPlay) return
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const bar = barRefs.current[index]
      if (video && bar) bar.style.transform = `scaleX(${video.duration ? video.currentTime / video.duration : 0})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, shouldPlay])

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
    swapStory(dir, group.reels[next]?.poster, () => {
      setStatus('loading')
      setIndex(next)
    })
  }, [index, count, group.reels, swapStory])

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
      <div ref={storyOutRef} className="absolute inset-0 [backface-visibility:hidden]">
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />

      {/* Project title stays visible while the neighbouring cards travel past. */}
      <h3 className={`bwsm-story-title pointer-events-none absolute inset-x-4 z-30 whitespace-pre-line text-center text-[clamp(25px,2.4vw,44px)] uppercase leading-[0.82] tracking-[-0.045em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.28)] transition-[top,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/story:scale-[1.025] ${passed ? 'top-[calc(100%-1.25rem)] -translate-y-full' : 'top-9 translate-y-0'}`}>
        {group.title}
      </h3>

      {/* progress segments */}
      <div
        className={`pointer-events-none absolute inset-x-3 top-3 z-30 flex gap-1 transition-[transform,opacity,gap] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover/story:gap-1.5 ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        aria-hidden="true"
      >
        {group.reels.map((item, i) => (
          <span key={`${item.id}-${i}`} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30 transition-[height,background-color] duration-300 group-hover/story:h-[3.5px] group-hover/story:bg-white/45">
            <span
              ref={(el) => { barRefs.current[i] = el }}
              className="block h-full w-full origin-left rounded-full bg-white transition-transform duration-100 ease-linear will-change-transform"
            />
          </span>
        ))}
      </div>

      {/* Service chips rise in at the same 10% overlap point as playback. */}
      {caption && (
        <div
          data-story-caption
          aria-label={`${group.title.replace(/\n/g, ' ')}: ${caption.tags.join(', ')}`}
          className={`pointer-events-none absolute bottom-4 right-4 z-30 flex max-w-[72%] flex-col items-end gap-1 text-right transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${active ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
        >
          <ul className="flex flex-col items-end gap-1 text-[clamp(8px,0.62vw,10px)] font-bold leading-none text-[#cb2486]">
            {caption.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-[#fff8f6] px-2.5 py-1 shadow-[0_5px_16px_rgba(0,0,0,.14)]">
                {tag}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {/* Open the complete project story board. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onPreview(group, event.currentTarget)
        }}
        aria-label={`Open all ${group.title.replace(/\n/g, ' ')} stories`}
        className="group/preview absolute bottom-4 left-[4.5rem] z-40 grid size-12 place-items-center rounded-full bg-[#fff8f6] text-[#d72585] shadow-[0_10px_26px_rgba(0,0,0,.18)] transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span className="absolute h-[2px] w-[16px] rounded-full bg-current" />
        <span className="absolute h-[16px] w-[2px] rounded-full bg-current transition-transform duration-300 group-hover/preview:rotate-90" />
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
          style={{ backgroundColor: 'rgba(25, 255, 5, 0.01)', color: '#fff' }}
        >
          <Icon.Arrow dir={dir} />
        </button>
      ))}
    </article>
  )
}

function StoryProjectPreview({
  selection,
  groups,
  onDismiss,
}: {
  selection: StoryPreviewSelection
  groups: StoryGroup[]
  onDismiss: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const modalLenisRef = useRef<Lenis | null>(null)
  const [open, setOpen] = useState(true)
  const [activeId, setActiveId] = useState(selection.group.id)
  const reduced = Boolean(useReducedMotion())
  const [mediaReady, setMediaReady] = useState(reduced)
  const activeGroup = groups.find((group) => group.id === activeId) ?? selection.group
  const groupIndex = Math.max(0, groups.findIndex((group) => group.id === activeGroup.id))
  const background = STORY_RAIL_BACKGROUNDS[groupIndex] ?? STORY_RAIL_BACKGROUNDS[0]
  const foreground = groupIndex === 1 || groupIndex === 3 ? '#10110f' : '#fffaf7'

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

  useEffect(() => {
    if (reduced) return
    const timer = window.setTimeout(() => setMediaReady(true), 560)
    return () => window.clearTimeout(timer)
  }, [activeId, reduced])

  useEffect(() => {
    if (!open || reduced) return
    const wrapper = scrollRef.current
    const content = contentRef.current
    if (!wrapper || !content) return

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
    })
    modalLenisRef.current = lenis
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      modalLenisRef.current = null
    }
  }, [open, reduced])

  const selectGroup = (group: StoryGroup) => {
    if (!reduced) setMediaReady(false)
    setActiveId(group.id)
    if (modalLenisRef.current) modalLenisRef.current.scrollTo(0, { duration: 0.7 })
    else scrollRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-transparent"
      aria-labelledby="bwsm-project-preview-title"
      data-lenis-prevent="true"
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}
    >
      <AnimatePresence onExitComplete={onDismiss}>
        {open && (
          <motion.div
            ref={scrollRef}
            className="fixed inset-0 overflow-y-auto overscroll-contain transition-colors duration-500 [will-change:transform,opacity]"
            style={{ backgroundColor: background, color: foreground }}
            initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.985, borderRadius: reduced ? 0 : 30 }}
            animate={{ opacity: 1, scale: 1, borderRadius: 0 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 1.012, borderRadius: reduced ? 0 : 30 }}
            transition={{ duration: reduced ? 0 : 0.58, ease: EASE }}
          >
            <div ref={contentRef} className="min-h-full">
            <div className="pointer-events-none fixed inset-x-0 top-0 z-[3] flex items-start justify-between p-[clamp(18px,2vw,36px)]">
              <span className="grid size-11 place-items-center rounded-full bg-[#f7e0dd] font-primary text-[14px] font-bold text-[#cb2486] shadow-[0_8px_24px_rgba(0,0,0,.12)]">BW</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close project stories"
                className="pointer-events-auto relative grid size-[clamp(50px,4vw,68px)] place-items-center rounded-full bg-[#e993bc] text-[#055c2c] shadow-[0_10px_30px_rgba(0,0,0,.14)] transition-transform duration-300 hover:rotate-90 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="absolute h-[2px] w-5 rotate-45 rounded-full bg-current" />
                <span className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current" />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeGroup.id}
                className="mx-auto grid min-h-[100svh] w-full max-w-[1760px] gap-10 px-[clamp(22px,5vw,96px)] pb-16 pt-[clamp(105px,13vh,150px)] lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.5fr)] lg:gap-[clamp(50px,7vw,130px)]"
                initial={{ y: reduced ? 0 : 28, opacity: reduced ? 1 : 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: reduced ? 0 : -18, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.48, ease: EASE }}
              >
              <aside className="self-start lg:sticky lg:top-[18svh]">
                <span className="inline-flex rounded-full bg-[#f7e0dd] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#cb2486]">Social case</span>
                <h2 id="bwsm-project-preview-title" className="bwsm-story-title mt-5 whitespace-pre-line text-[clamp(58px,7.2vw,138px)] uppercase leading-[0.76] tracking-[-0.055em]">
                  {activeGroup.title}
                </h2>
                <p className="mt-6 max-w-[42ch] text-[clamp(14px,1.05vw,18px)] font-semibold leading-[1.5] opacity-85">{activeGroup.description}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {socialCaseOfMonth.tags.map((tag) => <span key={tag} className="rounded-full border border-current/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em]">{tag}</span>)}
                </div>
              </aside>

              <div className="grid grid-cols-1 items-start gap-[clamp(18px,2vw,34px)] sm:grid-cols-2">
                {activeGroup.reels.map((story, storyIndex) => (
                  <article key={`${activeGroup.id}-${story.id}-${storyIndex}`} className={storyIndex % 3 === 1 ? 'sm:translate-y-[14svh]' : ''}>
                    <div className="aspect-[9/16] overflow-hidden rounded-[clamp(18px,1.5vw,28px)] bg-black/15 shadow-[0_22px_60px_rgba(0,0,0,.16)]">
                      {mediaReady ? (
                        <MediaFrame reel={story} />
                      ) : story.poster ? (
                        <img src={story.poster} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="block h-full w-full animate-pulse bg-black/10" aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-3 rounded-[clamp(16px,1.2vw,22px)] bg-black/15 p-[clamp(18px,2vw,30px)] backdrop-blur-sm">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">Story {pad2(storyIndex + 1)}</span>
                      <h3 className="mt-3 font-primary text-[clamp(28px,2.6vw,48px)] uppercase leading-[0.86]">{story.caption}</h3>
                      <p className="mt-4 text-[12px] font-semibold leading-[1.5] opacity-75">A platform-native moment from the {activeGroup.title.replace(/\n/g, ' ')} story system, designed to work on its own and as part of the complete campaign.</p>
                    </div>
                  </article>
                ))}
              </div>
              </motion.div>
            </AnimatePresence>

            <div className="mx-auto w-full max-w-[1760px] px-[clamp(22px,5vw,96px)] pb-[clamp(70px,10vh,120px)] pt-12">
              <p className="font-primary text-[clamp(38px,5vw,86px)] uppercase leading-[0.8]">Explore other projects</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {groups.map((group, index) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => selectGroup(group)}
                    aria-pressed={group.id === activeGroup.id}
                    className="group flex items-center gap-3 rounded-full border border-current/25 py-2 pl-2 pr-4 text-left transition-[background-color,transform] duration-300 hover:-translate-y-1 aria-pressed:bg-[#cb2486] aria-pressed:text-white"
                  >
                    <span className="size-12 overflow-hidden rounded-full bg-black/15">
                      {group.reels[0]?.poster ? <img src={group.reels[0].poster} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.05em]">{group.title.replace(/\n/g, ' ')}</span>
                    <span className="grid size-7 place-items-center rounded-full bg-[#e993bc] text-[#055c2c] transition-transform duration-300 group-hover:rotate-90">+</span>
                  </button>
                ))}
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
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
const LAST_CARD_STOP = 0 // final CTA locks at the same centered position as every story card
const MORE_PROJECTS_REVEAL = 76
// The incoming story takes control after crossing 10% into the current
// card. Its movement continues independently until it reaches the lock.
const STORY_ACTIVATION_OVERLAP = 0.1

const STAGE_VARS = { '--slot-h': 'min(73svh, 700px)', '--slot-w': 'calc(var(--slot-h) * 0.665)' } as CSSProperties
const SLOT: CSSProperties = { position: 'absolute', width: 'var(--slot-w)', height: 'var(--slot-h)', left: 'calc(50% - var(--slot-w) / 2)', top: 'calc(50% - var(--slot-h) / 2)' }
const RAIL_ITEM: CSSProperties = { position: 'absolute', width: 'var(--slot-w)', height: 'var(--slot-h)', left: 0, top: 'calc(50% - var(--slot-h) / 2)' }

function ProjectRail({ onOpen }: { onOpen: (reel: SocialReel, trigger: HTMLElement) => void }) {
  const desktopRef = useRef<HTMLDivElement>(null)
  const [railIndex, setRailIndex] = useState(0)
  const [projectPreview, setProjectPreview] = useState<StoryPreviewSelection | null>(null)

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
  const railEnd = RAIL_START + FIRST_STORY_TURN + (railCount - 1) * PER_CARD
  const total = railEnd + MORE_PROJECTS_REVEAL + 40

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
      const impactGateway = q<HTMLElement>('[data-impact-gateway]')
      const flowHeroBack = q('[data-flow="hero-back"]')
      const flowHeroCopy = q('[data-flow="hero-copy"]')
      const flowPinkL = q('[data-flow="pink-left"]')
      const flowPinkR = q('[data-flow="pink-right"]')
      const flowElectricL = q('[data-flow="electric-left"]')
      const flowElectricR = q('[data-flow="electric-right"]')
      const flowSocial = q('[data-flow="social"]')
      const socialMeta = qa('[data-flow="social"] [data-social-fade]')
      const video = q<HTMLVideoElement>('[data-social-takeover-video]')

      if (!stage || !railBg || !stageBg || !backdrop || shells.length < 3 || !flipFront || !flipBack || !teamCard || !railItems.length || !impactGateway) return

      const centerShell = shells[1]
      const leftShell = shells[0]
      const backCard = shells[2] // reused as the card peeking behind the team card
      const cardW = () => teamCard.offsetWidth
      const cylFace = { transformOrigin: '50% 50%', transformPerspective: CYL_PERSPECTIVE, force3D: true }
      // each cylinder face keeps its own angle; `base` is its resting x (only the first story has one)
      const cylAngle = new Map<HTMLElement, { a: number; base: () => number; z?: number; offset?: number }>()
      const placeOnCylinder = (el: HTMLElement) => {
        const st = cylAngle.get(el)
        if (!st) return
        setCover(el, st.a, st.base(), st.offset)
        // the card that is arriving always sits on top of the one it covers
        if (st.z) gsap.set(el, { zIndex: st.z + (st.a > 0 ? 20 : st.a === 0 ? 10 : 0) })
      }
      const firstStory = railItems[0]
      const restItems = railItems.slice(1) // these still slide in from the right

      /* ---------- initial state ---------- */
      gsap.set(stageBg, { backgroundColor: WHITE })
      gsap.set(railBg, { backgroundColor: STORY_RAIL_BACKGROUNDS[0] })
      gsap.set(shells, { transformOrigin: '50% 50%', force3D: true })
      gsap.set(centerShell, { scale: 1, zIndex: 30 })
      gsap.set(leftShell, { x: () => -centerShell.offsetWidth * 0.785, y: 8, scale: 0.77, rotation: -3.2, zIndex: 10 })
      gsap.set(backCard, { x: () => centerShell.offsetWidth * 0.8, y: -4, scale: 0.77, rotation: 3, zIndex: 10 })
      // photo, video, team card and first story all sit on the same cylinder
      gsap.set(flipFront, { ...cylFace, pointerEvents: 'auto' })
      gsap.set(flipBack, { ...cylFace, autoAlpha: 0, pointerEvents: 'none' })
      gsap.set(teamCard, { ...cylFace, autoAlpha: 0 })
      gsap.set(firstStory, { ...cylFace, autoAlpha: 0 })
      cylAngle.set(flipFront, { a: 0, base: () => 0, z: 1 })
      cylAngle.set(flipBack, { a: CYL_ANGLE, base: () => 0, z: 2 })
      cylAngle.set(teamCard, { a: CYL_ANGLE, base: () => 0 })
      // Preserve the original cover turn; only its starting edge receives a
      // larger gap from the old photo.
      cylAngle.set(firstStory, { a: CYL_ANGLE, base: () => geom.x0, offset: 96 })
      // These cards are measured and positioned from page load, but must not
      // leak into the hero before the stories chapter begins.
      gsap.set(restItems, {
        transformOrigin: '0% 50%',
        transformPerspective: 1600,
        force3D: true,
        autoAlpha: 0,
        pointerEvents: 'none',
      })
      gsap.set(impactGateway, {
        scaleX: 0,
        scaleY: 0,
        transformOrigin: '50% 50%',
        force3D: true,
      })

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
      const geom = { vw: 0, W: 0, x0: 0, gap: 14, entryGap: 96, natural: [] as number[], max: 0 }
      const measure = () => {
        geom.vw = stage.clientWidth
        geom.W = cardW()
        geom.x0 = (geom.vw - geom.W) / 2
        geom.entryGap = gsap.utils.clamp(56, 120, geom.vw * 0.075)
        // Keep the remaining projects attached to the active card as one
        // continuous rail. The next card is already visible beside it and
        // begins moving immediately, matching the reference transition.
        geom.natural = restItems.map((_, k) => geom.x0 + geom.W + geom.gap + k * (geom.W + geom.gap))
        const firstStoryState = cylAngle.get(firstStory)
        if (firstStoryState) firstStoryState.offset = geom.entryGap
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
      let restActivated = 0
      let lastActive = -1
      const updateActive = () => {
        const active = firstShown ? 1 + restActivated : 0
        if (active !== lastActive) {
          lastActive = active
          setRailIndex(active)
          // Background state follows the same 10% overlap threshold as playback.
          // The last colour belongs to the final "More projects?" card.
          const colourIndex = gsap.utils.clamp(0, STORY_RAIL_BACKGROUNDS.length - 1, Math.max(0, active - 1))
          gsap.to(railBg, {
            backgroundColor: STORY_RAIL_BACKGROUNDS[colourIndex],
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      }
      const layoutRail = () => {
        const { vw, W, x0, natural } = geom
        placeOnCylinder(firstStory)
        // While Yellow! Village is still turning in, keep every following
        // card attached to its live visual right edge. This preserves the
        // order [old photo] [Yellow] [Solty] instead of leaving Solty parked
        // at Yellow's eventual destination.
        const stageRect = stage.getBoundingClientRect()
        const yellowRect = firstStory.getBoundingClientRect()
        const attachedOffset = proxy.o <= 0.001 && natural.length
          ? yellowRect.right - stageRect.left - (x0 + W)
          : 0
        let activated = 0
        restItems.forEach((_, k) => {
          const isLast = k === restItems.length - 1
          const lockX = x0 + (isLast ? W * LAST_CARD_STOP : 0)
          const raw = natural[k] - proxy.o + attachedOffset
          const x = Math.max(lockX, raw)
          // Activate after the incoming card has overlapped the current
          // slot by 10%; it can then keep travelling to its final lock.
          const activationX = x0 + W * (1 - STORY_ACTIVATION_OVERLAP)
          if (raw <= activationX) activated = k + 1
          // a little swing while the card enters from the right edge (eased, not linear)
          const t = gsap.parseEase('power2.in')(gsap.utils.clamp(0, 1, (x - vw * 0.55) / (vw * 0.45)))
          setters[k].x(x)
          setters[k].ry(-24 * t)
          setters[k].rz(5 * t)
        })
        restActivated = activated
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
      const cylinder = (out: HTMLElement, inc: HTMLElement, at: number, duration: number, onTurn?: () => void) => {
        const fade = duration * 0.16
        const outState = cylAngle.get(out)!
        const incState = cylAngle.get(inc)!
        const updateTurn = () => {
          placeOnCylinder(out)
          placeOnCylinder(inc)
          onTurn?.()
        }
        tl.fromTo(outState, { a: 0 }, { a: -CYL_ANGLE, duration, ease: 'power2.inOut', immediateRender: false, onUpdate: updateTurn }, at)
        tl.fromTo(incState, { a: CYL_ANGLE }, { a: 0, duration, ease: 'power2.inOut', immediateRender: false, onUpdate: updateTurn }, at)
        // plain .to() fades: they record their start values in timeline order, which keeps
        // scrubbing back and forth (and ScrollTrigger refreshes) clean
        tl.to(inc, { autoAlpha: 1, duration: duration * 0.4, ease: 'none' }, at)
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
      tl.to(stageBg, { backgroundColor: '#cb2486', duration: 74, ease: 'none' }, 58)
      tl.to(leftShell, { x: 0, y: 0, scale: 1, rotation: -2, duration: 55, ease: 'power2.inOut' }, 0)
      tl.to(backCard, { x: 0, y: 0, scale: 1, rotation: 2, duration: 55, ease: 'power2.inOut' }, 0)
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
      tl.to(stageBg, { backgroundColor: '#fff5f3', duration: 82, ease: 'none' }, 225)

      // 5. "We make them social": stack tucks back in, title rises and stays
      tl.to([centerShell, backCard], { x: 0, rotation: 0, duration: 20, ease: 'power2.inOut' }, 380)
      tl.set([centerShell, backCard], { autoAlpha: 0 }, 402)
      flow(flowSocial, 100, 0, 370)
      reveal(flowSocial, 400)
      pop(flowSocial, 414)
      if (socialMeta.length) tl.fromTo(socialMeta, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 18, stagger: 5, ease: 'power2.out' }, 420)
      tl.to(stageBg, { backgroundColor: '#2f89b4', duration: 34, ease: 'none' }, 370)

      // 6. Stories: background deepens, the title turns light so it stays readable
      tl.to(railBg, { backgroundColor: STORY_RAIL_BACKGROUNDS[0], opacity: 1, duration: 18, ease: 'power2.out' }, RAIL_START - 16)
      tl.to(stageBg, { backgroundColor: '#b3bdc3', duration: 18, ease: 'power2.inOut' }, RAIL_START - 16)
      if (flowSocial) tl.to(flowSocial, { color: '#fffaf7', duration: 18, ease: 'power2.inOut' }, RAIL_START - 16)
      //    first story: one cylinder turn off the team card…
      const revealRailFromOverlap = () => {
        // The attached cards must move on the same frame as Yellow's turn.
        layoutRail()
        const oldRect = teamCard.getBoundingClientRect()
        const yellowRect = firstStory.getBoundingClientRect()
        const overlapWidth = Math.max(0, Math.min(oldRect.right, yellowRect.right) - Math.max(oldRect.left, yellowRect.left))
        const overlapRatio = oldRect.width > 0 ? overlapWidth / oldRect.width : 0
        // Solty remains hidden until Yellow covers 5% of the old card, then
        // eases into the attached rail over the following 10%.
        const reveal = gsap.utils.clamp(0, 1, (overlapRatio - 0.05) / 0.1)
        gsap.set(restItems, {
          autoAlpha: reveal,
          pointerEvents: reveal >= 0.98 ? 'auto' : 'none',
        })
      }
      cylinder(teamCard, firstStory, RAIL_START, FIRST_STORY_TURN, revealRailFromOverlap)
      //    …then every other card follows through from the right
      tl.to(proxy, { o: () => geom.max, duration: (railCount - 1) * PER_CARD, ease: 'none', onUpdate: layoutRail }, RAIL_START + FIRST_STORY_TURN)

      // The CTA stays as the final stack card. A separate foreground surface
      // starts at zero in the viewport centre and grows evenly toward all four
      // edges into the next full-screen scene.
      tl.to(impactGateway, {
        scaleX: 1,
        scaleY: 1,
        duration: MORE_PROJECTS_REVEAL,
        ease: 'power4.inOut',
      }, railEnd)

      // video only plays while it's the card on show
      tl.eventCallback('onUpdate', () => {
        // keep every cylinder face exactly where its angle says (both scroll directions)
        cylAngle.forEach((_, el) => { if (el !== firstStory) placeOnCylinder(el) })
        layoutRail()
        // Match the rail handoff: the first story starts near the end of
        // its turn, with the last 10% of movement still completing.
        const shown = tl.time() >= RAIL_START + FIRST_STORY_TURN * (1 - STORY_ACTIVATION_OVERLAP)
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
        gsap.killTweensOf(railBg)
        video?.pause()
        setRailIndex(0)
      }
    })

    return () => mm.revert()
  }, { scope: desktopRef, dependencies: [total, railCount] })

  const visibleStoryGroup = storyGroups[Math.max(0, Math.min(storyGroups.length - 1, railIndex - 1))] ?? storyGroups[0]

  const tiltedSticker = 'bwsm-emoji-bubble bwsm-emoji-float pointer-events-none absolute z-50 rounded-[26px] bg-[#f7e0dd] px-6 py-5 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,0.12)]'
  const flowBox = 'pointer-events-none absolute inset-0 z-[30] will-change-transform'
  const textHighlight = 'inline-block text-[#e993bc]'

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
            <div className="absolute inset-x-0 top-[4svh] flex justify-center">
              <div aria-hidden="true" className="bwsm-hero-type bwsm-hero-type--clash flex origin-top scale-y-[2] whitespace-nowrap text-[clamp(100px,12vw,180px)] uppercase leading-[0.9] tracking-[-0.01em] text-[#055c2c]">
                {'BRANDWORKS'.split('').map((letter, index) => (
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
          <div className="pointer-events-none absolute inset-0 z-[70]">
            {storyGroups.map((group, g) => (
              <div key={group.id} data-rail-item className="pointer-events-auto [will-change:transform]" style={{ ...RAIL_ITEM, zIndex: g + 1, transform: 'translateX(110vw)' }}>
                <StoryGroupCard
                  group={group}
                  active={!projectPreview && railIndex === g + 1}
                  passed={railIndex > g + 1}
                  onOpen={onOpen}
                  onPreview={(selectedGroup, trigger) => setProjectPreview({ group: selectedGroup, trigger })}
                  className="h-full w-full"
                  caption={socialCaseOfMonth}
                />
                <CylShade className="z-10 rounded-[clamp(14px,1.2vw,22px)]" />
              </div>
            ))}
            <div data-rail-item data-more-projects-item className="pointer-events-auto [will-change:transform,width,height]" style={{ ...RAIL_ITEM, zIndex: storyGroups.length + 1, transform: 'translateX(110vw)' }}>
              <a
                data-more-projects-card
                href="#social-process"
                className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[clamp(14px,1.2vw,22px)] bg-[#cb2486] p-8 text-center text-white shadow-[0_20px_60px_rgba(0,0,0,.18)]"
              >
                <span className="relative z-10 flex flex-col items-center">
                  <span className="font-primary text-[clamp(42px,4vw,70px)] uppercase leading-[0.76] tracking-[-0.05em]">More<br />projects?</span>
                  <small className="mt-7 rounded-full bg-white px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#111]">Explore <Arrow /></small>
                </span>
              </a>
            </div>
          </div>

          <div data-impact-gateway aria-hidden="true" className="pointer-events-none absolute inset-0 z-[80] bg-[#cb2486] [will-change:transform]" />

          {/* ---------- text that simply scrolls past ---------- */}
          <div data-flow="hero-copy" className={flowBox}>
            <div data-hero-copy className="absolute bottom-[3.6svh] left-[clamp(20px,2vw,38px)]">
              <p className="mb-[clamp(10px,1.6vw,28px)] text-[clamp(13px,1.15vw,22px)] font-extrabold tracking-[-0.03em] text-[#d0cce2]">Social media agency</p>
              <h1 className="bwsm-hero-type origin-left scale-x-[1.1] text-[clamp(50px,6.3vw,122px)] font-normal uppercase leading-[0.9] tracking-[-0.005em] [word-spacing:0.12em]">
                <Lines lines={[<span key="h" data-hero-human className="text-[#cb2486]">Human</span>, <span key="s" className="text-[#e993bc]">Social Club</span>]} />
              </h1>
            </div>
            {/* <div data-hero-copy className="absolute bottom-[5vh] right-[clamp(28px,3vw,58px)] max-w-[240px] border-t border-black/15 pt-4">
              <p className="text-[12px] font-medium leading-[1.5] text-black/50">Strategy, content and community built around people worth following.</p>
            </div> */}
          </div>

          {/* ---------- We are the current, / You are the story. ---------- */}
          <div data-flow="pink-left" className={`${flowBox} text-[#f7e0dd]`}>
            <span data-pop className="absolute left-[12vw] top-[12vh] block">
              <AppleEmojiRow names={['phone', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float rotate-[5deg] rounded-[26px] bg-[#f7e0dd] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            </span>
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[12vh] max-w-[28vw]">
              <span className="mb-4 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(48px,4.8vw,112px)] uppercase leading-[0.8]">
                <Lines lines={['We are the', <Hl key="c">current</Hl>]} />
              </h2>
            </div>
          </div>
          <div data-flow="pink-right" className={`${flowBox} text-[#e993bc]`}>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[calc(6vh+44px)] max-w-[28vw] text-left">
              <h2 className="font-primary text-[clamp(44px,4vw,76px)] uppercase leading-[0.8]">
                <Lines lines={['You are', <Hl key="s">the story.</Hl>]} />
              </h2>
            </div>
          </div>

          {/* ---------- We electrify your networks, ---------- */}
          <div data-flow="electric-left" className={`${flowBox} text-[#cb2486]`}>
            <span data-pop className="absolute left-[10vw] top-[3vh] block">
              <AppleEmojiRow names={['camera', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float rotate-[6deg] rounded-[26px] bg-[#f7e0dd] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            </span>
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[4vh] max-w-[29vw]">
              <span className="mb-5 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(36px,4vw,90px)] uppercase leading-[0.8] tracking-[-0.025em]">
                <Lines lines={['We', 'electrify your', <Hl key="n" className="text-[#e993bc]">networks,</Hl>]} />
              </h2>
            </div>
          </div>
          <div data-flow="electric-right" className={`${flowBox} text-[#cb2486]`}>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[8vh] max-w-[min(25vw,320px)]">
              <p className="text-[clamp(15px,1.15vw,18px)] font-semibold leading-[1.4] pb-2">
                <Words text="At BrandWorks, we believe social media is not just about publishing a few posts." />
              </p>
              <p data-pop className="mt-6 inline-flex origin-left items-center gap-2 rounded-full bg-[#10110f] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e993bc] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#e993bc]" />
                </span>
                Hover a face to meet the team
              </p>
            </div>
          </div>

          {/* ---------- We make them social ---------- */}
          <div data-flow="social" className={`${flowBox} z-[60] text-white`}>
            <span data-pop className="absolute left-[clamp(170px,12vw,250px)] top-[clamp(65px,13vh,115px)] block">
              <AppleEmojiRow names={['phone', 'heart', 'sunglasses']} className="bwsm-emoji-bubble bwsm-emoji-float -rotate-[7deg] rounded-[28px] bg-[#f7e0dd] px-8 py-6 text-[34px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
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
                <button
                  type="button"
                  data-pop
                  onClick={(event) => {
                    if (visibleStoryGroup) setProjectPreview({ group: visibleStoryGroup, trigger: event.currentTarget })
                  }}
                  aria-label={`Open all ${visibleStoryGroup?.title.replace(/\n/g, ' ') ?? 'project'} stories`}
                  className="grid size-12 place-items-center rounded-full border-2 border-white bg-[#cb2486] text-[11px] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,.16)] transition-transform duration-300 hover:rotate-90 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  +{Math.max(2, SOCIAL_REELS.length - 4)}
                </button>
              </div>
              {/* story counter + progress, synced with the rail */}
              <div data-social-fade className="mt-8 w-[min(240px,20vw)]">
                
             
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden lg:motion-reduce:block">
        <div className="relative min-h-[100svh] overflow-hidden bg-[#cb2486] px-5 pb-14 pt-24">
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

        <div className="bg-[#cb2486] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[6vw]">We are the<br />current,</h2>
          {playlist.length > 0 && (
            <div className="mx-auto my-10 aspect-[9/16] w-full max-w-[281.25px]">
              <HeroVideoPlayer reels={playlist} autoPlayInView />
            </div>
          )}
          <h2 className="text-right font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] text-[#10110f] lg:text-[7vw]">You are<br /><span className={textHighlight}>the story.</span></h2>
        </div>

        <div className="bg-[#fff5f3] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[11vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[5vw]">We electrify<br /><span className={`${textHighlight} mt-[0.12em]`}>your networks,</span></h2>
          <p className="mt-6 max-w-[420px] text-[14px] leading-[1.55] text-[#10110f]/75">
            Social is not a few posts a week. It&apos;s a story to tell, a strategy to build and an image to live up to.
          </p>
          <div className="mt-10 flex justify-center">
            <TeamHoverCard image={teamPhoto} className="h-[min(78svh,500px)] w-full max-w-[420px]" />
          </div>
        </div>

        <div className="bg-[#2f89b4] px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.76]  lg:text-[10rem]">We make<br />them social.</h2>
          <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
            {storyGroups.map((group) => (
              <StoryGroupCard
                key={group.id}
                group={group}
                active={!projectPreview}
                onOpen={onOpen}
                onPreview={(selectedGroup, trigger) => setProjectPreview({ group: selectedGroup, trigger })}
                className="h-[min(78svh,500px)] w-[82vw] max-w-[380px] snap-center"
                caption={socialCaseOfMonth}
              />
            ))}
          </div>
        </div>
      </div>
      {projectPreview && (
        <StoryProjectPreview
          selection={projectPreview}
          groups={storyGroups}
          onDismiss={() => setProjectPreview(null)}
        />
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* More-projects -> expertise centre reveal                            */
/* ------------------------------------------------------------------ */

function CenterImpactTransition() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const statement = section.querySelector<HTMLElement>('[data-impact-statement]')
      const statementLines = gsap.utils.toArray<HTMLElement>('[data-impact-line]', section)
      const mark = section.querySelector<HTMLImageElement>('[data-impact-mark]')
      const bw = section.querySelector<HTMLElement>('[data-impact-bw]')
      const starWipe = section.querySelector<HTMLElement>('[data-impact-star-wipe]')
      const base = section.querySelector<HTMLElement>('[data-impact-base]')
      const finalLines = gsap.utils.toArray<HTMLElement>('[data-impact-final-line]', section)
      if (!statement || !mark || !bw || !starWipe || !base) return

      gsap.set(statement, { autoAlpha: 0 })
      gsap.set(statementLines, {
        yPercent: 120,
        clipPath: 'inset(0% 0% 0% 0%)',
        transformOrigin: '50% 50%',
      })
      gsap.set(mark, {
        autoAlpha: 0,
        scale: 0.08,
        rotation: -5,
        clipPath: 'inset(50% 0% 50% 0%)',
        transformOrigin: '50% 50%',
        force3D: true,
      })
      gsap.set(bw, {
        autoAlpha: 0,
        scale: 0.65,
        transformOrigin: '50% 50%',
        force3D: true,
      })
      // One clipped surface replaces the two enormous filtered SVG layers.
      // Its polygon never changes; only compositor-friendly transforms do.
      gsap.set(starWipe, {
        autoAlpha: 0,
        scale: 0.06,
        rotation: 0,
        yPercent: 7,
        backgroundColor: '#fffaf7',
        transformOrigin: '50% 50%',
        force3D: true,
      })
      gsap.set(finalLines, { yPercent: 125 })

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.05,
          invalidateOnRefresh: true,
        },
      })

      timeline
        .set(statement, { autoAlpha: 1 }, 0)
        .to(statementLines, { yPercent: 0, duration: 0.68, stagger: 0.13, ease: 'power4.out' }, 0.08)
        .to(mark, { autoAlpha: 1, scale: 1, rotation: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.72, ease: 'power4.out' }, 1.02)
        .to(bw, { autoAlpha: 1, scale: 1, duration: 0.52, ease: 'back.out(1.8)' }, 1.12)
        .to(statementLines, {
          scale: 0.86,
          color: '#fffaf7',
          autoAlpha: 0,
          duration: 0.58,
          stagger: 0.035,
          ease: 'power3.inOut',
        }, 1.34)
        .to(statement, { autoAlpha: 0, duration: 0.12 }, 1.86)
        .set(starWipe, { autoAlpha: 1 }, 1.72)
        .to(mark, { scale: 1.14, duration: 0.28, ease: 'power3.out' }, 1.7)
        .to(bw, { scale: 1.08, duration: 0.28, ease: 'power3.out' }, 1.7)
        .to(starWipe, { scale: 0.3, rotation: -5, yPercent: 4, duration: 0.3, ease: 'power3.out' }, 1.72)
        .to(mark, { autoAlpha: 0, scale: 0.92, duration: 0.26, ease: 'power2.in' }, 1.96)
        .to(bw, { autoAlpha: 0, scale: 0.82, duration: 0.22, ease: 'power2.in' }, 1.96)
        .to(starWipe, {
          scale: 5.8,
          rotation: 2,
          yPercent: -4,
          backgroundColor: '#d0cce2',
          duration: 1.12,
          ease: 'power4.inOut',
        }, 2.02)
        .set(base, { backgroundColor: '#d0cce2' }, 3.08)
        .to(finalLines, { yPercent: 0, duration: 0.62, stagger: 0.11, ease: 'power4.out' }, 3.1)
        .set({}, {}, 4.12)

      return () => timeline.kill()
    })

    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="relative bg-[#cb2486] lg:h-[360svh]" aria-label="BrandWorks impact transition">
      <div className="relative hidden h-[100svh] overflow-hidden lg:sticky lg:top-0 lg:block">
        <div data-impact-base className="absolute inset-0 bg-[#cb2486]" />

        <div data-impact-statement className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-8 text-[#fff5f3]">
          <h2 className="bwsm-story-title text-center text-[clamp(54px,7vw,132px)] uppercase leading-[0.82] tracking-[-0.05em]">
            {['It is the impact', 'of your sincerity', 'It is aiming true'].map((line) => (
              <span key={line} className="block overflow-hidden py-[0.04em]"><span data-impact-line className="block">{line}</span></span>
            ))}
          </h2>
        </div>

        <img
          data-impact-mark
          src={impactStarAsset}
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 w-[clamp(110px,12vw,220px)] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_32px_rgba(255,250,247,.28)] [will-change:transform,clip-path]"
          aria-hidden="true"
        />

        <span
          data-impact-bw
          className="pointer-events-none absolute left-1/2 top-1/2 z-[45] -translate-x-1/2 -translate-y-1/2 font-primary text-[clamp(22px,2.2vw,40px)] font-bold uppercase tracking-[-0.08em] text-[#cb2486] [will-change:transform,opacity]"
          aria-hidden="true"
        >
          BW
        </span>

        <div
          data-impact-star-wipe
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[100vmax] w-[68vmax] -translate-x-1/2 -translate-y-1/2 bg-[#fffaf7] [clip-path:polygon(50%_0%,58%_42%,100%_50%,58%_58%,50%_100%,42%_58%,0%_50%,42%_42%)] [will-change:transform]"
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center text-[#cb2486]">
          <h2 className="bwsm-story-title text-center text-[clamp(66px,9vw,164px)] uppercase leading-[0.76] tracking-[-0.055em]">
            {['And', 'hit', 'strong.'].map((line) => (
              <span key={line} className="block overflow-hidden py-[0.04em]"><span data-impact-final-line className="block">{line}</span></span>
            ))}
          </h2>
        </div>
      </div>

      <div className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#d0cce2] px-6 py-24 text-center text-[#cb2486] lg:hidden">
        <img src={impactStarAsset} alt="" className="absolute h-[82svh] w-auto opacity-15" aria-hidden="true" />
        <h2 className="bwsm-story-title relative text-[18vw] uppercase leading-[0.78] tracking-[-0.055em]">It is aiming true.<br />And hit strong.</h2>
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

type WhyIconName = 'laptop' | 'craft' | 'bolt' | 'smile'

function WhyIcon({ name }: { name: WhyIconName }) {
  const shared = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {name === 'laptop' && <><rect x="15" y="15" width="34" height="25" rx="3" {...shared} /><path d="M10 46h44l-4 5H14l-4-5Z" {...shared} /><path d="M28 47h8" {...shared} /></>}
      {name === 'craft' && <><path d="M27 50V28c0-3 4-3 4 0v8-18c0-4 5-4 5 0v15-19c0-4 5-4 5 0v19-14c0-4 5-4 5 0v20c0 8-5 13-12 13h-1c-8 0-14-6-14-14v-8c0-4 5-5 7-1l5 8" {...shared} /><path d="M18 18c4 0 7-3 7-7M15 24c-3-2-4-5-3-8" {...shared} /></>}
      {name === 'bolt' && <path d="M36 7 17 35h14l-4 22 20-31H33l3-19Z" {...shared} />}
      {name === 'smile' && <><circle cx="32" cy="32" r="23" {...shared} /><path d="M22 27h.01M42 27h.01M21 38c3 6 8 9 11 9s8-3 11-9" {...shared} /></>}
    </svg>
  )
}

function WhySection() {
  const sectionRef = useRef<HTMLElement>(null)
  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-why-card]', section)
      const cta = section.querySelector<HTMLElement>('[data-why-cta]')
      const starts = [
        { xPercent: -42, yPercent: 128, rotate: -8 },
        { xPercent: -15, yPercent: 137, rotate: 6 },
        { xPercent: 17, yPercent: 130, rotate: -5 },
        { xPercent: 44, yPercent: 142, rotate: 8 },
      ]
      const restingRotations = [-2.4, 1.5, -1.2, 2.2]

      cards.forEach((card, index) => gsap.set(card, {
        ...starts[index],
        transformOrigin: '50% 100%',
        force3D: true,
        willChange: 'transform',
      }))
      if (cta) gsap.set(cta, { autoAlpha: 0, y: 18 })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.85,
          invalidateOnRefresh: true,
        },
      })
      cards.forEach((card, index) => {
        timeline.to(card, {
          xPercent: 0,
          yPercent: 0,
          rotate: restingRotations[index],
          duration: 0.82,
          ease: 'power3.out',
        }, index * 0.58)
      })
      if (cta) timeline.to(cta, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 2.35)
      timeline.set({}, {}, 2.85)

      return () => {
        timeline.kill()
        gsap.set(cards, { clearProps: 'transform,willChange' })
        if (cta) gsap.set(cta, { clearProps: 'transform,opacity,visibility' })
      }
    })
    return () => mm.revert()
  }, { scope: sectionRef })

  const benefits: Array<{ title: string; copy: string; icon: WhyIconName }> = [
    { title: 'Social media experts', copy: "For almost 10 years, our core business has been social media. Community management, photos and videos: that's what we do best.", icon: 'laptop' },
    { title: 'Premium & custom-made', copy: 'No standardized offers or copy-paste packages. Each project is designed for you and guided by the same goal: quality.', icon: 'craft' },
    { title: 'A clear method', copy: 'Shaped over the years between rigor and creativity: organization, precision and long-term vision.', icon: 'bolt' },
    { title: 'Humanity first', copy: "Behind every brand are passionate people. It's their story that we love to understand and tell.", icon: 'smile' },
  ]

  return (
    <section ref={sectionRef} className="bwsm-why" aria-labelledby="bwsm-why-title">
      <div className="bwsm-why__sticky">
        <h2 id="bwsm-why-title">Why<br />choose<br />BrandWorks?</h2>
        <div className="bwsm-why__cards">
          {benefits.map(({ title, copy, icon }) => (
            <article key={title} data-why-card>
              <span className="bwsm-why__icon"><WhyIcon name={icon} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <Link to="/contact" className="bwsm-why__cta" data-why-cta>Start a conversation <Arrow /></Link>
      </div>
    </section>
  )
}

function useSocialMediaMetadata(siteUrl?: string) {
  const nativeMetadata = useNativeMetadata()
  useEffect(() => {
    if (nativeMetadata) return
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
  }, [nativeMetadata, siteUrl])
}

function SocialRoundNav() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    document.body.classList.add('bwsm-route')
    return () => document.body.classList.remove('bwsm-route', 'bwsm-nav-open')
  }, [])
  useEffect(() => { document.body.classList.toggle('bwsm-nav-open', open) }, [open])
  return (
    <div className="bwsm-roundnav">
      <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span /><span /><span />
      </button>
      <Link to="/contact" aria-label="Contact us">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /></svg>
      </Link>
    </div>
  )
}

export default function SocialMediaPage({ siteUrl }: { siteUrl?: string }) {
  const [viewer, setViewer] = useState<ViewerSelection | null>(null)
  const openReel = useCallback((reel: SocialReel, trigger: HTMLElement) => setViewer({ reel, trigger }), [])
  const dismissViewer = useCallback(() => setViewer(null), [])
  useSocialMediaMetadata(siteUrl)
  return (
    <main className="bwsm-page">
      <SocialRoundNav />
      <SocialCaseCard image={SOCIAL_REELS[0]?.poster ?? ''} />
      <ProjectRail onOpen={openReel} />
      <CenterImpactTransition />
      <ExpertiseSection />
      <ProcessSection />
      <WhySection />
      <SocialFAQ />
      <SocialContact />
      {viewer && <ReelViewer selection={viewer} onDismiss={dismissViewer} />}
    </main>
  )
}
