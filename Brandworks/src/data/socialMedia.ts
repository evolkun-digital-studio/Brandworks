import { mediaUrl } from '../media'
// Content for the Social Media section (components/SocialMedia).

// The reels and their posters are not on the R2 bucket: the videos are
// served from ImageKit and the posters are bundled locally.
import reel01Poster from '../assets/social/reel-01-poster.webp'
import reel02Poster from '../assets/social/reel-02-poster.webp'
import reel03Poster from '../assets/social/reel-03-poster.webp'

const IMAGEKIT = 'https://ik.imagekit.io/rxoyjxx4c'

// `tr=orig-true` asks ImageKit for the uploaded file as-is; other URL forms
// trigger video transformations, which count against the account quota.
// encodeURI, not encodeURIComponent: ImageKit 404s on a comma encoded as %2C.
const original = (file: string) => `${IMAGEKIT}/${encodeURI(file)}?tr=orig-true`

const contentStill = mediaUrl("content-still.webp")
const campaignStill = mediaUrl("campaign-still.webp")

export type SocialReel = {
  id: string
  // category: string
  caption: string
  src: string
  /** The reel's first frame, shown until the video can play. Without one, the video's own first frame shows. */
  poster?: string
}

export const SOCIAL_REELS: SocialReel[] = [
  {
    id: '01',
    // category: 'Reel / Social',
    caption: 'Creative built for attention.',
    src: original("Jnco southpole shorts drop Saturday May 10th _ - All Shorts will be available this Saturday at .mp4"),
    poster: reel01Poster,
  },
  {
    id: '02',
    // category: 'Brand content',
    caption: 'Consistency turns content into identity.',
    src: original("Carhartt has become a global symbol of authentic workwear, embraced not only by workers but also.mp4"),
    poster: reel02Poster,
  },
  {
    id: '03',
    // category: 'Campaign',
    caption: 'Concept, content and distribution working together.',
    src: original("Collection of polo Harrington jacket Polo Ralph Lauren Harrington Jacket Bomber Nylon Classic Po.mp4"),
    poster: reel03Poster,
  },
  {
    id: '04',
    // category: 'Product drop',g
    caption: 'Building anticipation before launch.',
    src: original("Dropping soon _ Vintage 90s classic coogi multicolor 3D knit sweater All sizes are available fo.mp4"),
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
