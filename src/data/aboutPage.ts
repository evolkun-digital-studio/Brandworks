// Content and media for the About page (components/AboutPage).
//
// Every line of copy and every photograph the page shows lives here, so
// rewriting the story or swapping a portrait never means touching the
// layout.

import studioPortrait from '../assets/about/studio-portrait.webp'
import studioPortraitSmall from '../assets/about/studio-portrait-640.webp'
import craftStill from '../assets/graphics/gm-01.webp'
import craftStillSmall from '../assets/graphics/gm-01-560.webp'
import sphereStill from '../assets/graphics/gm-04.webp'
import sphereStillSmall from '../assets/graphics/gm-04-800.webp'
import coastRoad from '../assets/social/campaign-aerial.jpg'
import bottleStill from '../assets/hero/photo-04.webp'
import bottleStillSmall from '../assets/hero/photo-04-640.webp'
import portrait01 from '../assets/hero/photo-01.webp'
import portrait01Small from '../assets/hero/photo-01-640.webp'
import portrait02 from '../assets/graphics/gm-03.webp'
import portrait02Small from '../assets/graphics/gm-03-560.webp'
import portrait03 from '../assets/graphics/gm-05.webp'
import portrait03Small from '../assets/graphics/gm-05-560.webp'
import portrait04 from '../assets/about/team-04.webp'
import portrait04Small from '../assets/about/team-04-560.webp'

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
  index: '01 — About BrandWorks',
  heading: 'About Us',
  description: 'The people, thinking and journey behind BrandWorks.',
  image: {
    src: studioPortrait,
    srcSet: `${studioPortraitSmall} 640w, ${studioPortrait} 960w`,
    width: 960,
    height: 1200,
    alt: 'A hand holding a product up to warm studio light during a BrandWorks shoot',
  } satisfies AboutImage,
  location: 'India / Worldwide',
}

export const ABOUT_INTRO = {
  label: 'Who We Are',
  // Two phrases: the lead-in sits in the muted tone, the idea in full ink —
  // emphasis carried by colour, never by italics.
  statement: {
    lead: 'We built BrandWorks around a simple idea:',
    idea: 'great brands become stronger when strategy, creativity and technology work together.',
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
  approachLabel: 'Our Approach',
  approach: [
    "We don't create for the sake of creating.",
    'Every image, campaign, story and digital experience should help people understand, remember and trust the brand behind it.',
  ],
}

export type JourneyStage = {
  number: string
  title: string
  text: string
}

export const ABOUT_JOURNEY = {
  label: 'Our Journey',
  heading: 'Our Journey',
  description: 'From an idea to an interdisciplinary creative studio.',
  stages: [
    {
      number: '01',
      title: 'The Beginning',
      text: 'BrandWorks began with one goal — to close the gap between good creative work and clear brand thinking.',
    },
    {
      number: '02',
      title: 'Building the Studio',
      text: 'What started with creative execution expanded into photography, films, design, content, social media and digital experiences.',
    },
    {
      number: '03',
      title: 'Strategy Meets Creative',
      text: 'We began bringing strategy, reputation, performance and technology into the same creative process.',
    },
    {
      number: '04',
      title: 'Where We Are Now',
      text: 'Today, BrandWorks works across disciplines to build brands that are clearer, more consistent and easier to remember.',
    },
  ] satisfies JourneyStage[],
  images: {
    beginning: {
      src: craftStill,
      srcSet: `${craftStillSmall} 560w, ${craftStill} 967w`,
      width: 967,
      height: 1200,
      alt: 'A black product tube standing on cracked concrete in hard afternoon light',
    },
    studio: {
      src: sphereStill,
      srcSet: `${sphereStillSmall} 800w, ${sphereStill} 1200w`,
      width: 1200,
      height: 904,
      alt: 'A glass sphere resting on a pale paper backdrop',
    },
    road: {
      src: coastRoad,
      width: 1200,
      height: 800,
      alt: 'Aerial view of a road winding along a rocky coastline',
    },
  } satisfies Record<string, AboutImage>,
}

export const ABOUT_STATEMENT = {
  label: 'Why BrandWorks',
  heading: "We didn't want to build another agency that simply produced more content.",
  text: 'We wanted to build a studio where every discipline contributes to the same idea.',
  signature: 'The BrandWorks Studio',
  image: {
    src: bottleStill,
    srcSet: `${bottleStillSmall} 640w, ${bottleStill} 1200w`,
    width: 1200,
    height: 1200,
    alt: 'A single white bottle lit against a black studio backdrop',
  } satisfies AboutImage,
}

export const ABOUT_PRINCIPLES = {
  label: 'Principles',
  heading: 'How We Think',
  items: [
    { number: '01', title: 'Clarity', text: 'Make the idea easy to understand.' },
    { number: '02', title: 'Consistency', text: 'Build recognizable brand behaviour across every touchpoint.' },
    { number: '03', title: 'Craft', text: 'Details matter — from strategy to the final frame.' },
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

// PLACEHOLDER TEAM — replace before launch. The names below are stand-ins
// and the portraits are BrandWorks campaign photography, not the team.
// Swap in real names, roles and portraits (portrait orientation, at least
// ~900px wide) and keep the four `ratio` values varied.
export const ABOUT_TEAM = {
  label: 'The Studio',
  heading: 'Meet the Team',
  description: 'Different disciplines. One creative process.',
  members: [
    {
      name: 'Aarav Mehta',
      role: 'Founder / Creative Director',
      speciality: 'Brand direction and creative concepts',
      ratio: '4/5',
      image: {
        src: portrait01,
        srcSet: `${portrait01Small} 640w, ${portrait01} 960w`,
        width: 960,
        height: 1200,
        alt: 'Portrait of Aarav Mehta',
      },
    },
    {
      name: 'Naina Kapoor',
      role: 'Strategy & Marketing',
      speciality: 'Positioning, reputation and growth',
      ratio: '2/3',
      image: {
        src: portrait02,
        srcSet: `${portrait02Small} 560w, ${portrait02} 904w`,
        width: 904,
        height: 1200,
        alt: 'Portrait of Naina Kapoor',
      },
    },
    {
      name: 'Kabir Rao',
      role: 'Photography / Film',
      speciality: 'Campaign stills and brand films',
      ratio: '3/4',
      image: {
        src: portrait03,
        srcSet: `${portrait03Small} 560w, ${portrait03} 904w`,
        width: 904,
        height: 1200,
        alt: 'Portrait of Kabir Rao',
        position: '50% 30%',
      },
    },
    {
      name: 'Meera Iyer',
      role: 'Design & Motion',
      speciality: 'Identity systems and animation',
      ratio: '4/5',
      image: {
        src: portrait04,
        srcSet: `${portrait04Small} 560w, ${portrait04} 904w`,
        width: 904,
        height: 1200,
        alt: 'Portrait of Meera Iyer',
        position: '50% 35%',
      },
    },
  ] satisfies TeamMember[],
}

export const ABOUT_CLOSING = {
  lines: ['Different skills. Different perspectives.', 'One BrandWorks.'],
  cta: { label: 'Work With Us', href: 'mailto:hello@brandworks.com' },
}
