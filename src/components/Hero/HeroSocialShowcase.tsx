import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import type { Variants } from 'motion/react'
import type { HeroImage } from '../../data/heroServices'
import { HeroImg } from './HeroImg'
import type { ImagePriority } from './HeroImg'
import HeroSocialLine from './HeroSocialLine'
import HeroSocialGrid from './HeroSocialGrid'

// Same curve as --hero-ease in Hero.css.
const EASE = [0.22, 1, 0.36, 1] as const
// The caption swaps ~0.32s after a click; holding the cards until then means
// the stage has settled at its final size before anything is visible.
const ENTER_DELAY = 0.34
// Cards only reset once HeroMedia has faded the layer out (0.25s + 0.8s), so
// leaving Social Media never shows them dropping away.
const RESET_DELAY = 1.1

const CARD_SIZES = '(max-width: 767px) 60vw, (max-width: 1199px) 44vw, 30vw'

function cardVariants(rise: number, delay: number, reducedMotion: boolean): Variants {
  const reset = { duration: 0, delay: RESET_DELAY }
  if (reducedMotion) {
    return {
      hidden: { opacity: 0, transition: reset },
      shown: { opacity: 1, transition: { duration: 0.35, delay } },
    }
  }
  return {
    hidden: { opacity: 0, y: rise, scale: 0.985, transition: reset },
    shown: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.72, ease: EASE, delay },
    },
  }
}

/**
 * The phone recording. It never autoplays in the background: it plays only
 * while Social Media is the active, on-screen service and pauses the moment
 * another capsule takes over. Reduced motion keeps the first-frame poster.
 */
function ShowcaseVideo({
  video,
  playing,
  reducedMotion,
}: {
  video: { src: string; poster: string; label: string }
  playing: boolean
  reducedMotion: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldPlay = playing && !reducedMotion

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (shouldPlay) {
      void el.play().catch(() => undefined)
    } else {
      el.pause()
    }
  }, [shouldPlay])

  return (
    <video
      ref={videoRef}
      src={video.src}
      poster={video.poster}
      muted
      loop
      playsInline
      autoPlay={shouldPlay}
      preload="metadata"
      disablePictureInPicture
      aria-label={video.label}
      className="hero-img"
    />
  )
}

/**
 * Social Media: an editorial still and a live recording presented side by
 * side as one showcase, sitting above the hero copy rather than behind it,
 * with a single lime line drawn through the whole composition behind them.
 */
function HeroSocialShowcase({
  grid,
  image,
  video,
  active,
  playing,
  priority,
  reducedMotion,
}: {
  grid: HeroImage[]
  image: HeroImage
  video: { src: string; poster: string; label: string }
  active: boolean
  playing: boolean
  priority: ImagePriority
  reducedMotion: boolean
}) {
  return (
    <motion.div className="social-showcase" initial="hidden" animate={active ? 'shown' : 'hidden'}>
      <HeroSocialLine active={active} reducedMotion={reducedMotion} />

      <div className="social-showcase__stage">
        <HeroSocialGrid images={grid} priority={priority} reducedMotion={reducedMotion} />

        <div className="media-showcase">
          <motion.figure
            className="social-card social-image"
            variants={cardVariants(18, ENTER_DELAY, reducedMotion)}
          >
            <HeroImg image={image} sizes={CARD_SIZES} priority={priority} loading="lazy" />
          </motion.figure>

          <motion.figure
            className="social-card social-video"
            variants={cardVariants(28, ENTER_DELAY + 0.1, reducedMotion)}
          >
            <ShowcaseVideo video={video} playing={playing} reducedMotion={reducedMotion} />
          </motion.figure>
        </div>
      </div>
    </motion.div>
  )
}

export default HeroSocialShowcase
