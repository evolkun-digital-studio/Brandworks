import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from 'motion/react'
import { SOCIAL_ACCOUNT, type ReelComment, type SocialReel } from '../../data/socialMedia'
import {
  AddIcon,
  CameraIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CommentIcon,
  HeartIcon,
  HomeIcon,
  LinkIcon,
  MoreIcon,
  MusicIcon,
  PlayIcon,
  ReelsIcon,
  SaveIcon,
  SearchIcon,
  ShareIcon,
  SignalIcons,
  SwipeHandIcon,
} from './ReelIcons'
import './ReelFeed.css'

const pad = (n: number) => String(n).padStart(2, '0')

/** Instagram-style short counts: 980, 9,720 → 9.7K, 26,100 → 26.1K. */
const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** How long each reel stays up before the next one slides in. */
const HOLD_MS = 6500
const SLIDE = { duration: 1.1, ease: 'power3.inOut' }
/** Two taps closer together than this are a double tap (like). */
const DOUBLE_TAP_MS = 260
/** The swipe-up hint: shown once, on phones, shortly after the feed scrolls in. */
const HINT_QUERY = '(max-width: 767px)'
const HINT_DELAY_MS = 700
const HINT_MS = 3400

type Direction = 1 | -1
type Sheet = 'comments' | 'share' | null

/** What the visitor has done to one reel; the reel's own counts stay as given. */
type Engagement = {
  liked: boolean
  saved: boolean
  shared: number
  added: ReelComment[]
  likedComments: string[]
}

const NO_ENGAGEMENT: Engagement = { liked: false, saved: false, shared: 0, added: [], likedComments: [] }

/** Pointer gestures that start on these belong to them, not to the feed. */
const isOwnControl = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('button, a, input, form, .reel-sheet-layer'))

/**
 * The phone's screen, dressed as the Instagram Reels tab: the reels stacked
 * in place, one showing at a time, with the like / comment / share / save
 * rail, the account and caption, and the app's bottom bar.
 *   - the next reel slides up over the current one, like a flicked feed;
 *   - tap pauses, double tap likes (with the heart burst);
 *   - comments and share open as bottom sheets; comments can be added and
 *     liked, share copies the page link or uses the system share sheet;
 *   - only the showing reel plays, and only while the phone is on screen,
 *     the tab is visible and no sheet is open;
 *   - arrow keys step through the reels, Space / K pauses.
 * Engagement is local to the visit — nothing is sent anywhere.
 * With reduced motion nothing starts on its own and reels switch in place.
 */
function ReelFeed({ reels, label }: { reels: SocialReel[]; label: string }) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const shownRef = useRef(0)
  const directionRef = useRef<Direction>(1)
  const wheelDeltaRef = useRef(0)
  const wheelResetRef = useRef<number | null>(null)
  const wheelUnlockRef = useRef<number | null>(null)
  const wheelLockedRef = useRef(false)
  const tapTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const hintDoneRef = useRef(false)

  const [active, setActive] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  // Browser visibility is unknown during SSR; resolve it after hydration.
  const [tabHidden, setTabHidden] = useState(false)
  // null until the visitor chooses; then their choice wins over the default.
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [engagement, setEngagement] = useState<Record<string, Engagement>>({})
  const [following, setFollowing] = useState(false)
  const [captionOpen, setCaptionOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [burst, setBurst] = useState<{ key: number; x: number; y: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [hint, setHint] = useState(false)

  const paused = userPaused ?? Boolean(reduceMotion)
  const playing = onScreen && !paused && !tabHidden && sheet === null
  const sheetOpenRef = useRef(false)
  useEffect(() => {
    sheetOpenRef.current = sheet !== null
  }, [sheet])

  const reel = reels[active]
  const mine = engagement[reel.id] ?? NO_ENGAGEMENT
  const comments = [...mine.added, ...reel.comments]
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const goTo = useCallback(
    (index: number, direction: Direction) => {
      directionRef.current = direction
      setActive((index + reels.length) % reels.length)
      setCaptionOpen(false)
    },
    [reels.length],
  )

  const engage = (id: string, change: (current: Engagement) => Partial<Engagement>) =>
    setEngagement((all) => {
      const current = all[id] ?? NO_ENGAGEMENT
      return { ...all, [id]: { ...current, ...change(current) } }
    })

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800)
  }

  // Functional, so the delayed single-tap handler never toggles a stale value.
  const togglePause = () => setUserPaused((current) => !(current ?? Boolean(reduceMotion)))

  // Stack the reels before first paint: the first in place, the rest
  // waiting below the screen.
  useGSAP(
    () => {
      slideRefs.current.forEach((slide, index) => {
        if (slide) gsap.set(slide, { yPercent: index === 0 ? 0 : 100, zIndex: index === 0 ? 1 : 0 })
      })
    },
    { scope: rootRef },
  )

  // Slide from the reel on screen to the active one.
  useEffect(() => {
    const from = shownRef.current
    if (from === active) return
    shownRef.current = active

    const slides = slideRefs.current.filter((slide): slide is HTMLElement => Boolean(slide))
    const incoming = slideRefs.current[active]
    const outgoing = slideRefs.current[from]
    if (!incoming || !outgoing) return
    const direction = directionRef.current

    // A reel still moving from an earlier, interrupted change goes back
    // to waiting below.
    gsap.killTweensOf(slides)
    slides.forEach((slide) => {
      if (slide !== incoming && slide !== outgoing) gsap.set(slide, { yPercent: 100, zIndex: 0 })
    })

    const settle = () => {
      gsap.set(outgoing, { yPercent: 100, zIndex: 0 })
      gsap.set(incoming, { zIndex: 1 })
      const video = videoRefs.current[from]
      if (video) video.currentTime = 0
    }

    if (reduceMotion) {
      gsap.set(incoming, { yPercent: 0 })
      settle()
      return
    }

    gsap.set(outgoing, { zIndex: 1 })
    gsap.fromTo(incoming, { yPercent: 100 * direction, zIndex: 2 }, { yPercent: 0, ...SLIDE, onComplete: settle })
    gsap.to(outgoing, { yPercent: -28 * direction, ...SLIDE })
  }, [active, reduceMotion])

  useEffect(
    () => () => {
      gsap.killTweensOf(slideRefs.current.filter(Boolean))
      if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current)
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
    },
    [],
  )

  // Swipe-up hint for phones, once per visit: the first time the feed is on
  // screen, a hand sweeps up while the reel nudges up to show a sliver of
  // the next one. Any touch, key or wheel on the feed dismisses it.
  const dismissHint = () => {
    hintDoneRef.current = true
    setHint(false)
  }

  useEffect(() => {
    if (!onScreen || hintDoneRef.current || reels.length < 2) return
    if (typeof window === 'undefined' || !window.matchMedia(HINT_QUERY).matches) return
    const timer = window.setTimeout(() => {
      hintDoneRef.current = true
      setHint(true)
    }, HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [onScreen, reels.length])

  useEffect(() => {
    if (!hint) return
    const timer = window.setTimeout(() => setHint(false), HINT_MS)
    if (reduceMotion) return () => window.clearTimeout(timer)

    const current = slideRefs.current[shownRef.current]
    const next = slideRefs.current[(shownRef.current + 1) % reels.length]
    if (!current || !next || current === next) return () => window.clearTimeout(timer)

    // Two nudges, in time with the hand's 1.6s sweep.
    gsap.set(next, { yPercent: 100, zIndex: 2 })
    const nudge = gsap
      .timeline({ repeat: 1, repeatDelay: 0.25, delay: 0.15 })
      .to(current, { yPercent: -9, duration: 0.6, ease: 'power2.out' }, 0)
      .to(next, { yPercent: 86, duration: 0.6, ease: 'power2.out' }, 0)
      .to(current, { yPercent: 0, duration: 0.6, ease: 'power2.inOut' }, 0.75)
      .to(next, { yPercent: 100, duration: 0.6, ease: 'power2.inOut' }, 0.75)

    return () => {
      window.clearTimeout(timer)
      nudge.kill()
      gsap.set(current, { yPercent: 0 })
      gsap.set(next, { yPercent: 100, zIndex: 0 })
    }
  }, [hint, reduceMotion, reels.length])

  // Desktop wheel / trackpad browsing. This is installed natively with
  // passive:false so the page's smooth-scroll handler does not consume the
  // gesture while the pointer is over the phone. Small trackpad deltas are
  // accumulated into one deliberate step and locked until the slide has
  // nearly settled, preventing one wheel gesture from skipping reels.
  // With a sheet open the wheel scrolls the sheet instead.
  useEffect(() => {
    const root = rootRef.current
    if (!root || reels.length < 2) return

    const resetWheel = () => {
      wheelDeltaRef.current = 0
      wheelResetRef.current = null
    }

    const onWheel = (event: WheelEvent) => {
      hintDoneRef.current = true
      setHint(false)
      if (sheetOpenRef.current) {
        const inSheet = event.target instanceof Element && event.target.closest('.reel-sheet')
        if (!inSheet) event.preventDefault()
        event.stopPropagation()
        return
      }

      const rawDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX

      if (rawDelta === 0) return

      event.preventDefault()
      event.stopPropagation()

      if (wheelLockedRef.current) return

      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? root.clientHeight
            : 1

      wheelDeltaRef.current += rawDelta * unit

      if (wheelResetRef.current !== null) {
        window.clearTimeout(wheelResetRef.current)
      }

      wheelResetRef.current = window.setTimeout(resetWheel, 160)

      if (Math.abs(wheelDeltaRef.current) < 36) return

      const direction: Direction = wheelDeltaRef.current > 0 ? 1 : -1
      resetWheel()
      wheelLockedRef.current = true
      goTo(shownRef.current + direction, direction)

      wheelUnlockRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false
        wheelUnlockRef.current = null
      }, SLIDE.duration * 900)
    }

    root.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      root.removeEventListener('wheel', onWheel)
      if (wheelResetRef.current !== null) {
        window.clearTimeout(wheelResetRef.current)
      }
      if (wheelUnlockRef.current !== null) {
        window.clearTimeout(wheelUnlockRef.current)
      }
      resetWheel()
      wheelLockedRef.current = false
    }
  }, [goTo, reels.length])

  // Whether the phone is on the page's screen at all.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // One reel plays at most.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return
      if (index === active && playing) video.play().catch(() => {})
      else video.pause()
    })
  }, [active, playing])

  // Move on after a while, only while playing.
  useEffect(() => {
    if (!playing || reels.length < 2) return
    const timer = window.setTimeout(() => goTo(active + 1, 1), HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [active, playing, goTo, reels.length])

  // Escape closes a sheet wherever focus has ended up.
  useEffect(() => {
    if (sheet === null) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setSheet(null)
      rootRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheet])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    dismissHint()
    if (sheet !== null) return
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') goTo(active + 1, 1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') goTo(active - 1, -1)
    else if ((event.key === ' ' || event.key === 'k') && event.target === event.currentTarget) togglePause()
    else return
    event.preventDefault()
  }

  /* Pointer: a vertical flick changes reel, a tap pauses, a double tap likes. */
  const pointerStart = useRef<{ y: number } | null>(null)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    dismissHint()
    if (sheet !== null || isOwnControl(event.target)) return
    pointerStart.current = { y: event.clientY }
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return
    if (Math.abs(pointerStart.current.y - event.clientY) > 6) {
      event.preventDefault()
    }
  }

  const onTap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tapTimerRef.current !== null) {
      // Second tap: like (never unlike, as in the app) and burst a heart.
      window.clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      const box = event.currentTarget.getBoundingClientRect()
      setBurst({ key: Date.now(), x: event.clientX - box.left, y: event.clientY - box.top })
      engage(reel.id, () => ({ liked: true }))
      return
    }
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null
      togglePause()
    }, DOUBLE_TAP_MS)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current) return
    const dy = pointerStart.current.y - event.clientY
    pointerStart.current = null

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (Math.abs(dy) > 30) {
      goTo(active + (dy > 0 ? 1 : -1), dy > 0 ? 1 : -1)
    } else if (Math.abs(dy) < 10) {
      onTap(event)
    }
  }

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const closeSheet = () => {
    setSheet(null)
    rootRef.current?.focus()
  }

  const addComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    const comment: ReelComment = { id: `you-${Date.now()}`, user: 'you', text, time: 'now', likes: 0 }
    engage(reel.id, (current) => ({ added: [comment, ...current.added] }))
    setDraft('')
    // The Post button disables itself; keep focus in the field.
    event.currentTarget.querySelector('input')?.focus()
  }

  const toggleCommentLike = (commentId: string) =>
    engage(reel.id, (current) => ({
      likedComments: current.likedComments.includes(commentId)
        ? current.likedComments.filter((id) => id !== commentId)
        : [...current.likedComments, commentId],
    }))

  const shareUrl = () => (typeof window !== 'undefined' ? window.location.href : '')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      engage(reel.id, (current) => ({ shared: current.shared + 1 }))
      showToast('Link copied')
    } catch {
      showToast("Couldn't copy link")
    }
    setSheet(null)
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: SOCIAL_ACCOUNT.handle, text: reel.caption, url: shareUrl() })
      engage(reel.id, (current) => ({ shared: current.shared + 1 }))
    } catch {
      // Dismissed by the visitor; nothing to do.
    }
    setSheet(null)
  }

  return (
    <div
      ref={rootRef}
      className="reel-feed"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label}: ${reels.length} reels. Arrow keys browse, Space pauses.`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="reel-feed__slides" aria-live={playing ? 'off' : 'polite'}>
        {reels.map((item, index) => (
          <article
            key={item.id}
            ref={(node) => {
              slideRefs.current[index] = node
            }}
            className="social-reel"
            aria-roledescription="slide"
            aria-label={`Reel ${index + 1} of ${pad(reels.length)}: ${item.caption}`}
            aria-hidden={index !== active}
          >
            <video
              ref={(node) => {
                videoRefs.current[index] = node
              }}
              className="social-reel__video"
              src={item.src}
              poster={item.poster}
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              aria-hidden="true"
            />
            <div className="social-reel__shade" aria-hidden="true" />
          </article>
        ))}

        {burst && (
          <span
            key={burst.key}
            className="reel-burst"
            style={{ left: burst.x, top: burst.y }}
            onAnimationEnd={() => setBurst(null)}
            aria-hidden="true"
          >
            <HeartIcon filled />
          </span>
        )}

        {hint && (
          <div className="reel-hint" aria-hidden="true">
            <span className="reel-hint__chevrons">
              <ChevronUpIcon />
              <ChevronUpIcon />
            </span>
            <span className="reel-hint__hand">
              <SwipeHandIcon />
            </span>
            <span className="reel-hint__text">Swipe up for more</span>
          </div>
        )}

        {/* Shown while paused; while playing it stays reachable for keyboards. */}
        <button
          type="button"
          className={`reel-play${paused ? ' is-paused' : ''}`}
          onClick={togglePause}
          aria-label={paused ? 'Play reels' : 'Pause reels'}
        >
          <PlayIcon />
        </button>

        {/* Account, caption and audio, bottom left. */}
        <div className="reel-info">
          <div className="reel-info__account">
            <img className="reel-avatar" src={SOCIAL_ACCOUNT.avatar} alt="" />
            <span className="reel-info__handle">{SOCIAL_ACCOUNT.handle}</span>
            <button
              type="button"
              className={`reel-follow${following ? ' is-following' : ''}`}
              onClick={() => setFollowing(!following)}
              aria-pressed={following}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
          <button
            type="button"
            className={`reel-info__caption${captionOpen ? ' is-open' : ''}`}
            onClick={() => setCaptionOpen(!captionOpen)}
            aria-expanded={captionOpen}
          >
            {reel.caption}
          </button>
          <p className="reel-info__audio">
            <MusicIcon />
            <span>
              {SOCIAL_ACCOUNT.handle} · {SOCIAL_ACCOUNT.audio}
            </span>
          </p>
        </div>

        {/* Action rail, bottom right. */}
        <div className="reel-actions">
          <button
            type="button"
            className={`reel-action${mine.liked ? ' is-liked' : ''}`}
            onClick={() => engage(reel.id, (current) => ({ liked: !current.liked }))}
            aria-pressed={mine.liked}
            aria-label={mine.liked ? 'Unlike' : 'Like'}
          >
            <span key={String(mine.liked)} className="reel-action__icon">
              <HeartIcon filled={mine.liked} />
            </span>
            <span className="reel-action__count">{formatCount(reel.likes + (mine.liked ? 1 : 0))}</span>
          </button>
          <button
            type="button"
            className="reel-action"
            onClick={() => setSheet('comments')}
            aria-label={`Comments, ${comments.length}`}
            aria-haspopup="dialog"
          >
            <span className="reel-action__icon">
              <CommentIcon />
            </span>
            <span className="reel-action__count">{formatCount(comments.length)}</span>
          </button>
          <button
            type="button"
            className="reel-action"
            onClick={() => setSheet('share')}
            aria-label="Share"
            aria-haspopup="dialog"
          >
            <span className="reel-action__icon">
              <ShareIcon />
            </span>
            <span className="reel-action__count">{formatCount(reel.shares + mine.shared)}</span>
          </button>
          <button
            type="button"
            className={`reel-action${mine.saved ? ' is-saved' : ''}`}
            onClick={() => {
              engage(reel.id, (current) => ({ saved: !current.saved }))
              showToast(mine.saved ? 'Removed from saved' : 'Saved')
            }}
            aria-pressed={mine.saved}
            aria-label={mine.saved ? 'Remove from saved' : 'Save'}
          >
            <span key={String(mine.saved)} className="reel-action__icon">
              <SaveIcon filled={mine.saved} />
            </span>
          </button>
          <span className="reel-action reel-action--static" aria-hidden="true">
            <span className="reel-action__icon">
              <MoreIcon />
            </span>
          </span>
          <img className="reel-audio-thumb" src={SOCIAL_ACCOUNT.avatar} alt="" aria-hidden="true" />
        </div>
      </div>

      {/* Status bar and the Reels header. */}
      <div className="reel-top" aria-hidden="true">
        <div className="reel-status">
          <span>9:41</span>
          <SignalIcons />
        </div>
        <div className="reel-header">
          <span className="reel-header__title">
            Reels
            <ChevronDownIcon />
          </span>
          <CameraIcon />
        </div>
      </div>

      {/* The app's bottom bar, Reels selected. */}
      <nav className="reel-nav" aria-hidden="true">
        <HomeIcon />
        <SearchIcon />
        <AddIcon />
        <span className="reel-nav__active">
          <ReelsIcon />
        </span>
        <img className="reel-nav__avatar" src={SOCIAL_ACCOUNT.avatar} alt="" />
      </nav>

      {sheet !== null && (
        <div className="reel-sheet-layer">
          <div className="reel-sheet-backdrop" onClick={closeSheet} aria-hidden="true" />

          {sheet === 'comments' ? (
            <div className="reel-sheet reel-sheet--comments" role="dialog" aria-modal="true" aria-label="Comments">
              <span className="reel-sheet__grip" aria-hidden="true" />
              <div className="reel-sheet__head">
                <h3 className="reel-sheet__title">Comments</h3>
                <button type="button" className="reel-sheet__close" onClick={closeSheet} aria-label="Close comments">
                  ×
                </button>
              </div>
              <ul className="reel-comments" data-lenis-prevent="true">
                {comments.map((comment) => {
                  const liked = mine.likedComments.includes(comment.id)
                  return (
                    <li key={comment.id} className="reel-comment">
                      <span className="reel-comment__avatar" aria-hidden="true">
                        {comment.user.charAt(0).toUpperCase()}
                      </span>
                      <div className="reel-comment__body">
                        <p className="reel-comment__meta">
                          <strong>{comment.user}</strong> <span>{comment.time}</span>
                        </p>
                        <p className="reel-comment__text">{comment.text}</p>
                      </div>
                      <button
                        type="button"
                        className={`reel-comment__like${liked ? ' is-liked' : ''}`}
                        onClick={() => toggleCommentLike(comment.id)}
                        aria-pressed={liked}
                        aria-label={`Like comment by ${comment.user}`}
                      >
                        <HeartIcon filled={liked} />
                        {comment.likes + (liked ? 1 : 0) > 0 && <span>{comment.likes + (liked ? 1 : 0)}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <form className="reel-compose" onSubmit={addComment}>
                <span className="reel-comment__avatar reel-comment__avatar--you" aria-hidden="true">
                  Y
                </span>
                <input
                  className="reel-compose__input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Add a comment for ${SOCIAL_ACCOUNT.handle}…`}
                  aria-label="Add a comment"
                  maxLength={220}
                  autoFocus
                />
                <button type="submit" className="reel-compose__post" disabled={!draft.trim()}>
                  Post
                </button>
              </form>
            </div>
          ) : (
            <div className="reel-sheet reel-sheet--share" role="dialog" aria-modal="true" aria-label="Share">
              <span className="reel-sheet__grip" aria-hidden="true" />
              <div className="reel-sheet__head">
                <h3 className="reel-sheet__title">Share</h3>
                <button type="button" className="reel-sheet__close" onClick={closeSheet} aria-label="Close share">
                  ×
                </button>
              </div>
              <div className="reel-share">
                <button type="button" className="reel-share__target" onClick={copyLink} autoFocus>
                  <span className="reel-share__circle">
                    <LinkIcon />
                  </span>
                  Copy link
                </button>
                {canShare && (
                  <button type="button" className="reel-share__target" onClick={nativeShare}>
                    <span className="reel-share__circle">
                      <ShareIcon />
                    </span>
                    Share to…
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <p className="reel-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}

export default ReelFeed
