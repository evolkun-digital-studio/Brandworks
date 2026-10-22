import type { ReactNode } from 'react'
import type { VisualKey } from './flow'

/**
 * Tiny drawings for the visual-card questions. Each is a 160×100 sketch of
 * what the option means, not a decoration: a booking site shows a calendar,
 * "premium" shows dark ground and fine gold rules. Ink uses currentColor so
 * cards can invert when selected; the lime is the site's one accent.
 */
const LIME = 'var(--color-bw-lime)'
const INK = 'currentColor'

function Frame({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <svg viewBox="0 0 160 100" className="block h-full w-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="159" height="99" rx="6" fill={dark ? '#111' : '#fff'} stroke={INK} strokeOpacity="0.14" />
      {children}
    </svg>
  )
}

function BrowserBar() {
  return (
    <g>
      <rect x="10" y="9" width="140" height="6" rx="3" fill={INK} fillOpacity="0.07" />
      <circle cx="15" cy="12" r="1.6" fill={INK} fillOpacity="0.3" />
      <circle cx="20" cy="12" r="1.6" fill={INK} fillOpacity="0.3" />
    </g>
  )
}

export function OptionVisual({ visual }: { visual: VisualKey }) {
  switch (visual) {
    case 'business':
      return (
        <Frame>
          <BrowserBar />
          <rect x="14" y="26" width="70" height="8" rx="2" fill={INK} fillOpacity="0.85" />
          <rect x="14" y="38" width="54" height="8" rx="2" fill={INK} fillOpacity="0.85" />
          <rect x="14" y="52" width="62" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
          <rect x="14" y="58" width="48" height="3" rx="1.5" fill={INK} fillOpacity="0.25" />
          <rect x="14" y="70" width="34" height="11" rx="5.5" fill={LIME} />
          <rect x="96" y="26" width="50" height="56" rx="4" fill={INK} fillOpacity="0.08" />
          <path d="M106 70l10-12 8 8 6-6 10 10z" fill={INK} fillOpacity="0.2" />
        </Frame>
      )
    case 'store':
      return (
        <Frame>
          <BrowserBar />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${14 + i * 34} 24)`}>
              <rect width="28" height="34" rx="3" fill={INK} fillOpacity={i === 1 ? 0.18 : 0.08} />
              <rect y="39" width="22" height="3" rx="1.5" fill={INK} fillOpacity="0.4" />
              <rect y="45" width="12" height="3" rx="1.5" fill={INK} fillOpacity="0.8" />
            </g>
          ))}
          <rect x="112" y="80" width="34" height="10" rx="5" fill={LIME} />
        </Frame>
      )
    case 'booking':
      return (
        <Frame>
          <BrowserBar />
          {Array.from({ length: 21 }).map((_, i) => {
            const x = 14 + (i % 7) * 12
            const y = 26 + Math.floor(i / 7) * 12
            const on = i === 9
            return <rect key={i} x={x} y={y} width="9" height="9" rx="2" fill={on ? LIME : INK} fillOpacity={on ? 1 : 0.1} />
          })}
          {['10:00', '11:30', '15:00'].map((_, i) => (
            <rect key={i} x="104" y={26 + i * 13} width="42" height="9" rx="4.5" fill={i === 1 ? INK : 'none'} stroke={INK} strokeOpacity={i === 1 ? 1 : 0.25} />
          ))}
          <rect x="14" y="68" width="78" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
          <rect x="14" y="76" width="40" height="11" rx="5.5" fill={INK} fillOpacity="0.85" />
        </Frame>
      )
    case 'platform':
      return (
        <Frame>
          <circle cx="80" cy="52" r="12" fill={LIME} />
          {[[30, 26], [130, 26], [30, 78], [130, 78], [80, 16]].map(([x, y], i) => (
            <g key={i}>
              <line x1="80" y1="52" x2={x} y2={y} stroke={INK} strokeOpacity="0.25" strokeDasharray="3 3" />
              <circle cx={x} cy={y} r="8" fill="#fff" stroke={INK} strokeOpacity="0.5" />
              <circle cx={x} cy={y - 2} r="2.4" fill={INK} fillOpacity="0.6" />
            </g>
          ))}
        </Frame>
      )
    case 'unsure':
      return (
        <Frame>
          <circle cx="80" cy="50" r="24" fill="none" stroke={INK} strokeOpacity="0.35" strokeDasharray="4 4" />
          <text x="80" y="60" textAnchor="middle" fontSize="28" fontFamily="var(--font-secondary)" fill={INK}>?</text>
          <path d="M116 26l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill={LIME} stroke={INK} strokeOpacity="0.4" strokeWidth="0.6" />
          <path d="M44 70l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6z" fill={INK} fillOpacity="0.5" />
        </Frame>
      )
    case 'minimal':
      return (
        <Frame>
          <rect x="24" y="40" width="58" height="4" rx="2" fill={INK} fillOpacity="0.8" />
          <rect x="24" y="50" width="38" height="2" rx="1" fill={INK} fillOpacity="0.3" />
          <line x1="24" y1="72" x2="136" y2="72" stroke={INK} strokeOpacity="0.15" />
          <circle cx="132" cy="30" r="3" fill={LIME} stroke={INK} strokeOpacity="0.3" strokeWidth="0.5" />
        </Frame>
      )
    case 'bold':
      return (
        <Frame>
          <rect x="10" y="10" width="140" height="56" rx="3" fill={INK} />
          <text x="18" y="54" fontSize="38" fontWeight="800" fontFamily="var(--font-secondary)" fill="#fff" letterSpacing="-2">BIG.</text>
          <rect x="10" y="74" width="66" height="16" rx="2" fill={LIME} />
          <rect x="84" y="78" width="66" height="8" rx="2" fill={INK} fillOpacity="0.15" />
        </Frame>
      )
    case 'trendy':
      return (
        <Frame>
          <defs>
            <linearGradient id="bw-q-trendy" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#cefd10" />
              <stop offset="1" stopColor="#ff7ac6" />
            </linearGradient>
          </defs>
          <path d="M96 18c22-6 44 10 40 32s-30 36-52 26-14-52 12-58z" fill="url(#bw-q-trendy)" />
          <rect x="18" y="34" width="56" height="7" rx="3.5" fill={INK} fillOpacity="0.85" />
          <rect x="18" y="46" width="40" height="7" rx="3.5" fill={INK} fillOpacity="0.85" />
          <rect x="18" y="64" width="30" height="12" rx="6" fill="none" stroke={INK} />
        </Frame>
      )
    case 'premium':
      return (
        <Frame dark>
          <line x1="22" y1="26" x2="138" y2="26" stroke="#c9a96e" strokeOpacity="0.6" strokeWidth="0.6" />
          <text x="80" y="60" textAnchor="middle" fontSize="24" fontFamily="Georgia, 'Times New Roman', serif" fill="#e9dcc0" letterSpacing="4">MAISON</text>
          <line x1="22" y1="74" x2="138" y2="74" stroke="#c9a96e" strokeOpacity="0.6" strokeWidth="0.6" />
          <rect x="66" y="80" width="28" height="6" rx="3" fill="none" stroke="#c9a96e" strokeWidth="0.8" />
        </Frame>
      )
    case 'playful':
      return (
        <Frame>
          <circle cx="40" cy="40" r="16" fill={LIME} />
          <circle cx="62" cy="62" r="11" fill="#ff7ac6" />
          <rect x="94" y="22" width="34" height="34" rx="10" fill="#6aa8ff" transform="rotate(12 111 39)" />
          <path d="M20 80c10-8 20 8 30 0s20 8 30 0 20 8 30 0 20 8 30 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        </Frame>
      )
    case 'creative':
      return (
        <Frame>
          <rect x="22" y="20" width="44" height="54" fill={INK} fillOpacity="0.85" transform="rotate(-6 44 47)" />
          <rect x="58" y="30" width="46" height="40" fill={LIME} transform="rotate(5 81 50)" />
          <rect x="98" y="18" width="38" height="48" fill="none" stroke={INK} strokeWidth="1.2" transform="rotate(-3 117 42)" />
          <circle cx="120" cy="78" r="7" fill="#ff7ac6" />
        </Frame>
      )
    case 'animated':
      return (
        <Frame>
          <g className="bw-q-anim">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={18} y={22 + i * 15} width={i % 2 ? 90 : 120} height="6" rx="3" fill={i === 1 ? LIME : INK} fillOpacity={i === 1 ? 1 : 0.75}
                style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </g>
          <circle cx="138" cy="80" r="6" fill={INK} className="bw-q-pulse" />
        </Frame>
      )
    default:
      return null
  }
}
