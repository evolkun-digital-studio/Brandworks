import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { photographyProjects, photographyRows, type PhotographyProject } from '../../data/photographyWall'
import './PhotographyWall.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** What the viewer needs from a photo; shared with the photography page archive. */
export type ViewerPhoto = Pick<PhotographyProject, 'title' | 'category' | 'alt' | 'image' | 'hero' | 'width' | 'height'>
export type Selection = { project: ViewerPhoto; trigger: HTMLButtonElement; bounds: DOMRect }

export function PhotographyProjectTransition({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dismissRef = useRef<() => void>(() => {})
  const titleId = useId()

  useLayoutEffect(() => {
    const dialog = dialogRef.current!
    const frame = frameRef.current!
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - root.clientWidth
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`
    root.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    const media = gsap.matchMedia()
    let exitTimeline: gsap.core.Timeline | undefined
    media.add({ reduced: '(prefers-reduced-motion: reduce)', animated: '(prefers-reduced-motion: no-preference)' }, (context) => {
      const reduced = context.conditions?.reduced
      const surface = dialog.querySelector('.bww-detail-background')
      const caption = dialog.querySelectorAll('[data-bww-detail-copy]')
      const target = () => {
        const gutter = window.innerWidth < 768 ? 18 : 64
        const availableWidth = window.innerWidth - gutter * 2
        const availableHeight = Math.max(100, window.innerHeight - 190)
        const ratio = selection.project.width / selection.project.height
        const width = Math.min(availableWidth, availableHeight * ratio)
        const height = width / ratio
        return { left: (window.innerWidth - width) / 2, top: 90 + (availableHeight - height) / 2, width, height }
      }
      const start = selection.bounds
      const timeline = gsap.timeline()
      timeline.fromTo(surface, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.45 }, 0)
        .fromTo(frame, { left: start.left, top: start.top, width: start.width, height: start.height },
          { ...target(), duration: reduced ? 0 : 0.85, ease: 'power3.inOut' }, 0)
        .fromTo(caption, { opacity: 0, y: reduced ? 0 : 8 }, { opacity: 1, y: 0, duration: reduced ? 0 : 0.3 }, reduced ? 0 : 0.55)
      let closing = false
      dismissRef.current = () => {
        if (closing) return
        closing = true
        timeline.kill()
        const bounds = selection.trigger.querySelector('[data-bww-media]')?.getBoundingClientRect() ?? selection.trigger.getBoundingClientRect()
        exitTimeline = gsap.timeline({ onComplete: onClose })
          .to(caption, { opacity: 0, duration: reduced ? 0 : 0.15 }, 0)
          .to(frame, { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
            duration: reduced ? 0 : 0.65, ease: 'power3.inOut' }, 0)
          .to(surface, { opacity: 0, duration: reduced ? 0 : 0.5 }, 0)
      }
      const resize = () => {
        if (!closing) { timeline.progress(1); gsap.set(frame, target()) }
      }
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    })
    return () => {
      exitTimeline?.kill()
      media.revert()
      gsap.killTweensOf([frame, ...dialog.querySelectorAll('[data-bww-detail-copy], .bww-detail-background')])
      dialog.close()
      root.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
      if (selection.trigger.isConnected) selection.trigger.focus({ preventScroll: true })
    }
  }, [selection, onClose])

  return createPortal(
    <dialog ref={dialogRef} className="bww-detail" aria-labelledby={titleId} data-lenis-prevent="true"
      onCancel={(event) => { event.preventDefault(); dismissRef.current() }}>
      <div className="bww-detail-background" onClick={() => dismissRef.current()} />
      <div className="bww-detail-toolbar" data-bww-detail-copy>
        <span>Photography</span>
        <button ref={closeRef} type="button" onClick={() => dismissRef.current()} aria-label="Close photograph and return to gallery">Back to gallery <span aria-hidden="true">×</span></button>
      </div>
      <div className="bww-detail-frame" ref={frameRef}>
        <img src={selection.project.image} alt="" width={selection.project.width} height={selection.project.height} />
        <img src={selection.project.hero} alt={selection.project.alt} width={selection.project.width}
          height={selection.project.height} decoding="async" className="bww-detail-original"
          onLoad={(event) => { event.currentTarget.style.opacity = '1' }} />
      </div>
      <div className="bww-detail-caption" data-bww-detail-copy>
        <h2 id={titleId}>{selection.project.title}</h2>
        <p>{selection.project.category} · Photography</p>
      </div>
    </dialog>, document.body,
  )
}

function PhotographyCard({ project, width, duplicate, wide, priority, onOpen }: {
  project: PhotographyProject
  width: number
  duplicate: boolean
  wide: boolean
  priority: boolean
  onOpen: (selection: Selection) => void
}) {
  return (
    <div className={`bww-card-reveal${duplicate ? ' bww-repeat' : ''}${wide ? ' bww-wide' : ''}`} style={{ '--card-width': `${width}vw` } as CSSProperties}>
      <button type="button" className="bww-card" aria-label={`Open ${project.title}, ${project.category}`}
        onClick={(event) => {
          const trigger = event.currentTarget
          const bounds = trigger.querySelector('[data-bww-media]')!.getBoundingClientRect()
          onOpen({ project, trigger, bounds })
        }}>
        <span className="bww-media" data-bww-media>
          <img src={project.image} alt={project.alt} width={project.width} height={project.height}
            loading={priority ? 'eager' : 'lazy'} decoding="async" draggable={false}
            onError={(event) => { event.currentTarget.style.opacity = '0'; event.currentTarget.parentElement?.classList.add('bww-media--error') }} />
        </span>
        <span className="bww-card-caption"><span>{project.title}</span><small>{project.category}</small></span>
      </button>
    </div>
  )
}

export default function PhotographyWall({ page = false }: { page?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const headingId = useId()
  const close = useCallback(() => setSelection(null), [])

  useGSAP(() => {
    const section = sectionRef.current!
    const media = gsap.matchMedia()
    media.add({ desktop: '(min-width: 1024px)', tablet: '(min-width: 768px) and (max-width: 1023px)',
      mobile: '(max-width: 767px)', reduced: '(prefers-reduced-motion: reduce)' }, (context) => {
      if (context.conditions?.reduced) return
      const mobile = context.conditions?.mobile
      const cards = gsap.utils.toArray<HTMLElement>('.bww-card-reveal', section).filter((card) => card.getClientRects().length > 0)
      if (mobile) {
        gsap.set(cards, { opacity: 0, y: 20 })
        ScrollTrigger.batch(cards, { start: 'top 94%', once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.75, stagger: 0.045, ease: 'power3.out' }) })
        return
      }
      const plane = section.querySelector('.bww-scroll-plane')
      const rows = gsap.utils.toArray<HTMLElement>('.bww-row', section)
      const scrollTrigger = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.85, invalidateOnRefresh: true }
      gsap.fromTo(cards, { opacity: 0, scale: 0.96, y: 32 }, { opacity: 1, scale: 1, y: 0, duration: 0.9,
        stagger: { each: 0.035, from: 'center' }, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 85%', once: true } })
      gsap.fromTo(plane, { y: 16, rotationX: 0.8, rotationY: -0.6 },
        { y: -16, rotationX: -0.6, rotationY: 0.6, ease: 'none', scrollTrigger })
      rows.forEach((row, index) => {
        const shift = photographyRows[index].shift * (context.conditions?.tablet ? 0.6 : 1)
        gsap.fromTo(row, { x: () => -shift * window.innerWidth / 200 },
          { x: () => shift * window.innerWidth / 200, ease: 'none', scrollTrigger })
        gsap.fromTo(row.querySelectorAll('img'), { yPercent: index % 2 ? -2 : 2 },
          { yPercent: index % 2 ? 2 : -2, ease: 'none', scrollTrigger })
      })
    })
    media.add('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const wall = section.querySelector('.bww-mouse-plane')!
      const setters = {
        x: gsap.quickTo(wall, 'x', { duration: 0.9, ease: 'power3.out' }),
        y: gsap.quickTo(wall, 'y', { duration: 0.9, ease: 'power3.out' }),
        rotationX: gsap.quickTo(wall, 'rotationX', { duration: 1.1, ease: 'power3.out' }),
        rotationY: gsap.quickTo(wall, 'rotationY', { duration: 1.1, ease: 'power3.out' }),
      }
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || document.querySelector('.bww-detail[open]')) return
        const bounds = section.querySelector('.bww-stage')!.getBoundingClientRect()
        const x = gsap.utils.clamp(-0.5, 0.5, (event.clientX - bounds.left) / bounds.width - 0.5)
        const y = gsap.utils.clamp(-0.5, 0.5, (event.clientY - bounds.top) / bounds.height - 0.5)
        setters.x(x * 14); setters.y(y * 10); setters.rotationX(-y * 1.8); setters.rotationY(x * 2.4)
      }
      const reset = () => Object.values(setters).forEach((setter) => setter(0))
      section.addEventListener('pointermove', move)
      section.addEventListener('pointerleave', reset)
      return () => { section.removeEventListener('pointermove', move); section.removeEventListener('pointerleave', reset) }
    })
    let alive = true
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; media.revert() }
  }, { scope: sectionRef })

  const seen = new Set<number>()
  return (
    <section ref={sectionRef} className={`bww-section${page ? ' bww-section--page' : ''}`} id="photography" aria-labelledby={headingId}>
      <div className="bww-stage">
        <header className="bww-heading">
          <p>Photography</p>
          {page ? <h1 id={headingId}>Selected work</h1> : <h2 id={headingId}>Selected work</h2>}
        </header>
        <div className="bww-perspective">
          <div className="bww-mouse-plane"><div className="bww-scroll-plane">
            {photographyRows.map((row, rowIndex) => (
              <div className="bww-row" key={rowIndex} style={{ '--row-tilt': `${row.tilt}deg` } as CSSProperties}>
                {row.frames.map((index, cardIndex) => {
                  const duplicate = seen.has(index)
                  seen.add(index)
                  return <PhotographyCard key={`${rowIndex}-${index}`} project={photographyProjects[index]}
                    width={row.widths[cardIndex]} duplicate={duplicate} wide={!duplicate && (seen.size - 1) % 3 === 0} priority={page && rowIndex < 2}
                    onOpen={setSelection} />
                })}
              </div>
            ))}
          </div></div>
        </div>
        <footer className="bww-footer"><span>BrandWorks / Image making</span><span>{String(photographyProjects.length).padStart(2, '0')} selected frames</span></footer>
      </div>
      {selection && <PhotographyProjectTransition selection={selection} onClose={close} />}
    </section>
  )
}
