// Content and motion settings for the Brand Intelligence section
// (components/BrandIntelligence), which sits directly after Our Services.

export type BrandSignal = { number: string; title: string }

/** Fixed order: the cards are numbered, and read as a sequence. */
export const BRAND_SIGNALS: BrandSignal[] = [
  { number: '01', title: 'Clarity' },
  { number: '02', title: 'Trust' },
  { number: '03', title: 'Memory' },
  { number: '04', title: 'Preference' },
  { number: '05', title: 'Growth' },
  { number: '06', title: 'Identity' },
  { number: '07', title: 'Communication' },
  { number: '08', title: 'Content' },
  { number: '09', title: 'Reputation' },
  { number: '10', title: 'Founder Presence' },
  { number: '11', title: 'Creative Direction' },
]

export const BRAND_INTELLIGENCE_COPY = {
  eyebrow: 'THE INTELLIGENCE BEHIND EVERY BRAND',
  heading: 'Eleven signals every brand sends, whether it means to or not.',
  label: 'INTELLIGENCE',
} as const

export const BRAND_INTELLIGENCE_MOTION = {
  /** Only smooths the scroll-linked track; it never adds travel of its own.
   *  Overdamped (no bounce) and quick to settle, so the track stops soon
   *  after the scroll does. (Stiffness 70 / damping 25 trails by ~0.36s.) */
  spring: { stiffness: 170, damping: 30, mass: 0.35 },
  /** Over this much progress at each end, the smoothed value hands over to
   *  the raw scroll position. Any spring trails a fast scroll, and without
   *  this the stage could release with the last card still short of home. */
  edge: 0.06,
  /** A card at the reading position vs. one `span` card-steps away. The
   *  reading position is the first card's place at the start and eases to
   *  the last card's resting place by the end, so both ends are in focus. */
  focus: {
    /** Approaching from the right. */
    ahead: { opacity: 0.72 },
    /** Passing out to the left. */
    behind: { opacity: 0.78 },
    scale: 0.985,
    blur: 1.5, // px, at most
    /** Held at full focus within this many card-steps of the reading position. */
    hold: 0.15,
    /** Card-steps over which focus falls away: the next card, already fully
     *  on screen, is only partly dimmed. */
    span: 1.4,
  },
} as const
