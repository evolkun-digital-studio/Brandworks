import { analyticsConfig, clarityEnabled } from '../config'
import { loadScriptOnce, safely } from '../lib/loadScript'
import type { AnalyticsProvider, GenericEvent, PageViewEvent } from '../types'

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] }

declare global {
  interface Window {
    clarity?: ClarityFn
  }
}

/**
 * Microsoft Clarity — session-recording/heatmap provider. Loaded with
 * the vendor's standard queue-stub snippet only; no custom masking or
 * recording configuration is added (Phase 12, Part 7) — Clarity's own
 * default privacy behavior (automatic input masking, etc.) is left as
 * configured on the Clarity project itself, not second-guessed here.
 *
 * trackPageView is intentionally a no-op: Clarity observes SPA
 * navigation (URL changes) on its own, unlike GA4/GTM/Meta Pixel,
 * which is why those three need this codebase's manual page_view
 * strategy (Part 3/6) and Clarity doesn't.
 */
const clarityProvider: AnalyticsProvider = {
  name: 'clarity',

  init() {
    if (!clarityEnabled || !analyticsConfig.clarityProjectId) return
    if (document.getElementById('clarity-script')) return
    const id = analyticsConfig.clarityProjectId
    safely(() => {
      if (!window.clarity) {
        const stub = ((...args: unknown[]) => {
          stub.q = stub.q || []
          stub.q.push(args)
        }) as ClarityFn
        window.clarity = stub
      }
      loadScriptOnce('clarity-script', (script) => {
        script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`
      })
    })
  },

  trackPageView(_event: PageViewEvent) {
    // Intentional no-op — see module comment.
  },

  trackEvent(event: GenericEvent) {
    if (!clarityEnabled) return
    safely(() => {
      window.clarity?.('event', event.name)
    })
  },
}

export default clarityProvider
