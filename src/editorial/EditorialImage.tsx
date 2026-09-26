import { useState } from 'react'

export function EditorialImage({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return <div className={`editorial-image ${loaded ? 'is-loaded' : ''} ${className}`}><span className="image-skeleton" aria-hidden="true" /><img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} /></div>
}
