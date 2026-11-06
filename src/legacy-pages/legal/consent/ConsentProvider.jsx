import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { legalConfig } from '../legal.config';
import { activeVendors, categoriesInUse } from '../template';
import { analyticsConfig, gaDirectEnabled } from '../../../analytics/config';
import { setAnalyticsConsent } from '../../../analytics/analytics';
import { onIntroSettled } from '../../../lib/introGate';
import { applyConsent, clearTrackingCookies } from './trackers';
import { readConsent, writeConsent } from './consentCookie';
import ConsentScripts from './ConsentScripts';
import CookieBanner from './CookieBanner';

const ConsentContext = createContext(null);

/** Tools configured through NEXT_PUBLIC_* env vars; src/analytics loads these. */
const ENV_IDS = {
  ga4: gaDirectEnabled ? analyticsConfig.gaMeasurementId : null,
  metaPixel: analyticsConfig.metaPixelId,
  clarity: analyticsConfig.clarityProjectId,
  gtm: analyticsConfig.gtmContainerId,
};

/** legal.config.js, then CMS IDs (an empty CMS value falls back to legal.config.js). */
function cmsTracking(overrides) {
  const tracking = { ...legalConfig.tracking };
  Object.entries(overrides ?? {}).forEach(([key, id]) => {
    if (id) tracking[key] = id;
  });
  return tracking;
}

/** Every configured tool, for the preferences panel and the cookie policy. */
function allTracking(cms) {
  const tracking = { ...cms };
  Object.entries(ENV_IDS).forEach(([key, id]) => {
    if (id && !tracking[key]) tracking[key] = id;
  });
  return tracking;
}

function currentPage() {
  return {
    path: window.location.pathname + window.location.search,
    location: window.location.href,
    title: document.title,
  };
}

/**
 * Wraps the public site once (src/next/PublicLayout.tsx). It reads the saved
 * choice from the bw_consent cookie, shows the banner on a first visit once
 * the opening preloader has gone, and is the only place tracking is switched
 * on or off: <ConsentScripts /> for CMS-configured tools, setAnalyticsConsent
 * for env-configured ones. `tracking` takes IDs from the admin Settings page.
 */
export function ConsentProvider({ children, tracking: trackingOverrides }) {
  const overridesKey = JSON.stringify(trackingOverrides ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized IDs, not the object identity.
  const cms = useMemo(() => cmsTracking(trackingOverrides), [overridesKey]);
  const config = useMemo(() => ({ ...legalConfig, tracking: allTracking(cms) }), [cms]);
  const inUse = useMemo(() => categoriesInUse(config), [config]);
  const vendors = useMemo(() => activeVendors(config), [config]);
  const hasOptional = inUse.analytics || inUse.marketing;

  // Loaded by <ConsentScripts />: CMS / legal.config IDs that src/analytics doesn't already load.
  const scriptIds = useMemo(
    () => ({
      ga4: cms.ga4 && cms.ga4 !== ENV_IDS.ga4 ? cms.ga4 : null,
      googleAds: cms.googleAds,
      metaPixel: cms.metaPixel && cms.metaPixel !== ENV_IDS.metaPixel ? cms.metaPixel : null,
      linkedinPartnerId: cms.linkedinPartnerId,
    }),
    [cms],
  );
  // Every GA property on the page, so withdrawing consent stops all of them.
  const optOutIds = useMemo(
    () => ({ gaIds: [...new Set([cms.ga4, analyticsConfig.gaMeasurementId].filter(Boolean))] }),
    [cms],
  );

  const [choice, setChoice] = useState(null);
  // The cookie can only be read in the browser; until it has been, nothing
  // consent-related renders, so returning visitors never see a flash of the banner.
  const [ready, setReady] = useState(false);
  const [introSettled, setIntroSettled] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // The banner waits for the opening preloader to finish.
  useEffect(() => onIntroSettled(() => setIntroSettled(true)), []);

  /** Brings everything on the page in line with a choice. */
  const apply = useCallback(
    (record) => {
      applyConsent(record, optOutIds);
      setAnalyticsConsent(record, currentPage());
      // Withdrawn (or never given) categories keep none of their cookies.
      clearTrackingCookies({ analytics: !record.analytics, marketing: !record.marketing });
    },
    [optOutIds],
  );

  useEffect(() => {
    const saved = readConsent();
    if (saved) apply(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cookie only exists in the browser, after hydration.
    setChoice(saved);
    setReady(true);
  }, [apply]);

  const save = useCallback(
    (next) => {
      const record = writeConsent({ analytics: Boolean(next.analytics), marketing: Boolean(next.marketing) });
      apply(record);
      setChoice(record);
      setPreferencesOpen(false);
    },
    [apply],
  );

  const bannerOpen = ready && introSettled && hasOptional && !choice && !preferencesOpen;

  const value = useMemo(() => {
    const openSettings = () => setPreferencesOpen(true);
    return {
      // The documented API.
      consent: choice,
      acceptAll: () => save({ analytics: true, marketing: true }),
      rejectAll: () => save({ analytics: false, marketing: false }),
      save,
      openSettings,
      // Used by the banner, the footer link and the legal pages.
      choice,
      config,
      inUse,
      vendors,
      hasOptional,
      ready,
      bannerOpen,
      preferencesOpen,
      openPreferences: openSettings,
      closePreferences: () => setPreferencesOpen(false),
    };
  }, [choice, save, config, inUse, vendors, hasOptional, ready, bannerOpen, preferencesOpen]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {ready && (
        <ConsentScripts
          allowed={{ analytics: Boolean(choice?.analytics), marketing: Boolean(choice?.marketing) }}
          ids={scriptIds}
        />
      )}
      <CookieBanner />
    </ConsentContext.Provider>
  );
}

const fallback = {
  consent: null,
  choice: null,
  config: legalConfig,
  inUse: { analytics: false, marketing: false },
  vendors: [],
  hasOptional: false,
  ready: false,
  bannerOpen: false,
  preferencesOpen: false,
  acceptAll: () => {},
  rejectAll: () => {},
  save: () => {},
  openSettings: () => {},
  openPreferences: () => {},
  closePreferences: () => {},
};

/**
 * Read or change cookie consent from any component:
 * `const { consent, acceptAll, rejectAll, save, openSettings } = useConsent()`.
 * `consent` is null until the visitor has chosen.
 */
// oxlint-disable-next-line react/only-export-components -- the hook belongs with its provider.
export function useConsent() {
  return useContext(ConsentContext) ?? fallback;
}
