/**
 * Loads an external script at most once, identified by a stable DOM
 * id — not by counting calls. This is what actually guarantees "no
 * duplicate script insertion" (Phase 12, Parts 3/6/7/9) regardless of
 * how many times a provider's `init()` happens to be called (React
 * StrictMode double-invokes effects in development; multiple
 * navigations could otherwise call `initAnalytics()` more than once).
 * Checking the real DOM is the one source of truth that's correct no
 * matter what called it or how many times.
 */
export function loadScriptOnce(id: string, configure: (script: HTMLScriptElement) => void): void {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  configure(script)
  document.head.appendChild(script)
}

/**
 * Every provider's `init()` is wrapped in this — analytics must never
 * break the site (Phase 12, Part 16): a blocked script, an ad blocker,
 * a malformed ID, or a network failure only ever silently no-ops, and
 * is never allowed to throw into the React render tree.
 */
export function safely(fn: () => void): void {
  try {
    fn()
  } catch {
    // Intentionally silent — see module comment.
  }
}
