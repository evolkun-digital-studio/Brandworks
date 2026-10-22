/**
 * Presentation only: a short, human line shown the moment someone picks an
 * option ("Cafés are some of our favourite sites to make."). Instant and
 * hand-written, so it never waits on the AI and never uses its quota. Keyed by
 * option value like OPTION_EMOJI; anything missing falls back to a generic line.
 */

export const OPTION_CHEER: Record<string, string> = {
  // workType
  'restaurant-cafe-food-brand': 'Ooh, food! Cafés and restaurants are some of our favourite sites to make.',
  'local-services-salon-gym-plumbing-etc': 'Local services live on trust. We’ll make yours easy to call and book.',
  'home-services-cleaning-repair-maintenance': 'Home services are all about quick trust. We know that brief well.',
  'e-commerce-online-store': 'An online store, nice. Let’s make it easy to browse and buy.',
  'fashion-clothing-brand': 'Fashion is a joy to design for. Big visuals incoming.',
  'doctor-clinic-healthcare': 'Healthcare needs calm and clarity. Good to know early.',
  'coach-educator-institute': 'Teaching people is great work. We’ll help them find you.',
  'hotel-resort-homestay': 'Stays are about the feeling. We’ll make people want to book.',
  'real-estate': 'Real estate, great. Listings that look good and load fast.',
  'legal-financial-services': 'Legal and finance need to feel solid. We’ll keep it sharp and credible.',
  'creator-influencer-artist': 'A creator! Your site can be your home base beyond the feed.',
  'tech-startup-saas': 'A startup, exciting. Clear story, strong sign-up flow.',
  'agency-studio': 'A fellow studio. We’ll make your work the star.',
  'ngo-non-profit': 'Love that you’re doing good. We’ll help people get behind it.',
  other: 'Something different, love it. Tell us a little more below.',
  // operation
  'fully-offline-no-online-presence-yet': 'Your first step online, exciting. We’ll keep it simple.',
  'offline-business-moving-online': 'Bringing a real business online is our favourite kind of project.',
  'already-operating-online': 'Already online, great. We’ll build on what works.',
  'early-stage-idea-or-concept': 'An idea stage project, fun. We love shaping things early.',
  // projectStage
  scratch: 'A fresh start! The best kind of blank page.',
  redesign: 'A redesign, nice. Let’s give it the glow-up it deserves.',
  features: 'Adding features, smart. Let’s make your site do more.',
  // websiteType
  business: 'A business site, a classic for good reason.',
  store: 'A store, let’s get those carts filling up.',
  booking: 'Bookings, great. Fewer calls, more confirmed slots.',
  platform: 'A platform, ambitious! We like ambitious.',
  'not-sure': 'No problem. That’s what we’re here for.',
  // audience / redesignAudience
  'local-customers-near-me': 'Local focus, great. We’ll help nearby people find you.',
  'city-region': 'City-wide, nice reach.',
  nationwide: 'Nationwide, let’s think big.',
  'global-international': 'Global, love the ambition.',
  // references / redesignInspiration
  'yes-i-ll-share-links-later': 'Perfect, references help us a lot.',
  'i-have-some-ideas-but-no-links': 'Ideas are plenty to start with.',
  'no-i-want-you-to-guide-me': 'Happy to lead the way.',
  'yes-i-ll-share-references': 'Perfect, references help us a lot.',
  'i-have-ideas-but-no-links': 'Ideas are plenty to start with.',
  'no-i-want-you-to-guide-the-design': 'Happy to lead the way.',
  // contentStatus
  'i-already-have-all-the-content': 'Content ready? You’re ahead of most people.',
  'i-have-rough-content-that-needs-refinement': 'Rough drafts are a great start. We’ll polish them.',
  'i-need-help-writing-content': 'We’ve got words covered.',
  'i-need-help-with-both-content-and-visuals': 'Words and visuals, we can handle both.',
  'i-m-not-sure-yet': 'That’s fine, we’ll figure it out together.',
  // timelines
  'just-exploring-for-now': 'Exploring is a good place to be. No rush.',
  'in-the-next-1-2-months': 'A month or two, a comfortable runway.',
  'within-a-few-weeks': 'A few weeks, we can move fast.',
  immediately: 'Right away? Let’s get moving.',
  // priorities
  speed: 'Speed, a site that loads fast keeps people around.',
  'premium-quality': 'Premium quality, our favourite standard.',
  'leads-conversions': 'Leads, let’s make every visit count.',
  'seo-and-long-term-growth': 'Playing the long game, smart.',
  'smooth-user-experience': 'Smooth, easy to use, no friction.',
  'scalability-for-the-future': 'Building for later too, wise.',
  // language
  'english-only': 'English it is.',
  'local-language': 'Speaking your customers’ language, love that.',
  multilingual: 'Multilingual, more people, more reach.',
  'not-sure-yet': 'No worries, we can decide later.',
  // sections
  home: 'The front door, essential.',
  about: 'People love the story behind a brand.',
  'services-products': 'What you offer, front and centre.',
  contact: 'Easy to reach, always.',
  pricing: 'Clear pricing saves everyone time.',
  'blog-updates': 'A blog, great for search and for trust.',
  // redesignType
  complete: 'A full redesign, let’s go all in.',
  'major-upgrade': 'Sounds like it’s time. We’ll sort it out.',
  'small-changes': 'Small changes, got it.',
  // redesignWhy / redesignFrustration
  'the-design-looks-outdated': 'Time for a fresh coat, then.',
  'the-website-doesn-t-represent-the-brand-anymore': 'Your brand has grown. Your site should too.',
  'low-conversions-engagement': 'Let’s turn more visits into customers.',
  'poor-mobile-experience': 'Most visits are on phones. Good catch.',
  'business-has-evolved-new-services-audience-positioning': 'Growing pains, the good kind.',
  'navigation-is-confusing': 'We’ll make it easy to find things.',
  'design-feels-outdated': 'Time for a fresh coat, then.',
  'content-is-unclear': 'Clear words make a big difference.',
  'low-leads-or-conversions': 'Let’s turn more visits into customers.',
  'slow-performance': 'Slow sites lose people. We’ll fix that.',
  'not-sure-just-feels-off': 'Trust that feeling, we’ll find what’s off.',
  // redesignImprove
  'visual-quality-and-brand-presence': 'Let’s make it look the part.',
  'user-experience-and-flow': 'Smooth journeys, happy visitors.',
  'conversions-leads-sales-bookings': 'More results, that’s the goal.',
  'speed-and-performance': 'Fast is a feature.',
  'clarity-of-messaging': 'Clear message, stronger brand.',
  // vibe / redesignDirection
  'clean-and-minimal': 'Clean and minimal, timeless choice.',
  'bold-and-modern': 'Bold and modern, let’s make some noise.',
  'trendy-and-stylish': 'Trendy and stylish, fun!',
  'premium-luxury': 'Premium, elegant and refined it is.',
  'playful-artistic': 'Playful, this is going to be fun.',
  'creative-artistic': 'Creative, we love a bit of personality.',
  'animated-high-energy': 'Animated, let’s bring it to life.',
  // brandAssets
  'yes-logo-colors-fonts-ready': 'A ready brand kit, makes our job easier.',
  'logo-only-needs-a-system': 'A logo is a great start. We’ll build around it.',
  'no-brand-visuals-need-improvement': 'We can help with the brand too.',
  // redesignContent
  'content-is-good-just-needs-redesign': 'Good content is half the battle won.',
  'content-needs-refinement': 'A little polish goes a long way.',
  'content-needs-rewriting': 'Fresh words for a fresh site.',
  // platform
  wordpress: 'WordPress, we know it well.',
  shopify: 'Shopify, a solid choice for selling.',
  webflow: 'Webflow, nice and flexible.',
  wix: 'Wix, noted.',
  framer: 'Framer, a designer favourite.',
  'custom-built-html-react-next-js-etc': 'Custom-built, our home turf.',
  // featuresHandled
  'manually-spreadsheets-whatsapp-email-etc': 'Spreadsheets and WhatsApp? We can automate that.',
  'using-third-party-tools': 'Good to know what’s already in place.',
  'partially-on-the-website': 'Halfway there already.',
  'not-handled-at-all': 'A blank slate, we’ll design it right.',
  // featuresWhy
  'business-growth': 'Growth, love to hear it.',
  'manual-work-is-slowing-us-down': 'Let’s give you some hours back.',
  'customer-demand': 'Your customers asked. Let’s deliver.',
  'scaling-operations': 'Scaling up, exciting times.',
  'competitive-pressure': 'Let’s help you stay ahead.',
  // featuresCritical
  'core-to-my-business': 'Core to the business, we’ll treat it that way.',
  'very-important-major-improvement': 'A big one. We’ll give it focus.',
  'useful-but-not-urgent': 'Nice to have, noted.',
  'just-experimenting': 'Experiments are how good ideas start.',
}

const FALLBACK = ['Nice pick.', 'Good one.', 'Got it, thanks.', 'Noted.']

export function cheerFor(value: string): string {
  return OPTION_CHEER[value] ?? FALLBACK[value.length % FALLBACK.length]
}

const HEADLINES = ['Great choice!', 'Love it!', 'Nice pick!', 'Ooh, good one!', 'Yes, that’s it!', 'Brilliant!']

/** The big celebratory line on the pop-up; varies by option so it doesn't repeat every time. */
export function headlineFor(value: string): string {
  let hash = 0
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return HEADLINES[hash % HEADLINES.length]
}

/** "Chai & Co." → "CC", "Nimbus" → "N": up to two initials for the brand monogram. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || name.trim()[0]?.toUpperCase() || ''
}

const NAME_LINES = [
  'What a name. Let’s give it a website it deserves.',
  'Great to meet you. Let’s make it shine online.',
  'Love the name. Let’s build something you’re proud to share.',
]

/** The line under "Hello, {name}!" — varies by name so it feels written for them. */
export function nameLineFor(name: string): string {
  return NAME_LINES[name.trim().length % NAME_LINES.length]
}
