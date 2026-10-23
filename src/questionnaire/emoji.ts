/**
 * Presentation only: a small emoji in front of option labels (never titles
 * or headings), drawn by AppleEmoji. Kept out of flow.ts so the questions, values and validation stay
 * exactly as they are. Missing keys simply show no emoji. Visual-card steps
 * have drawings, so they don't use OPTION_EMOJI.
 */

/** Keyed by option value; a value means the same thing wherever it appears. */
export const OPTION_EMOJI: Record<string, string> = {
  // workType
  'restaurant-cafe-food-brand': '☕',
  'local-services-salon-gym-plumbing-etc': '💈',
  'home-services-cleaning-repair-maintenance': '🧹',
  'e-commerce-online-store': '🛒',
  'fashion-clothing-brand': '👗',
  'doctor-clinic-healthcare': '🩺',
  'coach-educator-institute': '🎓',
  'hotel-resort-homestay': '🏨',
  'real-estate': '🏡',
  'legal-financial-services': '⚖️',
  'creator-influencer-artist': '🎤',
  'tech-startup-saas': '💻',
  'agency-studio': '🎬',
  'ngo-non-profit': '🤝',
  other: '✏️',
  // operation
  'fully-offline-no-online-presence-yet': '🏪',
  'offline-business-moving-online': '📲',
  'already-operating-online': '🌐',
  'early-stage-idea-or-concept': '💡',
  // projectStage
  scratch: '🌱',
  redesign: '🔄',
  features: '🧩',
  // audience / redesignAudience
  'local-customers-near-me': '📍',
  'city-region': '🏙️',
  nationwide: '🗺️',
  'global-international': '🌍',
  // references / redesignInspiration
  'yes-i-ll-share-links-later': '🔗',
  'i-have-some-ideas-but-no-links': '💭',
  'no-i-want-you-to-guide-me': '🧭',
  'yes-i-ll-share-references': '🔗',
  'i-have-ideas-but-no-links': '💭',
  'no-i-want-you-to-guide-the-design': '🧭',
  // contentStatus
  'i-already-have-all-the-content': '✅',
  'i-have-rough-content-that-needs-refinement': '✍️',
  'i-need-help-writing-content': '📝',
  'i-need-help-with-both-content-and-visuals': '🎨',
  'i-m-not-sure-yet': '🤷',
  // timelines
  'just-exploring-for-now': '👀',
  'in-the-next-1-2-months': '📅',
  'within-a-few-weeks': '⏱️',
  immediately: '⚡',
  // priorities
  speed: '⚡',
  'premium-quality': '💎',
  'leads-conversions': '📈',
  'seo-and-long-term-growth': '🌱',
  'smooth-user-experience': '🧈',
  'scalability-for-the-future': '🏗️',
  // language
  'english-only': '🇬🇧',
  'local-language': '🗣️',
  multilingual: '🌐',
  'not-sure-yet': '🤷',
  'not-sure': '🤷',
  // sections
  home: '🏠',
  about: '👥',
  'services-products': '🛍️',
  contact: '📞',
  pricing: '🏷️',
  'blog-updates': '📰',
  // redesignType
  complete: '🔄',
  'major-upgrade': '🆙',
  'small-changes': '🔧',
  // redesignWhy / redesignFrustration
  'the-design-looks-outdated': '🕰️',
  'the-website-doesn-t-represent-the-brand-anymore': '🪞',
  'low-conversions-engagement': '📉',
  'poor-mobile-experience': '📱',
  'business-has-evolved-new-services-audience-positioning': '🌿',
  'navigation-is-confusing': '🧭',
  'design-feels-outdated': '🕰️',
  'content-is-unclear': '🌫️',
  'low-leads-or-conversions': '📉',
  'slow-performance': '🐢',
  'not-sure-just-feels-off': '🤔',
  // redesignImprove
  'visual-quality-and-brand-presence': '✨',
  'user-experience-and-flow': '🧈',
  'conversions-leads-sales-bookings': '📈',
  'speed-and-performance': '⚡',
  'clarity-of-messaging': '💬',
  // brandAssets
  'yes-logo-colors-fonts-ready': '✅',
  'logo-only-needs-a-system': '🔤',
  'no-brand-visuals-need-improvement': '🖌️',
  // redesignContent
  'content-is-good-just-needs-redesign': '👍',
  'content-needs-refinement': '✍️',
  'content-needs-rewriting': '📝',
  // platform
  wordpress: '📘',
  shopify: '🛍️',
  webflow: '🌊',
  wix: '🧱',
  framer: '🖼️',
  'custom-built-html-react-next-js-etc': '👨‍💻',
  // featuresHandled
  'manually-spreadsheets-whatsapp-email-etc': '📋',
  'using-third-party-tools': '🔌',
  'partially-on-the-website': '🌗',
  'not-handled-at-all': '🚫',
  // featuresWhy
  'business-growth': '📈',
  'manual-work-is-slowing-us-down': '🐌',
  'customer-demand': '🙋',
  'scaling-operations': '🏗️',
  'competitive-pressure': '🏁',
  // featuresCritical
  'core-to-my-business': '❤️',
  'very-important-major-improvement': '🔥',
  'useful-but-not-urgent': '👌',
  'just-experimenting': '🧪',
}
