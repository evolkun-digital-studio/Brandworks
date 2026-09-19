import { analyticsConfig, gaDirectEnabled } from '../config'
import { loadScriptOnce, safely } from '../lib/loadScript'
import type { AnalyticsProvider, GenericEvent, PageViewEvent } from '../types'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(args)
}

/**
 * Direct GA4 (gtag.js) provider — only active when
 * VITE_GA_MEASUREMENT_ID is set AND no GTM container also owns GA4
 * delivery (see config.ts's gaOwnedByGtm / Phase 12 Part 8).
 *
 * `send_page_view: false` on the config call is deliberate: GA4's own
 * automatic page_view only fires once, for whatever URL was current
 * when gtag.js finished loading — it does not reliably follow React
 * Router's client-side navigation. Disabling it and sending every
 * page_view explicitly (trackPageView below, driven by
 * analytics/RouteAnalytics.tsx) is the one authoritative page-view
 * strategy for this SPA (Part 3/6): nothing else ever sends a GA4
 * page_view, so it can never double-count.
 */
const ga4Provider: AnalyticsProvider = {
  name: 'ga4',

  init() {
    if (!gaDirectEnabled || !analyticsConfig.gaMeasurementId) return
    if (document.getElementById('ga4-script')) return
    const id = analyticsConfig.gaMeasurementId
    safely(() => {
      loadScriptOnce('ga4-script', (script) => {
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
      })
      window.dataLayer = window.dataLayer || []
      gtag('js', new Date())
      gtag('config', id, { send_page_view: false })
    })
  },

  trackPageView(event: PageViewEvent) {
    if (!gaDirectEnabled) return
    safely(() => {
      gtag('event', 'page_view', {
        page_location: event.location,
        page_path: event.path,
        page_title: event.title,
      })
    })
  },

  trackEvent(event: GenericEvent) {
    if (!gaDirectEnabled) return
    safely(() => {
      gtag('event', event.name, event.params ?? {})
    })
  },
}

export default ga4Provider
