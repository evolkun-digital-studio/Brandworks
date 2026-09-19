import { analyticsConfig, metaPixelEnabled } from '../config'
import { loadScriptOnce, safely } from '../lib/loadScript'
import type { AnalyticsProvider, GenericEvent, PageViewEvent } from '../types'

type FbqFn = ((...args: unknown[]) => void) & {
  queue?: unknown[][]
  loaded?: boolean
  version?: string
  callMethod?: (...args: unknown[]) => void
}

declare global {
  interface Window {
    fbq?: FbqFn
    _fbq?: FbqFn
  }
}

/**
 * Meta Pixel — optional, only active when VITE_META_PIXEL_ID is set
 * (Phase 12, Part 9). Loaded with the vendor's standard queue-stub
 * snippet.
 *
 * `init()` deliberately does NOT call `fbq('track', 'PageView')`
 * itself, unlike Meta's own canonical install snippet — doing so
 * would fire a PageView both here and again from
 * analytics/RouteAnalytics.tsx's initial page_view call, double-
 * counting the very first page load. Exactly like GA4's
 * `send_page_view: false` above, trackPageView is the one
 * authoritative source of PageView events for this provider (Part 3).
 */
const metaPixelProvider: AnalyticsProvider = {
  name: 'meta-pixel',

  init() {
    if (!metaPixelEnabled || !analyticsConfig.metaPixelId) return
    if (document.getElementById('meta-pixel-script')) return
    const id = analyticsConfig.metaPixelId
    safely(() => {
      if (!window.fbq) {
        const stub = ((...args: unknown[]) => {
          if (stub.callMethod) {
            stub.callMethod(...args)
          } else {
            stub.queue = stub.queue || []
            stub.queue.push(args)
          }
        }) as FbqFn
        stub.queue = []
        stub.loaded = true
        stub.version = '2.0'
        window.fbq = stub
        window._fbq = stub
      }
      loadScriptOnce('meta-pixel-script', (script) => {
        script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      })
      window.fbq('init', id)
    })
  },

  trackPageView(_event: PageViewEvent) {
    if (!metaPixelEnabled) return
    safely(() => {
      window.fbq?.('track', 'PageView')
    })
  },

  trackEvent(event: GenericEvent) {
    if (!metaPixelEnabled) return
    safely(() => {
      window.fbq?.('trackCustom', event.name, event.params ?? {})
    })
  },
}

export default metaPixelProvider
