import { mediaUrl } from '../lib/media'
import { assetUrl } from '../lib/assetUrl'
// Content for the Social Media section (components/SocialMedia).

// The reels and their posters are not on the R2 bucket: the videos are
// served from ImageKit and the posters are bundled locally.
import reel01PosterAsset from '../assets/social/reel-01-poster.webp'
import reel02PosterAsset from '../assets/social/reel-02-poster.webp'
import reel03PosterAsset from '../assets/social/reel-03-poster.webp'

const reel01Poster = assetUrl(reel01PosterAsset)
const reel02Poster = assetUrl(reel02PosterAsset)
const reel03Poster = assetUrl(reel03PosterAsset)

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
  /** Starting counts for the Instagram-style action rail. */
  likes: number
  shares: number
  comments: ReelComment[]
}

export type ReelComment = {
  id: string
  user: string
  text: string
  /** Display age, e.g. "2d". */
  time: string
  likes: number
}

/** The account the reels are shown as posted from. */
export const SOCIAL_ACCOUNT = {
  handle: 'brandworks.studio',
  avatar: mediaUrl('brandworkLogo.png'),
  audio: 'Original audio',
}

export const SOCIAL_REELS: SocialReel[] = [
  {
    id: '01',
    // category: 'Reel / Social',
    caption: 'Creative built for attention.',
    src: original("Jnco southpole shorts drop Saturday May 10th _ - All Shorts will be available this Saturday at .mp4"),
    poster: reel01Poster,
    likes: 18400,
    shares: 312,
    comments: [
      { id: 'c1', user: 'aanya.creates', text: 'The pacing on this is unreal 🔥', time: '2d', likes: 48 },
      { id: 'c2', user: 'studio.marlow', text: 'Who shot this? The light is perfect', time: '2d', likes: 21 },
      { id: 'c3', user: 'rohit.k', text: "Saturday can't come soon enough", time: '1d', likes: 9 },
    ],
  },
  {
    id: '02',
    // category: 'Brand content',
    caption: 'Consistency turns content into identity.',
    src: original("Carhartt has become a global symbol of authentic workwear, embraced not only by workers but also.mp4"),
    poster: reel02Poster,
    likes: 9720,
    shares: 145,
    comments: [
      { id: 'c1', user: 'workwear.daily', text: 'This is how you tell a brand story', time: '3d', likes: 34 },
      { id: 'c2', user: 'meera.design', text: 'The colour grade 👌', time: '2d', likes: 12 },
    ],
  },
  {
    id: '03',
    // category: 'Campaign',
    caption: 'Concept, content and distribution working together.',
    src: original("Collection of polo Harrington jacket Polo Ralph Lauren Harrington Jacket Bomber Nylon Classic Po.mp4"),
    poster: reel03Poster,
    likes: 26100,
    shares: 508,
    comments: [
      { id: 'c1', user: 'northbound.co', text: 'Concept to cut, so clean', time: '4d', likes: 71 },
      { id: 'c2', user: 'dev.frames', text: 'Transitions are smooth af', time: '3d', likes: 26 },
      { id: 'c3', user: 'lia.moves', text: 'Need this jacket', time: '2d', likes: 8 },
    ],
  },
  {
    id: '04',
    // category: 'Product drop',g
    caption: 'Building anticipation before launch.',
    src: original("Dropping soon _ Vintage 90s classic coogi multicolor 3D knit sweater All sizes are available fo.mp4"),
    likes: 6350,
    shares: 98,
    comments: [
      { id: 'c1', user: 'vintage.vault', text: 'The drop teaser we needed 👀', time: '1d', likes: 19 },
      { id: 'c2', user: 'kabir.ss', text: 'Sizes?? 🙏', time: '20h', likes: 4 },
    ],
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
