/**
 * Brand Works: legal pages and cookie consent config.
 *
 * This is the only file you need to edit for day-to-day changes.
 * Fill in every value that starts with "TODO" before going live. While you
 * run the dev server, the legal pages show a yellow box listing anything
 * still marked TODO.
 *
 * The page text itself lives in ./content/*.md. Values below are dropped into
 * that text wherever you see {{company.email}}, {{siteUrl}} and so on.
 */

export const legalConfig = {
  // Full URL of the live site, no trailing slash. Used in the policies and canonical tags.
  siteUrl: 'https://TODO-yourdomain.com',

  company: {
    brandName: 'Brand Works',
    // The legal entity behind the brand, exactly as registered.
    // e.g. "Brand Works Private Limited", "Brand Works LLP", or "Rahul Sharma, trading as Brand Works"
    legalName: 'TODO: registered legal name',
    address: 'TODO: registered business address',
    email: 'TODO: hello@yourdomain.com',
    privacyEmail: 'TODO: privacy@yourdomain.com',
    phone: 'TODO: +91 00000 00000',
    // City whose courts handle disputes (Terms of Use).
    jurisdiction: 'TODO: city, e.g. New Delhi',
  },

  // Required on the site under India's IT (SPDI) Rules 2011 and the DPDP Act.
  // Can be the founder, but give a real name and an inbox someone checks.
  grievanceOfficer: {
    name: 'TODO: full name',
    email: 'TODO: grievance@yourdomain.com',
  },

  // Change the date whenever you change that page's text (YYYY-MM-DD).
  lastUpdated: {
    privacy: '2026-10-05',
    cookies: '2026-10-05',
    terms: '2026-10-05',
  },

  // Turn sections of the policies on or off.
  features: {
    careers: true, // You accept job, internship or freelancer applications
    newsletter: false, // You run an email newsletter
    whatsapp: true, // You take enquiries on WhatsApp
    gdpr: true, // You market to clients in the UK or EU
  },

  // Tracking IDs. Leave a value empty ('') if you don't use that tool.
  // The cookie banner only appears once at least one ID is set, and the
  // Cookie Policy and Privacy Policy list only the tools you fill in here.
  tracking: {
    ga4: '', // Google Analytics 4, e.g. 'G-ABC123XYZ'
    googleAds: '', // Google Ads conversion ID, e.g. 'AW-1234567890'
    metaPixel: '', // Meta (Facebook/Instagram) Pixel ID, e.g. '1234567890123456'
    linkedinPartnerId: '', // LinkedIn Insight Tag partner ID, e.g. '1234567'
  },

  // Service providers that handle personal data for you. Tracking tools above
  // are added to this list automatically, so don't repeat them here.
  processors: [
    {
      name: 'TODO: hosting provider (e.g. Vercel, Netlify, Hostinger)',
      purpose: 'Hosts the website and keeps server logs',
      location: 'TODO: e.g. USA / global',
    },
    {
      name: 'TODO: email provider (e.g. Google Workspace, Zoho Mail)',
      purpose: 'Receives and stores our email, including enquiries',
      location: 'TODO: e.g. India / global',
    },
    {
      // Delete this entry if your forms post to your own server or inbox directly.
      name: 'TODO: form service (e.g. Web3Forms, Formspree, EmailJS)',
      purpose: 'Delivers contact form submissions to our inbox',
      location: 'TODO: e.g. USA',
    },
  ],

  // Bump this number when you add a new tracking tool. Everyone is asked again.
  consentVersion: 1,
  consentStorageKey: 'bw-consent',
  // How long a cookie choice is remembered before we ask again.
  consentMaxAgeDays: 365,
};

export const LEGAL_PAGES = [
  { key: 'privacy', path: '/privacy-policy', label: 'Privacy policy' },
  { key: 'cookies', path: '/cookie-policy', label: 'Cookie policy' },
  { key: 'terms', path: '/terms-of-use', label: 'Terms of use' },
];
