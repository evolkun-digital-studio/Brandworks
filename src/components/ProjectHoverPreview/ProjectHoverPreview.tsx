import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export interface ProjectPreviewData {
  title: string
  category?: string
  coverImage: string
  previewImages: string[]
  projectUrl?: string
}

const EASE = 'cubic-bezier(0.22,1,0.36,1)'
const CLOSE_DELAY = 220

// While the page is scrolling, cards slide under a still cursor and fire
// pointerenter; opening previews then makes the page flicker.
let lastScroll = 0
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => { lastScroll = performance.now() }, { passive: true, capture: true })
}
const isScrolling = () => performance.now() - lastScroll < 160

function canHover() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/**
 * Wraps a project card and reveals a compact strip of supporting images below it.
 * The strip floats over the gap under the card, so opening it never shifts the page layout.
 * Desktop: opens on hover (with a short close delay so the cursor can travel into the panel).
 * Touch: first tap opens the preview, a second tap (or "View Project") calls `onOpen`.
 */
export default function ProjectHoverPreview({
  project,
  onOpen,
  children,
  className = '',
}: {
  project: ProjectPreviewData
  onOpen: () => void
  /** Render prop for the main card; `activate` should be used as its click handler. */
  children: (activate: () => void, open: boolean) => ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const show = () => {
    cancelClose()
    if (!isScrolling()) setOpen(true)
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY)
  }

  useEffect(() => cancelClose, [])

  // Desktop: collapse as soon as the page scrolls
  useEffect(() => {
    if (!open || !canHover()) return
    const onScroll = () => { cancelClose(); setOpen(false) }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [open])

  // Touch: close when tapping anywhere else
  useEffect(() => {
    if (!open || canHover()) return
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const activate = useCallback(() => {
    if (canHover() || open) onOpen()
    else setOpen(true)
  }, [open, onOpen])

  const images = project.previewImages.slice(0, 3)
  const [lead, ...rest] = images

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? 'z-10' : ''} ${className}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerMove={(e) => e.pointerType === 'mouse' && !open && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
    >
      {children(activate, open)}

      {lead && (
        <div
          aria-hidden={!open}
          className={`absolute inset-x-0 top-full grid bg-black ${open ? '' : 'pointer-events-none'}`}
          style={{
            gridTemplateRows: open ? '1fr' : '0fr',
            transition: `grid-template-rows 520ms ${EASE}`,
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="pb-4 pt-4 max-md:pb-3 max-md:pt-3"
              style={{
                opacity: open ? 1 : 0,
                transform: `translateY(${open ? 0 : 14}px)`,
                clipPath: open ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
                transition: `opacity 480ms ${EASE}, transform 560ms ${EASE}, clip-path 560ms ${EASE}`,
                transitionDelay: open ? '60ms' : '0ms',
              }}
            >
              <div className="grid h-[clamp(150px,26vh,280px)] grid-cols-[1.6fr_1fr] gap-2 max-md:h-[clamp(110px,22vh,180px)]">
                <PreviewImage src={lead} alt={`${project.title} — detail 1`} />
                {rest.length > 0 && (
                  <div className="grid min-h-0 gap-2" style={{ gridTemplateRows: `repeat(${rest.length}, minmax(0, 1fr))` }}>
                    {rest.map((src, i) => <PreviewImage key={src} src={src} alt={`${project.title} — detail ${i + 2}`} />)}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-4 font-(--font-secondary) text-white">
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                  {[project.title, project.category].filter(Boolean).join(' — ')}
                </span>
                {project.projectUrl ? (
                  <a href={project.projectUrl} tabIndex={open ? 0 : -1} className="text-[11px] tracking-[0.04em] text-white no-underline transition-colors duration-300 hover:text-[#CCFF00]">
                    View Project →
                  </a>
                ) : (
                  <button type="button" tabIndex={open ? 0 : -1} onClick={onOpen} className="cursor-pointer border-0 bg-transparent p-0 text-[11px] tracking-[0.04em] text-white transition-colors duration-300 hover:text-[#CCFF00]">
                    View Project →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="min-h-0 overflow-hidden bg-[#1a1a1a]">
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  )
}
