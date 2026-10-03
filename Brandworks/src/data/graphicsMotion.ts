import { mediaUrl } from '../lib/media'
// Content for the Graphic & Motion section (components/GraphicsMotion).
//
// Cards share one height and take their width from the artwork's own
// proportions, so alternating portrait and landscape pieces gives the
// gallery its rhythm. Replace a project here and the layout follows.

const gm01 = mediaUrl("identity.jpg")
const gm02 = mediaUrl("scrolling.jpg")
const gm03 = mediaUrl("ideas.jpg")
const gm04 = mediaUrl("creative.jpg")
const gm05 = mediaUrl("movment.jpg")
const gm06 = mediaUrl("recognization.jpg")

export type GraphicsProject = {
  id: string
  image: string
  srcSet: string
  width: number
  height: number
  alt: string
  category: string
  title: string
  meta: string
}

export const GRAPHICS_SECTION = {
  heading: 'Graphic & Motion',
  description:
    'Visual systems built to communicate, move and stay memorable. From campaign graphics and brand assets to animation and motion-led content.',
}

export const GRAPHICS_PROJECTS: GraphicsProject[] = [
  {
    id: '01',
    image: gm01,
    srcSet: `${gm01} 6760w`,
    width: 6760,
    height: 4507,
    alt: 'Hand holding a phone showing a portrait with a motion-blurred face',
    category: 'Brand Systems',
    title: 'Identity made visually consistent.',
    meta: 'Identity / Packaging / 2026',
  },
  {
    id: '02',
    image: gm02,
    srcSet: `${gm02} 3800w`,
    width: 3800,
    height: 2138,
    alt: 'Man in a blue blazer cheering with raised fists at a laptop in a bright office',
    category: 'Campaign Design',
    title: 'Ideas turned into scroll-stopping visual worlds.',
    meta: 'Campaign / Key Visual / 2026',
  },
  {
    id: '03',
    image: gm03,
    srcSet: `${gm03} 5184w`,
    width: 5184,
    height: 3888,
    alt: 'Hand sketching ideas with an orange marker on a glass board',
    category: 'Motion Design',
    title: 'Static ideas built to move.',
    meta: 'Motion / Title Sequence / 2025',
  },
  {
    id: '04',
    image: gm04,
    srcSet: `${gm04} 3924w`,
    width: 3924,
    height: 5026,
    alt: 'Designer in headphones sketching at a wooden desk beside a window',
    category: 'Social Graphics',
    title: 'Content systems designed for everyday relevance.',
    meta: 'Social / Content System / 2026',
  },
  {
    id: '05',
    image: gm05,
    srcSet: `${gm05} 5472w`,
    width: 5472,
    height: 3648,
    alt: 'Close-up of a rising line chart on a dark screen',
    category: 'Animation',
    title: 'Movement that gives the message another dimension.',
    meta: 'Animation / Loop / 2025',
  },
  {
    id: '06',
    image: gm06,
    srcSet: `${gm06} 5282w`,
    width: 5282,
    height: 3521,
    alt: 'Small gold trophy cup on a black base against a plain grey backdrop',
    category: 'Art Direction',
    title: 'A visual language people can recognise.',
    meta: 'Art Direction / Brand World / 2026',
  },
]
