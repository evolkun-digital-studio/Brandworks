/**
 * Which opening the visitor gets:
 *
 * - full     first page load of the browser session, or a reload
 * - brief    any other full page load in the same session (~0.5s)
 * - reduced  prefers-reduced-motion: a static lockup for ~0.5s, then a fade
 * - none     reduced motion on a repeat load, or a second mount within the
 *            same page load (e.g. coming back from /admin) — client-side
 *            route changes never replay it either, since PublicLayout
 *            (and so the Preloader) stays mounted across them
 */
export type IntroMode = 'full' | 'brief' | 'reduced' | 'none'

const SEEN_KEY = 'bw:intro-seen'
let playedThisLoad = false

function seenThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function isReload(): boolean {
  const [entry] = (performance.getEntriesByType?.('navigation') ?? []) as PerformanceNavigationTiming[]
  return entry?.type === 'reload'
}

export function resolveIntroMode(): IntroMode {
  if (playedThisLoad) return 'none'
  const seen = seenThisSession()
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return seen ? 'none' : 'reduced'
  return !seen || isReload() ? 'full' : 'brief'
}

/** Called once an opening actually starts playing. */
export function markIntroPlayed() {
  playedThisLoad = true
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage blocked (private mode, sandboxed iframe): every load is a "first" one.
  }
}
