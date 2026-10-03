import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
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
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

type ViewerSelection = { reel: SocialReel; trigger: HTMLElement }

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

function Label({ children }: { children: ReactNode }) {
  return <p className="bwsm-label">{children}</p>
}

function Arrow() {
  return <span className="bwsm-arrow" aria-hidden="true">↗</span>
}

function MediaFrame({ reel, priority = false }: { reel: SocialReel; priority?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    reel.poster ? 'ready' : 'loading',
  )

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
                {/* <span>{selection.reel.category}</span> */}
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

function ProjectRail({ onOpen }: { onOpen: (reel: SocialReel, trigger: HTMLElement) => void }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const track = section.querySelector<HTMLElement>('[data-social-track]')
      const progress = section.querySelector<HTMLElement>('[data-social-progress]')
      const intro = section.querySelector<HTMLElement>('[data-social-intro]')
      const cards = gsap.utils.toArray<HTMLElement>('[data-social-card]', section)
      if (!track || !progress || !intro) return

      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth * 0.61)
      gsap.set(progress, { scaleX: 0, transformOrigin: 'left center' })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      })

      timeline
        .to(intro, { autoAlpha: 0, y: -24, duration: 0.07, ease: 'power1.out' }, 0)
        .to(track, { x: () => -distance(), ease: 'none' }, 0)
        .to(progress, { scaleX: 1, ease: 'none' }, 0)
        .to(section, { backgroundColor: '#dbe1e5', duration: 0.25 }, 0)
        .to(section, { backgroundColor: '#2b3117', duration: 0.25 }, 0.36)
        .to(section, { backgroundColor: '#e9a0a7', duration: 0.25 }, 0.76)

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { rotateY: index === 0 ? 0 : -13, scale: 0.94 },
          {
            rotateY: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              containerAnimation: timeline,
              start: 'left 88%',
              end: 'center center',
              scrub: true,
            },
          },
        )
      })
    })

    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bwsm-rail" id="social-work" aria-labelledby="bwsm-rail-title">
      <div className="bwsm-rail__sticky">
        <div className="bwsm-rail__intro" data-social-intro>
          <h1 id="bwsm-rail-title">
            <span>We make</span>
            <span>brands social.</span>
          </h1>
          {/* <p>Strategy, content and community designed to feel like one connected brand.</p>
          <div className="bwsm-rail__count"><strong>04</strong><span>projects</span></div> */}
        </div>

        <div className="bwsm-rail__viewport">
          <div className="bwsm-rail__track" data-social-track>
            {SOCIAL_REELS.map((reel, index) => (
              <button
                key={reel.id}
                type="button"
                className="bwsm-reel-card"
                data-social-card
                onClick={(event) => onOpen(reel, event.currentTarget)}
                aria-label={`View ${reel.caption}`}
              >
                <MediaFrame reel={reel} priority={index === 0} />
                {/* <span className="bwsm-reel-card__number">0{index + 1}</span> */}
                <span className="bwsm-reel-card__title">{reel.caption}</span>
                {/* <span className="bwsm-reel-card__category">{reel.category}</span> */}
              </button>
            ))}
            <a className="bwsm-reel-card bwsm-reel-card--more" href="#social-process" data-social-card>
              <span>More<br />than posts.</span>
              <small>Explore our process <Arrow /></small>
            </a>
          </div>
        </div>

        <div className="bwsm-rail__progress"><span data-social-progress /></div>
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
      if (cards.length < 2) return

      gsap.set(cards, { zIndex: (index) => cards.length - index })
      gsap.set(cards.slice(1), { yPercent: 8, scale: 0.94, rotate: (index) => index % 2 ? 3 : -3 })
      gsap.set(panels.slice(1), { opacity: 0, y: 20 })

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
      })

      cards.slice(0, -1).forEach((card, index) => {
        const next = cards[index + 1]
        timeline
          .to(card, { xPercent: index % 2 ? 112 : -112, rotate: index % 2 ? 12 : -12, opacity: 0, duration: 0.8 }, index)
          .to(next, { yPercent: 0, scale: 1, rotate: 0, duration: 0.8 }, index)
          .to(panels[index], { opacity: 0, y: -16, duration: 0.24 }, index)
          .to(panels[index + 1], { opacity: 1, y: 0, duration: 0.35 }, index + 0.25)
      })
    })
    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bwsm-expertise" id="social-expertise" aria-labelledby="bwsm-expertise-title">
      <div className="bwsm-expertise__sticky">
        <div className="bwsm-expertise__intro">
          <Label>Our expertise</Label>
          <h2 id="bwsm-expertise-title">Reasoning<br />to better:<br /><span>resonating.</span></h2>
          {/* <p>Social only works when strategy, creative and community learn from each other.</p> */}
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
              <button
                type="button"
                className="bwsm-case-card__close"
                aria-label="Dismiss project note"
                onClick={() => setShowCaseCard(false)}
              >
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
          <Label>Method & process</Label>
          <h2 id="bwsm-process-title">
            We will<br />always prefer<br /><span>this order.</span>
          </h2>
          <p>Clear thinking before constant output.</p>
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
