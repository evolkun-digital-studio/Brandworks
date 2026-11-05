import { useEffect } from 'react';
import Script from 'next/script';

/** Tracking IDs come from the CMS, so only plain IDs ever reach a script URL. */
const SAFE_ID = /^[A-Za-z0-9_-]{2,64}$/;
const safe = (id) => (typeof id === 'string' && SAFE_ID.test(id) ? id : null);

// Commands sent once per page load, even if consent is withdrawn and given again.
const done = new Set();
const once = (key, fn) => {
  if (done.has(key)) return;
  done.add(key);
  try {
    fn();
  } catch {
    // Tracking must never break the page.
  }
};

/**
 * Loads the tracking tools configured in the CMS (Settings) and
 * legal.config.js — only for the categories the visitor has allowed, and
 * nothing at all before they choose. Allowing a category renders its tags
 * straight away, so accepting needs no reload. Tools configured through
 * NEXT_PUBLIC_* env vars are started by src/analytics instead, through the
 * same consent choice (see ConsentProvider), and are left out of `ids`.
 *
 * Withdrawing consent unmounts these tags; tools already running are
 * stopped by trackers.js (Consent Mode "denied", ga-disable, fbq revoke).
 */
export default function ConsentScripts({ allowed, ids }) {
  const googleIds = [allowed.analytics && safe(ids.ga4), allowed.marketing && safe(ids.googleAds)].filter(Boolean);
  const metaPixel = allowed.marketing ? safe(ids.metaPixel) : null;
  const linkedin = allowed.marketing ? safe(ids.linkedinPartnerId) : null;
  const googleKey = googleIds.join(',');

  // gtag() itself is defined by the inline Consent Mode script in app/layout.tsx.
  useEffect(() => {
    if (!googleKey) return;
    once('gtag-js', () => window.gtag('js', new Date()));
    googleKey.split(',').forEach((id) => once(`gtag-config-${id}`, () => window.gtag('config', id)));
  }, [googleKey]);

  useEffect(() => {
    if (!metaPixel) return;
    once('meta-stub', () => {
      if (window.fbq) return;
      // Meta's standard base code, unminified. It queues `arguments` until fbevents.js loads.
      const fbq = function fbq() {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
    });
    window.fbq('consent', 'grant');
    once(`meta-init-${metaPixel}`, () => {
      window.fbq('init', metaPixel);
      window.fbq('track', 'PageView');
    });
  }, [metaPixel]);

  useEffect(() => {
    if (!linkedin) return;
    once(`linkedin-${linkedin}`, () => {
      window._linkedin_partner_id = linkedin;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(linkedin);
      if (!window.lintrk) {
        const lintrk = (a, b) => lintrk.q.push([a, b]);
        lintrk.q = [];
        window.lintrk = lintrk;
      }
    });
  }, [linkedin]);

  return (
    <>
      {googleIds.length > 0 && (
        <Script
          id="bw-gtag"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleIds[0])}`}
        />
      )}
      {metaPixel && (
        <Script id="bw-meta-pixel" strategy="afterInteractive" src="https://connect.facebook.net/en_US/fbevents.js" />
      )}
      {linkedin && (
        <Script id="bw-linkedin" strategy="afterInteractive" src="https://snap.licdn.com/li.lms-analytics/insight.min.js" />
      )}
    </>
  );
}
