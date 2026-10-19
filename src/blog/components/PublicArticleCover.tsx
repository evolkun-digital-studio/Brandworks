'use client'

import { useState } from 'react'

export default function PublicArticleCover({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <div className="mt-10 flex aspect-[16/9] w-full items-center justify-center rounded-[16px] bg-neutral-100 text-[13px] text-neutral-400">Image unavailable</div>
  }

  return <img src={src} alt={alt} loading="eager" fetchPriority="high" onError={() => setFailed(true)} className="mt-10 aspect-[16/9] w-full rounded-[16px] object-cover" />
}

