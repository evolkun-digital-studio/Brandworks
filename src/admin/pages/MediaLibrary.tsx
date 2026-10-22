import Image from 'next/image'
import { Copy, FileUp, ImagePlus, Pencil, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import * as mediaApi from '../api/mediaAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminIconButton from '../components/AdminIconButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import { useConfirm } from '../components/ConfirmDialog'

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'])

function MediaCard({ asset, onEdit, onDelete, onCopy }: { asset: mediaApi.MediaAsset; onEdit: (asset: mediaApi.MediaAsset) => void; onDelete: (asset: mediaApi.MediaAsset) => void; onCopy: (asset: mediaApi.MediaAsset) => void }) {
  return (
    <article className="admin-card group overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-a-fill">
        {asset.kind === 'image' ? (
          <Image src={asset.publicUrl} alt={asset.altText} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 33vw, 25vw" loading="lazy" style={{ objectFit: 'cover' }} />
        ) : (
          <video className="size-full object-cover" src={asset.publicUrl} controls preload="metadata" aria-label={asset.altText || asset.originalName} />
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <button type="button" className="admin-chip-button size-8 justify-center px-0" aria-label={`Copy URL for ${asset.originalName}`} onClick={() => onCopy(asset)}><Copy size={14} aria-hidden="true" /></button>
          <button type="button" className="admin-chip-button size-8 justify-center px-0" aria-label={`Edit ${asset.originalName}`} onClick={() => onEdit(asset)}><Pencil size={14} aria-hidden="true" /></button>
          <button type="button" className="admin-chip-button size-8 justify-center px-0 text-a-danger" aria-label={`Delete ${asset.originalName}`} onClick={() => onDelete(asset)}><Trash2 size={14} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-3">
        <h2 className="truncate text-[13.5px] font-semibold" title={asset.originalName}>{asset.originalName}</h2>
        <p className="truncate text-xs text-a-ink-2">{asset.mimeType.split('/')[1]?.toUpperCase()} · {formatSize(asset.size)}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}</p>
        <p className={`mt-1 truncate text-xs ${asset.altText ? 'text-a-ink-2' : 'font-medium text-a-warning'}`}>{asset.altText || 'Add alt text'}</p>
      </div>
    </article>
  )
}

function MediaLibrary() {
  const [assets, setAssets] = useState<mediaApi.MediaAsset[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'' | 'image' | 'video'>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<mediaApi.MediaAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [description, setDescription] = useState('')
  const { confirm, dialog } = useConfirm()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await mediaApi.listMedia({ search: search.trim() || undefined, type: type || undefined, page, limit: 24 })
      setAssets(result.assets)
      setTotalPages(result.totalPages || 1)
      setTotal(result.total)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, page])

  function openUpload() { setFile(null); setFileError(null); setAltText(''); setCaption(''); setUploadOpen(true) }
  function openEditor(asset: mediaApi.MediaAsset) { setEditing(asset); setAltText(asset.altText); setCaption(asset.caption); setDescription(asset.description) }
  function closeDialog() { setUploadOpen(false); setEditing(null) }

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return
    if (!ACCEPTED_MEDIA_TYPES.has(nextFile.type)) {
      setFile(null)
      setFileError('Choose a supported image or video file.')
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setFileError('This file is larger than the 20 MB limit.')
      return
    }
    setFileError(null)
    setFile(nextFile)
    if (!altText) setAltText(nextFile.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await mediaApi.uploadMedia(file, altText, caption)
      closeDialog()
      toast.success('Uploaded.')
      setPage(1)
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveMetadata() {
    if (!editing) return
    setBusy(true)
    try {
      const { asset } = await mediaApi.updateMedia(editing.id, { altText, caption, description })
      setAssets((current) => current.map((item) => item.id === asset.id ? asset : item))
      setEditing(null)
      toast.success('Saved.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(asset: mediaApi.MediaAsset) {
    const ok = await confirm({
      title: `Remove “${asset.originalName}”?`,
      message: 'It leaves the library. Articles that already use it keep working.',
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      await mediaApi.deleteMedia(asset.id)
      setAssets((current) => current.filter((item) => item.id !== asset.id))
      setTotal((value) => Math.max(0, value - 1))
      toast.success('Removed from the library.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function copyUrl(asset: mediaApi.MediaAsset) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${asset.publicUrl}`)
      toast.success('Link copied.')
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  const hasActiveFilters = Boolean(search.trim() || type)
  const dialogOpen = uploadOpen || Boolean(editing)

  return (
    <div>
      <AdminPageHeader
        title="Media"
        description="Images and video for your articles, with the descriptions that make them accessible."
        actions={<AdminButton variant="primary" onClick={openUpload} icon={<ImagePlus size={15} aria-hidden="true" />}>Upload</AdminButton>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="admin-segmented-control" role="group" aria-label="Filter media type">
          {([['', 'All'], ['image', 'Images'], ['video', 'Video']] as const).map(([value, label]) => (
            <button key={value || 'all'} type="button" aria-pressed={type === value} onClick={() => { setType(value); setPage(1) }}>{label}</button>
          ))}
        </div>
        <label className="relative block w-full sm:w-[280px]">
          <span className="sr-only">Search media</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-a-ink-3" aria-hidden="true" />
          <input className="admin-input pl-9" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search by name or description" />
        </label>
      </div>

      {error && <div className="mb-4"><FormMessage type="error">{error}</FormMessage></div>}

      <section className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4" aria-live="polite" aria-busy={loading}>
        {loading && Array.from({ length: 8 }).map((_, index) => <span key={index} className="admin-skeleton aspect-[4/3.6] rounded-a-lg" />)}
      </section>

      {!loading && assets.length === 0 && (
        <div className="admin-card admin-empty-state">
          <span className="admin-empty-state__icon"><ImagePlus size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <p className="admin-empty-state__title">{hasActiveFilters ? 'No matching media' : 'No media yet'}</p>
          <p className="admin-empty-state__description">{hasActiveFilters ? 'Try another search, or clear the filters.' : 'Upload your first image to start building the library.'}</p>
          {hasActiveFilters
            ? <AdminButton onClick={() => { setSearch(''); setType(''); setPage(1) }} icon={<X size={14} aria-hidden="true" />}>Clear filters</AdminButton>
            : <AdminButton variant="primary" onClick={openUpload} icon={<ImagePlus size={14} aria-hidden="true" />}>Upload</AdminButton>}
        </div>
      )}

      {!loading && assets.length > 0 && (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {assets.map((asset) => <MediaCard key={asset.id} asset={asset} onEdit={openEditor} onDelete={(item) => void remove(item)} onCopy={(item) => void copyUrl(item)} />)}
        </section>
      )}

      {!loading && total > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <AdminButton disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton>
          <span className="text-xs text-a-ink-2">Page {page} of {totalPages} · {total} items</span>
          <AdminButton disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</AdminButton>
        </div>
      )}

      {dialogOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="media-dialog-title">
            <div className="admin-modal__header">
              <div>
                <h2 id="media-dialog-title">{uploadOpen ? 'Upload media' : 'Edit details'}</h2>
                <p>{uploadOpen ? 'Add an image or video to the library.' : editing?.originalName}</p>
              </div>
              <AdminIconButton label="Close" onClick={closeDialog}><X size={18} strokeWidth={1.8} /></AdminIconButton>
            </div>
            {uploadOpen && (
              <label
                className={`admin-upload-dropzone ${dropActive ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setDropActive(true) }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (event.currentTarget === event.target) setDropActive(false) }}
                onDrop={(event) => { event.preventDefault(); setDropActive(false); chooseFile(event.dataTransfer.files?.[0] ?? null) }}
              >
                <span className="admin-upload-dropzone__icon"><FileUp size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                <strong>{file ? file.name : 'Drop a file here, or click to choose'}</strong>
                <span>{file ? `${formatSize(file.size)} · ready to upload` : 'JPEG, PNG, WebP, AVIF, GIF, MP4 or WebM · up to 20 MB'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              </label>
            )}
            {uploadOpen && fileError && <FormMessage type="error">{fileError}</FormMessage>}
            <div className="grid gap-4">
              <FormField id="media-alt" label="Alt text" helperText="Describe the image for people who can’t see it." required={uploadOpen} value={altText} onChange={(event) => setAltText(event.target.value)} />
              <FormField id="media-caption" label="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
              {editing && <FormField id="media-description" label="Internal note" value={description} onChange={(event) => setDescription(event.target.value)} />}
            </div>
            <div className="admin-modal__actions">
              <AdminButton onClick={closeDialog}>Cancel</AdminButton>
              <AdminButton variant="primary" disabled={busy || (uploadOpen && (!file || !altText.trim()))} onClick={() => void (uploadOpen ? upload() : saveMetadata())}>
                {busy ? 'Saving…' : uploadOpen ? 'Upload' : 'Save'}
              </AdminButton>
            </div>
          </section>
        </div>
      )}
      {dialog}
    </div>
  )
}

export default MediaLibrary
