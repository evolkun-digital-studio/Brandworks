import type { HeroImage } from '../../data/heroServices'

export type ImagePriority = 'high' | 'low'

export function HeroImg({
  image,
  sizes,
  priority,
  loading = 'eager',
  className = '',
}: {
  image: HeroImage
  sizes: string
  priority: ImagePriority
  loading?: 'eager' | 'lazy'
  className?: string
}) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={loading}
      decoding="async"
      fetchPriority={priority}
      draggable={false}
      className={`hero-img ${className}`}
      style={image.position ? { objectPosition: image.position } : undefined}
    />
  )
}
