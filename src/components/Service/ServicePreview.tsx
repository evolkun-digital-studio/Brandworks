'use client'

import Image from 'next/image'
import images from './service-images.json'

type Props = {
  activeIndex: number
  titles: string[]
  onImageReady: (index: number) => void
}

export default function ServicePreview({ activeIndex, titles, onImageReady }: Props) {
  return (
    <aside aria-hidden="true" className="hidden lg:block lg:-translate-x-10 transition-transform duration-500 ease-out motion-reduce:transition-none">
      <div className="sticky top-[10svh]">
        <div className="service-preview relative h-[80svh] overflow-hidden rounded-[18px] ml-[5rem] w-[clamp(400px,40vw,560px)]">
          {titles.map((title, index) => (
            <Image key={title} {...images[index]} alt="" fill
              sizes="(max-width: 1023px) 1px, (max-width: 1280px) 40vw, 456px"
              preload={index === 0} loading={index === 0 ? undefined : 'eager'}
              fetchPriority={index === 0 ? undefined : 'low'}
              onLoad={() => onImageReady(index)}
              className={`service-preview__image ${index === activeIndex ? 'is-active' : ''}`}
              placeholder="blur" />
          ))}
          <div className="service-preview__gradient" />
          <p key={activeIndex} className="service-preview__title pointer-events-none absolute bottom-6 left-6 z-20 max-w-[90%] text-[clamp(1.5rem,2vw,1.875rem)] font-medium leading-[1.05] tracking-[-0.03em] text-white">
            {titles[activeIndex]}
          </p>
        </div>
      </div>
    </aside>
  )
}
