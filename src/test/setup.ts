// Tells React that manual `act(...)` calls (used throughout this
// project's component tests — see BlogDetailPage.test.tsx,
// RouteAnalytics.test.tsx, LazyBackgroundVideo.test.tsx) are running
// in a real test environment. Without this, React 19 warns "The
// current testing environment is not configured to support act(...)"
// on every act() call — harmless to test correctness, but noisy, and
// the flag exists specifically so a test runner can declare this
// once rather than every test file working around the warning.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
