'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import images from './service-images.json'

type Props = {
  service: { slug: string; title: string; shortTitle?: string; description: string; imageAlt: string }
  index: number
  onIntent: (index: number) => void
  onCancel: () => void
  onActivate: (index: number) => void
}

export default memo(function ServiceRow({ service, index, onIntent, onCancel, onActivate }: Props) {
  return (
    <li className="service-index-row border-b border-neutral-200"
      onPointerEnter={event => { if (event.pointerType !== 'touch') onIntent(index) }}
      onPointerLeave={onCancel} onFocus={() => onActivate(index)}>
      <Link href={`/services/${service.slug}`} prefetch
        className="service-index-row__link group grid min-h-[84px] grid-cols-[1fr_auto] items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-4 sm:min-h-[94px] sm:grid-cols-[minmax(190px,0.72fr)_minmax(240px,1fr)_auto] sm:gap-5">
        <span className="service-index-row__name text-[20px] font-medium leading-tight tracking-[-0.025em] sm:text-[22px]">{service.shortTitle ?? service.title}</span>
        <span className="service-index-row__description hidden max-w-[410px] text-sm leading-6 sm:block">{service.description}</span>
        <span aria-hidden="true" className="service-index-row__arrow">↗</span>
      </Link>
      <details className="service-index-row__mobile lg:hidden">
        <summary className="cursor-pointer pb-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-4">Preview {service.shortTitle ?? service.title}</summary>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image {...images[index]} alt={service.imageAlt} fill sizes="(max-width: 1023px) 90vw, 1px" placeholder="blur" className="object-cover" />
        </div>
        <p className="py-4 text-sm leading-6 text-neutral-600 sm:hidden">{service.description}</p>
      </details>
    </li>
  )
})
