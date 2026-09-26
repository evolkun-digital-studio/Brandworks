// Web Design & Development — the homepage "digital reel"
// (components/WebDevelopment). Content only: the component reads this and
// nothing else, so replacing a project is a data edit, never a layout edit.
//
// IMPORTANT — PLACEHOLDER WORK. There are no website screenshots in the
// project yet, so the three entries below use existing BrandWorks studio
// imagery as stand-ins and deliberately neutral titles. Before launch,
// replace each `image` (and project 02's `secondary`) with real website
// captures and fill in the real project name, year and — once the site is
// public — its `url`. A project without a `url` renders no link at all.
//
// Screenshot guidance: desktop captures at 2400px wide or more (the stage
// shows them up to full viewport width), exported as WebP. The mobile crop
// for a 'spread' project should be a 9:16-ish portrait capture of the same
// site.

import gm02 from '../assets/graphics/gm-02.webp'
import gm02Small from '../assets/graphics/gm-02-800.webp'
import gm05 from '../assets/graphics/gm-05.webp'
import gm05Small from '../assets/graphics/gm-05-560.webp'
import gm06 from '../assets/graphics/gm-06.webp'
import gm06Small from '../assets/graphics/gm-06-800.webp'
import coastRoad from '../assets/social/campaign-aerial.jpg'

export type WebProjectImage = {
  src: string
  srcSet?: string
  width: number
  height: number
  alt: string
  /** CSS object-position, for steering the crop of a screenshot. */
  position?: string
}

/**
 * How the work sits in the reel's frame:
 * - 'landscape' — one large landscape crop, sized to the frame;
 * - 'spread'    — a desktop capture set off-centre with one mobile crop;
 * - 'bleed'     — edge-to-edge; the last project opens out to full width.
 */
export type WebProjectLayout = 'landscape' | 'spread' | 'bleed'

export type WebProject = {
  id: string
  title: string
  type: string
  services: string[]
  year: string
  layout: WebProjectLayout
  image: WebProjectImage
  /** Only used by the 'spread' layout: the single mobile crop. */
  secondary?: WebProjectImage
  /** Live site or case study. Leave undefined until there is a real one. */
  url?: string
}

export const WEB_SECTION = {
  label: 'Web Design & Development',
  heading: ['Designed to be used.', 'Built to last.'],
  description:
    'From structure and UX to interface, motion and development, we create digital experiences that stay clear, fast and distinctly yours.',
  capabilities: ['Strategy', 'UX/UI', 'Development', 'CMS', 'Performance'],
} as const

export const WEB_PROJECTS: WebProject[] = [
  {
    id: '01',
    title: 'Project One',
    type: 'Digital Experience',
    services: ['UX/UI', 'Development', 'Motion'],
    year: '2026',
    layout: 'landscape',
    image: {
      src: gm02,
      srcSet: `${gm02Small} 800w, ${gm02} 1200w`,
      width: 1200,
      height: 904,
      alt: 'Placeholder artwork for a BrandWorks website project',
    },
  },
  {
    id: '02',
    title: 'Project Two',
    type: 'Digital Platform',
    services: ['Design System', 'Development', 'CMS'],
    year: '2026',
    layout: 'spread',
    image: {
      src: gm06,
      srcSet: `${gm06Small} 800w, ${gm06} 1200w`,
      width: 1200,
      height: 904,
      alt: 'Placeholder artwork for a BrandWorks platform project on desktop',
    },
    secondary: {
      src: gm05,
      srcSet: `${gm05Small} 560w, ${gm05} 904w`,
      width: 904,
      height: 1200,
      alt: 'Placeholder artwork for the same platform project on mobile',
      position: '50% 30%',
    },
  },
  {
    id: '03',
    title: 'Project Three',
    type: 'Brand Website',
    services: ['Strategy', 'UX/UI', 'Development', 'Performance'],
    year: '2026',
    layout: 'bleed',
    image: {
      src: coastRoad,
      width: 1200,
      height: 800,
      alt: 'Placeholder artwork for a BrandWorks brand website project',
    },
  },
]
