// Outline icons for the Instagram-style reel screen (ReelFeed.tsx).
// All drawn on a 24px grid with `currentColor`, so CSS sizes and tints them.

type IconProps = { filled?: boolean }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function HeartIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16.8 3.5c-2 0-3.6 1.1-4.8 2.8-1.2-1.7-2.8-2.8-4.8-2.8C4.3 3.5 2 5.9 2 8.9c0 5.4 7.4 10.3 10 11.6 2.6-1.3 10-6.2 10-11.6 0-3-2.3-5.4-5.2-5.4z"
        {...stroke}
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

export function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.7 16.9a9.5 9.5 0 1 0-3.6 3.5l4.4 1.1z" {...stroke} />
    </svg>
  )
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 3 9.2 10.8M22 3l-6.6 18-3.2-8.2L2 9.5z" {...stroke} />
    </svg>
  )
}

export function SaveIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 21l-7-6.3L5 21V3h14z" {...stroke} fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2.2h5.8L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" {...stroke} />
      <circle cx="12" cy="12.8" r="3.6" {...stroke} />
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" {...stroke} strokeWidth={2.4} />
    </svg>
  )
}

export function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V5l11-2v13" {...stroke} />
      <circle cx="6" cy="18" r="3" {...stroke} />
      <circle cx="17" cy="16" r="3" {...stroke} />
    </svg>
  )
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </svg>
  )
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" {...stroke} />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" {...stroke} />
    </svg>
  )
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" {...stroke} />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7" {...stroke} />
      <path d="m16 16 5 5" {...stroke} />
    </svg>
  )
}

export function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" {...stroke} />
      <path d="M12 8v8M8 12h8" {...stroke} />
    </svg>
  )
}

export function ReelsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" {...stroke} />
      <path d="M3 8.5h18M9 3l3 5.5M15 3l3 5.5" {...stroke} />
      <path d="M10 12.2v5l4.3-2.5z" fill="currentColor" />
    </svg>
  )
}

export function SwipeHandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 11v-1a2 2 0 0 0-4 0M14 10V9a2 2 0 0 0-4 0v1M10 9.5V4a2 2 0 0 0-4 0v10" {...stroke} strokeWidth={1.7} />
      <path
        d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"
        {...stroke}
        strokeWidth={1.7}
      />
    </svg>
  )
}

export function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 15 6-6 6 6" {...stroke} strokeWidth={2.4} />
    </svg>
  )
}

export function SignalIcons() {
  return (
    <svg viewBox="0 0 54 13" aria-hidden="true">
      <g fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="0.8" />
        <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8" />
        <rect x="9" y="3" width="3" height="9" rx="0.8" />
        <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" />
        <path d="M28 2.2a9.6 9.6 0 0 1 6.8 2.8l-1.3 1.3A7.8 7.8 0 0 0 28 4a7.8 7.8 0 0 0-5.5 2.3L21.2 5A9.6 9.6 0 0 1 28 2.2zm0 3.7a5.9 5.9 0 0 1 4.2 1.7l-1.3 1.3A4.1 4.1 0 0 0 28 7.7a4.1 4.1 0 0 0-2.9 1.2l-1.3-1.3A5.9 5.9 0 0 1 28 5.9zm0 3.7 1.6 1.6L28 12.8l-1.6-1.6z" />
        <rect x="38.5" y="1" width="13" height="10" rx="2.6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
        <rect x="40" y="2.5" width="9.4" height="7" rx="1.5" />
        <rect x="52.3" y="4.2" width="1.4" height="3.6" rx="0.6" opacity="0.45" />
      </g>
    </svg>
  )
}
