import { mediaUrl } from '../media'
/**
 * TEMPORARY DEMO MEDIA FOR GRAPHICS / MOTION / DIGITAL SECTION
 *
 * Replace these URLs with final BrandWorks work samples.
 * These are placeholder assets only.
 */

export const graphicsMotionMedia = {
  // STAGE 1: Static Graphic Design
  staticGraphic: {
    url: mediaUrl("photo-1561070791-2526d30994b5.jpg"),
    alt: 'Graphic design composition',
  },

  // STAGE 2: Deconstructed elements
  graphicElements: {
    headline: 'DESIGNED TO MOVE',
    detail: mediaUrl("photo-1561070791-2526d30994b5.jpg"),
    texture: mediaUrl("photo-1492684223066-81342ee5ff30.jpg"),
  },

  // STAGE 3-4: Motion/Video
  motionVideo: {
    url: mediaUrl("3571937-sd_1280_720_30fps.mp4"),
    alt: 'Motion design animation',
    poster: mediaUrl("photo-1495707902905-78189c7e58d1.jpg"),
  },

  // STAGE 5: Code/Digital Output
  digitalOutput: {
    visual: mediaUrl("photo-1517694712202-14dd9538aa97.jpg"),
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
    dominant: mediaUrl("photo-1561070791-2526d30994b5.jpg"),
    supporting1: mediaUrl("photo-1495707902905-78189c7e58d1.jpg"),
    supporting2: mediaUrl("photo-1517694712202-14dd9538aa97.jpg"),
    detail: mediaUrl("photo-1552664730-d307ca884978.jpg"),
  },

  // Fallback images
  fallback: mediaUrl("photo-1561070791-2526d30994b5.jpg"),
}
