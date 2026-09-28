import { useLayoutEffect, useRef, useState } from 'react'
import { imageSources } from './format'

const WIDTHS = [480, 800, 1200, 1600, 2000]

type Props = {
  src: string
  alt: string
  /** Rendered width hint for the browser's srcset choice. */
  sizes?: string
  /** Above-the-fold: eager, high priority, no async decode. */
  priority?: boolean
  className?: string
}

/**
 * The frame reserves its box through CSS aspect-ratio (see
 * Editorial.css), so there is no layout shift. The frame itself is the
 * skeleton: a flat neutral surface with a slow pulse that stops, and
 * the photograph crossfades in, once the file has decoded.
 */
export function EditorialImage({ src, alt, sizes = '100vw', priority = false, className = '' }: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  // A cached image can finish before React attaches onLoad; checking
  // before paint also avoids a needless fade when it's already there.
  useLayoutEffect(() => {
    const img = ref.current
    setState(img?.complete && img.naturalWidth > 0 ? 'loaded' : 'loading')
  }, [src])

  const { src: fallback, srcSet } = imageSources(src, WIDTHS)

  return (
    <div className={`ed-image is-${state} ${className}`}>
      <img
        ref={ref}
        src={fallback}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? undefined : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
      />
    </div>
  )
}
