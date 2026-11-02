import { useEffect, useState } from 'react'
import { ImageOff, LoaderCircle } from 'lucide-react'

export interface VerifiedImage {
  url: string
  width: number | null
  height: number | null
}

type Probe =
  | { state: 'failed'; url: string }
  | ({ state: 'ready' } & VerifiedImage)

type Check =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'loading'; url: string }
  | Probe

function toImageAddress(value: string): string | null {
  const raw = value.trim()
  if (/^https?:\/\/[^\s/]+\S*$/i.test(raw)) return raw
  if (/^[^\s:/]+\.[^\s/]{2,}\S*$/.test(raw)) return `https://${raw}`
  return null
}

/** Checks the address by really loading it, and shows the result before anything is inserted. */
function ImageUrlPanel({ onContinue }: { onContinue: (image: VerifiedImage) => void }) {
  const [value, setValue] = useState('')
  // Only the outcome of loading is state; everything else follows from what was typed.
  const [probe, setProbe] = useState<Probe | null>(null)
  const raw = value.trim()
  const url = raw ? toImageAddress(raw) : null
  const check: Check = !raw
    ? { state: 'idle' }
    : !url
      ? { state: 'invalid', message: 'Enter a full web address that starts with https://' }
      : probe?.url === url ? probe : { state: 'loading', url }

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const image = new Image()
    const timer = window.setTimeout(() => {
      image.onload = () => {
        if (!cancelled) setProbe({ state: 'ready', url, width: image.naturalWidth || null, height: image.naturalHeight || null })
      }
      image.onerror = () => { if (!cancelled) setProbe({ state: 'failed', url }) }
      image.src = url
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
    }
  }, [url])

  function submit() {
    if (check.state === 'ready') onContinue({ url: check.url, width: check.width, height: check.height })
  }

  return (
    <div className="flex flex-col gap-2 p-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit() } }}>
      <label htmlFor="rte-image-url" className="admin-form-label mb-0">Image address</label>
      <input
        id="rte-image-url"
        className={`admin-input ${check.state === 'invalid' || check.state === 'failed' ? 'admin-input--error' : ''}`}
        autoFocus
        placeholder="https://"
        value={value}
        aria-describedby="rte-image-url-status"
        onChange={(event) => setValue(event.target.value)}
      />
      <div id="rte-image-url-status" role="status">
        {check.state === 'invalid' && <p className="m-0 text-xs text-a-danger">{check.message}</p>}
        {check.state === 'failed' && <p className="m-0 flex items-start gap-1.5 text-xs text-a-danger"><ImageOff size={13} className="mt-px flex-none" aria-hidden="true" /> No image could be loaded from this address. Check that it points directly to an image file.</p>}
        {check.state === 'loading' && <p className="m-0 flex items-center gap-1.5 text-xs text-a-ink-2"><LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> Checking the image…</p>}
        {check.state === 'ready' && (
          <figure className="m-0 overflow-hidden rounded-a-sm bg-a-fill">
            <img src={check.url} alt="Preview of the image at this address" className="block max-h-40 w-full object-contain" />
            {check.width && check.height && <figcaption className="px-2 py-1 text-[11px] text-a-ink-2 tabular-nums">{check.width} × {check.height}</figcaption>}
          </figure>
        )}
      </div>
      <button type="button" className="admin-button admin-button--primary admin-button--sm self-end" disabled={check.state !== 'ready'} onClick={submit}>Continue</button>
    </div>
  )
}

export default ImageUrlPanel
