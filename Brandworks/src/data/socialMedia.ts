import { mediaUrl } from '../media'
// Content for the Social Media section (components/SocialMedia).

const reel01Poster = mediaUrl("reel-01-poster.webp")
const reel02Poster = mediaUrl("reel-02-poster.webp")
const reel03Poster = mediaUrl("reel-03-poster.webp")
const contentStill = mediaUrl("content-still.webp")
const campaignStill = mediaUrl("campaign-still.webp")

export type SocialReel = {
  id: string
  category: string
  caption: string
  src: string
  /** The reel's first frame, shown until the video can play. */
  poster: string
}

export const SOCIAL_REELS: SocialReel[] = [
  {
    id: '01',
    category: 'Reel / Social',
    caption: 'Creative built for attention.',
    src: mediaUrl("Jnco southpole shorts drop Saturday May 10th _ - All Shorts will be available this Saturday at .mp4"),
    poster: reel01Poster,
  },
  {
    id: '02',
    category: 'Brand content',
    caption: 'Consistency turns content into identity.',
    src: mediaUrl("Carhartt has become a global symbol of authentic workwear, embraced not only by workers but also.mp4"),
    poster: reel02Poster,
  },
  {
    id: '03',
    category: 'Campaign',
    caption: 'Concept, content and distribution working together.',
    src: mediaUrl("Collection of polo Harrington jacket Polo Ralph Lauren Harrington Jacket Bomber Nylon Classic Po.mp4"),
    poster: reel03Poster,
  },
]

export const SOCIAL_SECTION = {
  heading: 'Social Media & Content',
  description:
    'A consistent presence, built around real ideas. We develop content strategies, campaigns, reels, graphics and ongoing formats for brands and founders. The goal is simple: make every piece feel connected rather than posted in isolation.',
  phoneLabel: 'Social Media & Content',
}

export type SocialFloater =
  | { id: string; kind: 'image'; position: 'top-left' | 'bottom-right'; label: string; text?: string; image: string }
  | { id: string; kind: 'text'; position: 'top-right' | 'bottom-left'; label: string; text: string }

/** Supporting pieces from the earlier layout; not rendered in the current section. */
export const SOCIAL_FLOATERS: SocialFloater[] = [
  {
    id: 'content',
    kind: 'image',
    position: 'top-left',
    label: 'Content',
    text: 'Built around the brand, not the algorithm.',
    image: contentStill,
  },
  {
    id: 'strategy',
    kind: 'text',
    position: 'top-right',
    label: 'Strategy',
    text: 'Plan the message before publishing the post.',
  },
  {
    id: 'consistency',
    kind: 'text',
    position: 'bottom-left',
    label: 'Consistency',
    text: 'One visual language across every touchpoint.',
  },
  {
    id: 'social',
    kind: 'image',
    position: 'bottom-right',
    label: 'Social',
    image: campaignStill,
  },
]
