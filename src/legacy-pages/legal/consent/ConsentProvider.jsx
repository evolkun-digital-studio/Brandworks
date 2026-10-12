import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { legalConfig } from '../legal.config';
import { activeVendors, categoriesInUse } from '../template';
import { applyConsent, clearTrackingCookies, setGoogleConsentDefaults } from './trackers';
import CookieBanner from './CookieBanner';

const ConsentContext = createContext(null);

const { consentStorageKey: STORAGE_KEY, consentVersion: VERSION, consentMaxAgeDays } = legalConfig;
const MAX_AGE_MS = consentMaxAgeDays * 24 * 60 * 60 * 1000;

function readSavedChoice() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== VERSION || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function writeSavedChoice(choice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Private browsing or blocked storage: the choice lasts for this visit only.
  }
}

/**
 * Wrap your app in this once (inside or outside the router). It renders the
 * cookie banner and preferences dialog, and loads tracking tools that the
 * visitor has allowed.
 */
export function ConsentProvider({ children }) {
  const inUse = useMemo(() => categoriesInUse(legalConfig), []);
  const vendors = useMemo(() => activeVendors(legalConfig), []);
  const hasOptional = inUse.analytics || inUse.marketing;

  const [choice, setChoice] = useState(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Resolve browser storage after hydration while keeping the first render
  // identical on the server and client.
  useLayoutEffect(() => {
    const saved = readSavedChoice();
    if (legalConfig.tracking.ga4 || legalConfig.tracking.googleAds) setGoogleConsentDefaults();
    if (saved) applyConsent(saved);
    setChoice(saved);
    setBannerOpen(hasOptional && !saved);
  }, [hasOptional]);

  const save = useCallback(
    (next) => {
      const record = {
        version: VERSION,
        savedAt: Date.now(),
        analytics: Boolean(next.analytics) && inUse.analytics,
        marketing: Boolean(next.marketing) && inUse.marketing,
      };
      const switchedOff = {
        analytics: Boolean(choice?.analytics) && !record.analytics,
        marketing: Boolean(choice?.marketing) && !record.marketing,
      };

      writeSavedChoice(record);
      setChoice(record);
      setBannerOpen(false);
      setPreferencesOpen(false);

      if (switchedOff.analytics || switchedOff.marketing) {
        // Scripts can't be unloaded, so clear their cookies and start fresh.
        clearTrackingCookies(switchedOff);
        window.location.reload();
        return;
      }
      applyConsent(record);
    },
    [choice, inUse],
  );

  const value = useMemo(
    () => ({
      choice,
      inUse,
      vendors,
      hasOptional,
      bannerOpen,
      preferencesOpen,
      acceptAll: () => save({ analytics: true, marketing: true }),
      rejectAll: () => save({ analytics: false, marketing: false }),
      save,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [choice, inUse, vendors, hasOptional, bannerOpen, preferencesOpen, save],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <CookieBanner />
    </ConsentContext.Provider>
  );
}

const fallback = {
  choice: null,
  inUse: { analytics: false, marketing: false },
  vendors: [],
  hasOptional: false,
  bannerOpen: false,
  preferencesOpen: false,
  acceptAll: () => {},
  rejectAll: () => {},
  save: () => {},
  openPreferences: () => {},
  closePreferences: () => {},
};

/** Read or change cookie consent from any component. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConsent() {
  return useContext(ConsentContext) ?? fallback;
}
