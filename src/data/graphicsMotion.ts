import { mediaUrl } from '../lib/media'
// Content for the Graphic & Motion section (components/GraphicsMotion).
// Four featured cards, shown together in one row on desktop.

export type GraphicsCard = {
  id: string
  image: string
  width: number
  height: number
  alt: string
  title: string
  description: string
}

export const GRAPHICS_SECTION = {
  eyebrow: 'Graphic & Motion',
  heading: 'Ideas designed to move.',
}

export const GRAPHICS_CARDS: GraphicsCard[] = [
  {
    id: 'graphic-design',
    image: mediaUrl('ideas.jpg'),
    width: 5184,
    height: 3888,
    alt: 'Hand sketching ideas with an orange marker on a glass board',
    title: 'Graphic Design',
    description: 'Brand visuals, campaigns and communication designed with purpose.',
  },
  {
    id: 'motion-design',
    image: mediaUrl('movment.jpg'),
    width: 5472,
    height: 3648,
    alt: 'Close-up of a rising line chart on a dark screen',
    title: 'Motion Design',
    description: 'Animation and motion that make digital experiences feel more alive.',
  },
  {
    id: 'campaign-creatives',
    image: mediaUrl('scrolling.jpg'),
    width: 3800,
    height: 2138,
    alt: 'Man in a blue blazer cheering with raised fists at a laptop in a bright office',
    title: 'Campaign Creatives',
    description: 'Visual systems created to stay consistent across platforms and formats.',
  },
  {
    id: 'brand-identity',
    image: mediaUrl('identity.jpg'),
    width: 6760,
    height: 4507,
    alt: 'Hand holding a phone showing a portrait with a motion-blurred face',
    title: 'Brand Identity',
    description: 'Logos, typography and assets that make a brand instantly recognisable.',
  },
]
