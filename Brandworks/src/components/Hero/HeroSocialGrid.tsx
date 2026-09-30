import { motion } from 'motion/react'
import type { Variants } from 'motion/react'
import type { HeroImage } from '../../data/heroServices'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'

const GRID_EASE = [0.22, 1, 0.36, 1] as const
const GRID_DELAY = 0.22

function cellVariants(index: number, reducedMotion: boolean): Variants {
  const delay = GRID_DELAY + index * 0.065

  return {
    hidden: {
      opacity: 0,
      scale: reducedMotion ? 1 : 1.02,
      transition: { duration: 0.2 },
    },
    shown: {
      opacity: 1,
      scale: 1,
      transition: { duration: reducedMotion ? 0.3 : 0.62, ease: GRID_EASE, delay },
    },
  }
}

/** Six campaign frames presented as one compact social contact sheet. */
function HeroSocialGrid({
  images,
  priority,
  reducedMotion,
}: {
  images: HeroImage[]
  priority: ImagePriority
  reducedMotion: boolean
}) {
  return (
    <div className="social-contact-sheet" aria-label="Selected BrandWorks social campaign frames">
      {images.map((image, index) => (
        <motion.figure
          key={image.src}
          className="social-contact-sheet__cell"
          variants={cellVariants(index, reducedMotion)}
        >
          <HeroImg
            image={image}
            sizes="(max-width: 767px) 46vw, (max-width: 1199px) 30vw, 190px"
            priority={priority}
            loading="lazy"
          />
        </motion.figure>
      ))}
    </div>
  )
}

export default HeroSocialGrid
