import { mediaUrl } from '../lib/media'
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

const websiteOne = mediaUrl("website .png")
const projectTwoMain = mediaUrl("project 2.webp")
const projectTwoCrop = mediaUrl("project_2.webp")
const projectThree = mediaUrl("project_3.webp")

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
 * - 'bleed'     — edge-to-edge within the frame.
 */
export type WebProjectLayout = 'landscape' | 'spread' | 'bleed'

export type WebProject = {
  id: string
  title: string
  type: string
  services: string[]
  
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
} as const

export const WEB_PROJECTS: WebProject[] = [
  {
    id: '01',
    title: 'Project One',
    type: 'Digital Experience',
    services: ['UX/UI', 'Development', 'Motion'],
    layout: 'landscape',
    image: {
      src: websiteOne,
      width: 1536,
      height: 1024,
      alt: 'Jellystar streetwear website homepage with a model in a hooded sweatshirt',
    },
  },
  {
    id: '02',
    title: 'Project Two',
    type: 'Digital Platform',
    services: ['Design System', 'Development', 'CMS'],
    layout: 'spread',
    image: {
      src: projectTwoMain,
      width: 4000,
      height: 6000,
      alt: 'A dark-themed web app shown on a monitor, laptop and phone on a desk',
      // Portrait shot in a wide frame: keep the three screens in view.
      position: '65% 50%',
    },
    secondary: {
      src: projectTwoCrop,
      width: 4843,
      height: 3632,
      alt: 'A hand holding a phone showing a city data dashboard app',
      // Landscape shot in a 9:16 frame: centre on the phone.
      position: '48% 50%',
    },
  },
  {
    id: '03',
    title: 'Project Three',
    type: 'Brand Website',
    services: ['Strategy', 'UX/UI', 'Development', 'Performance'],
    layout: 'bleed',
    image: {
      src: projectThree,
      width: 12513,
      height: 5363,
      alt: 'A web dashboard on a laptop beside a monitor showing its code in a dark studio',
      // Very wide shot: keep the laptop and monitor in view on narrower frames.
      position: '62% 50%',
    },
  },
]
