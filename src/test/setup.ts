// Tells React that manual `act(...)` calls (used throughout this
// project's component tests — see BlogDetailPage.test.tsx,
// RouteAnalytics.test.tsx, LazyBackgroundVideo.test.tsx) are running
// in a real test environment. Without this, React 19 warns "The
// current testing environment is not configured to support act(...)"
// on every act() call — harmless to test correctness, but noisy, and
// the flag exists specifically so a test runner can declare this
// once rather than every test file working around the warning.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom does not implement window.matchMedia. GSAP's ScrollTrigger
// calls it the moment it is registered (at import time, in every
// component that uses it), so without this any test that imports the
// real App tree fails before a single assertion runs. Reports "no
// match" for every query — the same answer a browser gives for a
// media query that does not apply. Guarded because several test files
// run in the plain node environment, where there is no window at all.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}
