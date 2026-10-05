import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type HTMLAttributes,
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

const EASE = [0.22, 1, 0.36, 1] as const
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const APPLE_EMOJI_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64'
const APPLE_EMOJI = {
  desktop: '1f5a5-fe0f',
  bolt: '26a1-fe0f',
  headphones: '1f3a7',
  movieCamera: '1f3a5',
  fist: '1f44a',
  phone: '1f4f1',
  playful: '1f61c',
  camera: '1f4f8',
  heart: '1f496',
  sunglasses: '1f60e',
  chart: '1f4ca',
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
type StoryGroup = { id: string; title: string; reels: SocialReel[] }

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
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
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

function MediaFrame({ reel, priority = false }: { reel: SocialReel; priority?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(reel.poster ? 'ready' : 'loading')
  useEffect(() => {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame || !video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => undefined)
        else video.pause()
      },
      { rootMargin: '160px', threshold: 0.12 },
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={frameRef} className="bwsm-media" data-status={status} aria-busy={status === 'loading'}>
      <span className="bwsm-skeleton" aria-hidden="true" />
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        width={1080}
        height={1920}
        muted
        loop
        playsInline
        preload={priority ? 'auto' : 'metadata'}
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
                <p id="bwsm-viewer-title">{selection.reel.caption}</p>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)}>Close ×</button>
            </div>
            <motion.figure
              initial={{ y: reduced ? 0 : 28, scale: reduced ? 1 : 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
            >
              <MediaFrame reel={selection.reel} priority />
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
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
  const count = reels.length
  const reel = reels[clip % Math.max(1, count)]

  useEffect(() => {
    if (!autoPlayInView) return
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && video.dataset.userPaused !== 'true') video.play().catch(() => undefined)
      else if (!entry.isIntersecting) video.pause()
    }, { threshold: 0.45 })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [autoPlayInView])

  const goToClip = (next: number) => {
    const video = videoRef.current
    resumeRef.current = Boolean(video && !video.paused) || resumeRef.current
    setStatus('loading')
    setTime(0)
    setClip(((next % count) + count) % count)
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
  className="relative mx-auto h-[clamp(420px,85vh,560px)] w-[clamp(260px,26vw,380px)] overflow-hidden rounded-[22px] bg-[#151515] text-white shadow-[0_24px_60px_rgba(16,17,15,0.22)]"
>
      {status === 'loading' && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" aria-hidden="true" />}
      <video
        ref={videoRef}
        {...takeoverAttr}
        src={reel.src}
        poster={reel.poster}
        muted={muted}
        loop={count < 2}
        playsInline
        preload="auto"
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

      <span className="pointer-events-none absolute right-5 top-14 z-20 text-[13px] font-semibold tabular-nums text-[#075f38] drop-shadow-[0_1px_2px_rgba(255,255,255,.45)]">
        -{formatTime(duration - time)}
      </span>

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? 'Pause video' : 'Play video'}
        className="absolute bottom-5 left-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#075f38] shadow-[0_10px_28px_rgba(0,0,0,.16)] transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        {playing ? <Icon.Pause /> : <Icon.Play />}
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        aria-pressed={!muted}
        className="absolute bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#fffaf7] text-[#075f38] shadow-[0_10px_28px_rgba(0,0,0,.16)] transition-transform duration-200 hover:scale-105 active:scale-95"
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
/* Instagram-style story card: one card, 3–4 stories, prev/next CTAs   */
/* ------------------------------------------------------------------ */

const STORY_TITLES = ['Launch week', 'Behind the scenes', 'Campaigns', 'Community', 'Studio days']

function buildStoryGroups(reels: readonly SocialReel[]): StoryGroup[] {
  if (!reels.length) return []
  const perGroup = Math.min(4, reels.length)
  return STORY_TITLES.map((title, groupIndex) => {
    const size = groupIndex % 2 ? Math.min(3, perGroup) : perGroup
    return {
      id: `story-group-${groupIndex}`,
      title,
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
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [holding, setHolding] = useState(false)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(false)
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  const [burst, setBurst] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const count = group.reels.length
  const reel = group.reels[index]
  const cover = group.reels[0]?.poster
  const isLiked = Boolean(liked[index])
  const shouldPlay = active && inView && !paused && !holding
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
    setStatus('loading')
    setIndex(next)
  }, [index, count])

  const startHold = () => {
    held.current = false
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => { held.current = true; setHolding(true) }, 220)
  }
  const endHold = (dir: 1 | -1) => {
    window.clearTimeout(holdTimer.current)
    if (held.current) { held.current = false; setHolding(false) } else go(dir)
  }
  const cancelHold = () => {
    window.clearTimeout(holdTimer.current)
    if (held.current) { held.current = false; setHolding(false) }
  }
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  const toggleLike = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setLiked((value) => ({ ...value, [index]: !value[index] }))
    setBurst((value) => value + 1)
  }

  const share = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const data = { title: reel.caption, url: window.location.href }
    if (navigator.share) navigator.share(data).catch(() => undefined)
    else navigator.clipboard?.writeText(data.url).catch(() => undefined)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
    else if (event.target === event.currentTarget && event.key === ' ') { event.preventDefault(); setPaused((value) => !value) }
    else if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); onOpen(reel, event.currentTarget) }
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
      aria-label={`${group.title} — story ${index + 1} of ${count}`}
      className={`group/story relative shrink-0 select-none overflow-hidden rounded-[clamp(14px,1.2vw,22px)] bg-[#161616] text-white shadow-[0_24px_70px_rgba(0,0,0,.18)] outline-none [will-change:transform,opacity] focus-visible:ring-2 focus-visible:ring-white/90 ${className}`}
    >
      {status === 'loading' && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" aria-hidden="true" />}
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        muted={muted}
        playsInline
        preload="metadata"
        onCanPlay={() => setStatus('ready')}
        onError={() => setStatus('error')}
        onEnded={() => go(1)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {status === 'error' && <span className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.08em] text-white/60">Video unavailable</span>}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/65" />

      {/* progress segments */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex gap-1" aria-hidden="true">
        {group.reels.map((item, i) => (
          <span key={`${item.id}-${i}`} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
            <span ref={(el) => { barRefs.current[i] = el }} className="block h-full w-full origin-left rounded-full bg-white" />
          </span>
        ))}
      </div>

      {/* header */}
      <div className="absolute inset-x-3 top-6 z-30 flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]">
          <span className="block h-full w-full overflow-hidden rounded-full border-2 border-[#161616] bg-[#333]">
            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">brandworks</p>
          <p className="truncate text-[10px] text-white/70">{group.title} · {index + 1}/{count}</p>
        </div>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? 'Play stories' : 'Pause stories'}
          className="grid size-8 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15"
        >
          {paused ? <Icon.Play /> : <Icon.Pause />}
        </button>
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? 'Unmute stories' : 'Mute stories'}
          aria-pressed={!muted}
          className="grid size-8 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15"
        >
          {muted ? <Icon.Muted /> : <Icon.Volume />}
        </button>
      </div>

      {/* tap zones — tap left/right, press & hold to pause */}
      <div className="absolute inset-x-0 bottom-[128px] top-[66px] z-20 flex">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Previous story"
          className="h-full w-1/3 cursor-w-resize outline-none"
          onPointerDown={startHold}
          onPointerUp={() => endHold(-1)}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(event) => event.preventDefault()}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Next story"
          className="h-full w-2/3 cursor-e-resize outline-none"
          onPointerDown={startHold}
          onPointerUp={() => endHold(1)}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(event) => event.preventDefault()}
        />
      </div>

      {/* left / right CTAs */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous story"
        className="absolute left-2.5 top-1/2 z-30 -mt-[18px] grid size-9 place-items-center rounded-full bg-white/90 text-[#111] shadow-[0_8px_20px_rgba(0,0,0,.2)] transition-all duration-200 hover:scale-105 focus-visible:opacity-100 lg:opacity-0 lg:group-hover/story:opacity-100"
      >
        <Icon.Chevron dir="left" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next story"
        className="absolute right-2.5 top-1/2 z-30 -mt-[18px] grid size-9 place-items-center rounded-full bg-white/90 text-[#111] shadow-[0_8px_20px_rgba(0,0,0,.2)] transition-all duration-200 hover:scale-105 focus-visible:opacity-100 lg:opacity-0 lg:group-hover/story:opacity-100"
      >
        <Icon.Chevron dir="right" />
      </button>

      <AnimatePresence>
        {(holding || paused) && (
          <motion.span
            key="paused"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute left-1/2 top-[38%] z-30 -ml-7 grid size-14 place-items-center rounded-full bg-black/35 backdrop-blur-md"
            aria-hidden="true"
          >
            <Icon.Pause />
          </motion.span>
        )}
      </AnimatePresence>

      {/* footer */}
      <div className="absolute inset-x-4 bottom-4 z-30">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={`${reel.id}-${index}`}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="mb-4 max-w-[88%] font-primary text-[clamp(24px,2.1vw,36px)] uppercase leading-[0.84] tracking-[-0.04em]"
          >
            {reel.caption}
          </motion.h3>
        </AnimatePresence>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              aria-label={isLiked ? 'Unlike story' : 'Like story'}
              aria-pressed={isLiked}
              className={`relative grid size-10 place-items-center rounded-full border backdrop-blur-md transition-all duration-200 ${isLiked ? 'border-[#ff4d7d] bg-[#ff4d7d] text-white' : 'border-white/45 bg-black/15 text-white hover:bg-white hover:text-[#111]'}`}
            >
              <AnimatePresence initial={false}>
                {isLiked && (
                  <motion.span
                    key={burst}
                    initial={{ y: 0, scale: 0.4, opacity: 0 }}
                    animate={{ y: -30, scale: 1.15, opacity: 1 }}
                    exit={{ y: -46, scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.38, ease: EASE }}
                    className="pointer-events-none absolute text-[#ff4d7d]"
                  >
                    <Icon.Heart filled />
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.span key={`icon-${burst}`} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 16 }}>
                <Icon.Heart filled={isLiked} />
              </motion.span>
            </button>
            <button
              type="button"
              onClick={share}
              aria-label="Share story"
              className="grid size-10 place-items-center rounded-full border border-white/45 bg-black/15 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-[#111]"
            >
              <Icon.Send />
            </button>
          </div>
          <button
            type="button"
            onClick={(event) => onOpen(reel, event.currentTarget)}
            className="rounded-full bg-white/90 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#111] transition-colors hover:bg-white"
          >
            View story
          </button>
        </div>
      </div>
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
      const backdrop = q('[data-hero-backdrop]')
      const backdropImg = q('[data-hero-backdrop] img')
      const heroLetters = qa('[data-hero-letter]')
      const heroLines = qa('[data-hero-copy] [data-line]')
      const stickers = qa('[data-social-emoji]')
      const shells = qa('[data-social-photo-shell]')
      const shellIntro = qa('[data-shell-intro]')
      const magnets = qa('[data-social-magnet]')
      const flipInner = q('[data-flip-inner]')
      const flipFront = q('[data-flip-front]')
      const flipBack = q('[data-flip-back]')
      const teamCard = q('[data-social-team-card]')
      const railItems = qa('[data-rail-item]')
      const flowHeroBack = q('[data-flow="hero-back"]')
      const flowHeroCopy = q('[data-flow="hero-copy"]')
      const flowPink = q('[data-flow="pink"]')
      const flowElectric = q('[data-flow="electric"]')
      const flowSocial = q('[data-flow="social"]')
      const video = q<HTMLVideoElement>('[data-social-takeover-video]')

      if (!stage || !railBg || !backdrop || shells.length < 3 || !flipInner || !flipFront || !flipBack || !teamCard || !railItems.length) return

      const centerShell = shells[1]
      const leftShell = shells[0]
      const backCard = shells[2] // reused as the card peeking behind the team card
      const cardW = () => teamCard.offsetWidth

      /* ---------- initial state ---------- */
      gsap.set(shells, { transformOrigin: '50% 50%', force3D: true })
      gsap.set(centerShell, { scale: 1, zIndex: 30 })
      gsap.set(leftShell, { x: () => -window.innerWidth * 0.175, y: () => window.innerHeight * 0.09, scale: 1, rotation: -5.5, zIndex: 10 })
      gsap.set(backCard, { x: () => window.innerWidth * 0.175, y: () => window.innerHeight * 0.08, scale: 1, rotation: 5.2, zIndex: 10 })
      gsap.set(flipInner, { rotateY: 0, transformPerspective: 1800, transformOrigin: '50% 50%' })
      gsap.set(flipFront, { pointerEvents: 'auto' })
      gsap.set(flipBack, { pointerEvents: 'none' })
      // team card hinges on its RIGHT edge and swings over the video like a page
      gsap.set(teamCard, { autoAlpha: 0, rotateY: 88, transformOrigin: '100% 50%', transformPerspective: 2600, force3D: true })
      gsap.set(railItems, { transformOrigin: '0% 50%', transformPerspective: 1600, force3D: true })

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
        .fromTo(stickers, { scale: 0, rotation: -25 }, { scale: 1, rotation: (_i: number, el: HTMLElement) => Number(el.dataset.tilt || 0), duration: 0.8, stagger: 0.07, ease: 'back.out(2)' }, 0.85)

      /* ---------- horizontal stacking rail ---------- */
      const geom = { vw: 0, W: 0, x0: 0, gap: 14, natural: [] as number[], max: 0 }
      const measure = () => {
        geom.vw = window.innerWidth
        geom.W = cardW()
        geom.x0 = (geom.vw - geom.W) / 2
        geom.natural = railItems.map((_, k) => geom.vw + 30 + k * (geom.W + geom.gap))
        geom.max = geom.natural[railItems.length - 1] - (geom.x0 + geom.W * LAST_CARD_STOP)
      }
      measure()
      const proxy = { o: 0 }
      let lastActive = -1
      const layoutRail = () => {
        const { vw, W, x0, natural } = geom
        let active = 0
        railItems.forEach((card, k) => {
          const isLast = k === railItems.length - 1
          const lockX = x0 + (isLast ? W * LAST_CARD_STOP : 0)
          const raw = natural[k] - proxy.o
          const x = Math.max(lockX, raw)
          if (raw <= lockX + 0.5) active = k + 1
          // a little swing while the card enters from the right edge
          const t = gsap.utils.clamp(0, 1, (x - vw * 0.6) / (vw * 0.4))
          gsap.set(card, { x, rotateY: -24 * t, rotation: 5 * t })
        })
        if (active !== lastActive) {
          lastActive = active
          setRailIndex(active)
        }
      }
      layoutRail()
      const onRefreshInit = () => measure()
      const onRefresh = () => layoutRail()
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
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      tl.set({}, {}, total) // timeline length = scroll length in vh

      // text blocks: move 1 viewport-% per unit → plain native-feeling scroll
      const flow = (el: HTMLElement | null, from: number, to: number, at: number) => {
        if (el) tl.fromTo(el, { yPercent: from }, { yPercent: to, duration: Math.abs(from - to), ease: 'none' }, at)
      }

      // 1. Photos tuck behind the centre one while retaining their size
      flow(flowHeroBack, 0, -100, 0)
      flow(flowHeroCopy, 0, -100, 0)
      tl.to(backdrop, { autoAlpha: 0, duration: 35 }, 10)
      tl.to(leftShell, { x: 0, y: 0, rotation: -2, duration: 55, ease: 'power2.inOut' }, 0)
      tl.to(backCard, { x: 0, y: 0, rotation: 2, duration: 55, ease: 'power2.inOut' }, 0)
      tl.to(stickers, { autoAlpha: 0, scale: 0.6, duration: 20 }, 10)

      // 2. FLIP — the reel comes from the back of the photo
      tl.to(flipInner, { rotateY: 180, duration: 40, ease: 'power2.inOut' }, 55)
      tl.set([leftShell, backCard], { autoAlpha: 0 }, 60)
      tl.set(flipFront, { pointerEvents: 'none' }, 75)
      tl.set(flipBack, { pointerEvents: 'auto' }, 75)

      // 3. "We are the current" scrolls past while the video stays in the middle
      flow(flowPink, 100, -45, 80)

      // 4. TEAM card swings over the video (hinged on its right edge)
      tl.set(flipBack, { pointerEvents: 'none' }, 225)
      tl.fromTo(teamCard, { autoAlpha: 0 }, { autoAlpha: 1, duration: 6, immediateRender: false }, 225)
      tl.fromTo(teamCard, { rotateY: 88 }, { rotateY: 0, duration: 60, ease: 'power1.inOut', immediateRender: false }, 225)
      // the cards underneath splay out as a little stack
      tl.set(backCard, { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1 }, 255)
      tl.to(centerShell, { x: () => -cardW() * 0.07, rotation: -3.5, duration: 35, ease: 'power2.out' }, 255)
      tl.to(backCard, { x: () => cardW() * 0.07, rotation: 4, duration: 35, ease: 'power2.out' }, 255)
      flow(flowElectric, 100, -50, 230)

      // 5. "We make them social": stack tucks back in, title scrolls up and stays
      tl.to([centerShell, backCard], { x: 0, rotation: 0, duration: 20, ease: 'power2.inOut' }, 380)
      tl.set([centerShell, backCard], { autoAlpha: 0 }, 402)
      flow(flowSocial, 100, 0, 370)

      // 6. Stories slide in from the right and stack on the slot
      tl.to(railBg, { opacity: 1, duration: 2 }, RAIL_START - 2)
      tl.to(proxy, { o: () => geom.max, duration: railCount * PER_CARD, ease: 'none', onUpdate: layoutRail }, RAIL_START)

      // video only plays while it's the card on show
      tl.eventCallback('onUpdate', () => {
        if (!video) return
        const t = tl.time()
        const visible = t > 78 && t < 282
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
              {/* <div aria-hidden="true" className="flex whitespace-nowrap font-primary text-[clamp(120px,19vw,220px)] uppercase leading-[0.74] tracking-[-0.075em] text-[#00000]">
                {'BRANDWORKS'.split('').map((letter, index) => (
                  <span key={index} data-hero-letter className="inline-block">{letter}</span>
                ))}
              </div> */}
            </div>
          </div>

          {/* cards in the centre slot */}
          <div className="pointer-events-none absolute inset-0 z-[10]">
            {heroItems.map(({ reel, image }, index) => {
              const isCenter = index === 1
              return (
                <div key={reel.id} data-social-photo-shell className="pointer-events-auto [will-change:transform,opacity]" style={SLOT}>
                  <div data-shell-intro className="relative h-full w-full">
                    <div data-flip-inner={isCenter ? '' : undefined} className="relative h-full w-full [transform-style:preserve-3d]">
                      <div data-flip-front={isCenter ? '' : undefined} className="absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]">
                        <button
                          type="button"
                          data-social-magnet
                          className="group relative block h-full w-full [will-change:transform]"
                          onClick={(event) => onOpen(reel, event.currentTarget)}
                          aria-label={`View ${reel.caption}`}
                        >
                          <span className="relative block h-full w-full overflow-hidden rounded-[clamp(16px,1.35vw,23px)] bg-[#dedbd6] shadow-[0_26px_65px_rgba(16,17,15,0.16)]">
                            <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" loading={isCenter ? 'eager' : 'lazy'} />
                          </span>
                        </button>
                      </div>
                      {isCenter && (
                        <div data-flip-back className="pointer-events-none absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <HeroVideoPlayer reels={playlist} takeover />
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
                <Lines lines={[<span key="h" data-hero-human>Human</span>, <span key="s" className={textHighlight}>Social Club.</span>]} />
              </h1>
            </div>
            {/* <div data-hero-copy className="absolute bottom-[5vh] right-[clamp(28px,3vw,58px)] max-w-[240px] border-t border-black/15 pt-4">
              <p className="text-[12px] font-medium leading-[1.5] text-black/50">Strategy, content and community built around people worth following.</p>
            </div> */}
          </div>

          <div data-flow="pink" className={`${flowBox} text-[#10110f]`}>
            <AppleEmojiRow names={['phone', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float absolute left-[12vw] top-[12vh] rotate-[5deg] rounded-[26px] bg-[#f8ded4] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[12vh] max-w-[28vw]">
              <span className="mb-4 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(44px,5vw,112px)] uppercase leading-[0.78]  ">We are the<br />current,</h2>
            </div>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[calc(6vh+44px)] max-w-[28vw] text-left text-[#10110f]">
              <h2 className="font-primary text-[clamp(44px,4vw,76px)] uppercase leading-[0.78] ">You are<br /><span className={textHighlight}>the story.</span></h2>
            </div>
          </div>

          <div data-flow="electric" className={flowBox}>
            <AppleEmojiRow names={['camera', 'bolt', 'playful']} className="bwsm-emoji-bubble bwsm-emoji-float absolute left-[10vw] top-[11vh] rotate-[6deg] rounded-[26px] bg-[#f8ded4] px-6 py-4 text-[30px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            <div className="absolute left-[clamp(28px,3vw,58px)] top-[4vh] max-w-[29vw]">
              <span className="mb-5 block h-[62px]" aria-hidden="true" />
              <h2 className="font-primary text-[clamp(44px,5vw,112px)] uppercase leading-[0.78] tracking-[-0.025em] text-[#10110f]">
                We<br />electrify your<br /><span className={textHighlight}> networks,</span>
              </h2>
            </div>
            <div className="absolute right-[clamp(28px,3vw,58px)] top-[8vh] max-w-[min(25vw,300px)] text-[#10110f]">
              <p className="text-[13px] font-semibold leading-[1.45]">At BrandWorks, we believe social media is not just about publishing a few posts.</p>
              {/* <p className="mt-3 text-[12px] font-medium leading-[1.55] text-[#db3188]/75">
                It&apos;s a story to tell, a strategy to build and an image to live up to — turning your channels into a real lever for visibility and growth, with people at the heart of every project.
              </p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#db3188]/60">Hover the photo to meet the team</p> */}
            </div>
          </div>

          <div data-flow="social" className={`${flowBox} z-[60] text-[#10110f]`}>
            <AppleEmojiRow names={['phone', 'heart', 'sunglasses']} className="bwsm-emoji-bubble bwsm-emoji-float absolute left-[clamp(170px,12vw,250px)] top-[clamp(65px,13vh,115px)] -rotate-[7deg] rounded-[28px] bg-[#f8ded4] px-8 py-6 text-[34px] shadow-[0_12px_28px_rgba(16,17,15,.1)]" />
            <div className="absolute left-[clamp(28px,2vw,44px)] top-[clamp(150px,25vh,220px)] max-w-[26vw]">
              <h2 className="font-primary text-[clamp(44px,4.6vw,84px)] uppercase leading-[0.76] tracking-[-0.055em]">We<br />make them<br />social</h2>
              <div className="mt-4 flex -space-x-2">
                {SOCIAL_REELS.slice(0, 4).map((reel) => (
                  <span key={reel.id} className="size-8 overflow-hidden rounded-full border-2 border-white bg-white/20">
                    {reel.poster ? <img src={reel.poster} alt="" className="h-full w-full object-cover" /> : null}
                  </span>
                ))}
                <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-[#db3188] text-[11px]">+{Math.max(2, SOCIAL_REELS.length - 4)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden lg:motion-reduce:block">
        <div className="relative min-h-[100svh] overflow-hidden bg-white px-5 pb-14 pt-24">
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
                  <span className="block h-full w-full overflow-hidden rounded-[20px] bg-[#ddd] shadow-[0_22px_55px_rgba(16,17,15,0.18)]">
                    <img src={image} alt="" className="h-full w-full object-cover" loading={index === 1 ? 'eager' : 'lazy'} />
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

        <div className="bg-white px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[7vw]">We are the<br />current,</h2>
          {playlist.length > 0 && (
            <div className="mx-auto my-10 aspect-[9/16] w-full max-w-[281.25px]">
              <HeroVideoPlayer reels={playlist} autoPlayInView />
            </div>
          )}
          <h2 className="text-right font-primary text-[14vw] uppercase leading-[0.78] tracking-[-0.06em] text-[#10110f] lg:text-[7vw]">You are<br /><span className={textHighlight}>the story.</span></h2>
        </div>

        <div className="bg-white px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[13vw] uppercase leading-[0.78] tracking-[-0.06em] lg:text-[6.5vw]">We electrify<br /><span className={textHighlight}>your networks,</span></h2>
          <p className="mt-6 max-w-[420px] text-[14px] leading-[1.55] text-[#10110f]/75">
            Social is not a few posts a week. It&apos;s a story to tell, a strategy to build and an image to live up to.
          </p>
          <div className="mt-10 flex justify-center">
            <TeamHoverCard image={teamPhoto} className="h-[min(78svh,500px)] w-full max-w-[420px]" />
          </div>
        </div>

        <div className="bg-white px-5 py-16 text-[#10110f]">
          <h2 className="font-primary text-[14vw] uppercase leading-[0.76] tracking-[-0.06em] lg:text-[10rem]">We make<br />them social.</h2>
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

/* ------------------------------------------------------------------ */
/* Untouched sections                                                  */
/* ------------------------------------------------------------------ */

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
          scrub: 0.75,
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
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.65 },
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
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'center center', scrub: 0.6 },
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
