import { analyticsConfig, gtmEnabled } from '../config'
import { loadScriptOnce, safely } from '../lib/loadScript'
import type { AnalyticsProvider, GenericEvent, PageViewEvent } from '../types'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

/**
 * Google Tag Manager provider. When configured, this is the one
 * mechanism responsible for delivering events onward to GA4 (and
 * anything else configured inside the GTM container itself, entirely
 * outside this codebase) — see config.ts's gaOwnedByGtm (Phase 12,
 * Part 8): the direct GA4 provider stays inactive whenever GTM is
 * also configured, so events are never sent through both paths.
 *
 * No `<noscript>` fallback iframe is added, unlike a typical GTM
 * install: this is a client-rendered SPA that renders nothing at all
 * without JavaScript, so a JS-disabled fallback has no page to attach
 * to here.
 */
const gtmProvider: AnalyticsProvider = {
  name: 'gtm',

  init() {
    if (!gtmEnabled || !analyticsConfig.gtmContainerId) return
    if (document.getElementById('gtm-script')) return
    const id = analyticsConfig.gtmContainerId
    safely(() => {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      loadScriptOnce('gtm-script', (script) => {
        script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
      })
    })
  },

  trackPageView(event: PageViewEvent) {
    if (!gtmEnabled) return
    safely(() => {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: 'page_view',
        page_location: event.location,
        page_path: event.path,
        page_title: event.title,
      })
    })
  },

  trackEvent(event: GenericEvent) {
    if (!gtmEnabled) return
    safely(() => {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ event: event.name, ...event.params })
    })
  },
}

export default gtmProvider
