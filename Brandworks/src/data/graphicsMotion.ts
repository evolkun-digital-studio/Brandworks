// Content for the Graphic & Motion section (components/GraphicsMotion).
//
// Cards share one height and take their width from the artwork's own
// proportions, so alternating portrait and landscape pieces gives the
// gallery its rhythm. Replace a project here and the layout follows.

import gm01 from '../assets/graphics/gm-01.webp'
import gm01Small from '../assets/graphics/gm-01-560.webp'
import gm02 from '../assets/graphics/gm-02.webp'
import gm02Small from '../assets/graphics/gm-02-800.webp'
import gm03 from '../assets/graphics/gm-03.webp'
import gm03Small from '../assets/graphics/gm-03-560.webp'
import gm04 from '../assets/graphics/gm-04.webp'
import gm04Small from '../assets/graphics/gm-04-800.webp'
import gm05 from '../assets/graphics/gm-05.webp'
import gm05Small from '../assets/graphics/gm-05-560.webp'
import gm06 from '../assets/graphics/gm-06.webp'
import gm06Small from '../assets/graphics/gm-06-800.webp'

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
    srcSet: `${gm01Small} 560w, ${gm01} 967w`,
    width: 967,
    height: 1200,
    alt: 'Matte black tube packaging lit by hard window shadows',
    category: 'Brand Systems',
    title: 'Identity made visually consistent.',
    meta: 'Identity / Packaging / 2026',
  },
  {
    id: '02',
    image: gm02,
    srcSet: `${gm02Small} 800w, ${gm02} 1200w`,
    width: 1200,
    height: 904,
    alt: 'Bold geometric campaign composition with spheres on colour blocks',
    category: 'Campaign Design',
    title: 'Ideas turned into scroll-stopping visual worlds.',
    meta: 'Campaign / Key Visual / 2026',
  },
  {
    id: '03',
    image: gm03,
    srcSet: `${gm03Small} 560w, ${gm03} 904w`,
    width: 904,
    height: 1200,
    alt: 'Portrait with a motion-smeared orange streak across the eyes',
    category: 'Motion Design',
    title: 'Static ideas built to move.',
    meta: 'Motion / Title Sequence / 2025',
  },
  {
    id: '04',
    image: gm04,
    srcSet: `${gm04Small} 800w, ${gm04} 1200w`,
    width: 1200,
    height: 904,
    alt: 'Glass sphere resting on a pale sketched surface',
    category: 'Social Graphics',
    title: 'Content systems designed for everyday relevance.',
    meta: 'Social / Content System / 2026',
  },
  {
    id: '05',
    image: gm05,
    srcSet: `${gm05Small} 560w, ${gm05} 904w`,
    width: 904,
    height: 1200,
    alt: 'Portrait distorted by rippling holographic waves',
    category: 'Animation',
    title: 'Movement that gives the message another dimension.',
    meta: 'Animation / Loop / 2025',
  },
  {
    id: '06',
    image: gm06,
    srcSet: `${gm06Small} 800w, ${gm06} 1200w`,
    width: 1200,
    height: 904,
    alt: 'Spectrum of coloured light streaks rising from black',
    category: 'Art Direction',
    title: 'A visual language people can recognise.',
    meta: 'Art Direction / Brand World / 2026',
  },
]
