/**
 * Loads tracking scripts only after the visitor allows them.
 *
 * Google tags run with Google Consent Mode v2. Every signal starts as
 * "denied" and is updated when the visitor chooses. Meta and LinkedIn
 * scripts aren't added to the page at all until marketing cookies are allowed.
 */
import { legalConfig } from '../legal.config';
import { CLEARABLE_COOKIES } from '../cookieCatalog';

const loaded = new Set();

function addScript(src, id) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // gtag must push the `arguments` object, so this can't be an arrow function.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
}

/** Call once, as early as possible: every Google signal starts as denied. */
export function setGoogleConsentDefaults() {
  if (loaded.has('google-defaults')) return;
  loaded.add('google-defaults');
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

function loadGoogle({ analytics, marketing }, tracking) {
  const ids = [analytics && tracking.ga4, marketing && tracking.googleAds].filter(Boolean);
  if (!ids.length) return;
  ensureGtag();
  if (!loaded.has('gtag')) {
    loaded.add('gtag');
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`, 'bw-gtag');
    window.gtag('js', new Date());
  }
  ids.forEach((id) => {
    if (loaded.has(id)) return;
    loaded.add(id);
    window.gtag('config', id);
  });
}

function loadMetaPixel(pixelId) {
  if (loaded.has('meta')) {
    window.fbq?.('consent', 'grant');
    return;
  }
  loaded.add('meta');
  if (!window.fbq) {
    // Meta's standard base code, unminified. Like gtag, it queues `arguments`.
    const fbq = function fbq() {
      // eslint-disable-next-line prefer-rest-params
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      // eslint-disable-next-line prefer-rest-params
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    addScript('https://connect.facebook.net/en_US/fbevents.js', 'bw-meta-pixel');
  }
  window.fbq('consent', 'grant');
  window.fbq('init', pixelId);
  // The pixel tracks later React Router page changes on its own.
  window.fbq('track', 'PageView');
}

function loadLinkedIn(partnerId) {
  if (loaded.has('linkedin')) return;
  loaded.add('linkedin');
  window._linkedin_partner_id = partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);
  if (!window.lintrk) {
    const lintrk = (a, b) => lintrk.q.push([a, b]);
    lintrk.q = [];
    window.lintrk = lintrk;
  }
  addScript('https://snap.licdn.com/li.lms-analytics/insight.min.js', 'bw-linkedin');
}

/** Turns tools on to match a saved choice. Turning tools off needs a reload (see clearTrackingCookies). */
export function applyConsent(choice, tracking = legalConfig.tracking) {
  const { analytics, marketing } = choice;
  if (tracking.ga4 || tracking.googleAds) {
    setGoogleConsentDefaults();
    updateGoogleConsent({ analytics, marketing });
    loadGoogle({ analytics, marketing }, tracking);
  }
  if (marketing && tracking.metaPixel) loadMetaPixel(tracking.metaPixel);
  if (marketing && tracking.linkedinPartnerId) loadLinkedIn(tracking.linkedinPartnerId);
}

/** Deletes the first-party cookies of the groups that were switched off. */
export function clearTrackingCookies({ analytics, marketing }) {
  const prefixes = [...(analytics ? CLEARABLE_COOKIES.analytics : []), ...(marketing ? CLEARABLE_COOKIES.marketing : [])];
  if (!prefixes.length) return;

  // Try the current host and each parent domain, e.g. www.example.com and .example.com.
  const parts = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i += 1) domains.push(`; domain=.${parts.slice(i).join('.')}`);

  document.cookie.split(';').forEach((pair) => {
    const name = pair.split('=')[0].trim();
    if (!prefixes.some((prefix) => name.startsWith(prefix))) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    });
  });
}
