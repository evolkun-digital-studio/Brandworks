import { mediaUrl } from '../lib/media'
// Content and media for the homepage hero (components/Hero).
//
// Every service the hero can preview lives here, so swapping a photo,
// a film or a line of copy never means touching the components.

const photo01 = mediaUrl("photo-01.webp")
const photo01Small = mediaUrl("photo-01-640.webp")
const photo02 = mediaUrl("photo-02.webp")
const photo02Small = mediaUrl("photo-02-480.webp")
const photo03 = mediaUrl("photo-03.webp")
const photo03Small = mediaUrl("photo-03-480.webp")
const photo04 = mediaUrl("photo-04.webp")
const photo04Small = mediaUrl("photo-04-640.webp")
const galleryPhoto02 = mediaUrl("Photo2.jpg")
const galleryPhoto03 = mediaUrl("Photo3.jpg")
const galleryPhoto04 = mediaUrl("moisturizer mock up.png")
const galleryPhoto05 = mediaUrl("Photo5.png")
const galleryPhoto06 = mediaUrl("Photo6.png")
const galleryPhoto07 = mediaUrl("Photo7.png")
const galleryPhoto08 = mediaUrl("Photo8.png")
const galleryPhoto09 = mediaUrl("Photo9.png")
const galleryPhoto10 = mediaUrl("Photo10.png")
const galleryPhoto11 = mediaUrl("Photo11.png")
const galleryPhoto12 = mediaUrl("Photo12.png")
const galleryPhoto13 = mediaUrl("Photo13.png")
const photographyUrl = (file: string) =>
  `https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/${file}`
const motionLifestyle =mediaUrl("campaign-motion.jpg")
const cinematicAction = mediaUrl("campaign-action.jpg")
const experimentalCreative = mediaUrl("gm-06-800.webp")
const socialAerial = mediaUrl("campaign-aerial.jpg")

export type HeroImage = {
  src: string
  srcSet?: string
  /** Intrinsic size of the largest source — reserves the box, no layout shift. */
  width: number
  height: number
  alt: string
  /** object-position for the crop; defaults to centre. */
  position?: string
}

export type HeroGalleryImage = HeroImage & {
  /** Stable identity used while an image moves between gallery levels. */
  id: string
}

export type HeroMedia =
  | { kind: 'grid'; images: HeroGalleryImage[] }
  | { kind: 'video'; src: string; poster: HeroImage }
  | { kind: 'image'; image: HeroImage }
  /** Social Media: an editorial still beside a looping phone recording. */
  | {
      kind: 'showcase'
      grid: HeroImage[]
      image: HeroImage
      video: { src: string; poster: string; label: string }
    }
  /** Web Design & Development: a coded composition, no media to fetch. */
  | { kind: 'web' }

export type HeroServiceId = 'photography' | 'videography' | 'social' | 'pr' | 'graphic-animation' | 'web'

export type HeroService = {
  id: HeroServiceId
  /** Capsule label. */
  label: string
  /** Optional kicker above the service list in the caption. */
  eyebrow?: string
  /** Small caption shown with the visual. */
  headline: string
  serviceList: string
  text: string
  media: HeroMedia
}

// R2 serves original files. Pre-generated local variants retain their srcsets below.
function originalImage(file: string, image: Omit<HeroImage, 'src' | 'srcSet'>): HeroImage {
  return { ...image, src: file }
}

export const HERO_SERVICE_ORDER: HeroServiceId[] = [
  'videography',
  'photography',
  'pr',
  'social',
  'graphic-animation',
  'web',
]

export const DEFAULT_HERO_SERVICE: HeroServiceId = 'videography'

export const heroServices: Record<HeroServiceId, HeroService> = {
  photography: {
    id: 'photography',
    label: 'Photography', 
    headline: 'Images with a clear point of view.',
    text: 'Portraits, products, campaigns and brand photography built around how the subject should be seen.',
    serviceList: 'Portrait · Product · Editorial · Campaign',
    media: {
      kind: 'grid',
      images: [
        {
          id: 'equestrian-editorial',
          src: photo01,
          srcSet: `${photo01Small} 640w, ${photo01} 960w`,
          width: 960,
          height: 1200,
          alt: 'Editorial portrait of a rider in a wide-brim hat on horseback',
        },
        {
          id: 'green-can-campaign',
          src: photo02,
          srcSet: `${photo02Small} 480w, ${photo02} 736w`,
          width: 736,
          height: 1104,
          alt: 'Campaign shot of a model drinking from a green can against a blue sky',
        },
        {
          id: 'net-product-study',
          src: photo03,
          srcSet: `${photo03Small} 480w, ${photo03} 736w`,
          width: 736,
          height: 980,
          alt: 'Product shot of a can caught in a net on black',
        },
        {
          id: 'pump-bottle-still-life',
          src: photo04,
          srcSet: `${photo04Small} 640w, ${photo04} 1200w`,
          width: 1200,
          height: 1200,
          alt: 'Studio product shot of a white pump bottle on a dark surface',
        },
        {
          id: 'content-creative-study',
          src: galleryPhoto02,
          width: 736,
          height: 980,
          alt: 'BrandWorks content and creative portfolio photograph',
        },
        {
          id: 'social-campaign-study',
          src: galleryPhoto03,
          width: 736,
          height: 1104,
          alt: 'BrandWorks social campaign portfolio photograph',
        },
        {
          id: 'aerolink-campaign',
          src: galleryPhoto04,
          width: 1254,
          height: 1254,
          alt: 'Softly moisturizer jar product photograph',
        },
        {
          id: 'riaaj-vintage-campaign',
          src: galleryPhoto05,
          width: 967,
          height: 1200,
          alt: 'Riaaj Vintage campaign photograph',
        },
        {
          id: 'mr-rework-campaign',
          src: galleryPhoto06,
          width: 1200,
          height: 800,
          alt: 'Mr. Rework campaign photograph',
        },
        {
          id: 'delhi-six-campaign',
          src: galleryPhoto07,
          width: 960,
          height: 1200,
          alt: 'Delhi-6 campaign photograph',
        },
        {
          id: 'nexa-solutions-campaign',
          src: galleryPhoto08,
          width: 904,
          height: 1200,
          alt: 'Nexa Solutions campaign photograph',
        },
        {
          id: 'growth-campaign',
          src: galleryPhoto09,
          width: 904,
          height: 1200,
          alt: 'BrandWorks growth campaign photograph',
        },
        {
          id: 'audience-campaign',
          src: galleryPhoto10,
          width: 960,
          height: 1200,
          alt: 'BrandWorks audience campaign photograph',
        },
        {
          id: 'inquiries-campaign',
          src: galleryPhoto11,
          width: 904,
          height: 1200,
          alt: 'BrandWorks client campaign photograph',
        },
        {
          id: 'studio-landscape-one',
          src: galleryPhoto12,
          width: 1200,
          height: 904,
          alt: 'BrandWorks studio portfolio photograph',
        },
        {
          id: 'studio-landscape-two',
          src: galleryPhoto13,
          width: 1200,
          height: 904,
          alt: 'BrandWorks editorial portfolio photograph',
        },
        {
          id: 'artboard-14',
          src: photographyUrl('Artboard%2014%403x.png'),
          width: 3241,
          height: 4051,
          alt: 'BrandWorks campaign portfolio photograph',
        },
        {
          id: 'artboard-2',
          src: photographyUrl('Artboard%202.png'),
          width: 1080,
          height: 1350,
          alt: 'BrandWorks brand portfolio photograph',
        },
        {
          id: 'artboard-3',
          src: photographyUrl('Artboard%203%403x%20(1).png'),
          width: 1786,
          height: 2527,
          alt: 'BrandWorks product portfolio photograph',
        },
        {
          id: 'studio-landscape-three',
          src: photographyUrl('ChatGPT%20Image%20Sep%2030%2C%202026%2C%2002_31_57%20PM.png'),
          width: 1536,
          height: 1024,
          alt: 'BrandWorks studio portfolio photograph',
        },
        {
          id: 'artboard-7',
          src: photographyUrl('Artboard%207%20(1).png'),
          width: 1080,
          height: 1350,
          alt: 'BrandWorks editorial campaign photograph',
        },
      ],
    },
  },
  videography: {
    id: 'videography',
    label: 'Cinematography', 
    headline: 'Stories built in motion.',
    text: 'From concept and direction to production and post, we create films for brands, campaigns and people.',
    serviceList: 'Brand Films · Campaigns · Commercials · Short-form',
    media: {
      kind: 'video',
      src: mediaUrl("Idea - Cinematic Video _ Shot on Canon EOS250D.mp4"),
      poster: originalImage(mediaUrl("first.webp"), {
        width: 1535,
        height: 862,
        alt: 'Close-up of a face with eyes lit by a band of warm light',
        position: '50% 50%',
      }),
    },
  },
  social: {
    id: 'social',
    label: 'Social & Content', 
    headline: 'Content with a reason to exist.',
    text: 'Strategy, concepts, design and production for an ongoing social presence that stays consistent with the brand.',
    serviceList: 'Strategy · Reels · Campaigns · Daily Content',
    media: {
      kind: 'showcase',
      grid: [
        {
          src: socialAerial,
          width: 1200,
          height: 800,
          alt: 'Aerial campaign frame of a coastal road meeting a dark ocean',
          position: '50% 56%',
        },
        {
          src: photo01,
          srcSet: `${photo01Small} 640w, ${photo01} 960w`,
          width: 960,
          height: 1200,
          alt: 'Editorial campaign portrait of a rider on horseback',
          position: '50% 35%',
        },
        {
          src: photo03,
          srcSet: `${photo03Small} 480w, ${photo03} 736w`,
          width: 736,
          height: 980,
          alt: 'High-contrast product campaign frame of a can suspended in netting',
        },
        {
          src: motionLifestyle,
          width: 1200,
          height: 673,
          alt: 'Motion-led monochrome lifestyle portrait',
          position: '46% 42%',
        },
        {
          src: experimentalCreative,
          width: 800,
          height: 603,
          alt: 'Experimental spectrum of coloured light rising through black',
          position: '50% 65%',
        },
        {
          src: cinematicAction,
          width: 1200,
          height: 673,
          alt: 'Cinematic action portrait surrounded by a ring of light',
        },
      ],
      image: originalImage(mediaUrl("ChatGPT Image Sep 24, 2026, 11_20_21 AM.png"), {
        width: 1086,
        height: 1448,
        alt: 'BrandWorks Instagram profile on a phone, surrounded by growth, engagement and content-plan cards',
      }),
      video: {
        src: mediaUrl("Screen_Recording_20260924_112309_Instagram_ppz2yx.mp4"),
        // Cloudinary's first frame as a still, shown until the recording plays.
        poster: mediaUrl("Screen_Recording_20260924_112309_Instagram_ppz2yx.jpg"),
        label: 'Screen recording of an Instagram reel being scrolled',
      },
    },
  },
  pr: {
    id: 'pr',
    label: 'Founder Reputation', 
    headline: 'Build the presence behind the name.',
    text: 'We shape how founders appear across media, search, social platforms and public conversations.',
    serviceList: 'Positioning · Media · Search · Content',
    media: {
      kind: 'image',
      image: originalImage(mediaUrl("ChatGPT Image Sep 21, 2026, 11_56_00 AM.png"), {
        width: 1122,
        height: 1402,
        alt: 'Black and white editorial portrait of a founder',
        position: '50% 28%',
      }),
    },
  },
  'graphic-animation': {
    id: 'graphic-animation',
    label: 'Design & Motion', 
    headline: 'Visual systems made to communicate.',
    text: 'Graphic design, campaign assets, animation and motion built to keep the brand clear across different formats.',
    serviceList: 'Graphic Design · Motion · Animation · Campaign Assets',
    media: {
      kind: 'image',
      image: {
        src: experimentalCreative,
        width: 800,
        height: 603,
        alt: 'Abstract spectrum of coloured light in motion against black',
      },
    },
  },
  web: {
    id: 'web',
    label: 'Web Design & Dev',
    headline: 'Digital experiences built to work.',
    text: 'Websites designed and developed around clarity, interaction and how people actually use the web.',
    serviceList: 'Strategy · UX/UI · Development · Performance',
    media: { kind: 'web' },
  },
}
