// Content and scroll timeline for the Featured Work → Photography bridge.

export type TypographyStage = {
  id: string
  text: string
  image: string
  width: number
  height: number
  alt: string
  position: { desktop: string; mobile: string }
  shade: number
}

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
  stages: [
    { image: [0, 0], text: [0.05, 0.22] },
    { image: [0.3, 0.42], text: [0.42, 0.58] },
    { image: [0.62, 0.74], text: [0.74, 0.88] },
  ] as { image: Range; text: Range }[],
  settle: 0.3,
} as const

export const TRANSITION_MOTION = {
  textEase: 'M0,0 C0.16,1 0.3,1 1,1',
  textFrom: 110,
  imageScaleFrom: 1.04,
  scrub: { desktop: 1.2, mobile: 0.8 },
  srcWidths: [640, 960, 1280, 1600, 1920],
} as const
