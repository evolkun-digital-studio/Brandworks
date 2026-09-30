/**
 * TEMPORARY DEMO MEDIA FOR GRAPHICS / MOTION / DIGITAL SECTION
 *
 * Replace these URLs with final BrandWorks work samples.
 * These are placeholder assets only.
 */

export const graphicsMotionMedia = {
  // STAGE 1: Static Graphic Design
  staticGraphic: {
    url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1400&h=1000&fit=crop',
    alt: 'Graphic design composition',
  },

  // STAGE 2: Deconstructed elements
  graphicElements: {
    headline: 'DESIGNED TO MOVE',
    detail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
    texture: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop',
  },

  // STAGE 3-4: Motion/Video
  motionVideo: {
    url: 'https://videos.pexels.com/video-files/3571937/3571937-sd_1280_720_30fps.mp4',
    alt: 'Motion design animation',
    poster: 'https://images.unsplash.com/photo-1495707902905-78189c7e58d1?w=1400&h=900&fit=crop',
  },

  // STAGE 5: Code/Digital Output
  digitalOutput: {
    visual: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=700&fit=crop',
    code: `const createDesign = () => {
  return gsap.timeline({
    scrollTrigger: {
      trigger: ".section",
      scrub: 1.2
    }
  }).to(".frame", {
    scale: 1.05,
    duration: 12
  })
}`,
  },

  // STAGE 6: Creative System (combination of all)
  creativeSystem: {
    dominant: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1400&h=900&fit=crop',
    supporting1: 'https://images.unsplash.com/photo-1495707902905-78189c7e58d1?w=800&h=600&fit=crop',
    supporting2: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=500&fit=crop',
    detail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
  },

  // Fallback images
  fallback: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop',
}
