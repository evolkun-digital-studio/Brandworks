/**
 * Switches tracking on and off to match the visitor's cookie choice.
 *
 * Scripts themselves are loaded by <ConsentScripts /> (IDs from the CMS and
 * legal.config.js) and by src/analytics (NEXT_PUBLIC_* IDs), both only for
 * allowed categories. This file sends the signals that apply to tools that
 * are already on the page:
 *
 * - Google Consent Mode v2. Every signal starts "denied" (inline script in
 *   app/layout.tsx, before any Google tag) and is updated here.
 * - Opt-outs that take effect immediately, without a reload, when consent
 *   is withdrawn: GA's ga-disable flag, Meta's consent revoke, Clarity's
 *   consent erase.
 * - Deleting the first-party cookies of withdrawn categories.
 */
import { CLEARABLE_COOKIES } from '../cookieCatalog';

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // gtag must push the `arguments` object, so this can't be an arrow function.
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/** Fallback for pages rendered without app/layout.tsx's inline default. */
export function setGoogleConsentDefaults() {
  if (window.__bwConsentDefault) return;
  window.__bwConsentDefault = true;
  ensureGtag();
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
}

function updateGoogleConsent({ analytics, marketing }) {
  ensureGtag();
  const signal = (on) => (on ? 'granted' : 'denied');
  window.gtag('consent', 'update', {
    analytics_storage: signal(analytics),
    ad_storage: signal(marketing),
    ad_user_data: signal(marketing),
    ad_personalization: signal(marketing),
  });
}

/**
 * Applies a choice to everything already on the page. `tracking` holds every
 * configured ID (CMS, env and legal.config.js merged).
 */
export function applyConsent({ analytics, marketing }, tracking) {
  setGoogleConsentDefaults();
  updateGoogleConsent({ analytics, marketing });

  // GA stops sending hits for a property at once when this flag is set.
  // `gaIds` also covers a NEXT_PUBLIC_GA_MEASUREMENT_ID that differs from the CMS one.
  (tracking.gaIds ?? [tracking.ga4]).filter(Boolean).forEach((id) => {
    window[`ga-disable-${id}`] = !analytics;
  });

  try {
    if (window.fbq) window.fbq('consent', marketing ? 'grant' : 'revoke');
  } catch {
    // A blocked or half-loaded pixel must never break the page.
  }
  try {
    // consent() allows Clarity cookies; consent(false) stops it and erases them.
    if (window.clarity) {
      if (analytics) window.clarity('consent');
      else window.clarity('consent', false);
    }
  } catch {
    // Same as above.
  }
}

/**
 * Deletes the first-party cookies of the categories that are not allowed,
 * on this host and on every parent domain (e.g. www.brandworks.me and
 * .brandworks.me), where analytics tools usually set them.
 */
export function clearTrackingCookies({ analytics, marketing }) {
  const prefixes = [...(analytics ? CLEARABLE_COOKIES.analytics : []), ...(marketing ? CLEARABLE_COOKIES.marketing : [])];
  if (!prefixes.length) return;

  const parts = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i += 1) domains.push(`; domain=.${parts.slice(i).join('.')}`);

  document.cookie.split(';').forEach((pair) => {
    const name = pair.split('=')[0].trim();
    if (!prefixes.some((prefix) => name.startsWith(prefix))) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; path=/${domain}`;
    });
  });
}
