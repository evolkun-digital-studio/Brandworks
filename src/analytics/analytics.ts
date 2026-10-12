import { anyProviderEnabled } from './config'
import { safely } from './lib/loadScript'
import { AnalyticsEvents } from './events'
import ga4Provider from './providers/ga4'
import gtmProvider from './providers/gtm'
import clarityProvider from './providers/clarity'
import metaPixelProvider from './providers/metaPixel'
import type { AnalyticsProvider, BlogArticleViewEvent, GenericEvent, PageViewEvent } from './types'

const providers: AnalyticsProvider[] = [ga4Provider, gtmProvider, clarityProvider, metaPixelProvider]

let initialized = false

/**
 * The single entry point every enabled provider's setup funnels
 * through — called once from analytics/RouteAnalytics.tsx, itself
 * only ever mounted inside PublicLayout (never on /admin/*, Phase 12
 * Part 6/12). This is also the one place a future consent mechanism
 * would need to gate (Part 13): wrapping this single call site in
 * `if (consentGranted) initAnalytics()` is enough on its own — no
 * other code in the app would need to change. No consent platform
 * exists yet; whether/how consent is required is a deployment- and
 * legal-policy-dependent decision outside this codebase's scope (see
 * the Phase 12 report's Cookie/Consent section) — nothing here claims
 * any particular regulation is satisfied.
 *
 * A provider that isn't configured (no env var set) never has its
 * `init()` do anything at all — see each provider file's own guard.
 */
export function initAnalytics(): void {
  if (initialized || !anyProviderEnabled) return
  initialized = true
  for (const provider of providers) {
    safely(() => provider.init())
  }
}

/** Fans a page view out to every enabled provider. See RouteAnalytics.tsx for the one call site driving this from React Router. */
export function trackPageView(event: PageViewEvent): void {
  for (const provider of providers) {
    safely(() => provider.trackPageView(event))
  }
}

/** Fans a named event out to every enabled provider — the low-level primitive behind trackBlogArticleView and any future conversion event (Part 5). */
export function trackEvent(event: GenericEvent): void {
  for (const provider of providers) {
    safely(() => provider.trackEvent(event))
  }
}

/**
 * The one rich, blog-specific event (Phase 12, Part 4) — built from
 * an explicit field allowlist, never by spreading a PublicBlogDetail,
 * so there is no path for article content, focusKeyword,
 * secondaryKeywords, or the internal MongoDB-derived id to leak into
 * it even by future accident. Only fields already public via the
 * public blog API are ever included, and only non-empty ones.
 */
export function trackBlogArticleView(event: BlogArticleViewEvent): void {
  trackEvent({
    name: AnalyticsEvents.blogArticleView,
    params: {
      slug: event.slug,
      title: event.title,
      ...(event.category ? { category: event.category } : {}),
      ...(event.author ? { author: event.author } : {}),
      ...(event.contentType ? { content_type: event.contentType } : {}),
      ...(event.contentIntent ? { content_intent: event.contentIntent } : {}),
    },
  })
}
