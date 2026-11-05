import { anyProviderEnabled } from './config'
import { safely } from './lib/loadScript'
import { AnalyticsEvents } from './events'
import ga4Provider from './providers/ga4'
import gtmProvider from './providers/gtm'
import clarityProvider from './providers/clarity'
import metaPixelProvider from './providers/metaPixel'
import type { AnalyticsProvider, BlogArticleViewEvent, GenericEvent, PageViewEvent } from './types'

const providers: AnalyticsProvider[] = [ga4Provider, gtmProvider, clarityProvider, metaPixelProvider]

export type ConsentCategories = { analytics: boolean; marketing: boolean }

/** Which consent category each provider needs before it may load or receive anything. */
const CATEGORY: Record<string, keyof ConsentCategories> = {
  ga4: 'analytics',
  gtm: 'analytics',
  clarity: 'analytics',
  'meta-pixel': 'marketing',
}

const started = new Set<AnalyticsProvider>()
let allowed: ConsentCategories = { analytics: false, marketing: false }

const isActive = (provider: AnalyticsProvider) => started.has(provider) && allowed[CATEGORY[provider.name] ?? 'marketing']

/**
 * The consent gate for every env-configured provider (NEXT_PUBLIC_* IDs).
 * Called by the cookie consent provider (legacy-pages/legal/consent) when
 * the saved choice is read and whenever the visitor changes it. A
 * provider's script loads only once its category is allowed; events and
 * page views reach only providers that are loaded *and* still allowed, so
 * withdrawing consent stops tracking from that moment.
 *
 * `currentPage` is sent to providers that start now, because the page
 * view for the page the visitor is on happened before they allowed it.
 */
export function setAnalyticsConsent(next: ConsentCategories, currentPage?: PageViewEvent): void {
  allowed = { analytics: Boolean(next.analytics), marketing: Boolean(next.marketing) }
  if (!anyProviderEnabled) return
  for (const provider of providers) {
    if (started.has(provider) || !allowed[CATEGORY[provider.name] ?? 'marketing']) continue
    started.add(provider)
    safely(() => provider.init())
    if (currentPage) safely(() => provider.trackPageView(currentPage))
  }
}

/**
 * Starts every enabled provider as if all categories were allowed. Kept
 * for tests and tooling; the site itself goes through setAnalyticsConsent,
 * so nothing loads before the visitor has agreed.
 */
export function initAnalytics(): void {
  setAnalyticsConsent({ analytics: true, marketing: true })
}

/** Fans a page view out to every provider the visitor has allowed. See RouteAnalytics.tsx for the one call site driving this from React Router. */
export function trackPageView(event: PageViewEvent): void {
  for (const provider of providers) {
    if (!isActive(provider)) continue
    safely(() => provider.trackPageView(event))
  }
}

/** Fans a named event out to every enabled provider — the low-level primitive behind trackBlogArticleView and any future conversion event (Part 5). */
export function trackEvent(event: GenericEvent): void {
  for (const provider of providers) {
    if (!isActive(provider)) continue
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
