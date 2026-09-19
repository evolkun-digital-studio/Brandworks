import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageView } from './analytics'
import { applyGscVerification } from './gsc'

/**
 * Wires the analytics layer into React Router (Phase 12, Part 6).
 * Mounted once inside PublicLayout.tsx, which only ever wraps the
 * public routes (/, /blog, /blog/:slug) — never /admin/* (a sibling,
 * separately-lazy-loaded top-level route in App.tsx) — so this
 * component, and therefore every provider script it can trigger,
 * never runs on an admin page (Part 12).
 *
 * Renders nothing; it exists purely for its effects.
 */
function RouteAnalytics() {
  const location = useLocation()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    initAnalytics()
    applyGscVerification()
  }, [])

  useEffect(() => {
    const path = location.pathname + location.search
    // Guards against a duplicate page_view for the same path — the
    // one thing that could otherwise cause double-counting here:
    // React StrictMode double-invoking this effect in development
    // (Part 6). A genuine navigation always changes `path`.
    if (lastTrackedPath.current === path) return
    lastTrackedPath.current = path
    trackPageView({
      path,
      location: window.location.href,
      title: document.title,
    })
  }, [location.pathname, location.search])

  return null
}

export default RouteAnalytics
