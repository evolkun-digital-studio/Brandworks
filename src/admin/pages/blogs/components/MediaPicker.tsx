import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import * as mediaApi from '../../../api/mediaAdminApi'
import AdminButton from '../../../components/AdminButton'
import AdminIconButton from '../../../components/AdminIconButton'

export interface PickedImage {
  asset: mediaApi.MediaAsset
  /** Absolute URL — the blog API only accepts http(s) image addresses. */
  url: string
}

interface MediaPickerProps {
  title?: string
  onClose: () => void
  onPick: (picked: PickedImage) => void
}

function absolute(publicUrl: string) {
  return new URL(publicUrl, window.location.origin).href
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif'

/** Choose an existing image, or upload a new one into the media library. */
function MediaPicker({ title = 'Choose an image', onClose, onPick }: MediaPickerProps) {
  const [assets, setAssets] = useState<mediaApi.MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    searchRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      mediaApi.listMedia({ type: 'image', search: search.trim() || undefined, limit: 30 })
        .then((result) => { if (!cancelled) setAssets(result.assets) })
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not load the media library.'))
        .finally(() => { if (!cancelled) setLoading(false) })
    }, search ? 250 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search])

  function chooseFile(file: File | null | undefined) {
    if (!file) return
    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error('Choose a JPEG, PNG, WebP, AVIF or GIF image.')
      return
    }
    setPendingFile(file)
    setAltText(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function upload() {
    if (!pendingFile || !altText.trim()) return
    setUploading(true)
    try {
      const { asset } = await mediaApi.uploadMedia(pendingFile, altText.trim(), '')
      toast.success('Image uploaded.')
      onPick({ asset, url: absolute(asset.publicUrl) })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        className={`admin-modal admin-modal--wide ${dragging ? 'outline-2 outline-dashed outline-a-accent' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false) }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]) }}
      >
        <div className="admin-modal__header">
          <div>
            <h2 id="media-picker-title">{title}</h2>
            <p>Pick from your library, or drop a new image anywhere in this window.</p>
          </div>
          <AdminIconButton label="Close" onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>

        {pendingFile ? (
          <div className="flex flex-wrap items-end gap-3 rounded-a-lg bg-a-fill p-4">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="media-picker-alt" className="admin-form-label">Describe “{pendingFile.name}”</label>
              <input
                id="media-picker-alt"
                className="admin-input"
                value={altText}
                maxLength={300}
                autoFocus
                placeholder="Alt text, for people who can’t see the image"
                onChange={(event) => setAltText(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void upload() }}
              />
            </div>
            <AdminButton variant="primary" disabled={uploading || !altText.trim()} onClick={() => void upload()} icon={<Upload size={14} aria-hidden="true" />}>
              {uploading ? 'Uploading…' : 'Upload and use'}
            </AdminButton>
            <AdminButton variant="quiet" disabled={uploading} onClick={() => setPendingFile(null)}>Cancel</AdminButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block min-w-[200px] flex-1">
              <span className="sr-only">Search images</span>
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-a-ink-3" aria-hidden="true" />
              <input ref={searchRef} type="search" className="admin-input pl-9" placeholder="Search by name or description" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="admin-button admin-button--primary cursor-pointer">
              <Upload size={14} aria-hidden="true" />
              <span>Upload image</span>
              <input className="sr-only" type="file" accept={ACCEPT} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = '' }} />
            </label>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => <span key={index} className="admin-skeleton aspect-[4/3]" />)}
          </div>
        ) : assets.length === 0 ? (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><ImagePlus size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <p className="admin-empty-state__title">{search ? 'No matching images' : 'Your library is empty'}</p>
            <p className="admin-empty-state__description">{search ? 'Try a different search.' : 'Upload an image to get started.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-a-lg border-0 bg-a-fill p-0 text-left transition-transform duration-150 ease-a hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-a-accent"
                onClick={() => onPick({ asset, url: absolute(asset.publicUrl) })}
                title={asset.altText || asset.originalName}
              >
                <img src={asset.publicUrl} alt="" loading="lazy" className="size-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/60 to-transparent px-2.5 pt-6 pb-2 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {asset.originalName}
                </span>
                {!asset.altText && <span className="absolute top-2 left-2 rounded-full bg-a-warning-soft px-2 py-0.5 text-[11px] font-medium text-a-warning backdrop-blur">No alt</span>}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MediaPicker
