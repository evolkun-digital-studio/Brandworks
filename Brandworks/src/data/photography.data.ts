import { mediaUrl } from '../media'
const campaignMotion = mediaUrl("campaign-motion.jpg")
const photo01 = mediaUrl("photo-01.webp")
const photo02 = mediaUrl("photo-02.webp")
const photo03 = mediaUrl("photo-03.webp")
const photo04 = mediaUrl("photo-04.webp")

export type Photograph = {
  id: string
  title: string
  category: string
  // description: string
  src: string
  alt: string
  width: number
  height: number
  position?: string
  srcSet?: string
}

/**
 * Use your existing local assets. These are service categories, not fabricated
 * client projects. Replace alt text with descriptions of the ACTUAL photographs.
 * Add srcSet only when you have exported the corresponding image sizes.
 */
export const photographs: Photograph[] = [
  {
    id: 'campaign',
    title: 'Campaign photography',
    category: 'Campaign / Art direction',
    // description:
    //   'A visual language that holds together across the campaign, from the main image to the smallest detail.',
    src: photo01,
    alt: 'Campaign photography selection',
    width: 1600,
    height: 1200,
    position: '50% 50%',
  },
  {
    id: 'portraits',
    title: 'Editorial portraits',
    category: 'Portrait / Founder / Editorial',
    // description:
    //     'People photographed with intention. Character, expression and environment, without the familiar corporate template.',
    src: photo02,
    alt: 'Editorial portrait selection',
    width: 1200,
    height: 1500,
    position: '50% 40%',
  },
  {
    id: 'product',
    title: 'Product stories',
    category: 'Product / Still life',
    // description:
    //   'Material, light and composition working together to show the product clearly and give it a point of view.',
    src: photo03,
    alt: 'Product and still-life photography selection',
    width: 1200,
    height: 1500,
  },
  {
    id: 'spaces',
    title: 'Spaces & hospitality',
    category: 'Architecture / Interiors / Hospitality',
    //  description:
      // 'The atmosphere of a place, not just its dimensions. Architecture and interiors photographed around how they feel.',
    src: photo04,
    alt: 'Architecture and hospitality photography selection',
    width: 1600,
    height: 1200,
  },
]

export const heroPhotograph: Photograph = {
  id: 'hero',
  title: 'Photography that shapes perception.',
  category: 'Direction / Production / Image',
  // description: '',
  src: campaignMotion,
  alt: 'Motion-led monochrome lifestyle portrait',
  width: 1200,
  height: 673,
  position: '50% 50%',
}

export const photographyCapabilities = [
  'Commercial photography',
  'Campaign photography',
  'Product photography',
  'Editorial photography',
  'Fashion & lifestyle',
  'Hospitality photography',
  'Architecture & interiors',
  'Founder portraiture',
]

export const productionProcess = [
  {
    number: '01',
    title: 'Direction',
    text: 'We define what the photographs need to communicate and how the brand should feel before deciding how the shoot should look.',
  },
  {
    number: '02',
    title: 'Pre-production',
    text: 'References, locations, casting, styling, shot planning and production decisions are resolved before shoot day.',
  },
  {
    number: '03',
    title: 'Shoot',
    text: 'Lighting, composition, direction and detail come together around one visual point of view.',
  },
  {
    number: '04',
    title: 'Post',
    text: 'Selection, colour, retouching and delivery are developed for the places where the images need to live.',
  },
]

export const photographySeo = {
  title: 'Commercial & Brand Photography Services | BrandWorks',
  description:
    'Commercial, campaign and product photography, editorial portraits and hospitality imagery. Explore photography and creative production with BrandWorks.',
  pathname: '/services/photography',
}
