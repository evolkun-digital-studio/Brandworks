import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  heroPhotograph,
  photographs,
  photographyCapabilities,
  productionProcess,
  photographySeo,
  type Photograph,
} from '../../data/photography.data'
import './PhotographyPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const EASE = [0.22, 1, 0.36, 1] as const
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

type ViewerSelection = { photograph: Photograph; trigger: HTMLElement }
type OpenPhotograph = (photograph: Photograph, trigger: HTMLElement) => void

function Label({ children }: { children: ReactNode }) {
  return <p className="bwp-label">{children}</p>
}

function Arrow() {
  return <span className="bwp-arrow" aria-hidden="true">{'\u2197'}</span>
}

/**
 * Fixed frame geometry, a real loading state, cached-image detection and an
 * error state. A missing asset never leaves an endlessly pulsing skeleton.
 * GSAP animates wrappers, not this image's CSS opacity animation.
 */
function Photo({
  photograph,
  priority = false,
  decorative = false,
  fit = 'cover',
  sizes = '(min-width: 1280px) 720px, (min-width: 1024px) 56vw, 100vw',
}: {
  photograph: Photograph
  priority?: boolean
  decorative?: boolean
  fit?: 'cover' | 'contain'
  sizes?: string
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const image = imageRef.current
    setStatus(
      image?.complete ? (image.naturalWidth > 0 ? 'ready' : 'error') : 'loading',
    )
  }, [photograph.src])

  return (
    <div className="bwp-photo" data-status={status} aria-busy={status === 'loading'}>
      <span className="bwp-skeleton" aria-hidden="true" />
      <img
        ref={imageRef}
        src={photograph.src}
        srcSet={photograph.srcSet}
        sizes={photograph.srcSet ? sizes : undefined}
        alt={decorative ? '' : photograph.alt}
        width={photograph.width}
        height={photograph.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
        style={{ objectPosition: photograph.position ?? '50% 50%', objectFit: fit }}
      />
      {status === 'error' && (
        <span className="bwp-media-error" role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : photograph.alt}>
          Image unavailable
        </span>
      )}
    </div>
  )
}

/** Local, original adaptation of Animate UI's sliding-counter motion pattern. */
function FrameCounter({ value, reduced }: { value: number; reduced: boolean }) {
  return (
    <span className="bwp-counter" aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: reduced ? 0 : '100%', opacity: reduced ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduced ? 0 : '-100%', opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.38, ease: EASE }}
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * A real modal, rather than a visually modal div: native focus containment and
 * background inertness, Escape, focus restoration, scroll locking and exit motion.
 * The dialog pattern is informed by Animate UI; this is NOT a Radix import.
 */
function PhotoViewer({
  selection,
  onDismiss,
}: {
  selection: ViewerSelection
  onDismiss: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(true)
  const reduced = Boolean(useReducedMotion())

  useBrowserLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const root = document.documentElement
    const body = document.body
    const previousOverflow = root.style.overflow
    const previousPadding = body.style.paddingRight
    const gap = window.innerWidth - root.clientWidth
    if (gap > 0) {
      body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gap}px`
    }
    root.style.overflow = 'hidden'
    dialog.showModal()
    closeButtonRef.current?.focus({ preventScroll: true })
    return () => {
      if (dialog.open) dialog.close()
      root.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
      if (selection.trigger.isConnected) selection.trigger.focus({ preventScroll: true })
    }
  }, [selection.trigger])

  return createPortal(
    <dialog
      ref={dialogRef}
      className="bwp-dialog"
      aria-labelledby="bwp-viewer-title"
      data-lenis-prevent="true"
      onCancel={(event) => { event.preventDefault(); setOpen(false) }}
    >
      <AnimatePresence onExitComplete={onDismiss}>
        {open && (
          <motion.div
            className="bwp-viewer-surface"
            key="viewer"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.24 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false)
            }}
          >
            <div className="bwp-viewer-toolbar">
              <p id="bwp-viewer-title">{selection.photograph.title}</p>
              <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)}>
                Close <span aria-hidden="true">{'\u00d7'}</span>
              </button>
            </div>
            <motion.figure
              className="bwp-viewer-figure"
              initial={{ scale: reduced ? 1 : 0.96, y: reduced ? 0 : 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: reduced ? 1 : 0.985 }}
              transition={{ duration: reduced ? 0 : 0.48, ease: EASE }}
            >
              <Photo photograph={selection.photograph} fit="contain" priority sizes="92vw" />
              <figcaption>{selection.photograph.category}</figcaption>
            </motion.figure>
            <p className="bwp-viewer-help">Full frame. Press Escape to close.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>,
    document.body,
  )
}

function SelectedPhotography({ onOpen }: { onOpen: OpenPhotograph }) {
  const sectionRef = useRef<HTMLElement>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const reduced = Boolean(useReducedMotion())

  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const media = gsap.matchMedia()

    media.add(
      '(min-width: 1024px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)',
      () => {
        const layers = gsap.utils.toArray<HTMLElement>('[data-bwp-layer]', section)
        const rows = gsap.utils.toArray<HTMLElement>('[data-bwp-chapter]', section)
        const progress = section.querySelector<HTMLElement>('[data-bwp-progress]')
        if (layers.length < 2 || rows.length !== layers.length) return

        // Progressive enhancement: without this class, every photo is inline.
        section.classList.add('bwp-story--enhanced')
        const last = layers.length - 1
        gsap.set(layers, { clipPath: 'inset(0% 0% 100% 0%)' })
        gsap.set(layers[0], { clipPath: 'inset(0% 0% 0% 0%)' })

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: rows[0],
            start: 'center 60%',
            endTrigger: rows[last],
            end: 'center 60%',
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
          onUpdate() {
            // Discrete state only: no React render on every scroll pixel.
            const next = Math.min(last, Math.floor(timeline.time() + 0.24))
            if (next !== activeRef.current) {
              activeRef.current = next
              setActive(next)
            }
          },
        })

        layers.slice(1).forEach((layer, offset) => {
          const index = offset + 1
          const imagePlane = layer.querySelector<HTMLElement>('[data-bwp-plane]')
          // The previous image stays underneath. Forward and reverse scrolling
          // expose the NEXT frame continuously, rather than triggering a fade.
          timeline.to(layer, {
            clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62,
          }, index - 0.62)
          if (imagePlane) {
            timeline.fromTo(imagePlane,
              { yPercent: 2, scale: 1.045 },
              { yPercent: 0, scale: 1, duration: 0.62, immediateRender: true },
              index - 0.62,
            )
          }
        })
        if (progress) {
          timeline.fromTo(progress,
            { scaleX: 1 / layers.length },
            { scaleX: 1, duration: last, transformOrigin: 'left center' }, 0,
          )
        }

        return () => {
          section.classList.remove('bwp-story--enhanced')
          // GSAP matchMedia owns and reverts its own timelines and triggers.
        }
      },
    )
    return () => media.revert()
  }, { scope: sectionRef })

  return (
    <section className="bwp-story bwp-section" ref={sectionRef} id="selected-photography"
      aria-labelledby="bwp-work-heading">
      <div className="bwp-container">
        <header className="bwp-section-head">
          <div>
            <Label>Selected photography</Label>
            <h2 id="bwp-work-heading">Different subjects.<br />One consistent eye.</h2>
          </div>
          <a className="bwp-text-link" href="#photography-practice">Explore the practice <Arrow /></a>
        </header>
        <div className="bwp-story-grid">
          <div className="bwp-story-stage" aria-hidden="true">
            <div className="bwp-story-frame">
              {photographs.map((photograph, index) => (
                <div className="bwp-story-layer" data-bwp-layer key={photograph.id}
                  style={{ zIndex: index + 1 }}>
                  <div className="bwp-image-plane" data-bwp-plane>
                    <Photo photograph={photograph} decorative />
                  </div>
                </div>
              ))}
            </div>
            <div className="bwp-story-meter">
              <FrameCounter value={active + 1} reduced={reduced} />
              <span className="bwp-story-track"><span data-bwp-progress /></span>
              <span>{String(photographs.length).padStart(2, '0')}</span>
            </div>
          </div>
          <div className="bwp-story-chapters">
            {photographs.map((photograph, index) => (
              <article key={photograph.id} className="bwp-chapter" data-bwp-chapter
                data-active={active === index}>
                <button className="bwp-inline-photo" type="button"
                  aria-label={`View full photograph: ${photograph.title}`}
                  onClick={(event) => onOpen(photograph, event.currentTarget)}>
                  <Photo photograph={photograph} sizes="(min-width: 700px) 48vw, 100vw" />
                </button>
                <span className="bwp-chapter-number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{photograph.title}</h3>
                <p className="bwp-chapter-category">{photograph.category}</p>
                {/* <p className="bwp-chapter-description">{photograph.description}</p> */}
                <button type="button" className="bwp-text-link"
                  onClick={(event) => onOpen(photograph, event.currentTarget)}>
                  View photograph <Arrow />
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Inspira Expandable Gallery interaction, rewritten for React and this palette.
 * Flex changes happen on explicit pointer/focus interaction, not on page scroll.
 * Touch devices receive a two-column grid, not collapsed hover-only panels.
 */
function ContactSheet({ onOpen }: { onOpen: OpenPhotograph }) {
  const [active, setActive] = useState(0)
  return (
    <div className="bwp-contact-sheet">
      {photographs.map((photograph, index) => (
        <button type="button" key={photograph.id} className="bwp-contact-panel"
          data-active={active === index}
          onPointerEnter={(event) => { if (event.pointerType === 'mouse') setActive(index) }}
          onFocus={() => setActive(index)}
          onClick={(event) => onOpen(photograph, event.currentTarget)}
          aria-label={`View full photograph: ${photograph.title}`}>
          <span className="bwp-contact-image"><Photo photograph={photograph} decorative sizes="50vw" /></span>
          <span className="bwp-contact-caption">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{photograph.title}</span>
            <Arrow />
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Scoped client metadata, with restoration on unmount. Pass your REAL origin.
 * Omit siteUrl to skip canonical/schema; never point them at a guessed domain.
 * For production SEO, use your shared head manager and prerender this route.
 */
function usePhotographyMetadata(siteUrl?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = photographySeo.title
    const cleanups: Array<() => void> = []
    function setHead(selector: string, tag: string, attributes: Record<string, string>) {
      let element = document.head.querySelector<HTMLElement>(selector)
      const existed = Boolean(element)
      const previous = element ? Array.from(element.attributes, (a) => [a.name, a.value] as const) : []
      if (!element) { element = document.createElement(tag); document.head.appendChild(element) }
      const target = element
      Object.entries(attributes).forEach(([name, value]) => target.setAttribute(name, value))
      cleanups.push(() => {
        if (!existed) { target.remove(); return }
        for (const attribute of Array.from(target.attributes)) target.removeAttribute(attribute.name)
        previous.forEach(([name, value]) => target.setAttribute(name, value))
      })
    }
    setHead('meta[name="description"]', 'meta', { name: 'description', content: photographySeo.description })
    for (const [property, content] of [
      ['og:title', photographySeo.title],
      ['og:description', photographySeo.description],
      ['og:type', 'website'],
    ]) setHead(`meta[property="${property}"]`, 'meta', { property, content })
    setHead('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary_large_image' })
    let origin: string | undefined
    try {
      if (siteUrl) {
        const parsed = new URL(siteUrl)
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') origin = parsed.origin
      }
    } catch { /* Leave canonical unset until a valid production URL is supplied. */ }
    if (origin) {
      const url = `${origin}${photographySeo.pathname}`
      const image = new URL(heroPhotograph.src, origin).href
      setHead('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })
      setHead('meta[property="og:url"]', 'meta', { property: 'og:url', content: url })
      setHead('meta[property="og:image"]', 'meta', { property: 'og:image', content: image })
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.brandworksPhotography = 'true'
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Service', name: 'Commercial & Brand Photography',
            description: photographySeo.description, url,
            provider: { '@type': 'Organization', name: 'BrandWorks', url: origin },
          },
          {
            '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
              { '@type': 'ListItem', position: 2, name: 'Services', item: `${origin}/services` },
              { '@type': 'ListItem', position: 3, name: 'Photography', item: url },
            ],
          },
        ],
      })
      document.head.appendChild(script)
      cleanups.push(() => script.remove())
    }
    return () => {
      if (document.title === photographySeo.title) document.title = previousTitle
      cleanups.reverse().forEach((cleanup) => cleanup())
    }
  }, [siteUrl])
}

export default function PhotographyPage({ siteUrl }: { siteUrl?: string }) {
  const rootRef = useRef<HTMLElement>(null)
  const [viewer, setViewer] = useState<ViewerSelection | null>(null)
  const openPhotograph = useCallback<OpenPhotograph>((photograph, trigger) => {
    setViewer({ photograph, trigger })
  }, [])
  const dismissViewer = useCallback(() => setViewer(null), [])
  usePhotographyMetadata(siteUrl)

  useGSAP(() => {
    const root = rootRef.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Entrance is not dependent on a user scrolling. One title animation only.
      if (root.getBoundingClientRect().top > -100) {
        gsap.fromTo(root.querySelectorAll('[data-bwp-title]'),
          { yPercent: 112 },
          { yPercent: 0, duration: 0.86, stagger: 0.07, ease: 'power4.out' },
        )
      }
      // Reveal only secondary blocks; never blanket-hide the whole page.
      gsap.utils.toArray<HTMLElement>('[data-bwp-reveal]', root).forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return
        gsap.fromTo(element, { y: 18, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.72, ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 91%', once: true },
        })
      })
    })
    media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const stage = root.querySelector<HTMLElement>('[data-bwp-hero]')
      const mask = root.querySelector<HTMLElement>('[data-bwp-hero-mask]')
      const plane = root.querySelector<HTMLElement>('[data-bwp-hero-plane]')
      if (!stage || !mask || !plane) return
      // Container Scroll idea, without the original 3D rotation or device frame.
      // The frame keeps its layout size. Only its crop and inner scale change.
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: stage, start: 'clamp(top 85%)', end: 'clamp(top 15%)',
          scrub: 0.8, invalidateOnRefresh: true,
        },
      })
      timeline.fromTo(mask,
        { clipPath: 'inset(5% 16% 5% 16%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' }, 0,
      ).fromTo(plane,
        { scale: 1.075 },
        { scale: 1, duration: 1, ease: 'none' }, 0,
      )
    })
    let alive = true
    // One post-font refresh, not a global refresh for every image load.
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; media.revert() }
  }, { scope: rootRef })

  return (
    <main ref={rootRef} className="bwp-page">
      <section className="bwp-hero bwp-container" aria-labelledby="bwp-page-heading">
        <div className="bwp-hero-copy">
          <div>
            <Label>Photography</Label>
            <h1 id="bwp-page-heading">
              <span className="bwp-title-mask"><span data-bwp-title>Photography that</span></span>
              <span className="bwp-title-mask"><span data-bwp-title>shapes perception.</span></span>
            </h1>
          </div>
          {/* <div className="bwp-hero-description">
            <p>Commercial, campaign and editorial photography built around how a brand,
              product, place or person needs to be remembered.</p>
            <a className="bwp-text-link" href="#selected-photography">View selected photography <Arrow /></a>
          </div> */}
        </div>
        <figure className="bwp-hero-figure">
          <div className="bwp-hero-stage" data-bwp-hero>
            <button className="bwp-hero-mask" data-bwp-hero-mask type="button"
              aria-label="View featured photograph in full"
              onClick={(event) => openPhotograph(heroPhotograph, event.currentTarget)}>
              <div className="bwp-image-plane" data-bwp-hero-plane>
                <Photo photograph={heroPhotograph} priority sizes="(min-width: 1280px) 1200px, 96vw" />
              </div>
            </button>
          </div>
          {/* <figcaption><span>BrandWorks / Photography</span><span>Direction. Production. Image.</span></figcaption> */}
        </figure>
      </section>

      <section className="bwp-perspective bwp-container bwp-section" aria-labelledby="bwp-perspective-heading">
        <Label>Our perspective</Label>
        <div data-bwp-reveal>
          <h2 id="bwp-perspective-heading">The image should say something<br className="bwp-desktop-break" /> before the copy has to.</h2>
          <p>We approach photography as part of the brand system. Light, casting,
            environment, composition and post-production should all reinforce the same perception.</p>
        </div>
      </section>

      <SelectedPhotography onOpen={openPhotograph} />

      <section className="bwp-practice bwp-section" id="photography-practice" aria-labelledby="bwp-practice-heading">
        <div className="bwp-container">
          <header className="bwp-section-head" data-bwp-reveal>
            <div><Label>Photography practice</Label><h2 id="bwp-practice-heading">Built around what the<br />brand needs to show.</h2></div>
            {/* <p>Commercial photography, editorial thinking.<br />Explore a frame to see the full image.</p> */}
          </header>
          <ContactSheet onOpen={openPhotograph} />
          <ul className="bwp-capabilities" aria-label="Photography services">
            {photographyCapabilities.map((capability, index) => (
              <li key={capability}><span>{String(index + 1).padStart(2, '0')}</span>{capability}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bwp-process bwp-container bwp-section" aria-labelledby="bwp-process-heading">
        <header data-bwp-reveal><Label>Production process</Label><h2 id="bwp-process-heading">From brief to final image.</h2></header>
        <div className="bwp-process-list">
          {productionProcess.map((step) => (
            <article key={step.number} data-bwp-reveal>
              <span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bwp-context bwp-section" aria-labelledby="bwp-context-heading">
        <div className="bwp-container bwp-context-grid">
          <Label>Commercial photography</Label>
          <div data-bwp-reveal>
            <h2 id="bwp-context-heading">A visual direction that holds together.</h2>
            <p>BrandWorks provides commercial photography, brand photography, campaign
              imagery, product photography, editorial portraits and hospitality photography.
              Projects can include creative direction, location planning, casting, styling,
              lighting, retouching and final image delivery.</p>
            <p>Photography can also connect with our <Link to="/services/videography">videography</Link>,
              {' '}<Link to="/services/graphic-design">graphic design</Link> and
              {' '}<Link to="/services/content-creation">content creation</Link>, keeping one
              visual language across a campaign.</p>
          </div>
        </div>
      </section>

      <section className="bwp-cta bwp-section" aria-labelledby="bwp-cta-heading">
        <div className="bwp-container bwp-cta-inner">
          <div><Label>Start a shoot</Label><h2 id="bwp-cta-heading">What should your next<br />image say?</h2></div>
          <Link className="bwp-cta-link" to="/contact">Start a conversation <Arrow /></Link>
        </div>
      </section>
      {viewer && <PhotoViewer selection={viewer} onDismiss={dismissViewer} />}
    </main>
  )
}
