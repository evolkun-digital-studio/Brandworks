import Image from 'next/image'
import { Copy, ImagePlus, Pencil, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as mediaApi from '../api/mediaAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function MediaCard({ asset, onEdit, onDelete, onCopy }: { asset: mediaApi.MediaAsset; onEdit: (asset: mediaApi.MediaAsset) => void; onDelete: (asset: mediaApi.MediaAsset) => void; onCopy: (asset: mediaApi.MediaAsset) => void }) {
  return (
    <article className="admin-media-card">
      <div className="admin-media-card__preview">
        {asset.kind === 'image' ? (
          <Image src={asset.publicUrl} alt={asset.altText} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" loading="lazy" style={{ objectFit: 'cover' }} />
        ) : (
          <video src={asset.publicUrl} controls preload="metadata" aria-label={asset.altText || asset.originalName} />
        )}
      </div>
      <div className="admin-media-card__body">
        <div className="min-w-0">
          <h2 className="admin-media-card__name" title={asset.originalName}>{asset.originalName}</h2>
          <p className="admin-media-card__meta">{asset.mimeType} · {formatSize(asset.size)}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}</p>
        </div>
        <p className={`admin-media-card__alt ${asset.altText ? '' : 'is-missing'}`}>{asset.altText || 'Alt text missing'}</p>
        <div className="admin-media-card__footer">
          <span>{asset.usageCount} {asset.usageCount === 1 ? 'use' : 'uses'}</span>
          <div className="flex gap-1">
            <AdminButton variant="quiet" aria-label={`Copy URL for ${asset.originalName}`} onClick={() => onCopy(asset)}><Copy size={14} aria-hidden="true" /></AdminButton>
            <AdminButton variant="quiet" aria-label={`Edit ${asset.originalName}`} onClick={() => onEdit(asset)}><Pencil size={14} aria-hidden="true" /></AdminButton>
            <AdminButton variant="quiet" aria-label={`Delete ${asset.originalName}`} onClick={() => onDelete(asset)}><Trash2 size={14} aria-hidden="true" /></AdminButton>
          </div>
        </div>
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
  const [notice, setNotice] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<mediaApi.MediaAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    setLoading(true); setError(null)
    try {
      const result = await mediaApi.listMedia({ search: search.trim() || undefined, type: type || undefined, page, limit: 24 })
      setAssets(result.assets); setTotalPages(result.totalPages || 1); setTotal(result.total)
    } catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer) }, [search, type, page])

  function openUpload() { setFile(null); setAltText(''); setCaption(''); setNotice(null); setUploadOpen(true) }
  function openEditor(asset: mediaApi.MediaAsset) { setEditing(asset); setAltText(asset.altText); setCaption(asset.caption); setDescription(asset.description); setNotice(null) }

  async function upload() {
    if (!file) return
    setBusy(true); setError(null)
    try { await mediaApi.uploadMedia(file, altText, caption); setUploadOpen(false); setNotice('Media uploaded.'); setPage(1); await load() }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  async function saveMetadata() {
    if (!editing) return
    setBusy(true); setError(null)
    try {
      const { asset } = await mediaApi.updateMedia(editing.id, { altText, caption, description })
      setAssets((current) => current.map((item) => item.id === asset.id ? asset : item)); setEditing(null); setNotice('Metadata saved.')
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  async function remove(asset: mediaApi.MediaAsset) {
    if (!window.confirm(`Move “${asset.originalName}” out of the active library? Existing references will remain safe.`)) return
    setBusy(true); setError(null)
    try { await mediaApi.deleteMedia(asset.id); setAssets((current) => current.filter((item) => item.id !== asset.id)); setTotal((value) => Math.max(0, value - 1)); setNotice('Media archived.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  async function copyUrl(asset: mediaApi.MediaAsset) {
    await navigator.clipboard.writeText(`${window.location.origin}${asset.publicUrl}`)
    setNotice('Asset URL copied for reuse.')
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Asset library" title="Media" description="Upload, describe, and reuse approved images and video without changing the site’s authored interactions." actions={<AdminButton variant="primary" onClick={openUpload}><ImagePlus size={16} aria-hidden="true" /> Upload media</AdminButton>} />
      <section className="admin-surface admin-media-toolbar" aria-label="Media filters">
        <div className="admin-segmented-control" role="group" aria-label="Filter media type">
          {([['', 'All'], ['image', 'Images'], ['video', 'Video']] as const).map(([value, label]) => <button key={value || 'all'} type="button" aria-pressed={type === value} onClick={() => { setType(value); setPage(1) }}>{label}</button>)}
        </div>
        <label className="relative block w-full sm:w-[280px]"><span className="sr-only">Search media</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" /><input className="admin-input pl-9 text-[13px]" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search filename or metadata" /></label>
      </section>
      {notice && <div className="admin-library-notice" role="status">{notice}</div>}
      {error && <div className="mt-4"><FormMessage type="error">{error}</FormMessage></div>}
      <section className="admin-media-grid mt-4" aria-live="polite">
        {loading && <div className="admin-empty-state admin-media-grid__empty"><p className="admin-empty-state__title">Loading media</p><p className="admin-empty-state__description">Your library is on its way.</p></div>}
        {!loading && assets.length === 0 && <div className="admin-empty-state admin-media-grid__empty"><p className="admin-empty-state__title">No media found</p><p className="admin-empty-state__description">Upload a first asset or adjust the search.</p></div>}
        {!loading && assets.map((asset) => <MediaCard key={asset.id} asset={asset} onEdit={openEditor} onDelete={(item) => void remove(item)} onCopy={(item) => void copyUrl(item)} />)}
      </section>
      {!loading && total > 0 && <div className="flex items-center justify-between py-5"><AdminButton variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton><span className="text-[12px] text-neutral-500">Page {page} of {totalPages} · {total} total</span><AdminButton variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</AdminButton></div>}

      {(uploadOpen || editing) && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setUploadOpen(false); setEditing(null) } }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="media-dialog-title"><div className="admin-modal__header"><div><p className="admin-eyebrow">{uploadOpen ? 'New asset' : 'Asset metadata'}</p><h2 id="media-dialog-title">{uploadOpen ? 'Upload media' : 'Describe this asset'}</h2></div><AdminButton variant="quiet" aria-label="Close" onClick={() => { setUploadOpen(false); setEditing(null) }}><X size={18} aria-hidden="true" /></AdminButton></div>
          {uploadOpen && <label className="admin-upload-dropzone"><span className="font-medium text-neutral-900">Choose a file</span><span className="text-[12px] text-neutral-500">JPEG, PNG, WebP, AVIF, GIF, MP4, or WebM · 20 MB maximum</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>}
          <div className="grid gap-4"><FormField id="media-alt" label="Alt text" required={uploadOpen} value={altText} onChange={(event) => setAltText(event.target.value)} /><FormField id="media-caption" label="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />{editing && <FormField id="media-description" label="Internal description" value={description} onChange={(event) => setDescription(event.target.value)} />}</div>
          <div className="admin-modal__actions"><AdminButton variant="secondary" onClick={() => { setUploadOpen(false); setEditing(null) }}>Cancel</AdminButton><AdminButton variant="primary" disabled={busy || (uploadOpen && !file)} onClick={() => void (uploadOpen ? upload() : saveMetadata())}>{busy ? 'Saving…' : uploadOpen ? 'Upload asset' : 'Save metadata'}</AdminButton></div>
        </section></div>}
    </div>
  )
}

export default MediaLibrary
