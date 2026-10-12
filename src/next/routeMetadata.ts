import type { Metadata } from 'next'

/** Build the same server-visible metadata shape for existing public routes. */
export function routeMetadata(title: string, path: string, description?: string, image?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      url: path,
      ...(description ? { description } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      ...(description ? { description } : {}),
      ...(image ? { images: [image] } : {}),
    },
  }
}
