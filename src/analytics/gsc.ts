import { analyticsConfig, gscEnabled } from './config'
import { setMetaTag } from '../blog/lib/documentHead'

/**
 * Applies the Google Search Console ownership-verification meta tag
 * (Phase 12, Part 10) when VITE_GSC_VERIFICATION is configured.
 * Unlike title/canonical/OG (which change per page and are cleaned up
 * on unmount — see BlogDetailPage.tsx/BlogPage.tsx), this is a
 * site-wide, route-independent token: it's applied once, from
 * RouteAnalytics.tsx's mount effect, and never removed on public
 * navigation — reusing setMetaTag's own update-in-place-not-duplicate
 * behavior (src/blog/lib/documentHead.ts) means calling this more
 * than once (e.g. React StrictMode's double-invoke) can never create
 * a second tag.
 *
 * Emits nothing at all when unset. And to be explicit: this only ever
 * proves the token is present in the page's HTML — it does NOT mean
 * Search Console ownership has actually been verified. That step
 * still happens in Google Search Console itself, by the site owner.
 */
export function applyGscVerification(): void {
  if (!gscEnabled || !analyticsConfig.gscVerification) return
  setMetaTag('name', 'google-site-verification', analyticsConfig.gscVerification)
}
