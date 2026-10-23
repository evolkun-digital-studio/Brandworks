declare const process: { readonly env: { readonly NEXT_PUBLIC_APP_RUNTIME?: string } }

/** Widths Next's image optimizer accepts by default (imageSizes + deviceSizes). */
export type PreviewWidth = 256 | 384 | 640 | 1080 | 1200

/**
 * Uploaded originals can be many megabytes. For on-screen previews of images
 * served from /api/media/, ask Next's optimizer for a right-sized WebP instead.
 * Anything else (external images, the legacy Vite runtime) is used as-is.
 */
export function previewUrl(source: string, width: PreviewWidth): string {
  if (!source || process.env.NEXT_PUBLIC_APP_RUNTIME === 'vite' || typeof window === 'undefined') return source
  try {
    const url = new URL(source, window.location.origin)
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/media/')) {
      return `/_next/image?url=${encodeURIComponent(url.pathname)}&w=${width}&q=75`
    }
  } catch {
    // Not a parseable address: fall through to the original.
  }
  return source
}

export function isOptimizedPreview(source: string): boolean {
  return source.startsWith('/_next/image?')
}
