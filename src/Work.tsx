import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'

// Import temporary transition photography
import Photo1 from '/src/Photo/Photo1.jpg'
import Photo2 from '/src/Photo/Photo2.jpg'
import Photo3 from '/src/Photo/Photo3.jpg'

// TEMPORARY TRANSITION IMAGES
// High-quality editorial photography for the transition sequence.
// Replace these URLs with final BrandWorks project photography.
// Keep all images in this single array for easy future replacement.
const TEMP_PHOTOGRAPHY_IMAGES = [
  Photo1,  // Left panel primary
  Photo2,  // Center panel primary (becomes fullscreen)
  Photo3,  // Right panel primary
]

/**
 * PHOTOGRAPHY → Editorial Strips → Fullscreen → Portfolio Transition
 *
 * Cinematic, slow-paced scroll experience with deliberate hold moments.
 * 520vh total scroll distance allows for contemplative progression.
 *
 * Timeline:
 * 0.00–0.10: PHOTOGRAPHY title
 * 0.10–0.20: photography enters letters
 * 0.20–0.25: image masking strengthens
 * 0.25–0.31: HOLD typography + imagery
 * 0.31–0.50: vertical strips emerge
 * 0.50–0.63: HOLD three-panel composition
 * 0.63–0.77: panels expand
 * 0.77–0.82: HOLD large editorial composition
 * 0.82–0.91: side panels exit, hero takes over
 * 0.91–0.96: HOLD fullscreen photography
 * 0.96–1.00: fullscreen reveals portfolio
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // === TYPOGRAPHY PHASE ===
  const typographyOpacity = useTransform(scrollYProgress, [0, 0.10, 0.31, 0.50], [1, 1, 0.8, 0])

  // === LETTER MASKING PHASE (0.10–0.25) ===
  const letterPhotoOpacity = useTransform(scrollYProgress, [0.10, 0.25], [0, 1])

  // === LEFT STRIP ===
  const leftStripY = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.82, 0.91], ['0vh', '-30vh', '-30vh', '-80vh', '-100vh'])
  const leftStripHeight = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.91], ['2vh', '45vh', '45vh', '85vh', '100vh'])
  const leftStripWidth = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.82, 0.91], ['6vw', '18vw', '18vw', '28vw', '0vw', '0vw'])
  const leftStripOpacity = useTransform(scrollYProgress, [0.31, 0.50, 0.82, 0.91], [0, 1, 1, 0])
  // Internal camera movement during holds
  const leftImageScale = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82], [1, 1.04, 1.02, 1])
  const leftImageY = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82], ['2%', '-2%', '1%', '-1%'])
  const leftImageOpacity = useTransform(scrollYProgress, [0.31, 0.50], [0, 1])

  // === CENTER STRIP (becomes fullscreen) ===
  const centerStripY = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.82, 0.91, 1], ['0vh', '-20vh', '-20vh', '0vh', '0vh', '-100vh'])
  const centerStripHeight = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.82, 0.91, 1], ['2vh', '50vh', '50vh', '90vh', '100vh', '100vh', '100vh'])
  const centerStripWidth = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.82, 0.91, 1], ['6vw', '20vw', '20vw', '32vw', '100vw', '100vw', '100vw'])
  // Internal camera movement
  const centerImageScale = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82, 0.96], [1, 1.035, 1.02, 1, 1.01])
  const centerImageY = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82, 0.96], ['-1%', '1.5%', '-1%', '0%', '1%'])
  const centerImageOpacity = useTransform(scrollYProgress, [0.31, 0.50], [0, 1])

  // === RIGHT STRIP ===
  const rightStripY = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.82, 0.91], ['0vh', '30vh', '30vh', '80vh', '100vh'])
  const rightStripHeight = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.91], ['2vh', '48vh', '48vh', '88vh', '100vh'])
  const rightStripWidth = useTransform(scrollYProgress, [0.31, 0.50, 0.63, 0.77, 0.82, 0.91], ['6vw', '19vw', '19vw', '30vw', '0vw', '0vw'])
  const rightStripOpacity = useTransform(scrollYProgress, [0.31, 0.50, 0.82, 0.91], [0, 1, 1, 0])
  // Internal camera movement
  const rightImageScale = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82], [1, 1.045, 1.03, 1])
  const rightImageX = useTransform(scrollYProgress, [0.50, 0.63, 0.77, 0.82], ['-1%', '1%', '-1%', '0%'])
  const rightImageOpacity = useTransform(scrollYProgress, [0.31, 0.50], [0, 1])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-20 sm:pt-28" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center min-h-screen">
          <div
            className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            Photography
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* LONG SCROLL RUNWAY - Makes the entire experience slower and more cinematic */}
      <div ref={runwayRef} className="relative h-[520vh] bg-white">
        {/* STICKY VIEWPORT - Animation happens here */}
        <div className="sticky top-0 h-screen overflow-hidden bg-white flex items-center justify-center">
          {/* HERO TYPOGRAPHY - PHOTOGRAPHY title */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ opacity: typographyOpacity }}
          >
            <div
              className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Photography
            </div>
          </motion.div>

          {/* LETTER MASKING - Photography inside letter shapes */}
          <motion.div
            className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none"
            style={{ opacity: letterPhotoOpacity }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={TEMP_PHOTOGRAPHY_IMAGES[1]}
                alt=""
                className="w-[clamp(90px,11.5vw,190px)] h-auto object-cover"
                style={{ willChange: 'transform' }}
              />
            </div>
          </motion.div>

          {/* LEFT STRIP */}
          <motion.div
            className="absolute z-20 left-[12%] overflow-hidden bg-black"
            style={{
              y: leftStripY,
              height: leftStripHeight,
              width: leftStripWidth,
              opacity: leftStripOpacity,
              willChange: 'transform, opacity',
            }}
          >
            <motion.div
              className="relative w-full h-full"
              style={{ scale: leftImageScale, y: leftImageY, opacity: leftImageOpacity }}
            >
              <img src={TEMP_PHOTOGRAPHY_IMAGES[0]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* CENTER STRIP - Becomes fullscreen */}
          <motion.div
            className="absolute z-30 left-1/2 -translate-x-1/2 overflow-hidden bg-black"
            style={{
              y: centerStripY,
              height: centerStripHeight,
              width: centerStripWidth,
              willChange: 'transform',
            }}
          >
            <motion.div
              className="relative w-full h-full"
              style={{ scale: centerImageScale, y: centerImageY, opacity: centerImageOpacity }}
            >
              <img src={TEMP_PHOTOGRAPHY_IMAGES[1]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* RIGHT STRIP */}
          <motion.div
            className="absolute z-20 right-[12%] overflow-hidden bg-black"
            style={{
              y: rightStripY,
              height: rightStripHeight,
              width: rightStripWidth,
              opacity: rightStripOpacity,
              willChange: 'transform, opacity',
            }}
          >
            <motion.div
              className="relative w-full h-full"
              style={{ scale: rightImageScale, x: rightImageX, opacity: rightImageOpacity }}
            >
              <img src={TEMP_PHOTOGRAPHY_IMAGES[2]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* PORTFOLIO SECTION - Normal document flow */}
      <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Aerolink', image: TEMP_PHOTOGRAPHY_IMAGES[0] },
              { title: 'Riaaj Vintage', image: TEMP_PHOTOGRAPHY_IMAGES[1] },
              { title: 'Delhi-6', image: TEMP_PHOTOGRAPHY_IMAGES[2] },
              { title: 'Brand Project', image: TEMP_PHOTOGRAPHY_IMAGES[0] },
            ].map((project, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.08 }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="group"
              >
                <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xl">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-[#111]" style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}>
                    {project.title}
                  </h3>
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
