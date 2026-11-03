import { FileUp, GripVertical, History, ImagePlus, Pencil, RefreshCw, Trash2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import {
  recommendationWarning, SITE_MEDIA_ACCEPTED_TYPES, SITE_MEDIA_ALT_MAX, SITE_MEDIA_MAX_BYTES, SITE_MEDIA_SECTIONS,
  type SiteMediaSectionConfig, type SiteMediaSlotConfig,
} from '../../config/siteMediaSections'
import { Link } from '../../routing'
import { frames as photographyFrames } from '../../data/photographyArchive'
import * as siteMediaApi from '../api/siteMediaApi'
import type { SiteMediaAsset, SiteMediaItem } from '../api/siteMediaApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminIconButton from '../components/AdminIconButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FocalPointPicker from '../components/FocalPointPicker'
import FormMessage from '../components/FormMessage'
import { useConfirm } from '../components/ConfirmDialog'
import { useAdminAuth } from '../context/useAdminAuth'

function errorMessage(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function altFromName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

/** Client-side check mirroring the server's, so mistakes show before uploading. */
function fileProblem(file: File) {
  if (file.type === 'image/svg+xml') return 'SVG files aren’t accepted. Upload a JPG, PNG or WebP.'
  if (!(SITE_MEDIA_ACCEPTED_TYPES as readonly string[]).includes(file.type)) return 'Only JPG, PNG and WebP images are accepted.'
  if (file.size > SITE_MEDIA_MAX_BYTES) return `${file.name} is ${formatSize(file.size)}. The limit is 10 MB.`
  return null
}

interface PendingUpload {
  key: string
  file: File
  previewUrl: string
  width: number
  height: number
  altText: string
  focalX: number
  focalY: number
  progress: number | null
  error: string | null
}

type UploadTarget = { section: SiteMediaSectionConfig; slot: SiteMediaSlotConfig; itemId?: string; replacing?: SiteMediaAsset | null }

function readDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = url
  })
}

function UploadDialog({ target, onClose, onUploaded }: { target: UploadTarget; onClose: () => void; onUploaded: () => void }) {
  const { section, slot, itemId, replacing } = target
  const multiple = slot.kind === 'gallery' && !itemId
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [dropActive, setDropActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const aborts = useRef<Array<() => void>>([])

  useEffect(() => () => {
    aborts.current.forEach((abort) => abort())
  }, [])
  useEffect(() => () => pending.forEach((item) => URL.revokeObjectURL(item.previewUrl)), [pending])

  async function choose(files: FileList | null) {
    if (!files?.length) return
    const chosen = multiple ? Array.from(files) : [files[0]]
    const problems = chosen.map(fileProblem).filter(Boolean)
    setError(problems.length ? problems.join(' ') : null)
    const accepted = chosen.filter((file) => !fileProblem(file))
    const next = await Promise.all(accepted.map(async (file) => {
      const previewUrl = URL.createObjectURL(file)
      const { width, height } = await readDimensions(previewUrl)
      return {
        key: `${file.name}-${file.size}-${file.lastModified}`, file, previewUrl, width, height,
        altText: replacing?.altText ?? altFromName(file.name),
        focalX: replacing?.focalX ?? 0.5, focalY: replacing?.focalY ?? 0.5, progress: null, error: null,
      }
    }))
    setPending((current) => multiple ? [...current, ...next.filter((item) => !current.some((existing) => existing.key === item.key))] : next)
  }

  const update = (key: string, patch: Partial<PendingUpload>) =>
    setPending((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item))

  async function upload() {
    setBusy(true)
    let uploaded = 0
    for (const item of pending) {
      if (item.progress === 100 && !item.error) continue
      update(item.key, { progress: 0, error: null })
      const request = siteMediaApi.uploadSiteMedia(
        { file: item.file, section: section.id, slot: slot.id, altText: item.altText.trim(), focalX: item.focalX, focalY: item.focalY, itemId },
        (progress) => update(item.key, { progress }),
      )
      aborts.current.push(request.abort)
      try {
        const { warning } = await request.promise
        update(item.key, { progress: 100 })
        uploaded += 1
        if (warning) toast.warning(warning)
      } catch (err) {
        update(item.key, { progress: null, error: errorMessage(err) })
      }
    }
    setBusy(false)
    if (uploaded) {
      toast.success(uploaded === 1 ? 'Image converted to WebP and published.' : `${uploaded} images converted to WebP and published.`)
      onUploaded()
    }
    if (uploaded === pending.length) onClose()
  }

  const canUpload = pending.length > 0 && pending.every((item) => item.altText.trim()) && !busy
  const title = replacing ? `Replace ${slot.label.toLowerCase()}` : multiple ? `Add to ${slot.label.toLowerCase()}` : `Upload ${slot.label.toLowerCase()}`

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="admin-modal w-[min(100%,640px)] max-h-[92dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="site-media-upload-title">
        <div className="admin-modal__header">
          <div>
            <h2 id="site-media-upload-title">{title}</h2>
            <p>{section.label} · Recommended {slot.recommended.label}</p>
          </div>
          <AdminIconButton label="Close" disabled={busy} onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>

        {(multiple || pending.length === 0) && (
          <label
            className={`admin-upload-dropzone ${dropActive ? 'is-dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDropActive(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setDropActive(false) }}
            onDrop={(event) => { event.preventDefault(); setDropActive(false); void choose(event.dataTransfer.files) }}
          >
            <span className="admin-upload-dropzone__icon"><FileUp size={19} strokeWidth={1.8} aria-hidden="true" /></span>
            <strong>{multiple ? 'Drop images here, or click to browse' : 'Drop an image here, or click to browse'}</strong>
            <span>JPG, PNG or WebP · up to 10 MB · converted to WebP automatically</span>
            <input type="file" accept={SITE_MEDIA_ACCEPTED_TYPES.join(',')} multiple={multiple} onChange={(event) => { void choose(event.target.files); event.target.value = '' }} />
          </label>
        )}
        {error && <FormMessage type="error">{error}</FormMessage>}

        {pending.map((item, index) => {
          const warning = item.width ? recommendationWarning(slot.recommended, item.width, item.height) : null
          return (
            <div key={item.key} className="grid gap-3 border-t border-a-line pt-4 first-of-type:border-t-0">
              <FocalPointPicker
                src={item.previewUrl}
                alt={item.altText || 'Selected image preview'}
                x={item.focalX}
                y={item.focalY}
                onChange={(focalX, focalY) => update(item.key, { focalX, focalY })}
              />
              <p className="text-xs text-a-ink-2">{item.file.name} · {item.width} × {item.height} px · {formatSize(item.file.size)}</p>
              {warning && <p role="status" className="rounded-a-md bg-a-fill px-3 py-2 text-xs font-medium text-a-warning">{warning}</p>}
              <div className="admin-field">
                <label htmlFor={`site-media-alt-${index}`} className="admin-form-label">Alt text <span className="text-a-danger">*</span></label>
                <input
                  id={`site-media-alt-${index}`}
                  className={`admin-input ${item.altText.trim() ? '' : 'admin-input--error'}`}
                  value={item.altText}
                  maxLength={SITE_MEDIA_ALT_MAX}
                  required
                  aria-describedby={`site-media-alt-${index}-hint`}
                  onChange={(event) => update(item.key, { altText: event.target.value })}
                />
                <p id={`site-media-alt-${index}-hint`} className="admin-form-helper mt-1.5">Describe what’s in the image for people who can’t see it. Required.</p>
              </div>
              {item.progress !== null && (
                <div className="grid gap-1" aria-live="polite">
                  <div className="h-1.5 overflow-hidden rounded-full bg-a-fill" role="progressbar" aria-label={`Uploading ${item.file.name}`} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-a-accent transition-[width] duration-150" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="text-xs text-a-ink-2">{item.progress < 100 ? `Uploading… ${item.progress}%` : 'Converting and publishing…'}</span>
                </div>
              )}
              {item.error && <FormMessage type="error">{item.error}</FormMessage>}
              {!busy && (
                <AdminButton size="sm" variant="quiet" className="justify-self-start" icon={<X size={14} aria-hidden="true" />} onClick={() => setPending((current) => current.filter((entry) => entry.key !== item.key))}>
                  {multiple ? 'Remove from upload' : 'Choose a different image'}
                </AdminButton>
              )}
            </div>
          )
        })}

        <div className="admin-modal__actions">
          <AdminButton disabled={busy} onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" disabled={!canUpload} onClick={() => void upload()}>
            {busy ? 'Uploading…' : pending.length > 1 ? `Upload ${pending.length} images` : 'Upload and publish'}
          </AdminButton>
        </div>
      </section>
    </div>
  )
}

function EditDialog({ asset, onClose, onSaved }: { asset: SiteMediaAsset; onClose: () => void; onSaved: () => void }) {
  const [altText, setAltText] = useState(asset.altText)
  const [focal, setFocal] = useState({ x: asset.focalX, y: asset.focalY })
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await siteMediaApi.updateSiteMedia(asset.id, { altText: altText.trim(), focalX: focal.x, focalY: focal.y })
      toast.success('Saved. The website is updated.')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="admin-modal w-[min(100%,560px)] max-h-[92dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="site-media-edit-title">
        <div className="admin-modal__header">
          <div><h2 id="site-media-edit-title">Edit alt text and focal point</h2><p>Version {asset.version}</p></div>
          <AdminIconButton label="Close" onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>
        <FocalPointPicker src={asset.previewUrl} alt={asset.altText} x={focal.x} y={focal.y} onChange={(x, y) => setFocal({ x, y })} />
        <div className="admin-field">
          <label htmlFor="site-media-edit-alt" className="admin-form-label">Alt text <span className="text-a-danger">*</span></label>
          <input id="site-media-edit-alt" className="admin-input" value={altText} maxLength={SITE_MEDIA_ALT_MAX} required onChange={(event) => setAltText(event.target.value)} />
        </div>
        <div className="admin-modal__actions">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" disabled={busy || !altText.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</AdminButton>
        </div>
      </section>
    </div>
  )
}

function VersionsDialog({ item, onClose, onRestore }: { item: SiteMediaItem; onClose: () => void; onRestore: (asset: SiteMediaAsset) => void }) {
  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="admin-modal w-[min(100%,560px)]" role="dialog" aria-modal="true" aria-labelledby="site-media-versions-title">
        <div className="admin-modal__header">
          <div><h2 id="site-media-versions-title">Previous versions</h2><p>The last three uploads are kept.</p></div>
          <AdminIconButton label="Close" onClick={onClose}><X size={18} strokeWidth={1.8} /></AdminIconButton>
        </div>
        <ul className="grid gap-3">
          {item.versions.map((version) => (
            <li key={version.id} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already-optimized WebP */}
              <img src={version.previewUrl} alt={version.altText} className="size-16 shrink-0 rounded-a-md bg-a-fill object-cover" loading="lazy" />
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-semibold">Version {version.version}{version.isActive ? ' · live' : ''}</p>
                <p className="text-xs text-a-ink-2">{version.width} × {version.height} · {formatSize(version.sizeBytes)} · {formatDate(version.createdAt)}</p>
              </div>
              {!version.isActive && <AdminButton size="sm" icon={<Undo2 size={14} aria-hidden="true" />} onClick={() => onRestore(version)}>Restore</AdminButton>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** The built-in photo a slot shows until it's replaced, where the admin can know it. */
function builtInPreview(sectionId: string, slotId: string) {
  return sectionId === 'photography-page' ? photographyFrames[slotId as keyof typeof photographyFrames]?.thumb : undefined
}

function AssetPreview({ asset, label, fallbackSrc }: { asset: SiteMediaAsset | null; label: string; fallbackSrc?: string }) {
  if (!asset && fallbackSrc) {
    // eslint-disable-next-line @next/next/no-img-element -- small built-in thumbnail
    return <img src={fallbackSrc} alt={`Current built-in photo: ${label}`} loading="lazy" className="size-full object-cover" />
  }
  if (!asset) {
    return (
      <div className="grid size-full place-items-center bg-a-fill p-4 text-center text-xs text-a-ink-2">
        <span><ImagePlus size={20} className="mx-auto mb-2" aria-hidden="true" />Using the built-in default image</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already-optimized WebP
    <img
      src={asset.previewUrl}
      alt={asset.altText || label}
      loading="lazy"
      className="size-full object-cover"
      style={{ objectPosition: `${asset.focalX * 100}% ${asset.focalY * 100}%`, backgroundColor: asset.dominantColor ?? undefined }}
    />
  )
}

function AssetMeta({ asset }: { asset: SiteMediaAsset | null }) {
  if (!asset) return <p className="text-xs text-a-ink-2">Nothing uploaded yet.</p>
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-a-ink-2">
      <dt>Size</dt><dd className="text-a-ink">{asset.width} × {asset.height} px</dd>
      <dt>File</dt><dd className="text-a-ink">{asset.format.toUpperCase()} · {formatSize(asset.sizeBytes)}</dd>
      <dt>Updated</dt><dd className="text-a-ink">{formatDate(asset.updatedAt)}</dd>
      <dt>Alt text</dt><dd className="truncate text-a-ink" title={asset.altText}>{asset.altText}</dd>
    </dl>
  )
}

interface SlotActions {
  upload: (target: UploadTarget) => void
  edit: (asset: SiteMediaAsset) => void
  versions: (item: SiteMediaItem) => void
  remove: (asset: SiteMediaAsset, slot: SiteMediaSlotConfig) => void
  restorePrevious: (item: SiteMediaItem) => void
}

function SingleSlot({ section, slot, item, actions }: { section: SiteMediaSectionConfig; slot: SiteMediaSlotConfig; item: SiteMediaItem | undefined; actions: SlotActions }) {
  const active = item?.active ?? null
  const hasPrevious = Boolean(item?.versions.some((version) => !version.isActive))
  return (
    <article className="admin-card grid overflow-hidden md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="relative aspect-video bg-a-fill"><AssetPreview asset={active} label={slot.label} /></div>
      <div className="flex flex-col gap-3 p-5">
        <div>
          <h3 className="text-[15px] font-semibold">{slot.label}</h3>
          <p className="mt-0.5 text-xs text-a-ink-2">{slot.description}</p>
          <p className="mt-1 text-xs text-a-ink-2">Recommended: {slot.recommended.label}</p>
        </div>
        <AssetMeta asset={active} />
        <div className="mt-auto flex flex-wrap gap-2">
          <AdminButton size="sm" variant="primary" icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => actions.upload({ section, slot, replacing: active })}>{active ? 'Replace' : 'Upload'}</AdminButton>
          {active && <AdminButton size="sm" icon={<Pencil size={14} aria-hidden="true" />} onClick={() => actions.edit(active)}>Edit alt text</AdminButton>}
          {item && hasPrevious && <AdminButton size="sm" icon={<Undo2 size={14} aria-hidden="true" />} onClick={() => actions.restorePrevious(item)}>Restore previous</AdminButton>}
          {item && item.versions.length > 1 && <AdminButton size="sm" variant="quiet" icon={<History size={14} aria-hidden="true" />} onClick={() => actions.versions(item)}>Versions</AdminButton>}
          {active && <AdminButton size="sm" variant="quiet" className="text-a-danger" icon={<Trash2 size={14} aria-hidden="true" />} onClick={() => actions.remove(active, slot)}>Remove</AdminButton>}
        </div>
      </div>
    </article>
  )
}

/** A small card for sections with many single slots, such as the Photography page. */
function CompactSlot({ section, slot, item, actions }: { section: SiteMediaSectionConfig; slot: SiteMediaSlotConfig; item: SiteMediaItem | undefined; actions: SlotActions }) {
  const active = item?.active ?? null
  return (
    <li className="admin-card overflow-hidden">
      <div className="relative aspect-[4/3] bg-a-fill">
        <AssetPreview asset={active} label={slot.label} fallbackSrc={builtInPreview(section.id, slot.id)} />
        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">{active ? 'Replaced' : 'Original'}</span>
      </div>
      <div className="grid gap-2 p-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold" title={slot.label}>{slot.label}</h3>
        <p className="text-xs text-a-ink-2">{slot.description}</p>
        {active && <p className="text-xs text-a-ink-2">{active.width} × {active.height} px · {formatSize(active.sizeBytes)} · {formatDate(active.updatedAt)}</p>}
        <div className="flex flex-wrap gap-1">
          <AdminButton size="sm" variant={active ? 'secondary' : 'primary'} icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => actions.upload({ section, slot, replacing: active })}>Replace</AdminButton>
          {active && <AdminIconButton label="Edit alt text" onClick={() => actions.edit(active)}><Pencil size={15} /></AdminIconButton>}
          {item && item.versions.length > 1 && <AdminIconButton label="Restore previous version" onClick={() => actions.versions(item)}><Undo2 size={15} /></AdminIconButton>}
          {active && <AdminIconButton label="Remove (bring back the original)" className="text-a-danger" onClick={() => actions.remove(active, slot)}><Trash2 size={15} /></AdminIconButton>}
        </div>
      </div>
    </li>
  )
}

function GallerySlot({ section, slot, items, actions, onReorder }: { section: SiteMediaSectionConfig; slot: SiteMediaSlotConfig; items: SiteMediaItem[]; actions: SlotActions; onReorder: (itemIds: string[]) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [order, setOrder] = useState(items.map((item) => item.itemId))
  // Fresh data from the server resets the local (dragged) order.
  const [syncedItems, setSyncedItems] = useState(items)
  if (syncedItems !== items) {
    setSyncedItems(items)
    setOrder(items.map((item) => item.itemId))
  }
  const byId = useMemo(() => new Map(items.map((item) => [item.itemId, item])), [items])
  const full = Boolean(slot.maxItems && items.length >= slot.maxItems)

  function onDragOver(event: DragEvent, overId: string) {
    event.preventDefault()
    if (!dragging || dragging === overId) return
    setOrder((current) => {
      const next = current.filter((id) => id !== dragging)
      next.splice(next.indexOf(overId) + (current.indexOf(dragging) < current.indexOf(overId) ? 1 : 0), 0, dragging)
      return next
    })
  }

  function move(itemId: string, delta: number) {
    const index = order.indexOf(itemId)
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    next.splice(index, 1)
    next.splice(target, 0, itemId)
    setOrder(next)
    onReorder(next)
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">{slot.label}</h3>
          <p className="mt-0.5 text-xs text-a-ink-2">{slot.description} Recommended: {slot.recommended.label}.</p>
        </div>
        <AdminButton variant="primary" size="sm" disabled={full} icon={<ImagePlus size={14} aria-hidden="true" />} onClick={() => actions.upload({ section, slot })}>
          {full ? `Gallery full (${slot.maxItems})` : 'Add images'}
        </AdminButton>
      </div>
      {items.length === 0 && (
        <div className="admin-card admin-empty-state">
          <span className="admin-empty-state__icon"><ImagePlus size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <p className="admin-empty-state__title">The site is showing its built-in photographs</p>
          <p className="admin-empty-state__description">{slot.description}</p>
        </div>
      )}
      {slot.minItems && items.length > 0 && items.length < slot.minItems && (
        <p role="status" className="rounded-a-md bg-a-fill px-3 py-2 text-xs font-medium text-a-warning">
          Add {slot.minItems - items.length} more {slot.minItems - items.length === 1 ? 'image' : 'images'} to replace the built-in set. Until then the website keeps showing its original photos.
        </p>
      )}
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4" aria-label={`${slot.label}, in display order`}>
        {order.map((itemId, index) => {
          const item = byId.get(itemId)
          if (!item) return null
          const active = item.active
          const position = slot.positions?.[index]
          return (
            <li
              key={itemId}
              draggable
              onDragStart={(event) => { setDragging(itemId); event.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(event) => onDragOver(event, itemId)}
              onDragEnd={() => { setDragging(null); if (order.join() !== items.map((entry) => entry.itemId).join()) onReorder(order) }}
              className={`admin-card overflow-hidden transition-opacity ${dragging === itemId ? 'opacity-50' : ''}`}
            >
              <div className="relative aspect-[4/3] bg-a-fill">
                <AssetPreview asset={active} label={slot.label} />
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                  <GripVertical size={12} aria-hidden="true" />{index + 1}{slot.positions ? (position ? ` · ${position}` : ' · not shown') : ''}
                </span>
              </div>
              <div className="grid gap-2 p-3">
                <AssetMeta asset={active} />
                <div className="flex flex-wrap gap-1">
                  <AdminIconButton label="Move earlier" disabled={index === 0} onClick={() => move(itemId, -1)}><span aria-hidden="true">←</span></AdminIconButton>
                  <AdminIconButton label="Move later" disabled={index === order.length - 1} onClick={() => move(itemId, 1)}><span aria-hidden="true">→</span></AdminIconButton>
                  <AdminIconButton label="Replace" onClick={() => actions.upload({ section, slot, itemId, replacing: active })}><RefreshCw size={15} /></AdminIconButton>
                  {active && <AdminIconButton label="Edit alt text" onClick={() => actions.edit(active)}><Pencil size={15} /></AdminIconButton>}
                  {item.versions.length > 1 && <AdminIconButton label="Restore previous version" onClick={() => actions.versions(item)}><Undo2 size={15} /></AdminIconButton>}
                  {active && <AdminIconButton label="Delete" className="text-a-danger" onClick={() => actions.remove(active, slot)}><Trash2 size={15} /></AdminIconButton>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Media Manager: replace the images used on the public site, section by section. */
function SiteMediaManager() {
  const { admin } = useAdminAuth()
  const isAdmin = admin?.role === 'admin'
  const [sectionId, setSectionId] = useState(SITE_MEDIA_SECTIONS[0].id)
  const [state, setState] = useState<siteMediaApi.SiteMediaSectionState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
  const [editing, setEditing] = useState<SiteMediaAsset | null>(null)
  const [versionsOf, setVersionsOf] = useState<SiteMediaItem | null>(null)
  const { confirm, dialog } = useConfirm()

  const load = useCallback(async () => {
    try {
      const { sections } = await siteMediaApi.listSiteMedia()
      setState(sections)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    siteMediaApi.listSiteMedia().then(
      ({ sections }) => { if (!cancelled) { setState(sections); setLoading(false) } },
      (err: unknown) => { if (!cancelled) { setError(errorMessage(err)); setLoading(false) } },
    )
    return () => { cancelled = true }
  }, [isAdmin])

  const section = SITE_MEDIA_SECTIONS.find((item) => item.id === sectionId) ?? SITE_MEDIA_SECTIONS[0]
  const itemsFor = (slotId: string) => state.find((item) => item.id === section.id)?.slots.find((slot) => slot.id === slotId)?.items ?? []

  async function restore(asset: SiteMediaAsset) {
    try {
      await siteMediaApi.restoreSiteMedia(asset.id)
      toast.success(`Version ${asset.version} restored. The website is updated.`)
      setVersionsOf(null)
      await load()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const actions: SlotActions = {
    upload: setUploadTarget,
    edit: setEditing,
    versions: setVersionsOf,
    restorePrevious(item) {
      const previous = item.versions.find((version) => !version.isActive)
      if (previous) void restore(previous)
    },
    async remove(asset, slot) {
      const gallery = slot.kind === 'gallery'
      const ok = await confirm({
        title: gallery ? 'Delete this image?' : `Remove the ${slot.label.toLowerCase()}?`,
        message: gallery
          ? 'It leaves the gallery and its previous versions are deleted. This can’t be undone.'
          : 'The website goes back to its built-in default image. You can restore this one later from Versions.',
        confirmLabel: gallery ? 'Delete' : 'Remove',
        tone: 'danger',
      })
      if (!ok) return
      try {
        await siteMediaApi.removeSiteMedia(asset.id)
        toast.success(gallery ? 'Image deleted.' : 'Removed. The default image is back.')
        await load()
      } catch (err) {
        toast.error(errorMessage(err))
      }
    },
  }

  async function reorder(slot: SiteMediaSlotConfig, itemIds: string[]) {
    try {
      await siteMediaApi.reorderSiteMedia(section.id, slot.id, itemIds)
      toast.success('New order saved.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
    await load()
  }

  const header = (
    <AdminPageHeader
      title="Media Manager"
      description="Replace the images on the website. Uploads are converted to fast-loading WebP automatically."
      actions={<Link to="/admin/media/library" className="admin-button">Article media library</Link>}
    />
  )

  if (!isAdmin) {
    return (
      <div>
        {header}
        <FormMessage type="error">Only administrators can change the website’s images. You can still use the article media library.</FormMessage>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div className="admin-segmented-control mb-5" role="tablist" aria-label="Website sections">
        {SITE_MEDIA_SECTIONS.map((item) => (
          <button key={item.id} type="button" role="tab" id={`site-media-tab-${item.id}`} aria-controls="site-media-panel" aria-selected={item.id === section.id} onClick={() => setSectionId(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><FormMessage type="error">{error}</FormMessage></div>}
      <div id="site-media-panel" role="tabpanel" aria-labelledby={`site-media-tab-${section.id}`} aria-busy={loading} className="grid gap-6">
        <p className="text-[13.5px] text-a-ink-2">{section.description}</p>
        {loading ? <span className="admin-skeleton aspect-[16/6] rounded-a-lg" /> : section.compact ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4" aria-label={`${section.label} images`}>
            {section.slots.map((slot) => <CompactSlot key={slot.id} section={section} slot={slot} item={itemsFor(slot.id)[0]} actions={actions} />)}
          </ul>
        ) : section.slots.map((slot) => slot.kind === 'single'
          ? <SingleSlot key={slot.id} section={section} slot={slot} item={itemsFor(slot.id)[0]} actions={actions} />
          : <GallerySlot key={slot.id} section={section} slot={slot} items={itemsFor(slot.id)} actions={actions} onReorder={(itemIds) => void reorder(slot, itemIds)} />)}
      </div>

      {uploadTarget && <UploadDialog target={uploadTarget} onClose={() => setUploadTarget(null)} onUploaded={() => void load()} />}
      {editing && <EditDialog asset={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />}
      {versionsOf && <VersionsDialog item={versionsOf} onClose={() => setVersionsOf(null)} onRestore={(asset) => void restore(asset)} />}
      {dialog}
    </div>
  )
}

export default SiteMediaManager
