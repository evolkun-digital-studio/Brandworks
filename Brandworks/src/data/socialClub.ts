/** All copy + media for SocialClubPage. Replace freely: animation code never reads text or URLs from anywhere else. */
import campaignAction from '../assets/social/campaign-action.jpg'
import campaignAerial from '../assets/social/campaign-aerial.jpg'
import campaignMotion from '../assets/social/campaign-motion.jpg'
import contentStill from '../assets/social/content-still.webp'
import campaignStill from '../assets/social/campaign-still.webp'
import reel01 from '../assets/social/reel-01-poster.webp'
import reel02 from '../assets/social/reel-02-poster.webp'
import reel03 from '../assets/social/reel-03-poster.webp'

export const clubImages = {
  left: campaignAction,
  center: campaignStill,
  right: campaignMotion,
  caseThumb: reel01,
  projects: [reel02, reel03, campaignAerial, contentStill],
  expertise: [campaignStill, contentStill, campaignAerial],
}

export const clubData = {
  wordmark: 'BRANDWORKS',
  hero: { label: 'Social media agency', line1: 'Human', line2: 'Social club' },
  caseOfMonth: { label: 'Case of the month', title: 'Studio launch', tags: ['Content creation', 'Community management', 'Social media strategy'] },
  statement: { left: 'We are the current.', right: 'You are the story.' },
  electric: {
    title: ['We', 'electrify', 'your networks,'],
    lead: 'We are convinced that digital communication is not just about publishing a few posts.',
    copy: 'It is a story to tell, a strategy to build, an image to embody. Our mission: turn your social media into a powerful lever for visibility and growth, while keeping what matters most to us: people at the heart of every project.',
  },
  projects: {
    title: ['We', 'make them', 'social'],
    items: [
      { title: 'Studio launch', tags: ['Content creation'] },
      { title: 'Village stories', tags: ['Community management', 'Strategy'] },
      { title: 'Hotel season', tags: ['Content creation', 'Strategy'] },
      { title: 'Atelier bag', tags: ['Photography'] },
    ],
  },
  expertise: {
    title: ['Reasoning', 'to better:', 'resonating.'],
    copy: 'We are a social media agency built on three strong areas of expertise.',
    areas: [
      { title: 'Social media strategy', tags: ['Audit', 'Positioning', 'Editorial line', 'Benchmarks'] },
      { title: 'Content creation', tags: ['Videos', 'Photos', 'Reels', 'Interviews', 'Studio recording', 'Corporate'] },
      { title: 'Community management', tags: ['Editorial planning', 'Posting', 'Creating stories', 'Moderation', 'Reporting', 'Project management'] },
    ],
  },
  process: {
    title: ['We will', 'always', 'prefer', 'this order.'],
    lead: 'At BrandWorks, each project follows a clear and structured process.',
    copy: 'Because effective communication cannot be improvised, we use a method that combines strategy, creativity and rigor to guarantee concrete results.',
    steps: [
      ['01', 'Strategy', 'Analysis and definition of the pillars of communication.'],
      ['02', 'Art direction', 'A recognizable visual and verbal system, built before production.'],
      ['03', 'Content creation', 'Photos, films and reels produced for every platform.'],
      ['04', 'Community management', 'Publishing, replying and keeping the account alive.'],
      ['05', 'Reporting', 'Reading the signals to sharpen the next cycle.'],
    ] as const,
  },
  why: {
    title: ['Why', 'choose', 'BrandWorks?'],
    cards: [
      ['Social media experts', 'Strategy, production and community live in the same team.'],
      ['Made for you', 'No copy-paste calendars or borrowed brand voices.'],
      ['One clear method', 'Every creative decision ties back to a measurable goal.'],
    ] as const,
  },
}
