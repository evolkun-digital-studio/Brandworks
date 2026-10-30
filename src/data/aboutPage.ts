import { mediaUrl } from '../lib/media'
// Content and media for the About page (components/AboutPage).
//
// Every line of copy and every photograph the page shows lives here, so
// rewriting the story or swapping a portrait never means touching the
// layout.

const beginningStill = mediaUrl("Beginning.jpg")
const studioStill = mediaUrl("studio.jpg")
const technologyStill = "https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/creative_2.jpg"
const websiteDevStill = "https://pub-4a67635800e64547a1a4fd524f7a2783.r2.dev/Photography/website_dev.jpg"
const bottleStill = mediaUrl("photo-04.webp")
const bottleStillSmall = mediaUrl("photo-04-640.webp")


export type AboutImage = {
  src: string
  srcSet?: string
  /** Intrinsic size of the largest source — reserves the box, no layout shift. */
  width: number
  height: number
  alt: string
  /** object-position for the crop; defaults to centre. */
  position?: string
}

export const ABOUT_HERO = { 
  label: 'Creative & Marketing Studio',
  heading: 'About Us',
  description: 'The people, thinking and journey behind BrandWorks.',
  body: [
    // 'BrandWorks is an interdisciplinary creative and marketing studio. Strategy, design, content, photography, film and technology work as one process, under one roof.',
    'We partner with brands that want more than output: work that is clear, consistent and built to be remembered.',
  ],
  image: {
    src: studioStill,
    width: 6000,
    height: 4000,
    alt: 'A lit photo studio set with an armchair and plant on a paper backdrop',
    // Landscape shot in a 4:5 frame: centre on the lit chair and lamps.
    position: '66% 60%',
  } satisfies AboutImage,
}

export const ABOUT_INTRO = {
  label: 'Who We Are',
  // Two phrases: the lead-in sits in the muted tone, the idea in full ink —
  // emphasis carried by colour, never by italics.
  statement: {
    lead: 'We built BrandWorks around a simple idea',
    // idea: 'great brands become stronger when strategy, creativity and technology work together.',
  },
  studio:
    'BrandWorks is a creative and marketing studio. We bring every discipline a brand needs into one process, under one roof:',
  disciplines: [
    'Strategy',
    'Design',
    'Content',
    'Photography',
    'Videography',
    'Social Media',
    'PR',
    'Performance Marketing',
    'SEO',
    'Technology',
  ],
  // The Vite reference currently renders no label here. Keep that output while
  // making the property explicit for Next's route-scoped typecheck.
  approachLabel: undefined as string | undefined,
  approach: [
    // "We don't create for the sake of creating.",
    // 'Every image, campaign, story and digital experience should help people understand, remember and trust the brand behind it.',
  ],
}

export type JourneyStage = {
  title: string
  text: string
}

export const ABOUT_JOURNEY = {
  label: 'Our Journey',
  heading: 'Our Journey',
  description: 'From an idea to an interdisciplinary creative studio.',
  stages: [
    {
      title: 'The Beginning',
      text: 'BrandWorks began with one goal — to close the gap between good creative work and clear brand thinking.',
    },
    {
      title: 'Building the Studio',
      text: 'What started with creative execution expanded into photography, films, design, content, social media and digital experiences.',
    },
    {
      title: 'Strategy Meets Creative',
      text: 'We began bringing strategy, reputation, performance and technology into the same creative process.',
    },
    {
      title: 'Where We Are Now',
      text: 'Today, BrandWorks works across disciplines to build brands that are clearer, more consistent and easier to remember.',
    },
  ] satisfies JourneyStage[],
  images: {
    beginning: {
      src: beginningStill,
      width: 2656,
      height: 3542,
      alt: 'A traveller in a hat and dark coat, luggage beside him, raising a hand to hail a ride on a city street',
    },
    studio: {
      src: studioStill,
      width: 6000,
      height: 4000,
      alt: 'A photo studio set with lights and softboxes around an armchair and plant on a paper backdrop',
    },
    road: {
      src: technologyStill,
      width: 6000,
      height: 4000,
      alt: 'Close-up of code on a laptop screen above a dimly lit keyboard',
    },
  } satisfies Record<string, AboutImage>,
}

export const ABOUT_STATEMENT = {
  label: 'Today',
  heading: 'Where We Are Now',
  text: "BrandWorks wasn't built to simply produce more content. It was built to make every piece of work matter.",
  // signature: 'The BrandWorks Studio',
  image: {
    src: websiteDevStill,
    width: 1600,
    height: 1200,
    alt: 'BrandWorks studio image showing the creative team and working environment',
  } satisfies AboutImage,
}

export const ABOUT_PRINCIPLES = {
  label: 'Principles',
  heading: 'How We Think',
  items: [
    { number: '01', title: 'Clarity', text: 'Make the idea easy to understand.' },
    { number: '02', title: 'Consistency', text: 'Build recognizable brand behaviour across every touchpoint.' },
    { number: '03', title: 'Craft', text: 'Details matter from strategy to the final frame.' },
    { number: '04', title: 'Purpose', text: 'Creative work should contribute to something bigger than attention.' },
  ],
}

export type TeamMember = {
  name: string
  role: string
  speciality: string
  image: AboutImage
  /** Portrait proportion — varied on purpose, for the editorial rhythm. */
  ratio: '3/4' | '4/5' | '2/3'
}

export const ABOUT_TEAM = {
  label: 'The Studio',
  heading: 'Meet the Team',
  description: 'Different disciplines. One creative process.',
  members: [
    {
      name: 'Yuvraj Singh Thapa',
      role: 'Founder',
      speciality: 'Brand direction and creative concepts',
      ratio: '4/5',
      image: {
        src: mediaUrl("Yuvraj.png"),
        width: 960,
        height: 1200,
        alt: 'Portrait of Yuvraj Singh Thapa',
      },
    },
    {
      name: 'Md Hasnain',
      role: 'SEO specialist',
      speciality: 'Positioning, reputation and growth',
      ratio: '2/3',
      image: {
        src: mediaUrl("Hasnain.jpeg"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Md Hasnain',
      },
    },
    {
      name: 'Rahul Uniyal',
      role: 'Full-Stack Developer',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: mediaUrl("rahul-uniyal.jpeg"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Rahul Uniyal',
        position: '50% 30%',
      },
    },
    {
      name: 'Rahul Koli',
      role: 'Full-Stack Developer',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: mediaUrl("Rahul1.png"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Rahul Koli',
        position: '50% 30%',
      },
    },
    {
      name: 'Navneet',
      role: 'Frontend Developer',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: mediaUrl("Navneet.png"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Navneet',
        position: '50% 30%',
      },
    },
    {
      name: 'Shreya',
      role: 'Art Director',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: mediaUrl("Shreya.png"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Shreya',
        position: '50% 30%',
      },
    },
    {
      name: 'Vidhi',
      role: 'Creative Director',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: mediaUrl("Vidhi.png"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Vidhi',
        position: '50% 30%',
      },
    },
    {
      name: 'Ujjwal',
      role: 'Motion Graphics Designer',
      speciality: 'Identity systems and animation',
      ratio: '4/5',
      image: {
        src: mediaUrl("UJJWAL.png"),
        width: 904,
        height: 1200,
        alt: 'Portrait of Ujjwal',
        position: '50% 35%',
      },
    },
  ] satisfies TeamMember[],
}

export const ABOUT_CLOSING = {
  lines: ['Different skills. Different perspectives.', 'One BrandWorks.'],
  cta: { label: 'Work With Us', href: 'mailto:hello@brandworks.com' },
}
