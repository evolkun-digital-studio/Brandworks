/**
 * Cookies set by each tracking tool, used to build the tables in the Cookie
 * Policy. Vendors change these from time to time, so check them against each
 * vendor's current documentation when you update the policy.
 *
 * The keys match legalConfig.tracking.
 */

/** `name` is filled from legalConfig.consentStorageKey. */
export const NECESSARY_STORAGE = [
  {
    name: null,
    provider: 'Brand Works',
    purpose: 'Remembers your cookie choices so we don’t ask on every page. Kept in your browser’s local storage.',
    duration: '12 months',
  },
];

export const VENDORS = {
  ga4: {
    label: 'Google Analytics',
    company: 'Google LLC',
    category: 'analytics',
    processorPurpose: 'Website analytics, only if you allow analytics cookies',
    location: 'USA / global',
    cookies: [
      { name: '_ga', purpose: 'Tells visits from different browsers apart', duration: '2 years' },
      { name: '_ga_<ID>', purpose: 'Keeps track of your current visit', duration: '2 years' },
    ],
  },
  googleAds: {
    label: 'Google Ads',
    company: 'Google LLC',
    category: 'marketing',
    processorPurpose: 'Ad measurement, only if you allow marketing cookies',
    location: 'USA / global',
    cookies: [
      { name: '_gcl_au', purpose: 'Links a Google ad click to an enquiry on this site', duration: '90 days' },
    ],
  },
  metaPixel: {
    label: 'Meta Pixel',
    company: 'Meta Platforms, Inc.',
    category: 'marketing',
    processorPurpose: 'Measures and targets Facebook and Instagram ads, only if you allow marketing cookies',
    location: 'USA / global',
    cookies: [
      { name: '_fbp', purpose: 'Recognises your browser to measure and target Facebook and Instagram ads', duration: '90 days' },
      { name: '_fbc', purpose: 'Stores the Meta ad click that brought you here', duration: '90 days' },
    ],
  },
  linkedinPartnerId: {
    label: 'LinkedIn Insight Tag',
    company: 'LinkedIn Corporation',
    category: 'marketing',
    processorPurpose: 'Measures and targets LinkedIn ads, only if you allow marketing cookies',
    location: 'USA / global',
    cookies: [
      { name: 'li_sugr', purpose: 'Recognises your browser for ad measurement', duration: '90 days' },
      { name: 'bcookie', purpose: 'Recognises your browser across LinkedIn services', duration: '1 year' },
      { name: 'lidc', purpose: 'Routes data to the right LinkedIn data centre', duration: '24 hours' },
      { name: 'UserMatchHistory', purpose: 'Matches LinkedIn ad IDs', duration: '30 days' },
    ],
  },
};

/** Cookie name prefixes cleared when someone withdraws consent. */
export const CLEARABLE_COOKIES = {
  analytics: ['_ga', '_gid'],
  marketing: ['_gcl_', '_fbp', '_fbc', 'li_sugr', 'UserMatchHistory', 'AnalyticsSyncHistory'],
};
