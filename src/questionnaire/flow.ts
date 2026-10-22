/**
 * The website-project questionnaire, as data.
 *
 * Mirrors the agreed flowchart: four shared opening questions, then one of
 * three branches picked by "Where are you right now with your website
 * project?" —
 *
 *   scratch   → website type → AI greet + USP question → AI reply → brief
 *   redesign  → redesign scope (small changes exit politely) → optional URL → redesign brief
 *   features  → current site + the features to add
 *
 * Every branch ends with the contact step, then submission. This module is
 * pure (no React, no browser or server APIs) so the page and the API route
 * share one definition: the server rebuilds the human-readable answer list
 * from it rather than trusting labels sent by the browser.
 */

export type Answer = string | string[]
export type Answers = Record<string, Answer | undefined>
export type Branch = 'scratch' | 'redesign' | 'features'

export type VisualKey =
  | 'business' | 'store' | 'booking' | 'platform' | 'unsure'
  | 'minimal' | 'bold' | 'trendy' | 'premium' | 'playful' | 'animated' | 'creative'

export type Option = { value: string; label: string; hint?: string; visual?: VisualKey }

export type SectionKey = 'basics' | 'project' | 'style' | 'details' | 'contact'

export const SECTION_LABELS: Record<SectionKey, string> = {
  basics: 'Your business',
  project: 'The project',
  style: 'Look & feel',
  details: 'Details',
  contact: 'Contact',
}

type Base = {
  id: string
  section: SectionKey
  title: string
  helper?: string
  optional?: boolean
  /** Leaving this step streams a one-line AI reaction at the top of the next question. */
  aiReact?: true
  /** Free-text steps that offer AI idea chips under the answer box. */
  aiSuggest?: true
}

export type TextStep = Base & { kind: 'text'; placeholder?: string; inputType?: 'text' | 'url'; maxLength?: number }
export type LongTextStep = Base & {
  kind: 'longtext'
  placeholder?: string
  voice?: boolean
  maxLength?: number
  /** An AI message rendered above the question (the flowchart's GREET). */
  aiIntro?: 'greet'
}
export type SingleStep = Base & {
  kind: 'single'
  options: Option[]
  layout?: 'list' | 'visual'
  /** Choosing this value reveals a short "describe it" field stored under `${id}Other`. */
  otherValue?: string
  /** Choosing this value asks the AI for a suggestion (scratch → "Not sure yet"). */
  assistValue?: string
}
export type MultiStep = Base & {
  kind: 'multi'
  options: Option[]
  max?: number
  layout?: 'list' | 'visual'
  /** Values that can't be combined with anything else ("Not sure yet"). */
  exclusive?: string[]
}
/** A non-question screen where the AI speaks (the flowchart's second GREET). */
export type AiStep = Base & { kind: 'ai'; task: 'usp-reply'; cta: string }
/** The polite stop for redesigns that are only small changes. */
export type ExitStep = Base & { kind: 'exit'; heading: string; body: string }
export type ContactStep = Base & { kind: 'contact' }

export type Step = TextStep | LongTextStep | SingleStep | MultiStep | AiStep | ExitStep | ContactStep

/* -------------------------------------------------------------------------- */
/*  Shared option sets                                                        */
/* -------------------------------------------------------------------------- */

const opts = (...labels: string[]): Option[] => labels.map((label) => ({ value: slug(label), label }))

export function slug(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const AUDIENCE = opts('Local customers (near me)', 'City / region', 'Nationwide', 'Global / international')
const TIMELINE = opts('Just exploring for now', 'In the next 1–2 months', 'Within a few weeks', 'Immediately')

/* -------------------------------------------------------------------------- */
/*  Steps                                                                     */
/* -------------------------------------------------------------------------- */

export const STEPS: Record<string, Step> = {
  /* ---- Shared opening ---------------------------------------------------- */
  brandName: {
    id: 'brandName', section: 'basics', kind: 'text',
    title: 'What’s the name of your business or brand?',
    helper: 'Working name is fine if it isn’t final yet.',
    placeholder: 'e.g. Chai & Co.',
    maxLength: 120,
  },
  workType: {
    id: 'workType', section: 'basics', kind: 'single', aiReact: true,
    title: 'What kind of work do you do?',
    options: opts(
      'Restaurant / Café / Food brand',
      'Local services (salon, gym, plumbing, etc.)',
      'Home services (cleaning, repair, maintenance)',
      'E-commerce / Online store',
      'Fashion / Clothing brand',
      'Doctor / Clinic / Healthcare',
      'Coach / Educator / Institute',
      'Hotel / Resort / Homestay',
      'Real estate',
      'Legal / Financial services',
      'Creator / Influencer / Artist',
      'Tech startup / SaaS',
      'Agency / Studio',
      'NGO / Non-profit',
      'Other',
    ),
    otherValue: 'other',
  },
  operation: {
    id: 'operation', section: 'basics', kind: 'single', aiReact: true,
    title: 'How does your business operate today?',
    options: opts(
      'Fully offline (no online presence yet)',
      'Offline business moving online',
      'Already operating online',
      'Early-stage idea or concept',
    ),
  },
  projectStage: {
    id: 'projectStage', section: 'project', kind: 'single', aiReact: true,
    title: 'Where are you right now with your website project?',
    options: [
      { value: 'scratch', label: 'I’m starting from scratch', hint: 'No website yet' },
      { value: 'redesign', label: 'I have a website → redesign it', hint: 'New look, structure and experience' },
      { value: 'features', label: 'I have a website → add features', hint: 'Keep the site, extend what it does' },
    ],
  },

  /* ---- Branch: starting from scratch ------------------------------------ */
  websiteType: {
    id: 'websiteType', section: 'project', kind: 'single', layout: 'visual', aiReact: true,
    title: 'What kind of website are you building?',
    options: [
      { value: 'business', label: 'Business website', hint: 'Services + trust + inquiry', visual: 'business' },
      { value: 'store', label: 'Online store', hint: 'Products + payments', visual: 'store' },
      { value: 'booking', label: 'Booking website', hint: 'Appointments / reservations', visual: 'booking' },
      { value: 'platform', label: 'Platform / marketplace', hint: 'Multiple vendors / users', visual: 'platform' },
      { value: 'not-sure', label: 'Not sure yet', hint: 'Help me choose', visual: 'unsure' },
    ],
    assistValue: 'not-sure',
  },
  usp: {
    id: 'usp', section: 'project', kind: 'longtext', aiIntro: 'greet', optional: true, voice: true, aiSuggest: true,
    title: 'Is there any unique USP or feature idea you have?',
    helper: 'What makes you different, or something you’d love the website to do.',
    placeholder: 'e.g. Customers can build their own gift box and see it before they pay.',
    maxLength: 1500,
  },
  uspReply: {
    id: 'uspReply', section: 'project', kind: 'ai', task: 'usp-reply',
    title: 'Got it.',
    cta: 'Now, let’s move forward',
  },
  audience: {
    id: 'audience', section: 'project', kind: 'single',
    title: 'Who is the website mainly for?',
    options: AUDIENCE,
  },
  vibe: {
    id: 'vibe', section: 'style', kind: 'single', layout: 'visual', aiReact: true,
    title: 'What kind of design vibe are you going for?',
    options: [
      { value: 'clean-and-minimal', label: 'Clean & minimal', visual: 'minimal' },
      { value: 'bold-and-modern', label: 'Bold & modern', visual: 'bold' },
      { value: 'trendy-and-stylish', label: 'Trendy & stylish', visual: 'trendy' },
      { value: 'premium-luxury', label: 'Premium / luxury', visual: 'premium' },
      { value: 'playful-artistic', label: 'Playful / artistic', visual: 'playful' },
      { value: 'animated-high-energy', label: 'Animated / high-energy', visual: 'animated' },
    ],
  },
  references: {
    id: 'references', section: 'style', kind: 'single',
    title: 'Do you have any website references or inspiration you like?',
    options: opts('Yes (I’ll share links later)', 'I have some ideas but no links', 'No, I want you to guide me'),
  },
  contentStatus: {
    id: 'contentStatus', section: 'details', kind: 'single',
    title: 'How are you handling the content for the website?',
    options: opts(
      'I already have all the content',
      'I have rough content that needs refinement',
      'I need help writing content',
      'I need help with both content and visuals',
      'I’m not sure yet',
    ),
  },
  timeline: {
    id: 'timeline', section: 'details', kind: 'single',
    title: 'How soon do you want to move forward?',
    options: TIMELINE,
  },
  priorities: {
    id: 'priorities', section: 'details', kind: 'multi', max: 2, aiReact: true,
    title: 'What matters most to you for this project?',
    helper: 'Pick up to 2.',
    options: opts('Speed', 'Premium quality', 'Leads / conversions', 'SEO & long-term growth', 'Smooth user experience', 'Scalability for the future'),
  },
  idea: {
    id: 'idea', section: 'details', kind: 'longtext', optional: true, voice: true, aiSuggest: true,
    title: 'Tell us about your idea',
    helper: 'You can explain your idea in your own words. No pressure, speak freely.',
    placeholder: 'Type here, or tap the mic and just talk.',
    maxLength: 3000,
  },
  language: {
    id: 'language', section: 'details', kind: 'single',
    title: 'What language should the website be in?',
    options: opts('English only', 'Local language', 'Multilingual', 'Not sure yet'),
  },
  sections: {
    id: 'sections', section: 'details', kind: 'multi',
    title: 'Which sections do you already know you’ll need?',
    helper: 'Pick all that apply.',
    options: opts('Home', 'About', 'Services / Products', 'Contact', 'Pricing', 'Blog / Updates', 'Not sure yet'),
    exclusive: ['not-sure-yet'],
  },

  /* ---- Branch: redesign -------------------------------------------------- */
  redesignType: {
    id: 'redesignType', section: 'project', kind: 'single',
    title: 'What kind of redesign are you looking for?',
    options: [
      { value: 'complete', label: 'Complete website redesign', hint: 'New design, new structure, improved experience' },
      { value: 'major-upgrade', label: 'I’m not sure — but the site needs a major upgrade', hint: 'Feels outdated, doesn’t reflect the brand anymore' },
      { value: 'small-changes', label: 'Only small changes or section updates', hint: 'UI tweaks, one page, minor fixes' },
    ],
  },
  redesignExit: {
    id: 'redesignExit', section: 'project', kind: 'exit',
    title: 'Thanks for sharing.',
    heading: 'Thanks for sharing.',
    body: 'We currently focus on complete website redesigns where we can fully improve design, flow, and performance. If you’re planning a full redesign in the future, we’d love to help.',
  },
  redesignUrl: {
    id: 'redesignUrl', section: 'project', kind: 'text', inputType: 'url', optional: true,
    title: 'What’s your current website URL?',
    helper: 'So we can take a quick look at how it’s performing.',
    placeholder: 'yourbrand.com',
    maxLength: 300,
  },
  redesignWhy: {
    id: 'redesignWhy', section: 'project', kind: 'multi', aiReact: true,
    title: 'Why do you want to redesign your website now?',
    helper: 'Pick all that apply.',
    options: opts(
      'The design looks outdated',
      'The website doesn’t represent the brand anymore',
      'Low conversions / engagement',
      'Poor mobile experience',
      'Business has evolved (new services, audience, positioning)',
    ),
  },
  redesignFrustration: {
    id: 'redesignFrustration', section: 'project', kind: 'multi',
    title: 'What feels most frustrating or ineffective on your current website?',
    helper: 'Pick all that apply.',
    options: opts(
      'Navigation is confusing',
      'Design feels outdated',
      'Content is unclear',
      'Low leads or conversions',
      'Poor mobile experience',
      'Slow performance',
      'Not sure — just feels off',
    ),
    exclusive: ['not-sure-just-feels-off'],
  },
  redesignImprove: {
    id: 'redesignImprove', section: 'project', kind: 'multi', max: 2, aiReact: true,
    title: 'What should improve the most after the redesign?',
    helper: 'Pick up to 2.',
    options: opts(
      'Visual quality & brand presence',
      'User experience & flow',
      'Conversions (leads / sales / bookings)',
      'Speed & performance',
      'Clarity of messaging',
    ),
  },
  redesignDirection: {
    id: 'redesignDirection', section: 'style', kind: 'single', layout: 'visual',
    title: 'What design direction do you want to move towards?',
    options: [
      { value: 'clean-and-minimal', label: 'Clean & minimal', visual: 'minimal' },
      { value: 'bold-and-modern', label: 'Bold & modern', visual: 'bold' },
      { value: 'premium-luxury', label: 'Premium / luxury', visual: 'premium' },
      { value: 'trendy-and-stylish', label: 'Trendy & stylish', visual: 'trendy' },
      { value: 'creative-artistic', label: 'Creative / artistic', visual: 'creative' },
      { value: 'animated-high-energy', label: 'Animated / high-energy', visual: 'animated' },
    ],
  },
  brandAssets: {
    id: 'brandAssets', section: 'style', kind: 'single',
    title: 'Do you already have brand guidelines or visual assets?',
    options: opts('Yes (logo, colors, fonts ready)', 'Logo only (needs a system)', 'No — brand visuals need improvement'),
  },
  redesignInspiration: {
    id: 'redesignInspiration', section: 'style', kind: 'single',
    title: 'Do you have any websites you like or want inspiration from?',
    options: opts('Yes — I’ll share references', 'I have ideas but no links', 'No — I want you to guide the design'),
  },
  redesignContent: {
    id: 'redesignContent', section: 'details', kind: 'single',
    title: 'What about your current content?',
    options: opts('Content is good — just needs redesign', 'Content needs refinement', 'Content needs rewriting', 'Not sure yet'),
  },
  redesignAudience: {
    id: 'redesignAudience', section: 'details', kind: 'single',
    title: 'Who is the website mainly for?',
    options: AUDIENCE,
  },
  redesignTimeline: {
    id: 'redesignTimeline', section: 'details', kind: 'single',
    title: 'How soon are you planning to move forward with the redesign?',
    options: TIMELINE,
  },
  redesignNotes: {
    id: 'redesignNotes', section: 'details', kind: 'longtext', optional: true, voice: true,
    title: 'Anything specific you want us to know about this redesign?',
    helper: 'Tell us what you don’t like about your current site, or what you want it to become.',
    maxLength: 3000,
  },

  /* ---- Branch: add features --------------------------------------------- */
  currentUrl: {
    id: 'currentUrl', section: 'project', kind: 'text', inputType: 'url',
    title: 'What’s your current website URL?',
    helper: 'So we can understand your current setup.',
    placeholder: 'yourbrand.com',
    maxLength: 300,
  },
  platform: {
    id: 'platform', section: 'project', kind: 'single',
    title: 'Which platform or technology is your website built on?',
    options: opts('WordPress', 'Shopify', 'Webflow', 'Wix', 'Framer', 'Custom-built (HTML / React / Next.js etc.)', 'Not sure'),
  },
  featuresWanted: {
    id: 'featuresWanted', section: 'project', kind: 'longtext', voice: true, aiReact: true, aiSuggest: true,
    title: 'What features are you planning to add?',
    placeholder: 'e.g. Online booking with payments, a customer login, WhatsApp order updates…',
    maxLength: 2000,
  },
  featuresHandled: {
    id: 'featuresHandled', section: 'project', kind: 'single',
    title: 'How are these tasks or features handled right now?',
    options: opts(
      'Manually (spreadsheets, WhatsApp, email, etc.)',
      'Using third-party tools',
      'Partially on the website',
      'Not handled at all',
      'Not sure',
    ),
  },
  featuresWhy: {
    id: 'featuresWhy', section: 'details', kind: 'multi',
    title: 'Why do you want to add these features now?',
    helper: 'Pick all that apply.',
    options: opts('Business growth', 'Manual work is slowing us down', 'Customer demand', 'Scaling operations', 'Competitive pressure'),
  },
  featuresCritical: {
    id: 'featuresCritical', section: 'details', kind: 'single', aiReact: true,
    title: 'How critical are these features to your business?',
    options: opts('Core to my business', 'Very important (major improvement)', 'Useful but not urgent', 'Just experimenting'),
  },
  featuresTimeline: {
    id: 'featuresTimeline', section: 'details', kind: 'single',
    title: 'How soon do you want to move forward?',
    options: TIMELINE,
  },
  featuresNotes: {
    id: 'featuresNotes', section: 'details', kind: 'longtext', optional: true, voice: true,
    title: 'Anything else we should know?',
    helper: 'Share any constraints, expectations, or context you think is important.',
    maxLength: 3000,
  },

  /* ---- Shared ending ----------------------------------------------------- */
  contact: {
    id: 'contact', section: 'contact', kind: 'contact',
    title: 'Where should we send your project plan?',
    helper: 'A real person at BrandWorks reads every one of these and replies.',
  },
}

const OPENING = ['brandName', 'workType', 'operation', 'projectStage']

const BRANCHES: Record<Branch, string[]> = {
  scratch: [
    'websiteType', 'usp', 'uspReply', 'audience', 'vibe', 'references', 'contentStatus',
    'timeline', 'priorities', 'idea', 'language', 'sections',
  ],
  redesign: [
    'redesignType', 'redesignUrl', 'redesignWhy', 'redesignFrustration', 'redesignImprove', 'redesignDirection',
    'brandAssets', 'redesignInspiration', 'redesignContent', 'redesignAudience', 'redesignTimeline', 'redesignNotes',
  ],
  features: [
    'currentUrl', 'platform', 'featuresWanted', 'featuresHandled', 'featuresWhy',
    'featuresCritical', 'featuresTimeline', 'featuresNotes',
  ],
}

export function branchOf(answers: Answers): Branch | undefined {
  const stage = answers.projectStage
  return stage === 'scratch' || stage === 'redesign' || stage === 'features' ? stage : undefined
}

/**
 * The ordered step ids for the answers given so far. Until the branch
 * question is answered the path is just the opening; a small-changes
 * redesign ends on the exit screen instead of the contact step.
 */
export function buildPath(answers: Answers): string[] {
  const branch = branchOf(answers)
  if (!branch) return [...OPENING]
  if (branch === 'redesign' && answers.redesignType === 'small-changes') {
    return [...OPENING, 'redesignType', 'redesignExit']
  }
  return [...OPENING, ...BRANCHES[branch], 'contact']
}

/** Every step id a branch can visit — the server only keeps answers for these. */
export function allowedStepIds(answers: Answers): Set<string> {
  return new Set(buildPath(answers))
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

export const CONTACT_FIELDS = ['contactName', 'contactEmail', 'contactPhone', 'contactWebsite'] as const

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/)?[^\s.]+(\.[^\s.]+)+(\/\S*)?$/i.test(value.trim())
}

const str = (v: Answer | undefined) => (typeof v === 'string' ? v : '')
const list = (v: Answer | undefined) => (Array.isArray(v) ? v : [])

/** A message for the first problem with this step's answer, or null if it can move on. */
export function validateStep(step: Step, answers: Answers): string | null {
  switch (step.kind) {
    case 'text': {
      const value = str(answers[step.id]).trim()
      if (!value) return step.optional ? null : 'This one helps us a lot. A short answer is fine.'
      if (step.inputType === 'url' && !looksLikeUrl(value)) return 'That doesn’t look like a web address. Try something like yourbrand.com'
      return null
    }
    case 'longtext': {
      const value = str(answers[step.id]).trim()
      if (!value && !step.optional) return 'A sentence or two is plenty.'
      return null
    }
    case 'single': {
      const value = str(answers[step.id])
      if (!step.options.some((o) => o.value === value)) return 'Pick the option that fits best.'
      if (step.otherValue && value === step.otherValue && !str(answers[`${step.id}Other`]).trim()) {
        return 'Describe it briefly so we know what you do.'
      }
      return null
    }
    case 'multi': {
      const values = list(answers[step.id])
      if (values.length === 0) return step.optional ? null : 'Pick at least one.'
      if (step.max && values.length > step.max) return `Pick up to ${step.max}.`
      return null
    }
    case 'contact': {
      if (!str(answers.contactName).trim()) return 'What should we call you?'
      if (!isEmail(str(answers.contactEmail))) return 'That email doesn’t look quite right.'
      const site = str(answers.contactWebsite).trim()
      if (site && !looksLikeUrl(site)) return 'That website doesn’t look quite right. Leave it empty if you don’t have one.'
      return null
    }
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Readable summary                                                          */
/* -------------------------------------------------------------------------- */

export type SummaryRow = { id: string; question: string; answer: string }

const labelFor = (step: SingleStep | MultiStep, value: string) =>
  step.options.find((o) => o.value === value)?.label ?? value

/** Question/answer pairs in path order, in the words the customer saw. */
export function summarize(answers: Answers): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const id of buildPath(answers)) {
    const step = STEPS[id]
    if (!step) continue
    let answer = ''
    if (step.kind === 'text' || step.kind === 'longtext') answer = str(answers[id]).trim()
    if (step.kind === 'single') {
      const value = str(answers[id])
      answer = value ? labelFor(step, value) : ''
      if (step.otherValue && value === step.otherValue) {
        const other = str(answers[`${id}Other`]).trim()
        if (other) answer = `${answer}: ${other}`
      }
      if (step.assistValue && value === step.assistValue) {
        const suggested = str(answers[`${id}Suggested`])
        const match = step.options.find((o) => o.value === suggested)
        if (match) answer = `${answer} (AI suggested: ${match.label})`
      }
    }
    if (step.kind === 'multi') answer = list(answers[id]).map((v) => labelFor(step, v)).join(', ')
    if (answer) rows.push({ id, question: step.title, answer })
  }
  return rows
}

/** Rough count for "question x of y" before the branch is known. */
export function estimatedLength(answers: Answers): number {
  const path = buildPath(answers)
  if (branchOf(answers)) return path.filter((id) => STEPS[id]?.kind !== 'ai').length
  return OPENING.length + 12
}
