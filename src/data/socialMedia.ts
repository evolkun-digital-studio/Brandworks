// Content for the Social Media section (components/SocialMedia).

import reel01Poster from '../assets/social/reel-01-poster.webp'
import reel02Poster from '../assets/social/reel-02-poster.webp'
import reel03Poster from '../assets/social/reel-03-poster.webp'
import contentStill from '../assets/social/content-still.webp'
import campaignStill from '../assets/social/campaign-still.webp'

const IMAGEKIT = 'https://ik.imagekit.io/rxoyjxx4c'

// `tr=orig-true` asks ImageKit for the uploaded file as-is. Any other URL
// form can trigger a video transformation, and those count against the
// account's video-transformation quota — once it is used up ImageKit
// answers 403 ("Video transformations limit exceeded") instead of a video.
const original = (file: string) => `${IMAGEKIT}/${file}?tr=orig-true`

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
    src: original(
      'Jnco%20southpole%20shorts%20drop%20Saturday%20May%2010th%20_%20-%20All%20Shorts%20will%20be%20available%20this%20Saturday%20at%20.mp4',
    ),
    poster: reel01Poster,
  },
  {
    id: '02',
    category: 'Brand content',
    caption: 'Consistency turns content into identity.',
    src: original(
      'Carhartt%20has%20become%20a%20global%20symbol%20of%20authentic%20workwear,%20embraced%20not%20only%20by%20workers%20but%20also.mp4',
    ),
    poster: reel02Poster,
  },
  {
    id: '03',
    category: 'Campaign',
    caption: 'Concept, content and distribution working together.',
    src: original(
      'Collection%20of%20polo%20Harrington%20jacket%20Polo%20Ralph%20Lauren%20Harrington%20Jacket%20Bomber%20Nylon%20Classic%20Po.mp4',
    ),
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
