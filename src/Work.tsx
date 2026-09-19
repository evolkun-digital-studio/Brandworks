import { useRef, useMemo } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'

// Import all photos
import Photo1 from '/src/Photo/Photo1.jpg'
import Photo2 from '/src/Photo/Photo2.jpg'
import Photo3 from '/src/Photo/Photo3.jpg'
import Photo4 from '/src/Photo/Photo4.png'
import Photo5 from '/src/Photo/Photo5.png'
import Photo6 from '/src/Photo/Photo6.png'
import Photo7 from '/src/Photo/Photo7.png'
import Photo8 from '/src/Photo/Photo8.png'
import Photo9 from '/src/Photo/Photo9.png'
import Photo10 from '/src/Photo/Photo10.png'
import Photo11 from '/src/Photo/Photo11.png'
import Photo12 from '/src/Photo/Photo12.png'
import Photo13 from '/src/Photo/Photo13.png'
import Photo14 from '/src/Photo/Photo14.png'
import Photo15 from '/src/Photo/Photo15.png'
import Photo16 from '/src/Photo/Photo16.png'

const allPhotos = [Photo1, Photo2, Photo3, Photo4, Photo5, Photo6, Photo7, Photo8, Photo9, Photo10, Photo11, Photo12, Photo13, Photo14, Photo15, Photo16]



/**
 * Refined Photography → Work transition:
 *
 * PHOTOGRAPHY (centered title)
 * ↓
 * small image window appears
 * ↓
 * image expands and masks typography
 * ↓
 * fullscreen immersive visual
 * ↓
 * direct handoff to Work section (no white fade)
 * ↓
 * Work content revealed beneath
 *
 * Native scroll is still in control. Motion only reads scroll progress, so it
 * works with the site's existing Lenis setup and does not add scroll-jacking.
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  // Get 3 strong photos for the transition (not 5)
  const showcasePhotos = useMemo(() => {
    const shuffled = [...allPhotos].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }, [])

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // Timing distribution:
  // 0.00–0.15: PHOTOGRAPHY + small visual
  // 0.15–0.28: small visual activates
  // 0.28–0.55: visual grows to medium size
  // 0.55–0.78: visual grows aggressively toward fullscreen, typography masked
  // 0.78–0.88: fullscreen photography
  // 0.88–1.00: fullscreen image reveals Work content

  // Photo crossfades with 3 images only
  const photoOpacities = [
    useTransform(scrollYProgress, [0, 0.15, 0.35, 0.48], [1, 1, 0.8, 0]),      // Photo 0
    useTransform(scrollYProgress, [0.35, 0.48, 0.65, 0.75], [0, 1, 1, 0.3]),    // Photo 1
    useTransform(scrollYProgress, [0.63, 0.75, 0.88, 0.95], [0, 1, 1, 0.5]),    // Photo 2
  ]

  // Smooth scale expansion with proper timing
  // Stage A (0–0.15): invisible to 1.8% (small)
  // Stage B (0.15–0.28): 1.8% to 15% (activates)
  // Stage C (0.28–0.55): 15% to 45% (medium)
  // Stage D (0.55–0.88): 45% to 100% (fullscreen)
  // Stage E (0.88–1.00): hold at 100%
  const mediaScale = useTransform(
    scrollYProgress,
    [0, 0.08, 0.15, 0.28, 0.55, 0.88, 1],
    [0.008, 0.018, 0.035, 0.15, 0.95, 1, 1],
  )

  // Media stays fully opaque throughout (never fade to white)
  const mediaOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.12, 1],
    [0, 0.5, 1, 1]
  )

  // Border radius transitions smoothly
  // Small: 12px → Medium: 8px → Large: 4px → Fullscreen: 0px
  const mediaRadius = useTransform(
    scrollYProgress,
    [0.12, 0.28, 0.55, 0.78, 0.88],
    [12, 10, 6, 2, 0]
  )

  // Typography masking: text fades out as media expands
  // The media (z-20) already sits above text (z-10), but we hide text via opacity
  const typographyOpacity = useTransform(
    scrollYProgress,
    [0, 0.55, 0.75],
    [1, 0.8, 0]
  )


  // Subtle photo zoom and pan effects (very restrained)
  // Photo 1: subtle scale up
  const photo1Scale = useTransform(scrollYProgress, [0.35, 0.48], [1, 1.035])
  const photo1X = useTransform(scrollYProgress, [0.35, 0.48], ['0%', '-1%'])

  // Photo 2: subtle scale down
  const photo2Scale = useTransform(scrollYProgress, [0.48, 0.63], [1.03, 1])
  const photo2Y = useTransform(scrollYProgress, [0.48, 0.63], ['1%', '-1%'])

  // Clip path to reveal Work section underneath (instead of white fade)
  // The media container clips upward to reveal content below
  const mediaClipPath = useTransform(scrollYProgress, [0.88, 1], [
    'inset(0 0 0 0)',
    'inset(0 0 100% 0)'
  ])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-14 sm:pt-20" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
          <div
            className="text-center text-[clamp(90px,12vw,190px)] leading-[0.82] font-thin tracking-[-0.055em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            Photography
          </div>
          <div className="mt-12 aspect-video w-[clamp(220px,18vw,320px)] overflow-hidden rounded-lg bg-neutral-100 sm:mt-14">
            <img src={showcasePhotos[0]} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={runwayRef} className="relative h-[650vh] bg-white" aria-hidden="true">
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        {/* PHOTOGRAPHY title - centered, responsive, no awkward cropping */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-[2vw]"
          style={{ opacity: typographyOpacity }}
        >
          <div
            className="text-center text-[clamp(90px,12vw,190px)] leading-[0.82] font-thin tracking-[-0.055em] text-[#111] uppercase"
            style={{
              fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            Photography
          </div>
        </motion.div>

        {/* Expanding media container - masks typography via z-index and clip-path */}
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
          style={{
            opacity: mediaOpacity,
            scale: mediaScale,
            borderRadius: mediaRadius,
            transformOrigin: '50% 50%',
            clipPath: mediaClipPath,
            willChange: 'transform, opacity, border-radius, clip-path',
          }}
        >
          {/* Photo container with subtle zoom effects */}
          <div className="relative h-full w-full">
            {showcasePhotos.map((photo, idx) => (
              <motion.div
                key={photo}
                className="absolute inset-0"
                style={{
                  opacity: photoOpacities[idx],
                  scale: idx === 0 ? photo1Scale : idx === 1 ? photo2Scale : 1,
                  x: idx === 0 ? photo1X : 0,
                  y: idx === 1 ? photo2Y : 0,
                }}
              >
                <img
                  src={photo}
                  alt=""
                  className="h-full w-full select-none object-cover"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Work section placeholder - will be revealed as media clips upward */}
      <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            className="mb-16 text-center"
          >
            <div className="mb-4 text-[13px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              What We Do
            </div>
            <h2
              className="text-[clamp(42px,8vw,72px)] leading-[1.1] font-thin tracking-[-0.03em] text-[#111]"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Work with Impact
            </h2>
          </motion.div>

          {/* Placeholder grid for work projects */}
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                  delay: idx * 0.08,
                }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="aspect-square overflow-hidden rounded-2xl bg-neutral-100"
              >
                <div className="h-full w-full flex items-center justify-center text-neutral-400 font-medium">
                  Project {idx}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

 

function Work() {
  return (
    <section id="work" aria-labelledby="work-with-impact-heading" className="bg-white">
      <WorkReveal /> 
    </section>
  )
}

export default Work
