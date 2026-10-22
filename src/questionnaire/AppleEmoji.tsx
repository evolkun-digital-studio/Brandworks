'use client'

import { useState } from 'react'

const CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64'

/** "⚖️" → "2696-fe0f", the file name emoji-datasource uses. */
const codepoints = (emoji: string) => Array.from(emoji, (ch) => ch.codePointAt(0)!.toString(16)).join('-')

/**
 * An emoji drawn in Apple's style on every device (Android and Windows
 * included), decorative only. Falls back to the system emoji if the image
 * can't load.
 */
export default function AppleEmoji({ emoji, size = 20, className = '' }: { emoji: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span aria-hidden="true" className={className} style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny decorative CDN sprite, no optimisation needed
    <img
      src={`${CDN}/${codepoints(emoji)}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 select-none align-[-0.2em] ${className}`}
    />
  )
}
