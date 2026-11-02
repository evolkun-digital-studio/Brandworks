import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Captions, ImageOff, Link2, Pencil, Replace, StretchHorizontal, Trash2, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import type { ImageAlign, ImageWrap } from '../../../../blog/lib/articleImage'
import { normalizeWebAddress, readImageAttributes } from '../lib/imageBlocks'

const ALT_MAX = 300
const SIZES = [
  { width: 25, label: 'Small (25%)' },
  { width: 50, label: 'Medium (50%)' },
  { width: 75, label: 'Large (75%)' },
  { width: 100, label: 'Full (100%)' },
]

function BarButton({ label, active, onClick, children, danger }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`admin-tool ${danger ? 'admin-tool--danger' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
      data-active={active ? 'true' : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Small diagrams of the three flow modes: the lines are text, the block is the image. */
function WrapIcon({ mode }: { mode: 'left' | 'right' | 'none' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      {mode === 'none' && <><path d="M2 2.5h12M2 13.5h12" /><rect x="3.5" y="5" width="9" height="6" rx="1" fill="currentColor" stroke="none" /></>}
      {mode === 'left' && <><rect x="2" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" /><path d="M10.5 3.5H14M10.5 6H14M10.5 8.5H14M2 12.5h12" /></>}
      {mode === 'right' && <><rect x="8" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none" /><path d="M2 3.5h3.5M2 6h3.5M2 8.5h3.5M2 12.5h12" /></>}
    </svg>
  )
}

export type ImageToolbarAction =
  | { type: 'align'; align: ImageAlign }
  | { type: 'wrap'; wrap: ImageWrap | null }
  | { type: 'width'; width: number }
  | { type: 'alt'; alt: string }
  | { type: 'commit-alt' }
  | { type: 'caption' }
  | { type: 'link'; link: string | null }
  | { type: 'replace' }
  | { type: 'details' }
  | { type: 'remove' }

interface ImageToolbarProps {
  figure: HTMLElement
  rect: DOMRect
  /** Top of the visible editing area: the toolbar stays below it. */
  stageTop: number
  /** "Image and text" has a fixed layout, so its size and position controls don't apply. */
  simple: boolean
  /** Bumped by the editor whenever the image changes, so these controls re-read it. */
  version: number
  onAction: (figure: HTMLElement, action: ImageToolbarAction) => void
}

function ImageToolbar({ figure, rect, stageTop, simple, version, onAction }: ImageToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<'alt' | 'link' | null>(null)
  const [linkDraft, setLinkDraft] = useState('')
  const [position, setPosition] = useState({ top: -9999, left: -9999 })
  // Read straight from the image on each render; `version` re-renders this after any change.
  const attributes = readImageAttributes(figure)
  const image = figure.querySelector('img')
  const broken = Boolean(image?.complete && image.naturalWidth === 0)
  const actions = {
    setAlign: (align: ImageAlign) => onAction(figure, { type: 'align', align }),
    setWrap: (wrap: ImageWrap | null) => onAction(figure, { type: 'wrap', wrap }),
    setWidth: (width: number) => onAction(figure, { type: 'width', width }),
    setAlt: (alt: string) => onAction(figure, { type: 'alt', alt }),
    commitAlt: () => onAction(figure, { type: 'commit-alt' }),
    toggleCaption: () => onAction(figure, { type: 'caption' }),
    setLink: (link: string | null) => onAction(figure, { type: 'link', link }),
    replace: () => onAction(figure, { type: 'replace' }),
    details: () => onAction(figure, { type: 'details' }),
    remove: () => onAction(figure, { type: 'remove' }),
  }

  // Above the image when there's room, then below it, then pinned inside the visible area.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const { offsetHeight: height, offsetWidth: width } = element
    const above = rect.top - height - 10
    const below = rect.bottom + 10
    const floor = stageTop + 8
    let top = above
    if (above < floor) top = below + height < window.innerHeight - 8 ? below : floor
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), Math.max(8, window.innerWidth - width - 8))
    setPosition({ top, left })
  }, [rect, stageTop, panel, simple, version])

  function openLink() {
    setLinkDraft(attributes.link)
    setPanel(panel === 'link' ? null : 'link')
  }

  function applyLink() {
    const link = normalizeWebAddress(linkDraft)
    if (!link) {
      toast.error('Enter a web address, like https://example.com')
      return
    }
    actions.setLink(link)
    setPanel(null)
  }

  return (
    <div ref={ref} className="admin-image-bar" data-rte-imagebar role="toolbar" aria-label="Image" style={position}>
      <div className="flex flex-wrap items-center gap-0.5">
        {!simple && (
          <>
            <BarButton label="Align left" active={attributes.align === 'left' && !attributes.wrap} onClick={() => actions.setAlign('left')}><AlignLeft size={15} strokeWidth={1.8} /></BarButton>
            <BarButton label="Align centre" active={attributes.align === 'center' && !attributes.wrap} onClick={() => actions.setAlign('center')}><AlignCenter size={15} strokeWidth={1.8} /></BarButton>
            <BarButton label="Align right" active={attributes.align === 'right' && !attributes.wrap} onClick={() => actions.setAlign('right')}><AlignRight size={15} strokeWidth={1.8} /></BarButton>
            <BarButton label="Full width" active={attributes.align === 'full'} onClick={() => actions.setAlign('full')}><StretchHorizontal size={15} strokeWidth={1.8} /></BarButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <BarButton label="No text wrap" active={!attributes.wrap} onClick={() => actions.setWrap(null)}><WrapIcon mode="none" /></BarButton>
            <BarButton label="Image on the left, text wraps beside it" active={attributes.wrap === 'left'} onClick={() => actions.setWrap('left')}><WrapIcon mode="left" /></BarButton>
            <BarButton label="Image on the right, text wraps beside it" active={attributes.wrap === 'right'} onClick={() => actions.setWrap('right')}><WrapIcon mode="right" /></BarButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            {SIZES.map((size) => (
              <BarButton key={size.width} label={size.label} active={attributes.width === size.width} onClick={() => actions.setWidth(size.width)}>
                <span className="text-[11.5px] font-medium tabular-nums">{size.width}%</span>
              </BarButton>
            ))}
            <span className="admin-tool-sep" aria-hidden="true" />
          </>
        )}
        <BarButton label={attributes.alt ? 'Alt text' : 'Alt text (missing)'} active={panel === 'alt'} onClick={() => setPanel(panel === 'alt' ? null : 'alt')}>
          <span className="text-[12px] font-medium">Alt</span>
          {!attributes.alt && <span className="size-1.5 rounded-full bg-a-warning" aria-hidden="true" />}
        </BarButton>
        <BarButton label={attributes.hasCaption ? 'Remove caption' : 'Add caption'} active={attributes.hasCaption} onClick={actions.toggleCaption}><Captions size={15} strokeWidth={1.8} /></BarButton>
        <BarButton label={attributes.link ? 'Edit link' : 'Link image'} active={Boolean(attributes.link) || panel === 'link'} onClick={openLink}><Link2 size={15} strokeWidth={1.8} /></BarButton>
        <BarButton label="Replace image" onClick={actions.replace}><Replace size={15} strokeWidth={1.8} /></BarButton>
        <BarButton label="Delete image" danger onClick={actions.remove}><Trash2 size={15} strokeWidth={1.8} /></BarButton>
      </div>

      {broken && <p className="m-0 flex items-center gap-1.5 px-2 pt-1.5 pb-1 text-xs text-a-warning"><ImageOff size={13} aria-hidden="true" /> Can’t load this image</p>}

      {panel === 'alt' && (
        <div className="mt-1 flex flex-col gap-1.5 border-t border-a-line p-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="rte-image-alt" className="text-xs font-semibold">Alt text</label>
            <span className={`text-xs tabular-nums ${attributes.alt.length >= ALT_MAX ? 'text-a-danger' : 'text-a-ink-3'}`}>{attributes.alt.length}/{ALT_MAX}</span>
          </div>
          <input
            id="rte-image-alt"
            className="admin-input"
            autoFocus
            maxLength={ALT_MAX}
            placeholder="Describe what’s in the image"
            value={attributes.alt}
            onChange={(event) => actions.setAlt(event.target.value)}
            onBlur={actions.commitAlt}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); actions.commitAlt(); setPanel(null) } }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-a-ink-2">Counts toward your SEO score.</span>
            <button type="button" className="admin-link text-xs" onClick={actions.details}><Pencil size={12} aria-hidden="true" /> More details</button>
          </div>
        </div>
      )}

      {panel === 'link' && (
        <div className="mt-1 flex flex-col gap-2 border-t border-a-line p-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } else if (event.key === 'Escape') { event.preventDefault(); setPanel(null) } }}>
          <label htmlFor="rte-image-link" className="text-xs font-semibold">Link address</label>
          <input id="rte-image-link" className="admin-input" autoFocus placeholder="https://" value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} />
          <div className="flex items-center justify-between gap-2">
            {attributes.link ? <button type="button" className="admin-link text-a-danger" onClick={() => { actions.setLink(null); setPanel(null) }}><Unlink size={13} aria-hidden="true" /> Remove link</button> : <span />}
            <button type="button" className="admin-button admin-button--primary admin-button--sm" onClick={applyLink}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageToolbar
