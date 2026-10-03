import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { heroPhotograph, photographySeo } from '../../data/photography.data'
import { closingGrid, frames, sphereTiles, wall, wallIntro, type FrameKey } from '../../data/photographyArchive'
import { PhotographyProjectTransition, type Selection, type ViewerPhoto } from '../../components/PhotographyWall/PhotographyWall'
import { useArchiveMode } from '../../components/PhotoArchive/useArchiveMode'
import './PhotographyPage.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const InteractivePhotoArchive = lazy(() => import('../../components/PhotoArchive/InteractivePhotoArchive'))

/**
 * One photograph. The figure takes scroll parallax, `.bwp-media` takes the
 * entrance and the img takes the hover scale, so the three transforms never
 * fight over the same element. With `onOpen` the photo becomes a button that
 * opens the viewer.
 */
function Photo({ id, sizes, eager = false, className = '', style, depth, drift, onOpen }: {
  id: FrameKey
  sizes: string
  eager?: boolean
  className?: string
  style?: CSSProperties
  /** Wall parallax in yPercent and horizontal drift in px. */
  depth?: number
  drift?: number
  onOpen?: (key: FrameKey, trigger: HTMLButtonElement) => void
}) {
  const photo = frames[id]
  const media = (
    <span className="bwp-media" data-bwp-reveal data-bww-media style={{ '--natural': `${photo.width} / ${photo.height}` } as CSSProperties}>
      <img src={photo.src} srcSet={photo.srcSet} sizes={sizes} alt={photo.alt}
        width={photo.width} height={photo.height} loading={eager ? 'eager' : 'lazy'} decoding="async"
        draggable={false} style={photo.focus ? { objectPosition: photo.focus } : undefined} />
    </span>
  )
  return (
    <figure className={`bwp-photo ${className}`} style={style} data-depth={depth} data-drift={drift}>
      {onOpen ? (
        <button type="button" className="bwp-open" aria-label={`Open photograph: ${photo.alt}`}
          onClick={(event) => onOpen(id, event.currentTarget)}>
          {media}
        </button>
      ) : media}
      <figcaption>{photo.label}</figcaption>
    </figure>
  )
}

/** The homepage wall's viewer, fed from an archive frame. */
function viewerPhoto(key: FrameKey): ViewerPhoto {
  const { label, alt, width, height, src, thumb } = frames[key]
  const [category, title = category] = label.split(' / ')
  return { title, category, alt, width, height, image: thumb, hero: src }
}

const sphereFrames = [...new Set(sphereTiles.map((tile) => tile.key))]

const span = (columns: number, of: number) => `${((columns / of) * 100).toFixed(1)}vw`

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
    } catch {  }
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
  const indexRef = useRef<HTMLUListElement>(null)
  const mode = useArchiveMode()
  const spatial = mode !== 'off'
  const [selection, setSelection] = useState<(Selection & { key: FrameKey }) | null>(null)
  const close = useCallback(() => setSelection(null), [])
  usePhotographyMetadata(siteUrl)

  const open = useCallback((key: FrameKey, trigger: HTMLButtonElement) => {
    const media = trigger.querySelector('[data-bww-media]') ?? trigger
    setSelection({ key, project: viewerPhoto(key), trigger, bounds: media.getBoundingClientRect() })
  }, [])
  // A click on a sphere tile opens through the same button the keyboard uses.
  const openFromSphere = useCallback((tile: string) => {
    const key = sphereTiles.find((slot) => slot.id === tile)?.key
    const trigger = key && indexRef.current?.querySelector<HTMLButtonElement>(`[data-frame="${key}"]`)
    if (key && trigger) open(key, trigger)
  }, [open])

  useGSAP(() => {
    const root = rootRef.current
    if (!root) return
    const media = gsap.matchMedia()

    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Barely-there entrance: a short rise and fade, staggered per batch.
      const reveals = gsap.utils.toArray<HTMLElement>('[data-bwp-reveal]', root)
      gsap.set(reveals, { opacity: 0, y: 20 })
      ScrollTrigger.batch(reveals, {
        start: 'top 96%', once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'power2.out', overwrite: true }),
      })

      // The full-bleed frame slides slowly inside its window.
      gsap.utils.toArray<HTMLElement>('.bwp-feature img', root).forEach((image) => {
        gsap.fromTo(image, { yPercent: -6 }, { yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: image.closest('.bwp-feature'), start: 'top bottom', end: 'bottom top', scrub: 1 } })
      })
    })

    // Wall parallax for the DOM fallback: each frame drifts at its own pace,
    // so the archive reads as layered paper rather than a scrolling grid.
    if (!spatial) media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const wallElement = root.querySelector('.bwp-wall')
      gsap.utils.toArray<HTMLElement>('.bwp-wall [data-depth]', root).forEach((figure) => {
        const depth = Number(figure.dataset.depth)
        const drift = Number(figure.dataset.drift ?? 0)
        gsap.fromTo(figure, { yPercent: depth, x: -drift }, { yPercent: -depth, x: drift, ease: 'none',
          scrollTrigger: { trigger: wallElement, start: 'top bottom', end: 'bottom top', scrub: 1 } })
      })
    })

    let alive = true
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; media.revert() }
  }, { scope: rootRef, dependencies: [spatial], revertOnUpdate: true })

  const [ic, ics, ir, irs] = wallIntro

  return (
    <main ref={rootRef} className="bwp-page">
      {mode !== 'off' ? (
        <section className="bwp-hero" aria-labelledby="bwp-title">
          <Suspense fallback={null}>
            <InteractivePhotoArchive mode={mode} opened={selection?.key ?? null} onOpen={openFromSphere} indexRef={indexRef} />
          </Suspense>
          <div className="bwp-hero-edge" aria-hidden="true" />
          <div className="bwp-hero-ui">
            <h1 id="bwp-title">Images that make<br /> people stop.</h1>
            {/* <p className="bwp-hint" aria-hidden="true"><span></span><span>Scroll to continue</span></p> */}
          </div>
          {/* The sphere's photographs for screen readers and keyboard; focusing
              one turns the sphere to it. Each proxy marks where its photo sits
              on screen, so the viewer opens from and closes back to it. */}
          <ul className="bwp-sphere-index" ref={indexRef} aria-label="Photographs">
            {sphereFrames.map((key) => (
              <li key={key}>
                <button type="button" data-frame={key} aria-label={`Open photograph: ${frames[key].alt}`}
                  onClick={(event) => open(key, event.currentTarget)}>
                  <span className="bwp-proxy" data-proxy={key} data-bww-media />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="bwp-archive" aria-labelledby="bwp-title">
          <div className="bwp-wall">
            <header className="bwp-intro" style={{ '--c': ic, '--cs': ics, '--r': ir, '--rs': irs } as CSSProperties}>
              {/* <p className="bwp-label">Photography</p> */}
              <h1 id="bwp-title">Images that make<br /> people stop.</h1>
            </header>
            {wall.map(({ key, at: [c, cs, r, rs], depth, drift, wide }) => {
              // Tablet keeps the mixed sizes on a 12-column grid, at a readable scale.
              const tc = cs <= 3 ? 3 : cs <= 5 ? 4 : 6
              const tr = Math.max(2, Math.round((tc * rs) / cs))
              return (
                <Photo key={key} id={key} eager={r < 8} className={wide ? 'is-wide' : ''} onOpen={open}
                  sizes={`(max-width: 767px) ${wide ? '100vw' : '50vw'}, (max-width: 1023px) ${span(tc, 12)}, ${span(cs, 24)}`}
                  style={{ '--c': c, '--cs': cs, '--r': r, '--rs': rs, '--tc': tc, '--tr': tr } as CSSProperties}
                  depth={depth} drift={drift} />
              )
            })}
          </div>
        </section>
      )}

      <section className="bwp-sequence" aria-label="Selected frames">
        <div className="bwp-seq-pair">
          <Photo id="denim" sizes="(max-width: 767px) 100vw, 46vw" />
          <Photo id="lovegen" sizes="(max-width: 767px) 100vw, 34vw" />
        </div>
        <Photo id="jellystar" className="bwp-seq-campaign" sizes="(max-width: 767px) 100vw, 76vw" />
      </section>

      <Photo id="arcade" className="bwp-feature" sizes="100vw" />

      <section className="bwp-closing" aria-label="More frames">
        {closingGrid.map(({ key, at: [c, cs], ratio, offset = 0, wide }) => (
          <Photo key={key} id={key} className={wide ? 'is-wide' : ''}
            sizes={`(max-width: 767px) ${wide ? '100vw' : '50vw'}, ${span(cs, 12)}`}
            style={{ '--c': c, '--cs': cs, '--ratio': ratio, '--offset': `${offset}rem` } as CSSProperties} />
        ))}
      </section>

      <section className="bwp-cta" aria-labelledby="bwp-cta-heading">
        <h2 id="bwp-cta-heading">Have something worth shooting?</h2>
        <Link className="bwp-cta-link" to="/contact">Start a project <span aria-hidden="true">{'→'}</span></Link>
      </section>

      {selection && <PhotographyProjectTransition selection={selection} onClose={close} />}
    </main>
  )
}
