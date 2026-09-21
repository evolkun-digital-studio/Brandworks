// Content and scroll timeline for the Featured Work → Photography bridge
// (components/PhotographyTransition). Positions are scroll progress through
// the section (0 = its sticky stage reaches the top of the viewport,
// 1 = the stage releases); the sequence is scrubbed, so it sits exactly
// where the scroll puts it and runs backwards when the reader does.

export type TypographyStage = {
  id: string
  text: string
  /** Swap freely — every size and format is derived from this one URL. */
  image: string
  /** The source's pixel size: caps srcSet and sets the cover-fit `sizes`. */
  width: number
  height: number
  alt: string
  /** Crop anchor per breakpoint, aimed at the image's subject. */
  position: { desktop: string; mobile: string }
  /** Strength of the dark reading shade behind the type over this image. */
  shade: number
}

/** One statement, built a word at a time: each word arrives with its own picture. */
export const TYPOGRAPHY_STAGES: TypographyStage[] = [
  {
    id: 'perception',
    text: 'PERCEPTION',
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2005_22_18%20PM.png',
    width: 1672,
    height: 941,
    alt: 'Perception visual',
    position: { desktop: '50% 50%', mobile: '22% 50%' },
    shade: 0.72,
  },
  {
    id: 'becomes',
    text: 'BECOMES',
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2005_19_10%20PM.png',
    width: 1916,
    height: 821,
    alt: 'Creative transformation visual',
    position: { desktop: '32% 50%', mobile: '30% 50%' },
    shade: 0.72,
  },
  {
    id: 'reality',
    text: 'REALITY',
    image: 'https://ik.imagekit.io/rxoyjxx4c/ChatGPT%20Image%20Sep%2021,%202026,%2005_23_56%20PM.png',
    width: 1672,
    height: 941,
    alt: 'Final creative outcome',
    position: { desktop: '50% 50%', mobile: '62% 50%' },
    shade: 0.5,
  },
]

type Range = readonly [number, number]

export const TRANSITION_TIMELINE = {
  /** Per stage, aligned with TYPOGRAPHY_STAGES. `image`: the picture
   *  crossfades in over the one before (the first is already there as the
   *  section arrives). `text`: its word rises, once its picture has landed.
   *  0.88–1.00 holds the finished statement over the REALITY picture. */
  stages: [
    { image: [0, 0], text: [0.05, 0.22] },
    { image: [0.3, 0.42], text: [0.42, 0.58] },
    { image: [0.62, 0.74], text: [0.74, 0.88] },
  ] as { image: Range; text: Range }[],
  /** How long each picture takes to ease from its starting scale to 1. */
  settle: 0.3,
} as const

export const TRANSITION_MOTION = {
  /** cubic-bezier(0.16, 1, 0.3, 1): a long, quiet landing. */
  textEase: 'M0,0 C0.16,1 0.3,1 1,1',
  textFrom: 110, // yPercent
  imageScaleFrom: 1.04,
  /** Scroll smoothing, matching the site's other scrubbed sections. */
  scrub: { desktop: 1.2, mobile: 0.8 },
  /** Widths offered in srcSet, capped at each source's own width. */
  srcWidths: [640, 960, 1280, 1600, 1920],
} as const
