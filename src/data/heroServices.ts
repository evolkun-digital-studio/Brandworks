import { mediaUrl } from '../lib/media'
import { assetUrl } from '../lib/assetUrl'
import lavenderHijab from '../assets/photography/hero-lavender-hijab-1200.webp'
import lavenderHijabSmall from '../assets/photography/hero-lavender-hijab-480.webp'
import handsPortrait from '../assets/photography/hero-hands-portrait-1200.webp'
import handsPortraitSmall from '../assets/photography/hero-hands-portrait-480.webp'
import redFashion from '../assets/photography/hero-fashion-study-1200.webp'
import redFashionSmall from '../assets/photography/hero-fashion-study-480.webp'
import luxuryDuffle from '../assets/photography/hero-luxury-duffle-full.webp'
import luxuryDuffleSmall from '../assets/photography/hero-luxury-duffle-480.webp'
import redCocktail from '../assets/photography/hero-red-cocktail-1200.webp'
import redCocktailSmall from '../assets/photography/hero-red-cocktail-480.webp'
import gourmetBiryani from '../assets/photography/hero-gourmet-biryani-1200.webp'
import gourmetBiryaniSmall from '../assets/photography/hero-gourmet-biryani-480.webp'
import azzaroNoir from '../assets/photography/hero-azzaro-noir-1200.webp'
import azzaroNoirSmall from '../assets/photography/hero-azzaro-noir-480.webp'
import jagermeister from '../assets/photography/hero-jagermeister-1600.webp'
import jagermeisterSmall from '../assets/photography/hero-jagermeister-480.webp'
import goldenSocks from '../assets/photography/hero-golden-socks-1600.webp'
import goldenSocksSmall from '../assets/photography/hero-golden-socks-480.webp'
import daisiesSneakers from '../assets/photography/hero-daisies-sneakers-1600.webp'
import daisiesSneakersSmall from '../assets/photography/hero-daisies-sneakers-480.webp'
import studioRedSweatshirt from '../assets/photography/hero-p1001110-1600.webp'
import studioRedSweatshirtSmall from '../assets/photography/hero-p1001110-480.webp'
// Content and media for the homepage hero (components/Hero).
//
// Every service the hero can preview lives here, so swapping a photo,
// a film or a line of copy never means touching the components.

const experimentalCreative = mediaUrl("gm-06-800.webp")
const socialReel = "/video/ForWebsite.mp4"
const socialReelPoster = mediaUrl("footer-showreel-poster.webp")

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

// Fixed Unsplash photographs, cropped to a portrait frame at responsive sizes.
function unsplashImage(id: string, photo: string, alt: string): HeroGalleryImage {
  const url = (width: number) =>
    `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&h=${Math.round(width * 4 / 3)}&q=85`
  return {
    id,
    src: url(1200),
    srcSet: `${url(480)} 480w, ${url(800)} 800w, ${url(1200)} 1200w`,
    width: 1200,
    height: 1600,
    alt,
  }
}

export const HERO_SERVICE_ORDER: HeroServiceId[] = [
  'videography',
  'photography',
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
          id: 'hero-jagermeister',
          src: assetUrl(jagermeister),
          srcSet: `${assetUrl(jagermeisterSmall)} 480w, ${assetUrl(jagermeister)} 1122w`,
          width: 1122,
          height: 1402,
          alt: 'Moody product photograph of a Jägermeister bottle in misty window light',
        },
        {
          id: 'lavender-hijab-editorial',
          src: assetUrl(lavenderHijab),
          srcSet: `${assetUrl(lavenderHijabSmall)} 480w, ${assetUrl(lavenderHijab)} 1086w`,
          width: 1086,
          height: 1448,
          alt: 'Top-down editorial portrait of a woman in a lavender hijab and white blazer adjusting sunglasses',
        },
        {
          id: 'hands-framed-editorial',
          src: assetUrl(handsPortrait),
          srcSet: `${assetUrl(handsPortraitSmall)} 480w, ${assetUrl(handsPortrait)} 1086w`,
          width: 1086,
          height: 1448,
          alt: 'Editorial portrait of a woman in glasses framed by her hands',
        },
        {
          id: 'red-fashion-editorial',
          src: assetUrl(redFashion),
          srcSet: `${assetUrl(redFashionSmall)} 480w, ${assetUrl(redFashion)} 736w`,
          width: 736,
          height: 1207,
          alt: 'Fashion portrait of a woman in a red blazer and cap against a red background',
        },
        {
          id: 'hero-golden-socks',
          src: assetUrl(goldenSocks),
          srcSet: `${assetUrl(goldenSocksSmall)} 480w, ${assetUrl(goldenSocks)} 1086w`,
          width: 1086,
          height: 1448,
          alt: 'Golden-hour close-up of a person adjusting white socks above brown suede shoes',
        },
        {
          id: 'hero-daisies-sneakers',
          src: assetUrl(daisiesSneakers),
          srcSet: `${assetUrl(daisiesSneakersSmall)} 480w, ${assetUrl(daisiesSneakers)} 1024w`,
          width: 1024,
          height: 1536,
          alt: 'White sneakers and jeans surrounded by daisies in sunlit grass',
        },
        {
          id: 'hero-p1001110',
          src: assetUrl(studioRedSweatshirt),
          srcSet: `${assetUrl(studioRedSweatshirtSmall)} 480w, ${assetUrl(studioRedSweatshirt)} 1600w`,
          width: 1600,
          height: 2402,
          alt: 'Editorial portrait of a model in a red sweatshirt and sunglasses in warm side light',
        },
        {
          id: 'hero-luxury-duffle',
          src: assetUrl(luxuryDuffle),
          srcSet: `${assetUrl(luxuryDuffleSmall)} 480w, ${assetUrl(luxuryDuffle)} 1402w`,
          width: 1402,
          height: 1122,
          alt: 'Luxury monogram duffle bag styled on rustic wood and draped fabric',
        },
        {
          id: 'hero-red-cocktail',
          src: assetUrl(redCocktail),
          srcSet: `${assetUrl(redCocktailSmall)} 480w, ${assetUrl(redCocktail)} 1024w`,
          width: 1024,
          height: 1536,
          alt: 'Red cocktail garnished with lime and herbs in warm cinematic light',
        },
        {
          id: 'hero-gourmet-biryani',
          src: assetUrl(gourmetBiryani),
          srcSet: `${assetUrl(gourmetBiryaniSmall)} 480w, ${assetUrl(gourmetBiryani)} 1024w`,
          width: 1024,
          height: 1536,
          alt: 'Gourmet biryani on a white plate against a moody red fabric backdrop',
        },
        {
          id: 'hero-azzaro-noir',
          src: assetUrl(azzaroNoir),
          srcSet: `${assetUrl(azzaroNoirSmall)} 480w, ${assetUrl(azzaroNoir)} 1122w`,
          width: 1122,
          height: 1402,
          alt: 'Black Azzaro fragrance bottle on reflective stone with dramatic studio lighting',
        },
        // Ela De Pure: https://unsplash.com/photos/zuIpmjxrmRk
        unsplashImage(
          'serum-product-study',
          'photo-1777450793530-99a0e7b7fc53',
          'Red glass serum bottle and suspended dropper against a warm backdrop',
        ),
        // Valentina Schick: https://unsplash.com/photos/9AS2t3rgGko
        unsplashImage(
          'fragrance-still-life',
          'photo-1673710672680-944563ff9cce',
          'Perfume bottle and gold jewelry styled on cream fabric in sunlight',
        ),
        // Laura Chouette: https://unsplash.com/photos/bvT2DWoIEKE
        unsplashImage(
          'beauty-campaign-portrait',
          'photo-1646032048829-5377b5c0feba',
          'Beauty portrait of a woman holding a perfume bottle',
        ),
        // Becky Sherburn: https://unsplash.com/photos/68fNpR-LMVc
        unsplashImage(
          'newspaper-editorial',
          'photo-1768595408288-22f8215ba8e9',
          'Conceptual editorial portrait of a person in a suit holding a newspaper over their face',
        ),
        // Dom Hill: https://images.unsplash.com/photo-1515886657613-9f3515b0c78f
        unsplashImage(
          'streetwear-editorial',
          'photo-1515886657613-9f3515b0c78f',
          'Streetwear fashion editorial in a bright yellow outfit',
        ),
        // Tasim Ahmed Safat: https://unsplash.com/photos/W9KxZY02iOQ
        unsplashImage(
          'dramatic-skincare-study',
          'photo-1742281501985-f0708f8cf878',
          'Skincare bottle in a dramatically lit product composition',
        ),
        // Poko Skincare: https://unsplash.com/photos/iexrtpiWLEw
        unsplashImage(
          'skincare-texture-study',
          'photo-1629732047356-30c7e14e712b',
          'Skincare tube and cream textures on a marble surface',
        ),
        // Laura Chouette: https://unsplash.com/photos/OD7DeX9S9W0
        unsplashImage(
          'fragrance-fashion-portrait',
          'photo-1727264702001-26b983dd93a1',
          'Fashion and beauty portrait of a woman holding a fragrance bottle',
        ),
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
      src: mediaUrl("ForWebsite_Full.mp4"),
      poster: originalImage(mediaUrl("first.webp"), {
        width: 1535,
        height: 862,
        alt: 'Cinematic brand film by BrandWorks',
        position: '50% 50%',
      }),
    },
  },
  social: {
    id: 'social',
    label: 'Social & Content', 
    headline: 'Culture Moves Through Content.',
    text: 'Stories, visuals, and ideas made to spark conversations, express identity, and become part of the culture.',
    serviceList: 'Strategy · Reels · Campaigns · Daily Content',
    media: {
      kind: 'showcase',
      grid: [
        {
          src: mediaUrl("Photo1.jpg"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks campaign photograph',
        },
        {
          src: mediaUrl("Photo2.jpg"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks editorial photograph',
        },
        {
          src: mediaUrl("Photo3.jpg"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks creative photograph',
        },
        {
          src: mediaUrl("Photo4.png"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks campaign photograph',
        },
        {
          src: mediaUrl("Photo5.png"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks editorial photograph',
        },
        {
          src: mediaUrl("Photo6.png"),
          width: 1200,
          height: 800,
          alt: 'BrandWorks creative photograph',
        },
      ],
      image: originalImage(socialReelPoster, {
        width: 1920,
        height: 1080,
        alt: 'BrandWorks showreel poster',
      }),
      video: {
        src: socialReel,
        poster: socialReelPoster,
        label: 'BrandWorks showreel',
      },
    },
  },
  pr: {
    id: 'pr',
    label: 'Founder Reputation', 
    headline: 'Your Story Shapes Perception.',
    text: 'Every voice carries a story. We shape yours with authenticity, purpose, and a presence that earns lasting trust.',
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
