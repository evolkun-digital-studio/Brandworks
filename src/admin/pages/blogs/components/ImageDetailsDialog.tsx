import { useEffect, useRef, useState } from 'react'
import { isOptimizedPreview, previewUrl } from '../../../lib/imageUrl'
import { ImageOff, Info, Replace, X } from 'lucide-react'
import AdminButton from '../../../components/AdminButton'
import AdminIconButton from '../../../components/AdminIconButton'

export type ImageLayout = 'figure' | 'media-text'

export interface ImageDetails {
  alt: string
  title: string
  caption: string
  layout: ImageLayout
}

interface ImageDetailsDialogProps {
  src: string
  /** insert: a new image going into the article · edit: an existing one · cover: the featured image. */
  mode: 'insert' | 'edit' | 'cover'
  initial?: Partial<ImageDetails>
  onSubmit: (details: ImageDetails) => void
  onCancel: () => void
  onReplace?: () => void
}

const ALT_MAX = 300
const TITLE_MAX = 200
const CAPTION_MAX = 500

const COPY = {
  insert: { heading: 'Image details', confirm: 'Insert image', blurb: 'Tell readers, and search engines, what this image shows.' },
  edit: { heading: 'Edit image', confirm: 'Save changes', blurb: 'Update how this image is described and captioned.' },
  cover: { heading: 'Cover image details', confirm: 'Save', blurb: 'The cover appears at the top of the article and when it is shared.' },
} as const

/** Alt text, title and caption for an image, with a live preview. */
function ImageDetailsDialog({ src, mode, initial, onSubmit, onCancel, onReplace }: ImageDetailsDialogProps) {
  const [alt, setAlt] = useState(initial?.alt ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [caption, setCaption] = useState(initial?.caption ?? '')
  const [layout, setLayout] = useState<ImageLayout>(initial?.layout ?? 'figure')
  const [decorative, setDecorative] = useState(false)
  const [failed, setFailed] = useState(false)
  const [tried, setTried] = useState(false)
  const altRef = useRef<HTMLTextAreaElement>(null)
  const surface = useRef<HTMLElement>(null)
  const [useOriginal, setUseOriginal] = useState(false)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel
  const canBeDecorative = mode !== 'cover'
  const altMissing = !decorative && !alt.trim()

  useEffect(() => {
    setFailed(false)
    setUseOriginal(false)
  }, [src])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    altRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancelRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [])

  function submit() {
    setTried(true)
    if (altMissing) {
      altRef.current?.focus()
      return
    }
    onSubmit({ alt: decorative ? '' : alt.trim(), title: title.trim(), caption: caption.trim(), layout })
  }

  const copy = COPY[mode]

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section ref={surface} className="admin-modal admin-modal--wide" role="dialog" aria-modal="true" aria-labelledby="image-details-title">
        <div className="admin-modal__header">
          <div>
            <h2 id="image-details-title">{copy.heading}</h2>
            <p>{copy.blurb}</p>
          </div>
          <AdminIconButton label="Close" onClick={onCancel}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-3">
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-a-lg bg-a-fill">
              {failed ? (
                <div className="flex flex-col items-center gap-2 px-6 text-center text-[13px] text-a-ink-2">
                  <ImageOff size={22} strokeWidth={1.6} aria-hidden="true" />
                  <p>This image can’t be loaded right now.</p>
                  <p className="text-xs text-a-ink-3">It may have been removed from the media library. You can still add details, or replace it.</p>
                </div>
              ) : (
                <img
                  src={useOriginal ? src : previewUrl(src, 640)}
                  alt=""
                  className="size-full object-contain"
                  onError={(event) => {
                    if (!useOriginal && isOptimizedPreview(event.currentTarget.getAttribute('src') ?? '')) setUseOriginal(true)
                    else setFailed(true)
                  }}
                />
              )}
            </div>
            {onReplace && (
              <AdminButton size="sm" className="self-start" onClick={onReplace} icon={<Replace size={13} aria-hidden="true" />}>Replace image</AdminButton>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="image-alt" className="text-[13px] font-semibold">Alt text{canBeDecorative ? '' : ' (required)'}</label>
                <span className={`text-xs tabular-nums ${alt.length > ALT_MAX ? 'text-a-danger' : 'text-a-ink-3'}`}>{alt.length}/{ALT_MAX}</span>
              </div>
              <textarea
                id="image-alt"
                ref={altRef}
                className={`admin-textarea ${tried && altMissing ? 'admin-input--error' : ''}`}
                rows={3}
                maxLength={ALT_MAX}
                value={decorative ? '' : alt}
                disabled={decorative}
                placeholder="Describe what’s in the image, in a short sentence"
                aria-invalid={tried && altMissing ? true : undefined}
                aria-describedby="image-alt-hint"
                onChange={(event) => setAlt(event.target.value)}
              />
              {tried && altMissing
                ? <p className="admin-field-error" role="alert">Add a description, or mark the image as decorative.</p>
                : <p id="image-alt-hint" className="admin-form-helper mt-1.5">Read aloud by screen readers and used by search engines.</p>}
              {canBeDecorative && (
                <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={decorative} onChange={(event) => setDecorative(event.target.checked)} />
                  This image is decorative
                </label>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="image-title" className="text-[13px] font-semibold">Title</label>
                <span className="text-xs tabular-nums text-a-ink-3">{title.length}/{TITLE_MAX}</span>
              </div>
              <input id="image-title" className="admin-input" maxLength={TITLE_MAX} value={title} placeholder="Optional" onChange={(event) => setTitle(event.target.value)} />
              <p className="admin-form-helper mt-1.5">Shown as a tooltip when someone hovers over the image.</p>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="image-caption" className="text-[13px] font-semibold">Caption</label>
                <span className="text-xs tabular-nums text-a-ink-3">{caption.length}/{CAPTION_MAX}</span>
              </div>
              <input id="image-caption" className="admin-input" maxLength={CAPTION_MAX} value={caption} placeholder="Optional" onChange={(event) => setCaption(event.target.value)} />
              <p className="admin-form-helper mt-1.5">Appears in small type under the image.</p>
            </div>

            {mode === 'insert' && (
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold">Layout</span>
                <div className="admin-segmented-control" role="group" aria-label="Image layout">
                  <button type="button" aria-pressed={layout === 'figure'} onClick={() => setLayout('figure')}>Image</button>
                  <button type="button" aria-pressed={layout === 'media-text'} onClick={() => setLayout('media-text')}>Image and text</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-a-ink-3"><Info size={13} aria-hidden="true" /> Good alt text is short and specific.</p>
          <div className="admin-modal__actions">
            <AdminButton onClick={onCancel}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={submit}>{copy.confirm}</AdminButton>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ImageDetailsDialog
