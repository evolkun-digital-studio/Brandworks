/**
 * The visitor's cookie choice, kept in a first-party cookie:
 *
 *   bw_consent = {"necessary":true,"analytics":false,"marketing":false,"version":1,"date":"2026-11-05T10:00:00.000Z"}
 *
 * Path=/, SameSite=Lax, Secure on HTTPS (production), and it expires after
 * legalConfig.consentMaxAgeDays. A record from an older consentVersion is
 * ignored, so bumping the version asks everyone again.
 */
import { legalConfig } from '../legal.config';

const { consentStorageKey: COOKIE_NAME, consentVersion: VERSION, consentMaxAgeDays: MAX_AGE_DAYS } = legalConfig;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;
/** Where earlier versions of the site kept the choice (localStorage). */
const LEGACY_STORAGE_KEY = 'bw-consent';

function isValidRecord(record) {
  if (!record || typeof record !== 'object') return false;
  if (record.version !== VERSION) return false;
  if (typeof record.analytics !== 'boolean' || typeof record.marketing !== 'boolean') return false;
  const time = Date.parse(record.date);
  return Number.isFinite(time) && Date.now() - time < MAX_AGE_SECONDS * 1000;
}

function normalise({ analytics, marketing, date }) {
  return {
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    version: VERSION,
    date: date ?? new Date().toISOString(),
  };
}

function readCookie() {
  const prefix = `${COOKIE_NAME}=`;
  const pair = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!pair) return null;
  try {
    return JSON.parse(decodeURIComponent(pair.slice(prefix.length)));
  } catch {
    return null;
  }
}

/** Saves a choice and returns the stored record. */
export function writeConsent(choice) {
  const record = normalise({ ...choice, date: undefined });
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  return record;
}

/**
 * The saved choice, or null when there is none (or it is out of date).
 * A choice saved by the earlier localStorage version is moved into the
 * cookie once, keeping its original date, so returning visitors aren't asked again.
 */
export function readConsent() {
  const record = readCookie();
  if (isValidRecord(record)) return record;

  try {
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (legacy && legacy.version === VERSION && typeof legacy.savedAt === 'number') {
      const migrated = normalise({ ...legacy, date: new Date(legacy.savedAt).toISOString() });
      if (isValidRecord(migrated)) {
        const remaining = Math.floor((MAX_AGE_SECONDS * 1000 - (Date.now() - legacy.savedAt)) / 1000);
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(migrated))}; Max-Age=${remaining}; Path=/; SameSite=Lax${secure}`;
        return migrated;
      }
    }
  } catch {
    // Storage blocked or malformed: treat as no choice.
  }
  return null;
}
