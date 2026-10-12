/**
 * The normalized event shapes every provider adapter receives.
 * Keeping these centralized (rather than letting components build
 * arbitrary untyped payloads) is what Phase 12 Part 15 asks for — a
 * provider only ever sees one of these, never a raw object assembled
 * ad hoc at the call site.
 */

export interface PageViewEvent {
  /** Path + query string, e.g. "/blog/my-post" — never includes the origin. */
  path: string
  /** Full current URL (window.location.href) — always the public frontend origin, never the :4001 backend (Phase 12, Part 23). */
  location: string
  title: string
}

/**
 * Deliberately only the fields explicitly allowed by the Phase 12
 * spec (Part 4) — never the full article, never focus keyword /
 * secondary keywords / internal ids. See analytics.ts's
 * trackBlogArticleView, which builds this from an explicit allowlist
 * rather than spreading a PublicBlogDetail.
 */
export interface BlogArticleViewEvent {
  slug: string
  title: string
  category: string | null
  author: string | null
  contentType: string | null
  contentIntent: string | null
}

/** A minimal, named event for future conversion tracking (Phase 12, Part 5) — e.g. "contact_cta_click". Params stay small and provider-agnostic. */
export interface GenericEvent {
  name: string
  params?: Record<string, string | number | boolean>
}

/**
 * The interface every provider adapter (ga4, clarity, gtm, metaPixel)
 * implements identically, so analytics.ts can fan an event out to
 * whichever providers are actually enabled without knowing their
 * individual APIs.
 */
export interface AnalyticsProvider {
  name: string
  /** Loads the provider's script and performs one-time setup. Safe to call more than once — see lib/loadScript.ts. */
  init(): void
  trackPageView(event: PageViewEvent): void
  trackEvent(event: GenericEvent): void
}
